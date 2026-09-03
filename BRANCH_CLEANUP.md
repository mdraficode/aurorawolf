# Branch Cleanup — Single-Branch Repo (2026-09-03)

**Goal:** No branches in the repo, everything handled from `main`, nothing lost.

## What was done

1. **Audited all branches:**
   - `main` at `b39f5e6` — current live
   - `arena/01a063b8-aurorawolf` at `bcd7b9e` — MERGED PR #3 (v6.8 + consolidation), branch lingered
   - PR #1 `arena/01a061fd` — CLOSED, work cherry-picked into main (`d70296d` + `1fb4b97`)
   - PR #2 `arena/01a0630f` — MERGED as `f7347f6` (boss-kit)

2. **Archived without loss:**
   - Created `archive/branches/` with full logs, stats, and diffs for each branch
   - `pr1-m47-human-speedrun.diff` (1.4M) — human-speedrun fixes (B8/B9/B10 + combat grammar)
   - `pr2-boss-kit.diff` (1.5M) — boss-kit
   - `pr3-consolidation.diff` (12K) — training/ isolation + dead file removal
   - `README.md` explains restore procedure

3. **Deleted branches:**
   - `git push origin --delete arena/01a063b8-aurorawolf`
   - `git push origin --delete arena/01a06481-aurorawolf` (temporary, auto-deleted by auto-integrate)
   - Verified: `gh api repos/mdraficode/aurorawolf/branches` → only `main`

4. **Single-branch workflow:**
   - **Local (with PAT `~/.ghtoken`):** `bash tools/ship.sh "msg"` → builds + commits + `git push origin main` → Pages live in ~1 min
   - **Arena sandbox (no PAT):** same command → creates temporary `arena/<timestamp>-aurorawolf`, pushes, `auto-integrate.yml` gates (build reproducible + 5 suites), merges into main, deletes branch → net effect: repo stays `main` only
   - Direct push to `main` also works: Pages builds from `main` (see `LINKS.md`)

## Verification

```bash
git ls-remote origin | grep refs/heads/
# → only refs/heads/main

python3 build.py && git diff --exit-code index.html
# → build reproducible

bash tools/ship.sh "test single-branch"
# → pushes, auto-integrate merges, branch deleted, back to main only
```

## Files

- `tools/ship.sh` — the ONE command to ship (replaces `publish.sh github`)
- `.github/workflows/auto-integrate.yml` — gate for sandbox pushes, keeps repo single-branch
- `archive/branches/` — full history of removed branches (no loss)

