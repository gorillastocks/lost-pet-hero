import { describe, expect, it } from 'vitest';
import { animalById, jobById } from '../src/data.js';
import {
  beginJob, freshState, hintTarget, movePlayer, resolveOffer, statusLine, tapFern, tapLog, tapPicture, tapSwitch,
} from '../src/game.js';
import { createTrail } from '../src/world.js';

function playToDen(state, how) {
  const job = jobById(state.active.jobId);
  const trail = createTrail(job);
  const step = (x, y) => {
    const moved = movePlayer(state, x, y);
    expect(moved.ok, `${x},${y} ${moved.reason || ''}`).toBe(true);
  };
  step(trail.crawl.x, trail.crawl.y);
  if (how === 'climb') expect(tapLog(state, 'climb').ok).toBe(true);
  else {
    expect(tapLog(state, 'climb').ok).toBe(false);
    expect(tapLog(state, 'crawl').ok).toBe(true);
  }
  step(trail.picture.x, trail.picture.y);
  if (how === 'climb') {
    expect(tapPicture(state, job.pictureOrder[0]).ok).toBe(true);
  } else {
    expect(tapPicture(state, 'fish' === job.pictureOrder[0] ? 'paw' : 'fish').ok).toBe(false);
    expect(state.active.pictureSeq).toEqual([]);
    for (const symbol of job.pictureOrder) expect(tapPicture(state, symbol).ok).toBe(true);
  }
  step(5, 6);
  if (how === 'climb') {
    expect(tapSwitch(state, job.switchOrder[0]).ok).toBe(true);
  } else {
    expect(tapSwitch(state, job.switchOrder[1]).ok).toBe(false);
    expect(state.active.switchSeq).toEqual([]);
    for (const symbol of job.switchOrder) expect(tapSwitch(state, symbol).ok).toBe(true);
  }
  step(5, 4);
  expect(tapFern(state, (job.fernIndex + 1) % 5).ok).toBe(false);
  expect(state.active.solved.fern).toBe(false);
  expect(tapFern(state, job.fernIndex).ok).toBe(true);
  step(trail.den.x, trail.den.y);
}

describe('a full rescue', () => {
  it('easy: owner item starts a heart, one good tap finishes a common pet, reunion pays', () => {
    const state = freshState('easy');
    const started = beginJob(state, 'pip', () => 0);
    expect(started.ok).toBe(true);
    expect(started.itemId).toBe('scarf');
    expect(state.active.petHearts).toBe(1);
    expect(hintTarget(state)).toBeTruthy();
    expect(state.active.cluesFound).toEqual([]);
    playToDen(state, 'climb');
    expect(state.active.cluesFound).toEqual(['paw', 'log']);
    expect(statusLine(state)).toMatch(/Pip/);

    const miss = resolveOffer(state, { target: 'pet', kind: 'treat', id: 'fish', phase: 0.01 });
    expect(miss.ok).toBe(false);
    expect(state.active.petHearts).toBe(1);
    expect(state.active.petWhere).toBe('hidden');
    expect(state.active.treats.fish).toBe(6);

    const hit = resolveOffer(state, { target: 'pet', kind: 'treat', id: 'berry', phase: 0.5 });
    expect(hit.ok).toBe(true);
    expect(state.active.following).toBe(true);
    expect(state.active.treats.berry).toBe(5);

    const gate = movePlayer(state, 5, 16);
    expect(gate.events.some((e) => e.type === 'reunion')).toBe(true);
    expect(state.rescues).toBe(1);
    expect(state.coins).toBe(10);
    expect(state.kindness).toBe(1);
    expect(state.completedJobs).toEqual(['pip']);
    expect(state.active).toBeNull();
  });

  it('normal: deduces the favourite, keeps hearts on a wrong snack, needs every heart', () => {
    const state = freshState('normal');
    beginJob(state, 'luma', () => 0.9);
    expect(hintTarget(state)).toBeNull();
    playToDen(state, 'crawl');
    expect(state.active.cluesFound).toContain('favourite');
    expect(state.active.cluesFound).toContain('picture');
    expect(state.active.petHearts).toBe(1);

    const wrong = resolveOffer(state, { target: 'pet', kind: 'treat', id: 'fish', phase: 0.5 });
    expect(wrong.reason).toBe('favourite');
    expect(state.active.petHearts).toBe(1);
    expect(state.active.treats.fish).toBe(6);
    expect(state.active.petWhere).toBe('hidden');

    const animal = animalById('luma');
    expect(animal.favourite).toEqual({ kind: 'tune', id: 'moon' });
    let guard = 0;
    while (!state.active.following && guard < 6) {
      const hit = resolveOffer(state, { target: 'pet', kind: 'tune', id: 'moon', phase: 0.5 });
      expect(hit.ok).toBe(true);
      guard += 1;
    }
    expect(guard).toBe(3);
    expect(state.active.petHearts).toBe(4);
    movePlayer(state, 5, 16);
    expect(state.coins).toBe(35);
    expect(state.kindness).toBe(3);
    expect(state.rescues).toBe(1);
  });

  it('a wild pet goes to the sanctuary and does not count as a rescue', () => {
    const state = freshState('easy');
    beginJob(state, 'bramble', () => 0);
    expect(state.active.wildId).toBe('dew');
    const first = resolveOffer(state, { target: 'wild', kind: 'treat', id: 'berry', phase: 0.5 });
    expect(first.done).toBe(false);
    expect(state.sanctuary).toEqual([]);
    const second = resolveOffer(state, { target: 'wild', kind: 'treat', id: 'fish', phase: 0.5 });
    expect(second.done).toBe(true);
    expect(state.sanctuary).toEqual(['dew']);
    expect(state.kindness).toBe(1);
    expect(state.rescues).toBe(0);
    expect(state.active.pending).toBe('sanctuary');
    expect(state.active.jobId).toBe('bramble');
  });

  it('the third rescue needs the unlock flag', () => {
    const state = freshState('easy');
    state.rescues = 2;
    state.completedJobs = ['pip', 'bramble'];
    expect(beginJob(state, 'luma').reason).toBe('gate');
    expect(state.active).toBeNull();
    expect(beginJob(state, 'luma', Math.random, { unlocked: true }).ok).toBe(true);
    expect(state.active.petHearts).toBe(1);
  });
});
