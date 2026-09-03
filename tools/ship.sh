#!/usr/bin/env bash
# ship.sh — SINGLE-BRANCH ONLY: all updates go directly to main, no branches ever
# Usage: bash tools/ship.sh "what changed"
#
# Repo has only main branch. This script:
# 1. python3 build.py (bakes champion GEN 50 into index.html)
# 2. git add -A && git commit
# 3. git push origin main → Pages live in ~1 min
# No arena/**, no PRs, no temporary branches. Just main.

set -euo pipefail
cd "$(dirname "$0")/.."

CUR=$(git rev-parse --abbrev-ref HEAD)
if [ "$CUR" != "main" ]; then
  echo "Switching to main (was $CUR)..."
  git checkout main
fi

MSG="${1:-Game update $(date -u +%Y-%m-%d)}"

echo "[1/3] building..."
python3 build.py
SZ=$(stat -c%s index.html)
echo "      index.html = $SZ bytes"

echo "[2/3] committing..."
git add -A
if git diff --cached --quiet; then
  echo "      nothing to commit"
else
  git commit -m "$MSG

Co-authored-by: arena-agent <297053741+arena-agent@users.noreply.github.com>"
  echo "      committed $(git rev-parse --short HEAD)"
fi

echo "[3/3] pushing directly to main (no branches)..."
if [ -f ~/.ghtoken ]; then
  GH=$(cat ~/.ghtoken)
  echo "      using ~/.ghtoken PAT..."
  git push "https://x-access-token:${GH}@github.com/mdraficode/aurorawolf.git" main:main
else
  git push origin main
fi

echo "      ✓ pushed to main"
echo "      Live: https://mdraficode.github.io/aurorawolf/ (~1 min)"
echo "      Verify: gh api repos/mdraficode/aurorawolf/branches --jq '.[].name' → only main"
