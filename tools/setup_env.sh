#!/usr/bin/env bash
# ============================================================================
# Aurora Wolf / REVONTULET — Arena sandbox environment setup (idempotent, ~2 min)
#
#   bash tools/setup_env.sh
#
# KEEP THIS FILE IN THE REPO. Everything outside /home/user/aurorawolf is wiped at
# turn boundaries (verified 2026-09-02: /home/user/setup_env.sh, /home/user/env_libs,
# ~/.revontulet.keystore, /tmp/chromium and /usr/local/lib all vanished between turns).
#
# WHY IT EXISTS — the sandbox egress is an ALLOWLIST (measured, see ENVIRONMENT.md):
#   reachable : github.com · api.github.com · codeload.github.com ·
#               registry.npmjs.org · pypi.org · files.pythonhosted.org
#   BLOCKED   : drive.google.com · *.googleapis.com · deb.debian.org ·
#               cdn.playwright.dev · playwright.azureedge.net ·
#               raw.githubusercontent.com · objects.githubusercontent.com ·
#               mdraficode.github.io · archive.ubuntu.com
# So `npx playwright install chromium` (Microsoft CDN) and `playwright install-deps`
# (apt mirrors) can NEVER work here.
#
# THE WORKAROUND
#   1. Chromium comes from npm's @sparticuz/chromium (149.0.7827.0) -> /tmp/chromium.
#   2. Its nspr/nss shared libs come from env_libs/ (Debian bookworm .deb extracts,
#      fetched once by the env-relay workflow and kept in git) -> /usr/local/lib.
#   3. Symlink /tmp/chromium into the four paths Playwright probes.
# ============================================================================
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LIBSRC="$REPO/tools/chromium-libs"
REG="$HOME/.cache/ms-playwright"
CHROME=/tmp/chromium

cd "$REPO"

echo "[1/6] npm install (skipping the blocked Playwright browser CDN)"
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
npm install --no-audit --no-fund >/dev/null
npm install --no-save --no-audit --no-fund @sparticuz/chromium >/dev/null
echo "      playwright $(node -e "console.log(require('playwright/package.json').version)")"

echo "[2/6] chromium binary"
if [ -x "$CHROME" ] && "$CHROME" --version >/dev/null 2>&1; then
  echo "      already present: $("$CHROME" --version)"
else
  node --input-type=module -e "
    import chromium from '@sparticuz/chromium';
    console.log('      decompressed -> ' + await chromium.executablePath());"
fi

echo "[3/6] shared libs (nspr/nss)"
if [ -d "$LIBSRC" ]; then
  # /usr/local/lib alone is NOT enough: glibc's fallback dirs are /lib and /usr/lib, and
  # ldconfig lives at /sbin/ldconfig (not on PATH in this image). Install to the default
  # multiarch dir and rebuild the cache, else ldd still reports the three as missing.
  sudo -n cp -u "$LIBSRC"/*.so /usr/local/lib/
  sudo -n cp -u "$LIBSRC"/*.so /usr/lib/x86_64-linux-gnu/
  sudo -n chmod 644 /usr/local/lib/*.so /usr/lib/x86_64-linux-gnu/lib{n,pl,sm,ss,fr}*.so 2>/dev/null || true
  [ -x /sbin/ldconfig ] && sudo -n /sbin/ldconfig || true
  echo "      $(ls "$LIBSRC"/*.so | wc -l) libs installed"
  ldd "$CHROME" 2>/dev/null | grep -q "not found" && { echo "      ERROR: unresolved libs remain"; ldd "$CHROME" | grep "not found"; exit 1; }
else
  echo "      ERROR: $LIBSRC missing — run the env-relay workflow to refetch them"
  exit 1
fi

echo "[4/6] playwright registry symlinks"
mkdir -p "$REG/chromium-1234/chrome-linux" "$REG/chromium-1234/chrome-linux64" \
         "$REG/chromium_headless_shell-1234/chrome-linux" \
         "$REG/chromium_headless_shell-1234/chrome-headless-shell-linux64"
ln -sf "$CHROME" "$REG/chromium-1234/chrome-linux/chrome"
ln -sf "$CHROME" "$REG/chromium-1234/chrome-linux64/chrome"
ln -sf "$CHROME" "$REG/chromium_headless_shell-1234/chrome-linux/headless_shell"
ln -sf "$CHROME" "$REG/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell"
echo "      4 symlinks -> $CHROME"

echo "[5/6] local-only secrets (never committed)"
if [ ! -f "$HOME/.revontulet.keystore" ]; then
  echo "      ~/.revontulet.keystore: MISSING (it rides in the Drive zip; relay it if an APK is needed)"
else
  echo "      ~/.revontulet.keystore: present"
fi

echo "[6/6] verify: real browser launch"
node --input-type=module -e "
  import { chromium } from 'playwright';
  const b = await chromium.launch({ args: ['--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--no-sandbox'] });
  const p = await b.newPage(); await p.setContent('<h1 id=x>ok</h1>');
  console.log('      LAUNCH OK (' + await p.textContent('#x') + ', chromium ' + b.version() + ')');
  await b.close();"

echo "READY — npm test / node training/rafzzer_gens.mjs status"
