#!/usr/bin/env node
/**
 * Tesla CN Fleet API — Step 4: partner account registration (one-time).
 *
 * Prerequisites (Step 3):
 * - public-key.pem hosted at
 *   https://www.familymedvault.com/.well-known/appspecific/com.tesla.3p.public-key.pem
 * - private-key.pem kept secret (Vercel env only, never in git)
 *
 * Usage:
 *   TESLA_CN_CLIENT_ID=... TESLA_CN_CLIENT_SECRET=... node scripts/register-tesla-cn-partner.mjs
 *   TESLA_CN_PARTNER_DOMAIN=www.familymedvault.com   # optional
 */

const TESLA_CN_TOKEN_URL = 'https://auth.tesla.cn/oauth2/v3/token';
const TESLA_CN_FLEET_API = 'https://fleet-api.prd.cn.vn.cloud.tesla.cn';

const clientId = process.env.TESLA_CN_CLIENT_ID;
const clientSecret = process.env.TESLA_CN_CLIENT_SECRET;
const domain = process.env.TESLA_CN_PARTNER_DOMAIN ?? 'www.familymedvault.com';

if (!clientId || !clientSecret) {
  console.error('Missing TESLA_CN_CLIENT_ID or TESLA_CN_CLIENT_SECRET');
  process.exit(1);
}

async function partnerToken() {
  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: clientId,
    client_secret: clientSecret,
    audience: TESLA_CN_FLEET_API,
    scope:
      'openid offline_access user_data vehicle_device_data vehicle_location vehicle_cmds vehicle_charging_cmds',
  });
  const res = await fetch(TESLA_CN_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) {
    throw new Error(
      `partner_token_failed ${res.status}: ${json.error_description ?? json.error ?? res.statusText}`,
    );
  }
  return json.access_token;
}

async function registerDomain(token, d) {
  const res = await fetch(`${TESLA_CN_FLEET_API}/api/1/partner_accounts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ domain: d }),
  });
  const text = await res.text();
  let body = text;
  try {
    body = JSON.parse(text);
  } catch {
    // keep text
  }
  return { status: res.status, ok: res.ok, body };
}

async function verifyPublicKey(d) {
  const url = `https://${d}/.well-known/appspecific/com.tesla.3p.public-key.pem`;
  const res = await fetch(url, { method: 'GET' });
  return { url, status: res.status, ok: res.ok };
}

async function main() {
  console.log('Checking public key…');
  const pk = await verifyPublicKey(domain);
  console.log(`  ${pk.url} → HTTP ${pk.status}`);
  if (!pk.ok) {
    console.error('Public key not reachable. Deploy public/.well-known/… first.');
    process.exit(2);
  }

  console.log('Requesting partner token…');
  const token = await partnerToken();
  console.log('Registering partner domain…', domain);
  const result = await registerDomain(token, domain);
  console.log(JSON.stringify(result, null, 2));

  if (!result.ok && result.status !== 409) {
    const alt = domain.startsWith('www.')
      ? domain.replace(/^www\./, '')
      : `www.${domain}`;
    console.log(`Retrying with alternate domain: ${alt}`);
    const retry = await registerDomain(token, alt);
    console.log(JSON.stringify(retry, null, 2));
    if (!retry.ok && retry.status !== 409) process.exit(3);
  }

  console.log('\nDone. Re-run TeLog OAuth → 连接车辆.');
}

main().catch(e => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(4);
});
