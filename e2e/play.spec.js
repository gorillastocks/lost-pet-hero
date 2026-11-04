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

test('after two rescues a grown-up sees the $9.99 card and nothing is unlocked', async ({ page }) => {
  await page.goto('./?debug=1&instant=1');
  await page.locator('#btn-tap-play').click({ force: true });
  await page.evaluate(() => {
    const state = window.__lph.fresh();
    state.rescues = 2;
    state.completedJobs = ['pip', 'bramble'];
    window.__lph.adopt(state);
  });
  await page.click('#job-luma');
  await expect(page.locator('#gate')).toBeVisible();
  await page.click('#btn-check');
  await expect(page.locator('#gate-msg')).toContainText('grown-up');
  await answerGate(page);
  await expect(page.locator('#price')).toHaveText('$9.99');
  await expect(page.locator('#btn-not-for-sale')).toBeDisabled();
  await expect(page.locator('#btn-dev-unlock')).toHaveCount(0);
  await page.click('#btn-unlock-back');
  await page.click('#job-luma');
  await expect(page.locator('#gate')).toBeVisible();
});
