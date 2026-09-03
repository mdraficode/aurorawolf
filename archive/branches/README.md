# Archived Branches — preserved without loss

This folder contains the full history of all branches that were removed to keep the repo single-branch (main only).

Each branch is saved as:
- `.log` — commit history
- `.stat` — file change summary vs main
- `.diff` / `.patch` — full diff (can be re-applied with `git apply`)

## Branches archived

| Branch | PR | State | Purpose |
|---|---|---|---|
| `arena/01a061fd-aurorawolf` | PR #1 | CLOSED (superseded) | M47 human-speedrun session: B8/B9/B10 + Legend combat grammar, speedrun rig, TRAINING_MANUAL. **Work was cherry-picked into main** via `d70296d` + `1fb4b97` (zero-conflict, only src/p4.js touched by both sides). PR closed, not merged. |
| `arena/01a0630f-aurorawolf` | PR #2 | MERGED | M46 v6.7 BOSS-KIT: Deep Bite & Wild-Hardened via mystic events + full boss-hit pack intercept. Merged as `f7347f6`, now in main. |
| `arena/01a063b8-aurorawolf` | PR #3 | MERGED | v6.8 + repository consolidation: M47 speedrun fixes merged onto boss-kit, training/ isolated, dead probe files removed (71 files). Merged as `73af950`, content re-created as `da59d3e Create ship.sh` (same tree, different parent). Now in main. |

## Why branches existed

- Arena sandbox can only push to `arena/**` branches (token restriction). The `auto-integrate.yml` workflow gates those pushes (build reproducible + key suites) and merges into main, then deletes the branch.
- Direct pushes to `main` from a local machine with PAT (`~/.ghtoken`) go live immediately via GitHub Pages — no branch needed.

## After cleanup

- `git branch -r` shows only `origin/main`
- `main` contains all work from all branches (verified by diff)
- This folder preserves the original branch diffs for audit / restore if ever needed

To restore a branch:
```bash
git checkout main
git checkout -b <name> main
git apply archive/branches/<name>.diff
```

