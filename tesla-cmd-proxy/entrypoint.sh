#!/bin/sh
set -eu

KEY_FILE="${TESLA_HTTP_PROXY_KEY_FILE:-/run/secrets/private-key.pem}"
TLS_CERT="${TESLA_HTTP_PROXY_TLS_CERT:-/run/tls/cert.pem}"
TLS_KEY="${TESLA_HTTP_PROXY_TLS_KEY:-/run/tls/key.pem}"
PORT="${TESLA_HTTP_PROXY_PORT:-4443}"

if [ ! -f "$KEY_FILE" ]; then
  echo "Missing private key: $KEY_FILE" >&2
  exit 1
fi

if [ ! -f "$TLS_CERT" ] || [ ! -f "$TLS_KEY" ]; then
  echo "Missing TLS cert/key in /run/tls — generate with scripts/run-tesla-vehicle-command-proxy.sh" >&2
  exit 1
fi

exec tesla-http-proxy \
  -tls-key "$TLS_KEY" \
  -cert "$TLS_CERT" \
  -key-file "$KEY_FILE" \
  -port "$PORT" \
  -verbose
