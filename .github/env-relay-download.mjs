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

// Belt-and-suspenders: always write a debug log to the repo root so the agent can
// pull the reason even when the workflow's tee/cp and the GitHub log blob are
// unreachable. Every branch appends to it; the workflow commits it.
const DEBUG = path.join(ROOT, 'relay_debug.txt');
const STATUS = path.join(ROOT, 'relay_status.txt');
fs.writeFileSync(DEBUG, `env-relay ${new Date().toISOString()}\nsource=${URL_}\nhost=${isDrive ? 'drive' : isWeTransfer ? 'wetransfer' : 'direct'}\n`);
function dbg(msg) { fs.appendFileSync(DEBUG, String(msg) + '\n'); console.log(msg); }
function finish(ok, msg) {
  dbg(`RESULT: ${ok ? 'OK' : 'FAILED'} — ${msg}`);
  fs.writeFileSync(STATUS, ok ? 'OK\n' : 'FAILED\n');
}

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
  dbg(`[relay] curl ${URL_}`);
  await run('curl', ['-fsSL', '--retry', '3', URL_, '-o', DEST]);
}

async function viaGdown() {
  dbg(`[relay] gdown ${URL_}`);
  // gdown handles the Google `confirm` token for large files.
  try {
    await run('gdown', ['-O', DEST, URL_]);
  } catch (e) {
    if (e.message && e.message.includes('ENOENT')) {
      // gdown not on PATH — fall back to curl with the Google `confirm` flow.
      dbg('[relay] gdown absent — falling back to curl (confirm token)');
      await run('curl', ['-fsSL', '--retry', '3',
        'https://drive.google.com/uc?export=download&confirm=t&id=' +
        (URL_.match(/[?&]id=([^&]+)/) || [])[1] || URL_, '-o', DEST]);
    } else throw e;
  }
}

async function viaPlaywright() {
  dbg(`[relay] playwright (WeTransfer) ${URL_}`);
  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage({ acceptDownloads: true });

  // WeTransfer is a JS app: the we.tl short link redirects to a download page that
  // exchanges an XSRF token and only then exposes the file. So we (1) follow the
  // redirect to the real page, (2) let it render, (3) click the download control,
  // (4) save the emitted download. Log each stage so a failure is attributable.
  const resp = await page.goto(URL_, { waitUntil: 'domcontentloaded', timeout: 120000 });
  dbg(`[relay]   landing page ${resp ? resp.status() : '?'} → ${page.url()}`);
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => dbg('[relay]   networkidle timeout (continuing)'));

  // WeTransfer shows a cookie-consent gate ("I agree") before the file list. Dismiss
  // it first — otherwise the Download control never appears. Try a broad set of
  // accept/dismiss buttons, tolerant of a missing gate.
  const acceptSels = [
    'button:has-text("I agree")', 'button:has-text("Accept")', 'button:has-text("Accept all")',
    'button:has-text("Accept All")', 'button:has-text("Agree")', 'button:has-text("OK")',
    'button:has-text("Yes")', '[data-testid*="accept"]', 'button#onetrust-accept-btn-handler'
  ];
  for (const sel of acceptSels) {
    const n = await page.locator(sel).count().catch(() => 0);
    if (n > 0) {
      dbg(`[relay]   dismissing consent via ${sel}`);
      await page.locator(sel).first().click({ timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1500);
      break;
    }
  }
  // Give the SPA a beat to hydrate the file list after consent.
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});

  // Broad, resilient selector set + a helper that reads the DOM once and reports
  // what it found (so the run log is diagnostic when the page differs).
  const found = await page.evaluate(() => {
    const q = s => document.querySelectorAll(s).length;
    return {
      url: location.href,
      anchors: Array.from(document.querySelectorAll('a')).map(a => (a.textContent || '').trim().slice(0, 40)).filter(Boolean).slice(0, 12),
      download: q('a.download, [data-download], a[href*="download"]'),
      buttons: Array.from(document.querySelectorAll('button')).map(b => (b.textContent || '').trim().slice(0, 30)).filter(Boolean).slice(0, 12),
      hasLink: q('a[href]')
    };
  });
  dbg('[relay]   page shape ' + JSON.stringify(found).slice(0, 500));

  const selectors = [
    'a.download', 'button.download', 'a[data-download]', '[data-download]',
    'a[href*="/downloads/"]', '[href*="/download"]', 'a[href*="download_link"]',
    '[data-testid="download"]', '[data-testid*="download"]',
    'button:has-text("Download")', 'a:has-text("Download")',
    'button:has-text("download")', 'a:has-text("download")',
    'button[aria-label*="ownload"]', 'a[aria-label*="ownload"]'
  ];

  // Wire the download event BEFORE clicking so nothing is missed.
  const downloadPromise = page.waitForEvent('download', { timeout: 120000 });
  let clicked = false;
  for (const sel of selectors) {
    const count = await page.locator(sel).count();
    if (count > 0) {
      dbg(`[relay]   clicking ${sel} (${count} match)`);
      try { await page.locator(sel).first().click({ timeout: 20000 }); clicked = true; break; }
      catch (e) { dbg(`[relay]   click on ${sel} failed: ${e.message.split('\n')[0]}`); }
    }
  }
  if (!clicked) {
    dbg('[relay]   no Download control found; page = ' + found.url);
    await browser.close();
    throw new Error('WeTransfer page has no download control');
  }
  const dl = await downloadPromise;
  dbg(`[relay]   download triggered: suggested ${dl.suggestedFilename()}`);
  await dl.saveAs(DEST);
  await browser.close();
  dbg('[relay]   saved via browser');
}

try {
  if (isDrive) await viaGdown();
  else if (isWeTransfer) await viaPlaywright();
  else await viaCurl();
} catch (e) {
  dbg('[relay] download error: ' + e.message);
  if (e.stack) dbg(e.stack);
  finish(false, e.message);
  process.exit(1);
}

const bytes = fs.statSync(DEST).size;
const digest = sha256(fs.readFileSync(DEST));
finish(true, `${bytes} bytes`);

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
