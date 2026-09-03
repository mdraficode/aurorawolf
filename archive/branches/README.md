# Archived Branches — preserved without loss (main-only repo)

This folder contains the full history of all branches that were removed to keep the repo single-branch (main only).

Each branch is saved as:
- `.log` — commit history
- `.stat` — file change summary vs main
- `.diff.gz` — full diff compressed (gunzip then `git apply`)

## Branches archived

| Branch | PR | State | Purpose |
|---|---|---|---|
| `arena/01a061fd-aurorawolf` | PR #1 | CLOSED (superseded) | M47 human-speedrun: B8/B9/B10 + Legend combat grammar, speedrun rig, TRAINING_MANUAL. Cherry-picked into main via `d70296d` + `1fb4b97`. |
| `arena/01a0630f-aurorawolf` | PR #2 | MERGED | M46 v6.7 BOSS-KIT: Deep Bite & Wild-Hardened via mystic events + boss-hit pack intercept. Merged as `f7347f6`, now in main. |
| `arena/01a063b8-aurorawolf` | PR #3 | MERGED | v6.8 + consolidation: M47 speedrun fixes + boss-kit, training/ isolated, dead probe files removed (71 files). Merged as `73af950`, re-created as `da59d3e`. Now in main. |

## Why branches existed (historical)

- Arena sandbox previously could only push to `arena/**` branches. An `auto-integrate.yml` workflow gated those pushes and merged into main.
- **2026-09-03 enforcement `adb113b`**: repo is now strictly main-only. `auto-integrate.yml` deleted, `tools/ship.sh` pushes directly to `main`. No branches will ever be created. `gh api branches` → `[main]` only.

## After cleanup

- `git ls-remote origin | grep refs/heads/` → only `refs/heads/main`
- `main` contains all work from all branches
- This folder preserves original diffs (compressed to .gz to avoid sandbox bloat) for audit / restore

To restore a branch:
```bash
git checkout main
git checkout -b <name> main
gunzip -c archive/branches/<name>.diff.gz | git apply
```

To view diff stats without applying:
```bash
gunzip -c archive/branches/pr1-m47-human-speedrun.diff.gz | git apply --stat
```
