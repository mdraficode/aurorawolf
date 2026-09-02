// BROWSERLAB probe — can this sandbox's npm-sourced Chromium run the game?
// usage: node test/browserlab/probe.mjs
import { chromium } from 'playwright';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const EXE = process.env.CHROME_LAB || '/tmp/chrome-lab.sh';
const here = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(here), '../..');
const game = pathToFileURL(path.join(ROOT, 'index.html')).href;

const ARGS = [
  '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
  '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--disable-gpu-sandbox', '--mute-audio', '--hide-scrollbars',
];

if (!fs.existsSync(EXE)) { console.error('no chromium wrapper — run: bash test/browserlab/boot.sh'); process.exit(2); }

const t0 = Date.now();
const browser = await chromium.launch({ executablePath: EXE, args: ARGS });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 200)); });

const gl = await page.evaluate(() => {
  const c = document.createElement('canvas');
  const g = c.getContext('webgl2') || c.getContext('webgl');
  if (!g) return { ok: false };
  const d = g.getExtension('WEBGL_debug_renderer_info');
  return { ok: true, ver: g.getParameter(g.VERSION), renderer: d ? g.getParameter(d.UNMASKED_RENDERER_WEBGL) : '?' };
});
console.log('webgl:', JSON.stringify(gl));

await page.goto(game, { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(4000);
const st = await page.evaluate(() => ({
  hasCAMP: typeof window.CAMP,
  hasRUN: typeof window.RUN,
  hasTHREE: typeof window.THREE,
  hasRAFZ: typeof window.RAFZZER,
  title: document.title,
  overlay: (document.querySelector('#overlay') || {}).className || null,
  bodyLen: document.body ? document.body.innerHTML.length : 0,
}));
console.log('game :', JSON.stringify(st));
console.log('boot ms:', Date.now() - t0, '· errors:', errs.length);
errs.slice(0, 12).forEach(e => console.log('  ', e));
await page.screenshot({ path: path.join(ROOT, 'shots/browserlab_probe.png') }).catch(() => {});
await browser.close();
process.exit(gl.ok && st.hasCAMP === 'object' ? 0 : 1);
