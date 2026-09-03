#!/usr/bin/env bash
# Publish the game — main-only repo (2026-09-03+)
#
#   bash tools/ship.sh "what changed"     → canonical: build + push directly to main → Pages live ~1 min
#                                          https://mdraficode.github.io/aurorawolf/
#   bash publish.sh archive [alias]       → permanent archive.org snapshot + optional spoo.me alias
#
# GitHub mode in this file is DEPRECATED and now delegates to tools/ship.sh
# to avoid duplicate logic. Use ship.sh directly.
#
# NOTE (user preference): do NOT rebuild the Android APK on game updates
# unless explicitly asked — only update the live web link.
set -euo pipefail
cd "$(dirname "$0")"
MODE="${1:-github}"

archive_publish() {
  ALIAS="${2:-}"
  UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
  echo "[1/4] building…"; python3 build.py
  SZ=$(stat -c%s index.html)
  echo "[2/4] uploading live copy…"
  LIVE=$(curl -s -m 300 -F "reqtype=fileupload" -F "time=72h" -F "fileToUpload=@index.html;type=text/html" https://litterbox.catbox.moe/resources/internals/api.php)
  case "$LIVE" in https://litter.catbox.moe/*) echo "      live(72h): $LIVE" ;; *) echo "ERROR: upload failed: $LIVE"; exit 1 ;; esac
  echo "[3/4] archiving to web.archive.org (1-6 min)…"
  EFFECTIVE=$(curl -sL -m 900 -A "$UA" -o /dev/null -w "%{url_effective}" "https://web.archive.org/save/$LIVE")
  TS=$(echo "$EFFECTIVE" | sed -n 's#.*/web/\([0-9]\{14\}\).*#\1#p')
  [ -n "$TS" ] || { echo "ERROR: no timestamp in $EFFECTIVE"; exit 1; }
  PERM="https://web.archive.org/web/${TS}id_/$LIVE"
  for i in $(seq 1 30); do
    CODE=$(curl -s -o /tmp/pub_check.html -w "%{http_code}" -m 120 -A "$UA" "$PERM" || echo 000)
    GOT=$(stat -c%s /tmp/pub_check.html 2>/dev/null || echo 0)
    [ "$CODE" = "200" ] && [ "$GOT" = "$SZ" ] && break
    sleep 10
  done
  echo "      permanent: $PERM"
  if [ -n "$ALIAS" ]; then
    echo "[4/4] registering spoo.me/$ALIAS…"
    curl -s -m 60 -X POST "https://spoo.me/api/v1/shorten" -H "Accept: application/json" -H "Content-Type: application/json" \
      -d "{\"url\":\"$PERM\",\"alias\":\"$ALIAS\"}" | python3 -c "import json,sys; d=json.load(sys.stdin); print('      short:', d.get('short_url') or 'FAIL '+str(d.get('error')))"
  fi
}

case "$MODE" in
  github)
    echo "DEPRECATED: publish.sh github → delegates to tools/ship.sh (main-only, no branches)"
    echo "Use: bash tools/ship.sh \"${2:-Game update}\""
    exec bash tools/ship.sh "${2:-Game update $(date -u +%Y-%m-%d)}"
    ;;
  archive) archive_publish "$@" ;;
  *) echo "usage: bash tools/ship.sh \"msg\"  (live)  |  bash publish.sh archive [alias]  (permanent)"; exit 1 ;;
esac
