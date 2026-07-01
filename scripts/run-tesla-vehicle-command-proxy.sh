#!/usr/bin/env bash
# Run Tesla Vehicle Command HTTP proxy (TVCP signing) for TeLog.
#
# Option A — Docker (recommended, TeslaMate-style sidecar):
#   cp your-private-key.pem secrets/tesla-command-private-key.pem
#   mkdir -p secrets/tesla-cmd-tls && ./scripts/run-tesla-vehicle-command-proxy.sh --gen-tls-only
#   docker compose -f docker-compose.tesla-cmd.yml up -d
#
# Option B — bare metal (requires Go build of teslamotors/vehicle-command):
#   export TESLA_CMD_PRIVATE_KEY=/path/to/private-key.pem
#   ./scripts/run-tesla-vehicle-command-proxy.sh
#
# Then set Vercel: TESLA_VEHICLE_COMMAND_PROXY_URL=https://your-host:4443

set -euo pipefail

if [[ "${1:-}" == "--gen-tls-only" ]]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
  TLS_DIR="${TESLA_CMD_TLS_DIR:-$REPO_ROOT/secrets/tesla-cmd-tls}"
  mkdir -p "$TLS_DIR"
  openssl req -x509 -newkey rsa:2048 -keyout "$TLS_DIR/key.pem" -out "$TLS_DIR/cert.pem" \
    -days 825 -nodes -subj "/CN=localhost" 2>/dev/null
  echo "TLS cert written to $TLS_DIR"
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
KEY_FILE="${TESLA_CMD_PRIVATE_KEY:-$REPO_ROOT/secrets/tesla-command-private-key.pem}"
TLS_DIR="${TESLA_CMD_TLS_DIR:-$REPO_ROOT/secrets/tesla-cmd-tls}"
PORT="${TESLA_CMD_PROXY_PORT:-4443}"
PROXY_BIN="${TESLA_HTTP_PROXY_BIN:-tesla-http-proxy}"

if [[ ! -f "$KEY_FILE" ]]; then
  echo "Missing private key: $KEY_FILE"
  echo "Generate with: openssl ecparam -name prime256v1 -genkey -noout -out private-key.pem"
  exit 1
fi

mkdir -p "$TLS_DIR"
if [[ ! -f "$TLS_DIR/cert.pem" || ! -f "$TLS_DIR/key.pem" ]]; then
  echo "Generating self-signed TLS cert in $TLS_DIR ..."
  openssl req -x509 -newkey rsa:2048 -keyout "$TLS_DIR/key.pem" -out "$TLS_DIR/cert.pem" \
    -days 825 -nodes -subj "/CN=localhost" 2>/dev/null
fi

echo "Starting tesla-http-proxy on port $PORT ..."
exec "$PROXY_BIN" \
  -tls-key "$TLS_DIR/key.pem" \
  -cert "$TLS_DIR/cert.pem" \
  -key-file "$KEY_FILE" \
  -port "$PORT" \
  -verbose
