# 🐺 REVONTULET — Aurora Wolf

A 3D open-world wolf simulator in a **single self-contained HTML file** (`index.html`, no internet needed — Three.js is embedded). Every world is procedurally generated from a seed: roam an infinite wilderness of biomes, hunt, gather, and watch the sky change.

## ▶ How to run
- Open `index.html` in any modern browser (double-click it), **or**
- Serve it: `python3 -m http.server 8000` → http://localhost:8000
- URL params: `?seed=12345` (specific world), `?quality=low` (no shadows, faster), `?autostart=1` (skip menu)
- **Android:** install `Revontulet-AuroraWolf.apk` (see below)

## 🤖 Android APK
`Revontulet-AuroraWolf.apk` — a signed (v1+v2+v3) WebView wrapper around the single-file game:
- Package `com.revontulet.wolf` · versionName 1.0 · minSdk 23 (Android 6.0+) · targetSdk 33
- Locked to **landscape**, immersive sticky fullscreen, keep-screen-on, no permissions
- Adaptive launcher icon (aurora wolf) in all densities + legacy square/round
- To install: copy to a phone, open it, allow "install unknown apps" when prompted

Rebuild from source after changing the game (`android/` holds the wrapper project):
```
# needs JDK 11+, build-tools r34 + platform-34 android.jar unpacked into /tmp/at/
bash android/build_apk.sh     # -> Revontulet-AuroraWolf.apk
```
`android/revontulet.keystore` (pass `revontulet`, alias `revontulet`) signs all builds — keep it to push updates that install over previous ones.

