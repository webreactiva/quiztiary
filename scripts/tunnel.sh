#!/bin/sh
# Opens a Cloudflare quick tunnel to the app. Downloads cloudflared to .bin/ on first run.
set -e
BIN=.bin/cloudflared
PORT=${PORT:-4321}
METRICS=${TUNNEL_METRICS_PORT:-20241}

if [ ! -x "$BIN" ]; then
  case "$(uname -m)" in arm64|aarch64) ARCH=arm64 ;; *) ARCH=amd64 ;; esac
  BASE=https://github.com/cloudflare/cloudflared/releases/latest/download
  mkdir -p .bin
  echo "Downloading cloudflared ($(uname -s) $ARCH)…"
  if [ "$(uname -s)" = Darwin ]; then
    curl -fsSL "$BASE/cloudflared-darwin-$ARCH.tgz" | tar xz -C .bin
  else
    curl -fsSL -o "$BIN" "$BASE/cloudflared-linux-$ARCH"
  fi
  chmod +x "$BIN"
fi

# The panel reads the public URL for its QR from the metrics server (src/lib/public-url.ts).
# If the machine sleeps, Cloudflare drops the tunnel ("Tunnel not found"): reopen it.
exec "$BIN" tunnel --no-autoupdate --metrics "127.0.0.1:$METRICS" --url "http://localhost:$PORT"
