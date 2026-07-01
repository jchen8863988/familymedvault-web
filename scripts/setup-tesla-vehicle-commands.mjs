#!/usr/bin/env node
/**
 * One-time TeLog TVCP infrastructure setup.
 *
 * 1. Verify public key is live on familymedvault.com
 * 2. Verify TESLA_CMD_PRIVATE_KEY matches public key (optional openssl check)
 * 3. Print Fly.io deploy + Vercel env instructions
 *
 * Usage:
 *   TESLA_CMD_PRIVATE_KEY_FILE=./secrets/tesla-command-private-key.pem node scripts/setup-tesla-vehicle-commands.mjs
 */
import { createPublicKey, createPrivateKey } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');
const PUBLIC_KEY_PATH = join(
  REPO,
  'public/.well-known/appspecific/com.tesla.3p.public-key.pem',
);
const PARTNER_DOMAIN = process.env.TESLA_CN_PARTNER_DOMAIN ?? 'www.familymedvault.com';

function loadPrivateKeyPem() {
  const fromEnv = process.env.TESLA_CMD_PRIVATE_KEY?.trim();
  if (fromEnv?.includes('BEGIN')) return fromEnv;
  const file =
    process.env.TESLA_CMD_PRIVATE_KEY_FILE ??
    join(REPO, 'secrets/tesla-command-private-key.pem');
  if (existsSync(file)) return readFileSync(file, 'utf8');
  return null;
}

function keysMatch(privatePem, publicPem) {
  try {
    const priv = createPrivateKey(privatePem);
    const pub = createPublicKey(publicPem);
    const derived = createPublicKey(priv);
    return derived.export({ type: 'spki', format: 'pem' }) === pub.export({ type: 'spki', format: 'pem' });
  } catch (e) {
    console.error('Key check failed:', e instanceof Error ? e.message : e);
    return false;
  }
}

async function checkPublicKeyHosted() {
  const url = `https://${PARTNER_DOMAIN}/.well-known/appspecific/com.tesla.3p.public-key.pem`;
  const res = await fetch(url);
  return { url, ok: res.ok, status: res.status, body: res.ok ? await res.text() : '' };
}

async function main() {
  console.log('TeLog TVCP setup\n');

  const hosted = await checkPublicKeyHosted();
  console.log(`Public key: ${hosted.url} → HTTP ${hosted.status}`);
  if (!hosted.ok) {
    console.error('Deploy FamilyMedVault with public/.well-known/… first.');
    process.exit(2);
  }

  const localPublic = readFileSync(PUBLIC_KEY_PATH, 'utf8');
  if (hosted.body.trim() !== localPublic.trim()) {
    console.warn('Warning: hosted public key differs from repo copy.');
  }

  const privatePem = loadPrivateKeyPem();
  if (!privatePem) {
    console.log(`
Missing private key. Generate per Tesla Fleet API Step 3:

  npm run tesla:keygen

Official openssl (same as developer.tesla.cn docs):
  openssl ecparam -name prime256v1 -genkey -noout -out secrets/tesla-command-private-key.pem
  openssl ec -in secrets/tesla-command-private-key.pem -pubout -out public/.well-known/appspecific/com.tesla.3p.public-key.pem

Then: git push → Vercel deploy → npm run tesla:register-partner
`);
    process.exit(3);
  }

  if (!keysMatch(privatePem, localPublic)) {
    console.error('Private key does NOT match deployed public key.');
    process.exit(4);
  }
  console.log('Private key matches public key ✓\n');

  console.log(`Deploy tesla-http-proxy (pick one):

  A) Docker on VPS:
     ./scripts/run-tesla-vehicle-command-proxy.sh --gen-tls-only
     docker compose -f docker-compose.tesla-cmd.yml up -d

  B) Fly.io:
     cd tesla-cmd-proxy && fly launch --no-deploy
     fly secrets set TESLA_HTTP_PROXY_KEY_FILE=/run/secrets/private-key.pem
     fly deploy

Then set on Vercel (Production):
  TESLA_VEHICLE_COMMAND_PROXY_URL=https://YOUR-PROXY-HOST:4443

Users pair virtual key after OAuth:
  https://www.tesla.cn/_ak/${PARTNER_DOMAIN}?vin=VIN
`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
