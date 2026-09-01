# Workspace restore map
Everything in this workspace now lives on GitHub — repo `mdraficode/aurorawolf`, branch `main`
(the Pages site serves index.html from the same repo). Only `.ghtoken` and this file are local-only.

    TOK=$(cat ~/.ghtoken)
    rm -rf /tmp/work && git clone https://x-access-token:$TOK@github.com/mdraficode/aurorawolf.git /tmp/work
    cp -r /tmp/work/. /home/user/ && rm -rf /home/user/.git

Layout: src/ (p1–p4, autopilot, shell, style) · build.py (bundle → index.html) · publish.sh (github|pages)
· test/ (all gates & probes) · shots/ (regenerable screenshots) · vendor/three.min.js · docs (README/PLAYLOG/BUGS/LINKS).
Env note: playwright/chromium caches are wiped at turn boundaries — reinstall when running probes (see BUGS.md).
