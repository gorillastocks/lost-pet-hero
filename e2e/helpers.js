import { expect } from '@playwright/test';

export function trackErrors(page) {
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
}

export async function start(page, difficulty = 'easy') {
  await page.goto(`./?debug=1&instant=1`);
  await page.click(`#diff-${difficulty}`);
  await page.click('#btn-play');
}

export async function tapTile(page, x, y) {
  const center = await page.evaluate(({ x, y }) => {
    const canvas = document.querySelector('#world');
    const p = window.__lph.tileCenter(x, y);
    return p && { ...p, w: canvas.clientWidth, h: canvas.clientHeight, px: canvas.dataset.x, py: canvas.dataset.y };
  }, { x, y });
  expect(center, `tile ${x},${y}`).toBeTruthy();
  expect(center.x, `tile ${x},${y} x offscreen from ${center.px},${center.py}`).toBeGreaterThan(1);
  expect(center.y, `tile ${x},${y} y offscreen from ${center.px},${center.py}`).toBeGreaterThan(1);
  expect(center.x).toBeLessThan(center.w - 1);
  expect(center.y).toBeLessThan(center.h - 1);
  await page.locator('#world').click({ position: { x: center.x, y: center.y } });
}

export async function timeATreat(page, id = 'fish') {
  await page.click(`#treat-${id}`);
  await page.waitForFunction(() => {
    const timing = document.querySelector('#timing');
    if (timing?.dataset.hot !== '1') return false;
    document.querySelector('#btn-tap')?.click();
    return true;
  });
}

export async function answerGate(page) {
  const q = await page.locator('#gate-q').innerText();
  const match = q.match(/(\d+)\s*\+\s*(\d+)/);
  expect(match, q).toBeTruthy();
  const answer = String(Number(match[1]) + Number(match[2]));
  for (const digit of answer) await page.locator(`[data-digit="${digit}"]`).click();
  await page.click('#btn-check');
}
