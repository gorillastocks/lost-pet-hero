import { test, expect } from '@playwright/test';
import { answerGate, dismissClue, start, tapTile, timeATreat, trackErrors } from './helpers.js';

test('title, settings, and three picture jobs', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('./?debug=1&instant=1');
  await expect(page.locator('h1')).toHaveText('Lost Pet Hero');
  await expect(page.locator('#btn-tap-play')).toBeVisible();
  await page.locator('#btn-tap-play').click({ force: true });
  await page.click('#diff-easy');
  await page.click('#diff-normal');
  await expect(page.locator('#diff-blurb')).toContainText('favourite');
  await page.click('#btn-settings');
  await answerGate(page);
  await page.click('#set-easy');
  await expect(page.locator('#btn-dev-unlock')).toHaveCount(0);
  await page.click('#btn-settings-back');
  await page.click('#btn-play');
  const fit = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('button.job')];
    return cards.map((el, i, arr) => {
      const c = el.getBoundingClientRect();
      const title = el.querySelector('.jobtitle').getBoundingClientRect();
      const desc = el.querySelector('.jobdesc').getBoundingClientRect();
      const inside = (r) => r.top >= c.top - 1 && r.bottom <= c.bottom + 1 && r.left >= c.left - 1 && r.right <= c.right + 1;
      const prev = i ? arr[i - 1].getBoundingClientRect() : null;
      return { id: el.id, inside: inside(title) && inside(desc), gap: prev ? c.top - prev.bottom : 8, h: c.height };
    });
  });
  for (const card of fit) {
    expect(card.inside, `${card.id} text inside card`).toBe(true);
    expect(card.gap, `${card.id} overlaps the card above`).toBeGreaterThan(0);
  }
  for (const id of ['pip', 'bramble', 'luma']) {
    const card = page.locator(`#job-${id}`);
    await card.scrollIntoViewIfNeeded();
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    const vp = page.viewportSize();
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 1);
  }
  await expect(page.locator('#job-pip')).toContainText('Pip');
  await expect(page.locator('#job-bramble')).toContainText('Bramble');
  await expect(page.locator('#job-luma')).toContainText('Luma');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('easy rescue: clues, simple puzzles, one timing tap, reunion', async ({ page }) => {
  const errors = trackErrors(page);
  await start(page, 'easy');
  await page.click('#job-pip');
  await expect(page.locator('#gift-copy')).toContainText('scarf');
  await page.click('#btn-enter');
  await expect(page.locator('#world')).toBeVisible();

  await tapTile(page, 5, 12);
  await dismissClue(page);
  await page.click('#act-climb');
  await expect(page.locator('#status')).toContainText(/picture|stone/i);

  await tapTile(page, 5, 10);
  await page.click('#act-picture');
  await expect(page.locator('#pic-paw')).toHaveClass(/glow/);
  await page.click('#pic-paw');

  await tapTile(page, 5, 6);
  await page.click('#act-switches');
  await expect(page.locator('#sw-moon')).toHaveClass(/glow/);
  await page.click('#sw-moon');

  await tapTile(page, 5, 4);
  await page.click('#act-fern');
  await expect(page.locator('#fern-2')).toHaveClass(/glow/);
  await page.click('#fern-2');

  await tapTile(page, 5, 1);
  await dismissClue(page);
  if (!(await page.locator('#hearts').count())) await page.locator('#act-calm-pet').click();
  await expect(page.locator('#hearts')).toHaveAttribute('data-filled', '1');
  await expect(page.locator('#hearts')).toHaveAttribute('data-needed', '2');
  await expect(page.locator('#treat-fish')).toHaveClass(/glow/);
  await timeATreat(page, 'berry');
  await expect(page.locator('#world')).toHaveAttribute('data-following', '1');

  for (const y of [5, 9, 13, 16]) await tapTile(page, 5, y);
  await expect(page.locator('#reunion-copy')).toContainText('home');
  await expect(page.locator('#reward')).toContainText('+10 coins');
  await page.click('#btn-town');
  await expect(page.locator('#stat-coins')).toHaveText('10 coins');
  await expect(page.locator('#job-pip')).toContainText('Home safe');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('easy shows an idle hint arrow; normal does not', async ({ page }) => {
  await start(page, 'easy');
  await page.click('#job-bramble');
  await page.click('#btn-enter');
  await expect(page.locator('#hint-arrow')).toBeVisible({ timeout: 8000 });

  await page.goto('./?debug=1&instant=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('#btn-tap-play').click({ force: true });
  await page.click('#diff-normal');
  await page.click('#btn-play');
  await page.click('#job-bramble');
  await page.click('#btn-enter');
  await page.waitForTimeout(4500);
  await expect(page.locator('#hint-arrow')).toBeHidden();
});

test('a wild pet can be calmed into the sanctuary', async ({ page }) => {
  await start(page, 'easy');
  await page.click('#job-pip');
  await page.click('#btn-enter');
  await tapTile(page, 3, 14);
  await dismissClue(page);
  await tapTile(page, 1, 14);
  await dismissClue(page);
  const hello = page.locator('#act-calm-wild');
  if (await hello.count()) await hello.click();
  for (let i = 0; i < 6; i++) {
    if (await page.locator('#sanctuary').count()) break;
    const again = page.locator('#act-calm-wild');
    if (await again.count()) await again.click();
    await expect(page.locator('#hearts')).toBeVisible();
    await timeATreat(page, 'berry');
  }
  await expect(page.locator('#sanctuary')).toBeVisible();
  await expect(page.locator('#sanctuary-new')).toBeVisible();
  await page.click('#btn-sanctuary-back');
  await expect(page.locator('#world')).toBeVisible();
});

test('a small phone shows every job and the grown-up gate', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./?debug=1&instant=1');
  await page.locator('#btn-tap-play').click({ force: true });
  const petsIn = await page.evaluate(() => {
    const app = document.querySelector('#app').getBoundingClientRect();
    return [...document.querySelectorAll('.peek')].every((el) => {
      const r = el.getBoundingClientRect();
      return r.top >= app.top - 1 && r.bottom <= app.bottom + 1 && r.left >= app.left - 1 && r.right <= app.right + 1;
    });
  });
  expect(petsIn).toBe(true);
  await page.click('#btn-play');
  const jobs = await page.evaluate(() => {
    const app = document.querySelector('#app').getBoundingClientRect();
    const footer = document.querySelector('footer.bar').getBoundingClientRect();
    return [...document.querySelectorAll('button.job')].map((el) => {
      const c = el.getBoundingClientRect();
      const title = el.querySelector('.jobtitle').getBoundingClientRect();
      const desc = el.querySelector('.jobdesc').getBoundingClientRect();
      const inside = (r) => r.top >= c.top - 1 && r.bottom <= c.bottom + 1 && r.left >= c.left - 1 && r.right <= c.right + 1;
      return {
        id: el.id,
        inside: inside(title) && inside(desc),
        onScreen: c.top >= app.top - 1 && c.bottom <= footer.top + 1 && c.left >= app.left - 1 && c.right <= app.right + 1,
      };
    });
  });
  expect(jobs.map((c) => c.id)).toEqual(['job-pip', 'job-bramble', 'job-luma']);
  for (const card of jobs) {
    expect(card.inside, card.id).toBe(true);
    expect(card.onScreen, card.id).toBe(true);
  }
  const labelFits = await page.locator('#btn-grownups').evaluate((el) => el.scrollWidth <= el.clientWidth + 2);
  expect(labelFits).toBe(true);
  await page.click('#btn-settings');
  const gate = await page.evaluate(() => {
    const app = document.querySelector('#app').getBoundingClientRect();
    const inside = (sel) => {
      const r = document.querySelector(sel).getBoundingClientRect();
      return r.height > 20 && r.top >= app.top - 1 && r.bottom <= app.bottom + 1 && r.left >= app.left - 1 && r.right <= app.right + 1;
    };
    return { head: inside('#gate h2'), back: inside('#btn-gate-back'), digit: inside('[data-digit="5"]') };
  });
  expect(gate).toEqual({ head: true, back: true, digit: true });
});

test('a purchase sheet stays hidden until the grown-up gate is passed', async ({ page }) => {
  await page.goto('./?debug=1&instant=1');
  await page.locator('#btn-tap-play').click({ force: true });
  await page.evaluate(() => {
    const state = window.__lph.fresh();
    state.rescues = 2;
    state.completedJobs = ['pip', 'bramble'];
    window.__lph.adopt(state);
  });
  const hidden = async () => {
    await expect(page.locator('#purchase-sheet')).toHaveCount(0);
    await expect(page.locator('#btn-buy')).toHaveCount(0);
    await expect(page.locator('#btn-restore')).toHaveCount(0);
    await expect(page.locator('#link-privacy')).toHaveCount(0);
    await expect(page.locator('#link-website')).toHaveCount(0);
    await expect(page.locator('#link-credits')).toHaveCount(0);
    await expect(page.locator('#btn-rate')).toHaveCount(0);
  };
  await hidden();
  await page.click('#job-luma');
  await expect(page.locator('#gate')).toBeVisible();
  await expect(page.locator('#gate-q')).toContainText('Type the answer:');
  await expect(page.locator('#gate-q')).not.toHaveText(/\d/);
  await hidden();
  await page.click('#btn-gate-back');
  await expect(page.locator('#job-luma')).toBeVisible();
  await hidden();
  await page.click('#job-luma');
  await page.click('#btn-check');
  await expect(page.locator('#gate-msg')).toContainText('grown-up');
  await hidden();
  await answerGate(page);
  await expect(page.locator('#purchase-sheet')).toBeVisible();
  await expect(page.locator('#price')).toHaveText('$9.99');
  await expect(page.locator('#btn-buy')).toBeVisible();
  await expect(page.locator('#btn-restore')).toBeVisible();
  await expect(page.locator('#link-privacy')).toBeVisible();
  await page.click('#btn-buy');
  await expect(page.locator('#purchase-note')).toContainText('Nothing is charged');
  await expect(page.locator('#btn-dev-unlock')).toHaveCount(0);
  await page.click('#btn-unlock-back');
  await page.click('#job-luma');
  await expect(page.locator('#gate')).toBeVisible();
  await hidden();
});
