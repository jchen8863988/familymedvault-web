/**
 * Per-tenant refresh token vault — envelope encryption simulating KMS/HSM.
 *
 * DEK encrypts refresh_token; master key (TELOG_KMS_MASTER_KEY) wraps DEK.
 * Production: replace master key with cloud KMS Encrypt/Decrypt API (CMK per region).
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

export const TOKEN_VAULT_KEY_VERSION = "v1";

export type EncryptedRefreshTokenVault = {
  keyVersion: string;
  ciphertext: string;
  iv: string;
  tag: string;
  wrappedDek: string;
  dekIv: string;
  dekTag: string;
};

function masterKey(): Buffer | null {
  const raw = process.env.TELOG_KMS_MASTER_KEY;
  if (!raw) return null;
  const buf = Buffer.from(raw, "base64");
  return buf.length === 32 ? buf : createHash("sha256").update(raw).digest();
}

function aesGcmEncrypt(key: Buffer, plaintext: Buffer, aad: Buffer): { iv: string; tag: string; ciphertext: string } {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(aad);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: encrypted.toString("base64"),
  };
}

function aesGcmDecrypt(
  key: Buffer,
  ciphertextB64: string,
  ivB64: string,
  tagB64: string,
  aad: Buffer,
): Buffer {
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(aad);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Store refresh token — returns vault blob; null if KMS master key not configured. */
export function sealRefreshToken(tenantId: string, refreshToken: string): EncryptedRefreshTokenVault | null {
  const mk = masterKey();
  if (!mk) return null;

  const dek = randomBytes(32);
  const aad = Buffer.from(`telog-refresh:${tenantId}`, "utf8");
  const tokenEnc = aesGcmEncrypt(dek, Buffer.from(refreshToken, "utf8"), aad);

  const dekAad = Buffer.from(`telog-dek:${tenantId}:${TOKEN_VAULT_KEY_VERSION}`, "utf8");
  const dekWrap = aesGcmEncrypt(mk, dek, dekAad);

  return {
    keyVersion: TOKEN_VAULT_KEY_VERSION,
    ciphertext: tokenEnc.ciphertext,
    iv: tokenEnc.iv,
    tag: tokenEnc.tag,
    wrappedDek: dekWrap.ciphertext,
    dekIv: dekWrap.iv,
    dekTag: dekWrap.tag,
  };
}

/** Collector worker only — never expose to client API responses. */
export function openRefreshToken(tenantId: string, vault: EncryptedRefreshTokenVault): string | null {
  const mk = masterKey();
  if (!mk || vault.keyVersion !== TOKEN_VAULT_KEY_VERSION) return null;

  try {
    const dekAad = Buffer.from(`telog-dek:${tenantId}:${vault.keyVersion}`, "utf8");
    const dek = aesGcmDecrypt(mk, vault.wrappedDek, vault.dekIv, vault.dekTag, dekAad);
    const aad = Buffer.from(`telog-refresh:${tenantId}`, "utf8");
    const plain = aesGcmDecrypt(dek, vault.ciphertext, vault.iv, vault.tag, aad);
    return plain.toString("utf8");
  } catch {
    return null;
  }
}

/** Explicit zeroization hook — caller must delete vault reference from storage. */
export function destroyRefreshTokenVault(_vault: EncryptedRefreshTokenVault | undefined): void {
  // Vault is immutable strings; deletion is removing the tenant record from the store.
}
