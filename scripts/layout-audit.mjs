import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const OUT = process.env.LAYOUT_OUT || '/tmp/layout-shots';
const BASE = process.env.LAYOUT_BASE || 'http://127.0.0.1:4174/';
const viewports = [
  { id: 'se', width: 375, height: 667 },
  { id: 'iphone', width: 390, height: 844 },
  { id: 'promax', width: 430, height: 932 },
  { id: 'ipad-p', width: 768, height: 1024 },
  { id: 'ipad-l', width: 1024, height: 768 },
  { id: 'desktop', width: 1280, height: 800 },
];
const screens = ['title', 'mode', 'jobs', 'map', 'clues', 'calm', 'reunion', 'sanctuary', 'settings', 'gate'];

function audit() {
  const app = document.querySelector('#app');
  const appBox = app.getBoundingClientRect();
  const issues = [];
  const seen = new Set();

  function visible(el) {
    if (!el || el.hidden) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  }

  function clipper(el) {
    let node = el.parentElement;
    while (node && node !== document.body) {
      const style = getComputedStyle(node);
      const ox = style.overflowX;
      const oy = style.overflowY;
      if (/(hidden|clip|auto|scroll)/.test(ox + oy)) return node;
      node = node.parentElement;
    }
    return app;
  }

  function label(el) {
    const id = el.id ? `#${el.id}` : '';
    const cls = el.className && typeof el.className === 'string' ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : '';
    const text = (el.innerText || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 42);
    return `${el.tagName.toLowerCase()}${id}${cls}${text ? ` "${text}"` : ''}`;
  }

  const nodes = [...app.querySelectorAll('button, a, h1, h2, p, .job, .jobtitle, .jobdesc, .jobline, .logo, .ribbon, .top, .pad, #status, #calm-line, #reunion-copy')];
  for (const el of nodes) {
    if (!visible(el) || seen.has(el)) continue;
    seen.add(el);
    const r = el.getBoundingClientRect();
    const box = clipper(el).getBoundingClientRect();
    const scrollParent = clipper(el);
    const oy = getComputedStyle(scrollParent).overflowY;
    const canScrollY = scrollParent.scrollHeight > scrollParent.clientHeight + 2 && /(auto|scroll)/.test(oy);
    const cut = {
      left: Math.round(box.left - r.left),
      right: Math.round(r.right - box.right),
      top: Math.round(box.top - r.top),
      bottom: Math.round(r.bottom - box.bottom),
    };
    // A scrolling pane may hide content below the fold. That is fine if the
    // element can move fully into the pane. Hidden overflow that cannot scroll is not.
    const clippedX = cut.left > 2 || cut.right > 2;
    const clippedY = cut.top > 2 || cut.bottom > 2;
    if ((clippedX || clippedY) && !canScrollY) issues.push({ kind: 'clipped', el: label(el), cut });

    const style = getComputedStyle(el);
    if (el.scrollWidth > el.clientWidth + 4 && style.overflowX !== 'visible') {
      issues.push({ kind: 'text-overflow', el: label(el), extra: el.scrollWidth - el.clientWidth });
    }
    if (el.tagName === 'BUTTON' || el.tagName === 'A') {
      const w = Math.round(r.width);
      const h = Math.round(r.height);
      if (w < 44 || h < 44) issues.push({ kind: 'tiny-target', el: label(el), w, h });
    }
  }

  const cards = [...app.querySelectorAll('button.job')];
  cards.forEach((el, i) => {
    const c = el.getBoundingClientRect();
    const title = el.querySelector('.jobtitle')?.getBoundingClientRect();
    const desc = el.querySelector('.jobdesc')?.getBoundingClientRect();
    const inside = (r) => r && r.top >= c.top - 1 && r.bottom <= c.bottom + 1 && r.left >= c.left - 1 && r.right <= c.right + 1;
    if ((title && !inside(title)) || (desc && !inside(desc))) issues.push({ kind: 'job-text-outside', el: label(el) });
    if (i) {
      const prev = cards[i - 1].getBoundingClientRect();
      const gap = Math.round(c.top - prev.bottom);
      if (gap < 4) issues.push({ kind: 'job-overlap', el: label(el), gap });
    }
    if (c.right > appBox.right + 1 || c.left < appBox.left - 1) issues.push({ kind: 'job-offscreen', el: label(el) });
  });

  const taps = [...app.querySelectorAll('button, a')].filter(visible);
  for (let i = 0; i < taps.length; i++) {
    for (let j = i + 1; j < taps.length; j++) {
      if (taps[i].contains(taps[j]) || taps[j].contains(taps[i])) continue;
      const a = taps[i].getBoundingClientRect();
      const b = taps[j].getBoundingClientRect();
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w > 6 && h > 6) issues.push({ kind: 'overlap', a: label(taps[i]), b: label(taps[j]), w: Math.round(w), h: Math.round(h) });
    }
  }
  return { issues, app: { w: Math.round(appBox.width), h: Math.round(appBox.height) } };
}

fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const report = [];
for (const vp of viewports) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${BASE}?debug=1&instant=1`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#btn-tap-play');
  for (const name of screens) {
    await page.evaluate((screen) => window.__lph.preview(screen), name);
    await page.waitForTimeout(80);
    const file = path.join(OUT, `${vp.id}-${name}.png`);
    await page.screenshot({ path: file });
    const result = await page.evaluate(audit);
    report.push({ vp: vp.id, screen: name, ...result });
    const bad = result.issues.length;
    console.log(`${vp.id} ${name} ${bad ? bad + ' issues' : 'ok'}`);
    for (const issue of result.issues) console.log('  ', JSON.stringify(issue));
    if (name === 'calm') {
      await page.click('#treat-fish');
      await page.waitForSelector('#timing:not([hidden])');
      await page.waitForTimeout(40);
      await page.screenshot({ path: path.join(OUT, `${vp.id}-calm-tap.png`) });
      const timing = await page.evaluate(audit);
      report.push({ vp: vp.id, screen: 'calm-tap', ...timing });
      console.log(`${vp.id} calm-tap ${timing.issues.length ? timing.issues.length + ' issues' : 'ok'}`);
      for (const issue of timing.issues) console.log('  ', JSON.stringify(issue));
    }
  }
  await page.close();
}
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
await browser.close();
const n = report.reduce((s, r) => s + r.issues.length, 0);
console.log(`TOTAL ${n}`);
process.exit(n ? 1 : 0);
