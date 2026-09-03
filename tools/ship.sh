#!/usr/bin/env bash
# ship.sh — ONE COMMAND to ship from main, no branches needed for the trainer
# Usage: bash tools/ship.sh "what changed"
# 
# What it does:
# 1. python3 build.py (bakes champion into index.html)
# 2. git add -A && git commit
# 3. Pushes to main:
#    - If ~/.ghtoken or GH_TOKEN exists and push to main succeeds → direct push (live in ~1 min via Pages)
#    - Else (Arena sandbox) → pushes to arena/<id> branch, auto-integrate.yml gates and merges into main, then deletes branch
#       → net effect: repo stays single-branch (main only)
#
# The repo is now single-branch by design. This script keeps it that way.

set -euo pipefail
cd "$(dirname "$0")/.."
MSG="${1:-Game update $(date -u +%Y-%m-%d)}"

echo "[1/3] building..."
python3 build.py
SZ=$(stat -c%s index.html)
echo "      index.html = $SZ bytes ($(numfmt --to=iec $SZ))"

echo "[2/3] committing..."
git add -A
if git diff --cached --quiet; then
  echo "      nothing to commit"
else
  git commit -m "$MSG

Co-authored-by: arena-agent <297053741+arena-agent@users.noreply.github.com>"
  echo "      committed $(git rev-parse --short HEAD)"
fi

echo "[3/3] shipping..."

# Try direct push to main first (works with PAT ~/.ghtoken or local git credential)
try_direct() {
  if [ -f ~/.ghtoken ]; then
    GH=$(cat ~/.ghtoken)
    echo "      trying direct push to main via PAT..."
    if git push "https://x-access-token:${GH}@github.com/mdraficode/aurorawolf.git" main:main 2>&1; then
      echo "      ✓ pushed directly to main — Pages will rebuild in ~1 min"
      echo "      https://mdraficode.github.io/aurorawolf/"
      return 0
    fi
  fi
  # Try plain git push (if credential helper or gh auth has push rights to main)
  echo "      trying plain git push origin main..."
  if git push origin main 2>&1; then
    echo "      ✓ pushed directly to main"
    return 0
  fi
  return 1
}

# Try arena branch push (Arena sandbox path)
try_arena() {
  BR="arena/$(date +%Y%m%d-%H%M%S)-$(head -c 4 /dev/urandom | od -An -tx1 | tr -d ' \n')-aurorawolf"
  # For arena sessions, use the session branch if already on one
  CUR=$(git rev-parse --abbrev-ref HEAD)
  if [[ "$CUR" == arena/* ]]; then
    BR="$CUR"
    echo "      already on $BR, pushing..."
  else
    echo "      creating $BR for auto-integrate..."
    git checkout -B "$BR"
  fi
  if git push origin "$BR" 2>&1; then
    echo "      ✓ pushed to $BR"
    echo "      auto-integrate.yml will gate (build reproducible + 5 suites) and merge into main, then delete branch"
    echo "      watch: gh run list --limit 3"
    echo "      after ~4 min, repo will be back to main only"
    return 0
  fi
  return 1
}

if try_direct; then
  exit 0
fi

echo "      direct push failed (expected in Arena sandbox), falling back to arena branch..."
if try_arena; then
  exit 0
fi

echo "ERROR: both direct and arena push failed"
exit 1
