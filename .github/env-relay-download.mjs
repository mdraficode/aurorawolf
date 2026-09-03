#!/usr/bin/env node
/* ============================================================================
   env-relay downloader — fetch a file on a GitHub runner (full internet) and
   stage it for commit to the session branch. The sandbox egress is an allowlist
   (github/npm/PyPI only), so this relay is the ONLY way a Drive/WeTransfer file
   reaches the workspace.

   Strategy by host:
     · we.tl / wetransfer.com  → Playwright (WeTransfer is a server-side download
                                 page, not P2P; a browser already sessioned gives
                                 the file). Chromium installed with --with-deps.
     · drive.google / drive.usercontent.google / docs.google  → gdown (handles the
                                 `confirm` token Google inserts for large files).
     · anything else HTTP(S)   → plain curl (works for direct file URLs).

   Outputs (all relative to the repo root, committed by the workflow):
     <out_dir>/<filename>        the payload
     MANIFEST.tsv                `path<TAB>bytes<TAB>sha256` (audit trail)
     NESTED_REPO_STATE.txt       note whether the payload's inner repo (if any) is a
                                 gitlink (an archive's nested .git collapses to a
                                 gitlink — record it so the payload stays auditable)
   ============================================================================ */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CFG = JSON.parse(fs.readFileSync(path.join(HERE, 'env-relay.config.json'), 'utf8'));

const URL_ = CFG.source_url;
const OUT_DIR = CFG.out_dir || 'drive_drop';
const FILENAME = CFG.filename || 'payload.bin';
const DEST = path.join(ROOT, OUT_DIR, FILENAME);
fs.mkdirSync(path.dirname(DEST), { recursive: true });

const isDrive = /drive\.google|drive\.usercontent\.google|docs\.google/.test(URL_);
const isWeTransfer = /we\.tl|wetransfer\.com/.test(URL_);

function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

function manifestLine(p, bytes) {
  return [p, bytes, ''].join('\t');
}

function run(cmd, args) {
  return new Promise((res, rej) => {
    const r = spawn(cmd, args, { stdio: 'inherit' });
    r.on('error', rej);
    r.on('exit', code => code === 0 ? res() : rej(new Error(`${cmd} exited ${code}`)));
  });
}

async function viaCurl() {
  console.log(`[relay] curl ${URL_}`);
  await run('curl', ['-fsSL', '--retry', '3', URL_, '-o', DEST]);
}

async function viaGdown() {
  console.log(`[relay] gdown ${URL_}`);
  // gdown handles the Google `confirm` token for large files.
  try {
    await run('gdown', ['-O', DEST, URL_]);
  } catch (e) {
    if (e.message && e.message.includes('ENOENT')) {
      // gdown not on PATH — fall back to curl with the Google `confirm` flow.
      console.warn('[relay] gdown absent — falling back to curl (confirm token)');
      await run('curl', ['-fsSL', '--retry', '3',
        'https://drive.google.com/uc?export=download&confirm=t&id=' +
        (URL_.match(/[?&]id=([^&]+)/) || [])[1] || URL_, '-o', DEST]);
    } else throw e;
  }
}

async function viaPlaywright() {
  console.log(`[relay] playwright (WeTransfer) ${URL_}`);
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ acceptDownloads: true });
  await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 120000 });
  // WeTransfer renders a clickable download; wait for the .download anchor/button.
  const downloadPromise = page.waitForEvent('download', { timeout: 120000 });
  const clickSel = 'a.download, a[href*="/downloads/"], a:has-text("Download"), button:has-text("Download")';
  await page.waitForSelector(clickSel, { timeout: 120000 });
  const el = page.locator(clickSel).first();
  await el.click();
  const dl = await downloadPromise;
  await dl.saveAs(DEST);
  await browser.close();
}

try {
  if (isDrive) await viaGdown();
  else if (isWeTransfer) await viaPlaywright();
  else await viaCurl();
} catch (e) {
  console.error('[relay] download error:', e.message);
  process.exit(1);
}

const bytes = fs.statSync(DEST).size;
const digest = sha256(fs.readFileSync(DEST));

// MANIFEST.tsv — path / bytes / sha256
fs.writeFileSync(path.join(ROOT, 'MANIFEST.tsv'),
  manifestLine(path.join(OUT_DIR, FILENAME), bytes) + '\t' + digest + '\n');

// NESTED_REPO_STATE.txt — record the gitlink hazard for an archive-backed payload
fs.writeFileSync(path.join(ROOT, 'NESTED_REPO_STATE.txt'),
  `payload=${path.join(OUT_DIR, FILENAME)}\n` +
  `bytes=${bytes}\nsha256=${digest}\n` +
  `nested_repo=archive; extract to inspect (a nested .git collapses to a gitlink on commit)\n` +
  `source=${URL_}\nrelayed_at=${new Date().toISOString()}\n`);

console.log(`[relay] saved ${bytes} bytes (sha256 ${digest.slice(0, 12)}…) → ${path.join(OUT_DIR, FILENAME)}`);
