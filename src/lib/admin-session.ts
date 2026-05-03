import { cookies } from "next/headers";

const COOKIE = "fmv_community_admin";
const SESSION_HOURS = 8;

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function createToken(secret: string): Promise<string> {
  const exp = Date.now() + SESSION_HOURS * 60 * 60 * 1000;
  const payload = String(exp);
  const sig = await hmacHex(secret, payload);
  return `${payload}.${sig}`;
}

async function verifyToken(secret: string, token: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const exp = Number(payload);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = await hmacHex(secret, payload);
  return sig === expected;
}

export async function setAdminSessionCookie(): Promise<void> {
  const secret = process.env.COMMUNITY_ADMIN_SECRET;
  if (!secret) return;
  const value = await createToken(secret);
  const store = await cookies();
  store.set(COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 60 * 60,
  });
}

export async function verifyCommunityAdminSession(): Promise<boolean> {
  const secret = process.env.COMMUNITY_ADMIN_SECRET;
  if (!secret) return false;
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return false;
  return verifyToken(secret, raw);
}

export async function clearAdminSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}
