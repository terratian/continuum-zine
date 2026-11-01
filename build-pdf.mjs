// Renders index.html (print.css applied) to a print-ready PDF.
// Run: npm install && npx playwright install chromium && npm run pdf
// Env: TRIM_W=8.5 TRIM_H=11 BLEED=0.125 (inches) OUT=dist/continuum-issue-01.pdf
//      STRICT=1 (fail if any image is missing/placeholder)  CHROMIUM_PATH=/path/to/chrome (optional)
//      TAILWIND_CSS=file.css (offline: use a prebuilt Tailwind CSS file instead of the CDN)
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, resolve, dirname, sep } from 'node:path';

const num = (k, d) => Number(process.env[k] ?? d);
const W = num('TRIM_W', 8.5), H = num('TRIM_H', 11), B = num('BLEED', 0.125);
const OUT = process.env.OUT ?? 'dist/continuum-issue-01.pdf';
const root = resolve('.');
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ogg': 'audio/ogg', '.woff2': 'font/woff2' };

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = resolve(join(root, p));
    const rel = file.slice(root.length + 1);
    if (!file.startsWith(root + sep) || rel.startsWith('.') || rel.startsWith('node_modules')) { res.writeHead(403).end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/index.html`;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  const page = await browser.newPage();
  const offlineCss = process.env.TAILWIND_CSS; // offline mode: prebuilt Tailwind CSS instead of the CDN
  if (offlineCss) {
    await page.route(/cdn\.tailwindcss\.com/, r => r.abort());
    // stub the stock-photo fallback with a 1x1 PNG so the page's onerror fallback can't loop offline
    await page.route(/images\.unsplash\.com/, r => r.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64') }));
  }
  await page.goto(url, { waitUntil: 'load' });
  if (!offlineCss) await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => console.warn('WARN network never went idle; continuing'));
  if (offlineCss) await page.addStyleTag({ path: offlineCss });
  await page.evaluate(() => document.fonts.ready);
  const pw = (W + 2 * B).toFixed(4), ph = (H + 2 * B).toFixed(4);
  await page.addStyleTag({ content: `@page{size:${pw}in ${ph}in;margin:0}:root{--page-w:${pw}in;--page-h:${ph}in;--bleed:${B}in}` });

  const imgs = await page.$$eval('img', els => els.map(i => ({ alt: i.alt, src: i.currentSrc || i.src, ok: i.complete && i.naturalWidth > 0 })));
  const bad = imgs.filter(i => !i.ok || /unsplash\.com/.test(i.src));
  bad.forEach(i => console.warn(`WARN placeholder/missing image: "${i.alt}" -> ${i.src}`));
  if (bad.length && process.env.STRICT === '1') throw new Error(`${bad.length} placeholder/missing image(s); aborting (STRICT=1)`);

  await mkdir(dirname(OUT), { recursive: true });
  await page.pdf({ path: OUT, preferCSSPageSize: true, printBackground: true });
  const pages = ((await readFile(OUT)).toString('latin1').match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  console.log(`Wrote ${OUT}: ${pages} pages, ${pw}x${ph}in (trim ${W}x${H} + ${B}in bleed)`);
  if (pages % 4) console.warn('WARN page count is not a multiple of 4 (needed for saddle-stitch)');
} finally {
  await browser.close();
  server.close();
}
