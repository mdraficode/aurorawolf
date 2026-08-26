#!/usr/bin/env bash
# Builds Revontulet.apk from the single-file game + WebView wrapper.
# Requirements (paths below): Android build-tools r34 + platform android.jar (API 34), JDK 11+.
#   /tmp/at/android-14/  -> aapt2, d8, apksigner, zipalign  (from build-tools_r34-linux.zip)
#   /tmp/at/android-34/android.jar                          (from platform-34-ext7_r03.zip)
set -euo pipefail

BT=/tmp/at/android-14
AJ=/tmp/at/android-34/android.jar
ROOT=/home/user
PROJ=$ROOT/android
WORK=/tmp/apkbuild
OUT=$ROOT/Revontulet-AuroraWolf.apk

rm -rf "$WORK"
mkdir -p "$WORK"/{assets,res,src,classes,dex}

# ---- 1) resources: process master icon into all densities ----
python3 - <<'PY'
from PIL import Image, ImageDraw
import pathlib, shutil

proj = pathlib.Path('/home/user/android')
work = pathlib.Path('/tmp/apkbuild')

# copy static res + manifest + java
for pattern in ('res/values/*.xml', 'res/mipmap-anydpi-v26/*.xml'):
    for f in proj.glob(pattern):
        dest = work / f.relative_to(proj)
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(f, dest)
shutil.copy(proj / 'AndroidManifest.xml', work / 'AndroidManifest.xml')
shutil.copytree(proj / 'src', work / 'src', dirs_exist_ok=True)

master = Image.open(proj / 'icon-master.png').convert('RGBA')
if master.width != master.height:
    m = min(master.width, master.height)
    master = master.crop(((master.width - m)//2, (master.height - m)//2,
                          (master.width + m)//2, (master.height + m)//2))

def rounded(img, radius_ratio):
    w, h = img.size
    mask = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=int(w * radius_ratio), fill=255)
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out

def circle(img):
    w, h = img.size
    mask = Image.new('L', (w, h), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse([0, 0, w - 1, h - 1], fill=255)
    out = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out

DENS = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for dpi, mult in DENS.items():
    folder = work / 'res' / ('mipmap-' + dpi)
    folder.mkdir(parents=True, exist_ok=True)
    # legacy launcher icons (rounded square + circle)
    size = int(48 * mult)
    art = master.resize((size, size), Image.LANCZOS)
    rounded(art, 0.2).save(folder / 'ic_launcher.png')
    circle(art).save(folder / 'ic_launcher_round.png')
    # adaptive foreground: art scaled into the 66% safe zone on transparency
    fgsize = int(108 * mult)
    fg = Image.new('RGBA', (fgsize, fgsize), (0, 0, 0, 0))
    inner = int(fgsize * 0.72)
    scaled = master.resize((inner, inner), Image.LANCZOS)
    fg.paste(scaled, ((fgsize - inner)//2, (fgsize - inner)//2))
    fg.save(folder / 'ic_launcher_fg.png')
print('icons written')
PY

cp "$ROOT/index.html" "$WORK/assets/index.html"

# ---- 2) compile & link resources ----
"$BT/aapt2" compile --dir "$WORK/res" -o "$WORK/resources.zip"
"$BT/aapt2" link \
    -o "$WORK/base.apk" \
    -I "$AJ" \
    --manifest "$WORK/AndroidManifest.xml" \
    -A "$WORK/assets" \
    --min-sdk-version 23 \
    --target-sdk-version 33 \
    --version-code 1 \
    --version-name "1.0" \
    "$WORK/resources.zip"

# ---- 3) java -> class -> dex ----
javac -source 1.8 -target 1.8 -nowarn \
    -classpath "$AJ" \
    -d "$WORK/classes" \
    $(find "$WORK/src" -name '*.java')
java -cp "$BT/lib/d8.jar" com.android.tools.r8.D8 --release \
    --lib "$AJ" \
    --output "$WORK/dex" \
    $(find "$WORK/classes" -name '*.class')

# ---- 4) pack classes.dex into the apk ----
python3 - <<'PY'
import zipfile
with zipfile.ZipFile('/tmp/apkbuild/base.apk', 'a') as z:
    z.write('/tmp/apkbuild/dex/classes.dex', 'classes.dex', compress_type=zipfile.ZIP_DEFLATED)
print('classes.dex added')
PY

# ---- 5) align ----
"$BT/zipalign" -f 4 "$WORK/base.apk" "$WORK/aligned.apk"

# ---- 6) sign (v1+v2) ----
KEYTOOL=$(command -v keytool || echo /usr/lib/jvm/jdk-11/bin/keytool)
KS="$PROJ/revontulet.keystore"   # keep the same key across builds so updates install
if [ ! -f "$KS" ]; then
  "$KEYTOOL" -genkeypair -keystore "$KS" -alias revontulet \
      -keyalg RSA -keysize 2048 -validity 10000 \
      -storepass revontulet -keypass revontulet \
      -dname "CN=Revontulet, O=Arena Agent, L=Rovaniemi, ST=Lapland, C=FI" >/dev/null 2>&1
fi
java -jar "$BT/lib/apksigner.jar" sign \
    --ks "$KS" --ks-pass pass:revontulet --key-pass pass:revontulet \
    --ks-key-alias revontulet \
    --out "$OUT" "$WORK/aligned.apk"

java -jar "$BT/lib/apksigner.jar" verify --print-certs "$OUT"
echo "-------------------------------------------"
ls -la "$OUT"
unzip -l "$OUT" | tail -5
echo "BUILD OK -> $OUT"
