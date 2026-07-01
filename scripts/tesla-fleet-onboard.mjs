#!/usr/bin/env node
/**
 * Tesla CN Fleet API — 一键引导（对齐官方文档 Step 3 → 6）
 *
 * Step 3  生成/校验 公钥私钥对 + 公钥托管路径
 * Step 4  partner_accounts 注册
 * Step 5  配置 TVCP 签名代理 + Vercel 环境变量说明
 * Step 6  App 虚拟钥匙配对 deep link
 *
 * Usage:
 *   npm run tesla:onboard              # 检查现状 + 打印待办
 *   npm run tesla:onboard -- --keygen  # 按官方 openssl 生成新密钥对
 *   npm run tesla:onboard -- --register # 执行 partner 注册
 */
import { createPublicKey, createPrivateKey } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, '..');
const PRIVATE_KEY = join(REPO, 'secrets/tesla-command-private-key.pem');
const PUBLIC_KEY = join(
  REPO,
  'public/.well-known/appspecific/com.tesla.3p.public-key.pem',
);
const PARTNER_DOMAIN = process.env.TESLA_CN_PARTNER_DOMAIN ?? 'www.familymedvault.com';
const PUBLIC_URL = `https://${PARTNER_DOMAIN}/.well-known/appspecific/com.tesla.3p.public-key.pem`;

const args = new Set(process.argv.slice(2));

