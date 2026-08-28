# 🐺 REVONTULET — Aurora Wolf

A 3D open-world wolf simulator in a **single self-contained HTML file** (`index.html`, no internet needed — Three.js is embedded). Every world is procedurally generated from a seed: roam an infinite wilderness of biomes, hunt, gather, and watch the sky change.

## ▶ How to run
- Open `index.html` in any modern browser (double-click it), **or**
- Play online: **https://mdraficode.github.io/aurorawolf/**
- URL params: `?seed=12345` (specific world), `?quality=low` (no shadows, faster), `?autostart=1` (skip menu)

## 🤖 Android APK (archived)
The signed APK and its WebView wrapper project are preserved in git history at tag **`archive/android-apk`** (nothing is lost). To resurrect for a requested APK build:

```
git fetch --tags
git checkout archive/android-apk -- android Revontulet-AuroraWolf.apk
cp ~/.revontulet.keystore android/revontulet.keystore   # never committed
# then build with android/build_apk.sh (JDK 11+, build-tools r34, platform-34)
```

## 🎮 Controls
| Key | Action |
|---|---|
| **WASD / arrows** | Run |
| **Shift** | Sprint (uses stamina — you'll tire out) |
| **Space** | Jump |
| **F** | Attack — bite & claw. **Behind ×3 · flank ×2 · face ×1; an unaware strike from the blind side = AMBUSH crit** |
| **X** | Prowl (crouch) — half speed, detection halved, bites from behind hit harder. Touch: 🐾 PROWL |
| **E** | Gather (berries, mushrooms, herbs, wood, stones) & drink at water |
| **Q** | Wolf sense — the ground lights up: 🐾 tracks, scent clouds (green prey · red predators · violet rivals), blood trails, resources |
| **H** | Howl (scares every animal within earshot) |
| **Drag mouse / wheel** | Orbit + zoom camera, **free through the full 90° — drag up (or park the drag at the top edge) and the view points straight at the zenith, frame full of sky, wolf out of sight: auroras, stars and moon, nothing in the way** · **C** snap behind wolf |
| **T** | Time ×8 (watch sunsets, seasons & auroras) |
| **M** | Big centered map — live terrain, landmarks, territories |
| **K / N / P** | Sound · minimap · pause (+ stats, new world) |

**Touch devices** get an on-screen controller: left **virtual joystick** (partial deflection = quieter stalking), right-side **ATTACK / JUMP / GATHER / SPRINT / HOWL / SENSE / PROWL** buttons, top-right **minimap**, drag to look, pinch to zoom, ⏸ pause. The controls stay out of your way: the joystick is invisible until your thumb lands on it (it shows once when play begins, then fades) — it rests a thumb-width right of the corner, away from the HUD column, and its invisible catch field is nearly twice the ring, so a near-miss touch still grabs the stick, and the action buttons rest faint — touching any of them wakes the whole cluster for a moment. The **HP/stamina bars sit in the upper-left corner** (stacked under the quest book, above the inventory), leaving the whole lower-left free for the stick.

## 📁 Project structure
```
index.html              ← THE game (self-contained deliverable, built)
build.py                ← assembles index.html from src/ + vendor/
src/                    ← source: p1 math/terrain · p2 render/veg · p3 wolf+animals+predators · p4 world/HUD/input · shell.html · style.css
vendor/three.min.js     ← three.js r134 (inlined at build)
publish.sh              ← publish: `github "msg"` = live update (~1 min) · `archive [alias]` = permanent snapshot
test/                   ← 22-suite gate incl. quest.test.mjs (quests · spirit · bosses · XP · fast travel), cam.test.mjs (free-look camera) and freeze.test.mjs (crash-proof loop) + on-demand: github (live), snapshots.mjs + analyze.py (regenerate shots)
shots/                  ← current-build screenshots (cave crystals · night aurora · waterfall · forest)
LINKS.md                ← all public links + tokens how-to
~/.ghtoken              ← GitHub access (keep! revocable at github.com/settings/tokens)
```
Build · test · publish: `npm run build` · `npm test` · `npm run publish`

> ⚠️ **Standing rule:** updates go to the live web link only. APK rebuilds **only when explicitly requested** (restore `android/` from tag `archive/android-apk` first).

## 🌍 What's in the world
- **📜 Quests, deeds & titles** — the wild keeps a ledger. Open it with **J** or the 📜 book button: *Active / Available / Completed* tabs with reward previews and progress bars, two deeds at most at a time, the tracker under your level card always watching. Six kinds: **HUNT** (a named quarry), **EXPLORATION** (seek a landmark — a gold pulsing waypoint marks it on minimap & big map; rewards **map reveal** and **fast travel**), **COLLECTION** (golden shimmer on the goods), **PACK** (drive a rival pack off or best rival wolves), **SURVIVAL** (days under the open sky — denning in a cave resets it — or kills in foul weather). Quests come from the lands you walk, the log refills as you finish them
- **⭐ XP & titles** — everything pays: prey 6, predators 20, rivals 35, gatherings 3, discoveries 10–60, legends 400. Level up (220 + 90·lvl XP) for **+8 max HP** each time and earn titles: Young Pup → Wanderer → Hunter → Stalker → Storm-Wolf → **Legend of the Aurora**
- **💀 Legendary bosses** — one legend per biome, and it only wakes after **3 quests done in that land** *and* you've met the Spirit Wolf. The **Ancient Stag** (forest, summons deer, fast), the **Frost Bear** (snow, ice patches, blizzards), the **Hydra Croc** (swamp, submerges and resurfaces, poison), the **Thunder Bison** (dry lands, telegraphed charge and dust), the **Shadow Wolf** (grove, teleports, breeds shadow clones), the **Sand Wyrm** (volcanic, burrows and erupts). Top-screen HP bar, phases at 50%/25% (faster, meaner), epic choir-and-drums override while it lives — and a slow-motion death that leaves you its **permanent gift**: Spring Steps, Winter Coat, Second Wind, Thunder Charge, Shadow Step or Sand Stride
- **👻 The Spirit Wolf** — a white, ghostly elder that appears near cave mouths (listen for the howl) and speaks in riddles on a spirit card before fading into particles. The **first meeting is a cutscene** — your howl answered, the camera orbiting the world — and it cannot be skipped
- **🗺️ Fast travel** — exploration quests that reward "the old paths" plant a travel marker on the big map; click it to journey there (not from inside a cave, not while a legend watches)
- **Infinite procedural terrain** — simplex-noise continents, ridged mountains, lakes, rivers of hills; chunks stream in/out as you roam, so exploration never ends
- **🐻 Territorial predators** — brown bears (taiga/forest), tigers (grove/forest) and snow leopards (mountains/tundra) patrol rare home ranges. Step in and you get a 3-second red warning banner, a growl, and a **red arrow** pointing at the incoming threat — fight back (F) or sprint out; they give up at the edge of their range. Slain: bear 8 hits (6🥩 2🧥 3🦴), tiger 6 (5🥩 2🧥 2🦴), snow leopard 5 (4🥩 2🧥 2🦴). If they catch you, your wolf falls and wakes up far away with full health (bounty kept).
- **❤️ Wolf health** — red HP bar above stamina; predators bite hard, health slowly regenerates when out of trouble for 6 s
- **Bigger, easier-to-spot prey** — all animals ~40% larger and visible from farther away
- **Hunting with real combat** — prey fights back with speed: rabbits and hares are easy catches, foxes and goats need a chase, elk/deer/reindeer take several bites but drop the richest bounty (meat, pelts, bones)
- ✨ **Magic mushrooms** — rare glowing purple caps in deep woodland; eating one grants **10 seconds of flight** (hold jump to climb, look down to dive), then you're back on four paws
- **8 blending biomes** — incl. NEW **Murky Swamp** (mist, dead trees, rain bias) and **Enchanted Grove** (rare violet-tinted woodland, dense mist, glowing plants — THE place to find magic mushrooms). All biome tuning (weather bias, densities, fog, magic rates) is data-driven in `BIOME_CONFIG`
- **🌳 Solid world** — big tree trunks and boulders are really there, for you *and* the wildlife: run into one and you stop (and slide along it); crash head-on at sprint speed and it bites off 4 HP with a thud, dust and a stumble. Fleeing deer bounce off stone, bears weave between trunks. Walking pace never hurts — it just blocks
- **Rivers & lakes** — winding river channels carve through lowlands (contour-noise bands), ponds and lakes in basins. **Swimming 2.0**: stamina drains while swimming; hit zero and your health starts slipping; paddle toward a bank to clamber out; **E** at the water's edge to drink and restore stamina
- **🗺️ Landmarks** — rare procedural points of interest: Elder Tree, Stone Circle, Cave Mouth, Ruined Shrine, Fallen Log Bridge — each with its own model, biome affinity, and special resources nearby
- **Minimap & world map** — circular live minimap (top-right): terrain, vivid water, colored resource dots, dashed **predator territory rings**, gold **landmark markers + guidance chevron with distance**, hunting predators (red), and a heading arrow — all scrolling in real time. **M** (or click the minimap) opens a **centered big map** of ~900 m around you with landmark names, updating live as you move
- **6 blending biomes** — Snowy Taiga, Frozen Tundra, Boreal Forest, Autumn Grove, Flower Meadows, Frostpeak Mountains (+ shorelines), each with its own trees, plants, ground colors and **wildlife** (elk, reindeer, deer, rabbits, hares, foxes, arctic foxes, mountain goats)
- **Wildlife AI** — animals graze, wander and flee; walk slowly to stalk, sprint to run them down (they tire out); meat is yours
- **👃 Three senses** — *see* the world; *hear* the closest moving thing; *smell* it: wolf sense paints tracks and drifting scent on the ground (green prey · red predators · violet rivals), and blood reads loudest of all
- **🩸 The hunt** — follow tracks → hear it → prowl in low → strike from the blind side. Wounded prey limps, bleeds a trail and goes to ground in thick cover; sprint through brush and you'll crunch it
- **🌍 Living populations** — every species keeps count. Hunt a valley empty and it stays empty; wild predators take prey too; herds birth back in spring (you can witness fawns). The world remembers
- **🌸 Seasons** — a 12-day year rides the day cycle: spring births & rain, summer plenty, autumn migrations, winter snow & bitter cold — the HUD shows the turning year
- **🎵 A living soundtrack** — a fully generative music engine: every biome sings its own theme (forest flutes, snowy minimalist piano with choir, swamp drones, autumn strings, meadow kalimba, desert oud), crossfading seamlessly between exploration, the hunt (a heartbeat that quickens as you close) and combat — drums drive harder as your HP falls, and the rival-pack battle plays the epic tier with choir. Night detunes and darkens every theme; the mystic events ring bells; landed bites stab brass that climbs with your combo
- **🐺 The wolf's voice & body** — aggressive/warning/pain growls, barks, whimpers at low HP, panting at low stamina, heavier breath when running (vaporizing in the cold), bone-crunch bites, per-species death cries, paw prints that persist 30 s in snow and sand
- **🍂 A world that whispers** — waterfall roar and river murmur by distance, ice cracking in deep cold, branches snapping in old forest, brush rustling as you crash through, owls at night, crickets at dusk, eagles over the high country, distant rival howls, songbirds by biome — plus lens flare staring into the sun, god rays between the trunks, dawn mist sleeping in the valleys, and a stronger aurora over the mountains
- **🏔️ The long view** — the haze opens far past the old horizon, and from a ridge the world unrolls: an extra ring of distant land generates for the vista. Fallen logs and stumps are solid too — the forest floor has walls
- **Resources** — lingonberries, mushrooms, herbs, sticks, stones; gathered spots regrow when you roam far and return
- **Day/night cycle** — moving sun & moon, dawn/dusk glows, stars, and **aurora borealis** on clear cold nights (this game is from Lapland, after all)
- **Dynamic weather** — clear / fair / overcast / rain / snow / thunderstorms with lightning, drifting clouds, wind, fog that breathes with the weather; cold biomes get snow instead of rain
- **🛡 Crash-proofed game loop** — a meteor landing near you once froze the game solid (its map icon crashed the minimap draw); that's fixed, and the main loop is now fault-tolerant: any error is bannered and the game recovers instead of freezing
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