## 🎮 Controls
| Key | Action |
|---|---|
| **WASD / arrows** | Run |
| **Shift** | Sprint (uses stamina — you'll tire out) |
| **Space** | Jump |
| **F** | Attack — bite & claw to hunt nearby prey |
| **E** | Gather (berries, mushrooms, herbs, wood, stones) |
| **Q** | Wolf sense — reveal nearby resources & prey |
| **H** | Howl (scares every animal within earshot) |
| **Drag mouse / wheel** | Orbit + zoom camera · **C** snap behind wolf |
| **T** | Time ×8 (watch sunsets & auroras) |
| **M** | Open the big centered map (or click the minimap) — live terrain, landmarks, territories |
| **K / N** | Sound on/off · small minimap on/off |
| **M / P** | Mute / pause (+ stats, new world) |

**Touch devices** get an on-screen controller automatically: a left-side **virtual joystick** (partial deflection = slower, quieter stalking), right-side **ATTACK / JUMP / GATHER / SPRINT / HOWL / SENSE** buttons, plus a top-right **minimap** (E also drinks at water edges), drag anywhere to look, **pinch to zoom**, and a ⏸ pause button.

## 📁 Project structure
```
index.html              ← THE game (self-contained deliverable, built)
build.py                ← assembles index.html from src/ + vendor/
src/                    ← source: p1 math/terrain · p2 render/veg · p3 wolf+animals+predators · p4 world/HUD/input · shell.html · style.css
vendor/three.min.js     ← three.js r134 (inlined at build)
publish.sh              ← publish: `github "msg"` = live update (~1 min) · `archive [alias]` = permanent snapshot
android/                ← APK wrapper (manifest, MainActivity, icons, keystore, build_apk.sh)
Revontulet-AuroraWolf.apk ← signed Android build
test/                   ← suite: smoke, layout, landscape, wolf, pose, ui2, touch, features (attack/flight), enemies (predators), github/wayback (live links), analyze.py
shots/                  ← current-build screenshots (menu · world+minimap · landmarks · dense forest)
LINKS.md                ← all public links + tokens how-to
~/.ghtoken              ← GitHub access (keep! revocable at github.com/settings/tokens)
```
Build · test · publish: `npm run build` · `npm test` · `npm run publish`

> ⚠️ **Standing rule:** updates go to the live web link only. Rebuild the APK (`npm run apk`) **only when explicitly requested**.

## 🌍 What's in the world
- **Infinite procedural terrain** — simplex-noise continents, ridged mountains, lakes, rivers of hills; chunks stream in/out as you roam, so exploration never ends
- **🐻 Territorial predators** — brown bears (taiga/forest), tigers (grove/forest) and snow leopards (mountains/tundra) patrol rare home ranges. Step in and you get a 3-second red warning banner, a growl, and a **red arrow** pointing at the incoming threat — fight back (F) or sprint out; they give up at the edge of their range. Slain: bear 8 hits (6🥩 2🧥 3🦴), tiger 6 (5🥩 2🧥 2🦴), snow leopard 5 (4🥩 2🧥 2🦴). If they catch you, your wolf falls and wakes up far away with full health (bounty kept).
- **❤️ Wolf health** — red HP bar above stamina; predators bite hard, health slowly regenerates when out of trouble for 6 s
- **Bigger, easier-to-spot prey** — all animals ~40% larger and visible from farther away
- **Hunting with real combat** — prey fights back with speed: rabbits and hares are easy catches, foxes and goats need a chase, elk/deer/reindeer take several bites but drop the richest bounty (meat, pelts, bones)
- ✨ **Magic mushrooms** — rare glowing purple caps in deep woodland; eating one grants **10 seconds of flight** (hold jump to climb, look down to dive), then you're back on four paws
- **8 blending biomes** — incl. NEW **Murky Swamp** (mist, dead trees, rain bias) and **Enchanted Grove** (rare violet-tinted woodland, dense mist, glowing plants — THE place to find magic mushrooms). All biome tuning (weather bias, densities, fog, magic rates) is data-driven in `BIOME_CONFIG`
- **Rivers & lakes** — winding river channels carve through lowlands (contour-noise bands), ponds and lakes in basins. **Swimming 2.0**: stamina drains while swimming; hit zero and your health starts slipping; paddle toward a bank to clamber out; **E** at the water's edge to drink and restore stamina
- **🗺️ Landmarks** — rare procedural points of interest: Elder Tree, Stone Circle, Cave Mouth, Ruined Shrine, Fallen Log Bridge — each with its own model, biome affinity, and special resources nearby
- **Minimap & world map** — circular live minimap (top-right): terrain, vivid water, colored resource dots, dashed **predator territory rings**, gold **landmark markers + guidance chevron with distance**, hunting predators (red), and a heading arrow — all scrolling in real time. **M** (or click the minimap) opens a **centered big map** of ~900 m around you with landmark names, updating live as you move
- **6 blending biomes** — Snowy Taiga, Frozen Tundra, Boreal Forest, Autumn Grove, Flower Meadows, Frostpeak Mountains (+ shorelines), each with its own trees, plants, ground colors and **wildlife** (elk, reindeer, deer, rabbits, hares, foxes, arctic foxes, mountain goats)
- **Wildlife AI** — animals graze, wander and flee; walk slowly to stalk, sprint to run them down (they tire out); meat is yours
- **Resources** — lingonberries, mushrooms, herbs, sticks, stones; gathered spots regrow when you roam far and return
- **Day/night cycle** — moving sun & moon, dawn/dusk glows, stars, and **aurora borealis** on clear cold nights (this game is from Lapland, after all)
- **Dynamic weather** — clear / fair / overcast / rain / snow / thunderstorms with lightning, drifting clouds, wind, fog that breathes with the weather; cold biomes get snow instead of rain
- **Synthesized audio** — wind, rain, thunder, birdsong and your howl are generated live with WebAudio (no audio files)

## 🛠 Rebuilding from source
```
src/p1.js      math, seeded simplex noise, terrain & biome functions
src/p2.js      renderer, sky, precipitation, vegetation geometry library
src/p3.js      wolf character & animal AI
src/p4.js      chunk streaming, weather, day/night, audio, UI, main loop
src/style.css  HUD styling
src/shell.html page template
vendor/three.min.js  Three.js r134 (embedded at build time)
python3 build.py      → regenerates index.html
```
Headless render/smoke tests live in `test/` (Playwright): `node test/render.test.mjs`
