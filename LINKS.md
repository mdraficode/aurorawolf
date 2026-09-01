# Game links — CANONICAL (2026-08-26)

## ⭐ THE link (always latest, updates in ~1 min)
- **Play:** https://mdraficode.github.io/aurorawolf-v2/
- **Short alias:** https://spoo.me/playaurorawolf → same place
- **Repo:** https://github.com/mdraficode/aurorawolf-v2 (public)
- Updating: `bash publish.sh github "what changed"` → pushes index.html → Pages rebuilds (~1–2 min).
- Token: `~/.ghtoken` (classic PAT, scopes repo+workflow). Revocable at github.com/settings/tokens.

## 🧊 Frozen permanent snapshots (never change, never die)
- v1 (attack/prey-tiers/flight): https://web.archive.org/web/20260826124244id_/https://litter.catbox.moe/iz87i5.html
  - short: spoo.me/aurorawolf2 · aurora-wolf · aurorawolfgame · revontulet2
- Future freezes: `bash publish.sh archive [alias]`

## 🗑️ Dead ~Fri 2026-08-29 (do not share)
- spoo.me/aurorawolf, spoo.me/revontulet (litterbox 72h targets; cannot repoint)

## Verified 2026-08-27
- GitHub Pages URL serves full 885,607-byte game (commit 45f54e0); browser test (test/github.test.mjs): boots → play, attack button ✓, pelt chip ✓, 0 errors.
- spoo.me/playaurorawolf 302 → Pages ✓.


## 🧹 Workspace slimmed (2026-08-26) — GitHub is the archive
- FULL project on GitHub: https://github.com/mdraficode/aurorawolf-v2 — lean web toolchain: src/, vendor/, build.py, publish.sh, test/, shots/. Android APK + wrapper archived at git tag `archive/android-apk`.
- NOT on GitHub (kept locally, never commit): ~/.ghtoken (publishing), ~/.revontulet.keystore (APK signing, storepass/keypass/alias: revontulet)
- Restore android wrapper: `git checkout archive/android-apk -- android Revontulet-AuroraWolf.apk` + copy ~/.revontulet.keystore in (never committed).
- Workspace keeps only: src/, vendor/, build.py, publish.sh, index.html, test/, docs, package.json, ~/.ghtoken