function loadPem(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

function keysMatch(privatePem, publicPem) {
  try {
    const priv = createPrivateKey(privatePem);
    const pub = createPublicKey(publicPem);
    const derived = createPublicKey(priv);
    return (
      derived.export({ type: 'spki', format: 'pem' }) ===
      pub.export({ type: 'spki', format: 'pem' })
    );
  } catch {
    return false;
  }
}

async function checkHostedPublicKey() {
  const res = await fetch(PUBLIC_URL);
  const body = res.ok ? await res.text() : '';
  return { ok: res.ok, status: res.status, body };
}

async function checkCommandProxy() {
  const proxyKey = process.env.TESLA_CN_AUTH_PROXY_KEY;
  if (!proxyKey) return { checked: false, reason: 'no_local_proxy_key' };
  const res = await fetch(`${process.env.TESLA_CMD_API_URL ?? 'https://www.familymedvault.com/api/telog/vehicle-command'}`, {
    headers: { Authorization: `Bearer ${proxyKey}` },
  });
  if (res.status === 401) return { checked: true, configured: false, status: 'unauthorized' };
  if (!res.ok) return { checked: true, configured: false, status: 'unreachable' };
  const json = await res.json();
  return { checked: true, configured: Boolean(json.configured), status: json.configured ? 'ok' : 'not_configured' };
}

function runKeygen(force = false) {
  const script = join(__dirname, 'tesla-fleet-keygen.sh');
  const r = spawnSync('bash', [script, ...(force ? ['--force'] : [])], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function runPartnerRegister() {
  const script = join(__dirname, 'register-tesla-cn-partner.mjs');
  const r = spawnSync('node', [script], { stdio: 'inherit', env: process.env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function printVercelEnv(privatePem) {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Vercel → Settings → Environment Variables（Production）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1) TESLA_CMD_PRIVATE_KEY
   值 = 下面私钥全文（单行或多行 PEM 均可）
   ⚠️  仅 Vercel，不要进 Git

2) TESLA_VEHICLE_COMMAND_PROXY_URL
   签名代理公网地址，例如:
   https://你的服务器IP:4443
   或 Fly.io: https://telog-tesla-cmd.fly.dev

3) 已有变量保持不变:
   TESLA_CN_CLIENT_ID / TESLA_CN_CLIENT_SECRET / TESLA_CN_AUTH_PROXY_KEY

部署 FamilyMedVault 后执行 partner 注册（若公钥有更新）:
  npm run tesla:register-partner

App 虚拟钥匙配对（授权后一次性）:
  https://www.tesla.cn/_ak/${PARTNER_DOMAIN}?vin=你的VIN
`);
  if (privatePem) {
    console.log('--- 私钥 PEM（复制到 Vercel TESLA_CMD_PRIVATE_KEY）---');
    console.log(privatePem.trim());
    console.log('--- end ---\n');
  }
}

function printProxyDeploy() {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Step 5 — 启动 tesla-http-proxy（TVCP 签名）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Mac 需先安装 Docker Desktop: https://www.docker.com/products/docker-desktop/

  cd "${REPO}"
  chmod +x scripts/run-tesla-vehicle-command-proxy.sh scripts/tesla-fleet-keygen.sh
  ./scripts/run-tesla-vehicle-command-proxy.sh --gen-tls-only
  docker compose -f docker-compose.tesla-cmd.yml up -d --build

生产环境请部署到有公网 IP 的云服务器（Vercel 无法访问本机 localhost）。

无 Docker 时可用 Fly.io（云端构建，无需本机 Docker）:
  cd tesla-cmd-proxy && fly launch && fly deploy
`);
}

async function main() {
  console.log('TeLog · Tesla Fleet API 引导\n');

  if (args.has('--keygen')) {
    runKeygen(args.has('--force'));
  }

  const privatePem = loadPem(PRIVATE_KEY);
  const publicPem = loadPem(PUBLIC_KEY);

  console.log('【Step 3】公钥/私钥');
  if (!privatePem) {
    console.log('  ✗ 私钥缺失 → 运行: npm run tesla:onboard -- --keygen');
  } else {
    console.log(`  ✓ 私钥: secrets/tesla-command-private-key.pem`);
  }
  if (!publicPem) {
    console.log('  ✗ 公钥文件缺失');
  } else {
    console.log(`  ✓ 公钥: public/.well-known/appspecific/com.tesla.3p.public-key.pem`);
  }
  if (privatePem && publicPem) {
    console.log(keysMatch(privatePem, publicPem) ? '  ✓ 公私钥配对正确' : '  ✗ 公私钥不匹配');
  }

  const hosted = await checkHostedPublicKey();
  console.log(`\n【Step 3b】线上公钥 ${PUBLIC_URL}`);
  console.log(`  HTTP ${hosted.status}`);
  if (hosted.ok && publicPem && hosted.body.trim() !== publicPem.trim()) {
    console.log('  ⚠️  线上公钥与本地文件不一致 → 需要 git push + Vercel 重新部署');
  } else if (hosted.ok) {
    console.log('  ✓ 线上公钥可访问');
  }

  const cmd = await checkCommandProxy();
  console.log('\n【Step 5】远程指令代理');
  if (!cmd.checked) {
    console.log('  ? 未检测到 TESLA_CN_AUTH_PROXY_KEY（本地）');
  } else {
    console.log(
      cmd.configured
        ? '  ✓ Vercel 已配置 TESLA_VEHICLE_COMMAND_PROXY_URL'
        : '  ✗ Vercel 未配置 TESLA_VEHICLE_COMMAND_PROXY_URL（预空调会 503）',
    );
  }

  if (args.has('--register')) {
    console.log('\n【Step 4】Partner 注册…');
    runPartnerRegister();
  }

  if (args.has('--show-key') && privatePem) {
    printVercelEnv(privatePem);
  } else if (privatePem) {
    console.log('\n复制私钥到 Vercel: npm run tesla:onboard -- --show-key\n');
  } else {
    printVercelEnv(undefined);
  }
  printProxyDeploy();

  console.log('【Step 6】TeLog App');
  console.log('  1. 部署公钥 + 配置 Vercel + 启动 proxy');
  console.log('  2. TeLog 断开 → 重新特斯拉授权');
  console.log('  3. 点「打开特斯拉 App 完成配对」');
  console.log('  4. 试预空调 / 闪灯\n');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
