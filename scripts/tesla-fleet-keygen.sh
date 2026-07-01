#!/usr/bin/env bash
# Tesla Fleet API — 第三步：生成公钥/私钥对
# @see https://developer.tesla.cn/docs/fleet-api (Step 3)
#
# 官方命令（secp256r1 / prime256v1）：
#   openssl ecparam -name prime256v1 -genkey -noout -out private-key.pem
#   openssl ec -in private-key.pem -pubout -out public-key.pem
#
# 公钥托管路径（随 FamilyMedVault 部署）：
#   https://www.familymedvault.com/.well-known/appspecific/com.tesla.3p.public-key.pem
#
# 私钥：仅 secrets/ 或 Vercel 环境变量，绝不提交 Git、绝不托管在域名上。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SECRETS_DIR="${TESLA_SECRETS_DIR:-$REPO_ROOT/secrets}"
PRIVATE_KEY="$SECRETS_DIR/tesla-command-private-key.pem"
PUBLIC_KEY="$REPO_ROOT/public/.well-known/appspecific/com.tesla.3p.public-key.pem"
FORCE="${1:-}"

mkdir -p "$SECRETS_DIR"

if [[ -f "$PRIVATE_KEY" && "$FORCE" != "--force" ]]; then
  echo "私钥已存在: $PRIVATE_KEY"
  echo "若要重新生成（会使旧虚拟钥匙失效），请: $0 --force"
  exit 0
fi

if [[ -f "$PRIVATE_KEY" && "$FORCE" == "--force" ]]; then
  echo "⚠️  重新生成密钥对 — 需重新部署公钥、重新 partner 注册、用户重新配对虚拟钥匙"
  rm -f "$PRIVATE_KEY"
fi

echo "1/2 生成 EC 私钥 (prime256v1) …"
openssl ecparam -name prime256v1 -genkey -noout -out "$PRIVATE_KEY"
chmod 600 "$PRIVATE_KEY"

echo "2/2 导出公钥 → public/.well-known/ …"
openssl ec -in "$PRIVATE_KEY" -pubout -out "$PUBLIC_KEY"

echo ""
echo "✓ 完成"
echo "  私钥: $PRIVATE_KEY  （保密，已 chmod 600）"
echo "  公钥: $PUBLIC_KEY  （随 git push + Vercel 部署后 Tesla 可访问）"
echo ""
echo "下一步:"
echo "  npm run tesla:onboard"
