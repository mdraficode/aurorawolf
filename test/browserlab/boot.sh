#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# BROWSERLAB BOOT — give this sandbox a working headless Chromium + WebGL
# without touching the (blocked) playwright CDN or (blocked) apt.
#
# Why: this sandbox's egress allow-list is github.com / api.github.com /
# registry.npmjs.org only. `npx playwright install chromium` (cdn.playwright.dev)
# and `apt-get` (deb.debian.org) both fail, and the base image ships no browser
# and none of Chromium's NSS libs. The npm registry *is* reachable, and
# @sparticuz/chromium ships a full headless Chromium **plus** the AL2023
# NSS/NSPR shared objects and SwiftShader inside the tarball — everything we
# need, straight from npm.
#
# What it does (idempotent, ~4 s warm / ~25 s cold):
#   1. npm-installs @sparticuz/chromium into /tmp/browserlab
#   2. brotli-inflates chromium + NSS libs + SwiftShader into /tmp/browserlab
#   3. writes /tmp/chrome-lab.sh (LD_LIBRARY_PATH wrapper)
#   4. registers the wrapper as playwright's chromium AND chromium_headless_shell
#      in ~/.cache/ms-playwright so every existing test suite in this repo runs
#      unmodified (`node test/x.test.mjs`, `npm test`, rafzzer_gens.mjs …)
#
# Usage:  bash test/browserlab/boot.sh
# Then:   node test/browserlab/probe.mjs      # WebGL + game-boot sanity
# ---------------------------------------------------------------------------
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
LAB=/tmp/browserlab
BIN=$LAB/bin
NSSLIB=$LAB/nss
WRAP=/tmp/chrome-lab.sh
PKG_VER="${CHROMIUM_PKG_VER:-149.0.0}"

mkdir -p "$BIN" "$NSSLIB"

if [ ! -x "$BIN/chromium" ]; then
  echo "boot: installing @sparticuz/chromium@$PKG_VER from npm…" >&2
  cd "$LAB" 2>/dev/null || { mkdir -p "$LAB"; cd "$LAB"; }
  [ -f package.json ] || npm init -y >/dev/null 2>&1
  npm i "@sparticuz/chromium@$PKG_VER" --no-audit --no-fund --silent >&2
  node --input-type=module -e "
    import zlib from 'node:zlib';
    import fs from 'node:fs';
    const src = '$LAB/node_modules/@sparticuz/chromium/bin';
    const out = [['chromium.br','$BIN/chromium'],['al2023.tar.br','$LAB/nss.tar'],['swiftshader.tar.br','$LAB/swiftshader.tar']];
    for (const [f, o] of out) fs.writeFileSync(o, zlib.brotliDecompressSync(fs.readFileSync(src + '/' + f)));
  " >&2
  chmod +x "$BIN/chromium"
  # nss.tar (AL2023 build) holds lib/*.so — flatten into $NSSLIB
  tar -xf "$LAB/nss.tar" -C "$NSSLIB" --strip-components=1
  # SwiftShader must sit NEXT TO the chromium binary (module dir, not ld path)
  tar -xf "$LAB/swiftshader.tar" -C "$BIN"
  tar -xf "$LAB/swiftshader.tar" -C /tmp || true
fi

cat > "$WRAP" <<EOF
#!/bin/sh
# browserlab chromium wrapper — injects the NSS/NSPR library path
export LD_LIBRARY_PATH="$NSSLIB:/tmp:\${LD_LIBRARY_PATH:-}"
exec "$BIN/chromium" "\$@"
EOF
chmod +x "$WRAP"

# --- register with playwright so the repo's existing suites run unmodified ---
PW="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"
REV_DIRS="$(cd "$REPO" && npx --no-install playwright install chromium --dry-run 2>/dev/null | awk '/Install location:/{print $3}')"
CHROMIUM_REV="${PLAYWRIGHT_CHROMIUM_REV:-$(echo "$REV_DIRS" | grep '/chromium-[0-9]*$' | head -1)}"
SHELL_REV="$(echo "$REV_DIRS" | grep '/chromium_headless_shell-[0-9]*$' | head -1)"
[ -n "$CHROMIUM_REV" ] || CHROMIUM_REV="$PW/chromium-1234"
[ -n "$SHELL_REV" ] || SHELL_REV="$PW/chromium_headless_shell-1234"
mkdir -p "$CHROMIUM_REV/chrome-linux64" "$SHELL_REV/chrome-headless-shell-linux64"
ln -sf "$WRAP" "$CHROMIUM_REV/chrome-linux64/chrome"
ln -sf "$WRAP" "$SHELL_REV/chrome-headless-shell-linux64/chrome-headless-shell"
touch "$CHROMIUM_REV/INSTALLATION_COMPLETE" "$CHROMIUM_REV/DEPENDENCIES_VALIDATED"
touch "$SHELL_REV/INSTALLATION_COMPLETE" "$SHELL_REV/DEPENDENCIES_VALIDATED"

ver=$("$WRAP" --version 2>/dev/null || echo FAILED)
echo "boot: $ver · wrapper $WRAP" >&2
echo "boot: playwright chromium → $CHROMIUM_REV/chrome-linux64/chrome" >&2
echo "$WRAP"
