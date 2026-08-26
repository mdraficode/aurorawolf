#!/usr/bin/env bash
# Publish the game. Two modes:
#
#   bash publish.sh github "what changed"   → push to GitHub Pages (LIVE LINK UPDATES ~1 min)
#                                            https://mdraficode.github.io/aurorawolf/
#   bash publish.sh archive [alias]         → permanent archive.org snapshot + optional spoo.me alias
#
#
# NOTE (user preference): do NOT rebuild the Android APK on game updates
# unless explicitly asked — only update the live web link (github mode).
#
# GitHub mode needs ~/.ghtoken (classic PAT with repo,workflow scopes — stored, chmod 600).
set -euo pipefail
cd "$(dirname "$0")"
MODE="${1:-github}"

gh_publish() {
  GH=$(cat ~/.ghtoken 2>/dev/null) || { echo "ERROR: ~/.ghtoken missing"; exit 1; }
  REPO="mdraficode/aurorawolf"
  MSG="${2:-Game update $(date -u +%Y-%m-%d)}"
  echo "[1/3] building…"; python3 build.py
  SZ=$(stat -c%s index.html); echo "      index.html = $SZ bytes"
  echo "[2/3] pushing to github.com/$REPO …"
  SHA=$(curl -s -m 60 -H "Authorization: Bearer $GH" "https://api.github.com/repos/$REPO/contents/index.html" | python3 -c "import json,sys; print(json.load(sys.stdin).get('sha',''))")
  python3 -c "
import base64, json
b = open('index.html','rb').read()
d = {'message': '''$MSG''', 'content': base64.b64encode(b).decode()}
if '$SHA': d['sha'] = '$SHA'
print(json.dumps(d))" > /tmp/ghput.json
  curl -s -m 300 -X PUT -H "Authorization: Bearer $GH" -H "Accept: application/vnd.github+json" \
    "https://api.github.com/repos/$REPO/contents/index.html" -d @/tmp/ghput.json -o /tmp/ghup.json
  python3 -c "
import json; d=json.load(open('/tmp/ghup.json'))
c=d.get('content') or {}
if c.get('size'): print('      pushed commit', d.get('commit',{}).get('sha','')[:7], '| size', c['size'])
else: print('ERROR:', d.get('message')); raise SystemExit(1)"
  echo "[3/3] Pages is rebuilding — https://mdraficode.github.io/aurorawolf/ updates within ~1-2 min."
}

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
  github) gh_publish "$@" ;;
  archive) archive_publish "$@" ;;
  *) echo "usage: bash publish.sh github \"msg\"  |  bash publish.sh archive [alias]"; exit 1 ;;
esac
