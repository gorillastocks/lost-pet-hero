import { describe, expect, it } from 'vitest';
import { JOBS, DIFFICULTY } from '../src/data.js';
import {
  createTrail, isWalkable, pathTo, reachableSet, suggest, CLUE_SPOTS, MAP_ROWS,
} from '../src/world.js';

const none = { log: false, picture: false, switches: false, fern: false };
const all = { log: true, picture: true, switches: true, fern: true };

function reach(trail, solved, origin) {
  return reachableSet(trail, solved, origin);
}

describe('Wildwood trail', () => {
  it('is a rectangle with no quest-marker tiles', () => {
    const width = MAP_ROWS[0].length;
    for (const row of MAP_ROWS) expect(row.length).toBe(width);
    const blob = JSON.stringify(createTrail(JOBS[0]));
    expect(blob).not.toMatch(/questMarker|waypoint|objectivePin/i);
  });

  it('gates the den behind log, pictures, switches, and the hidden fern', () => {
    const trail = createTrail(JOBS[0]);
    const start = trail.start;
    let solved = { ...none };
    let seen = reach(trail, solved, start);
    expect(seen.has(`${trail.den.x},${trail.den.y}`)).toBe(false);
    expect(seen.has(`${trail.grove.x},${trail.grove.y}`)).toBe(true);
    expect(seen.has(`${trail.gate.x},${trail.gate.y}`)).toBe(true);
    expect(seen.has(`${trail.crawl.x},${trail.crawl.y}`)).toBe(true);

    solved = { ...solved, log: true };
    seen = reach(trail, solved, start);
    expect(seen.has(`${trail.picture.x},${trail.picture.y}`)).toBe(true);
    expect(seen.has(`${trail.den.x},${trail.den.y}`)).toBe(false);

    solved = { ...solved, picture: true };
    seen = reach(trail, solved, start);
    expect(trail.switches.every((s) => seen.has(`${s.x},${s.y}`))).toBe(true);
    expect(seen.has('5,4')).toBe(false);

    solved = { ...solved, switches: true };
    seen = reach(trail, solved, start);
    expect(seen.has('5,4')).toBe(true);
    expect(seen.has(`${trail.den.x},${trail.den.y}`)).toBe(false);

    solved = { ...solved, fern: true };
    seen = reach(trail, solved, start);
    expect(seen.has(`${trail.den.x},${trail.den.y}`)).toBe(true);
    expect(pathTo(trail, solved, trail.den, trail.gate)).toBeTruthy();
  });

  it('opens only the job\'s fern', () => {
    for (const job of JOBS) {
      const trail = createTrail(job);
      expect(trail.ferns).toHaveLength(5);
      const solved = { ...all };
      for (const fern of trail.ferns) {
        expect(isWalkable(trail, solved, fern.x, fern.y)).toBe(fern.fernIndex === job.fernIndex);
      }
    }
  });

  it('puts every clue on a tile you can stand on before the den', () => {
    const trail = createTrail(JOBS[0]);
    const solved = { ...all, fern: false };
    const seen = reach(trail, solved, trail.start);
    for (const spot of CLUE_SPOTS) {
      if (spot.id === 'favourite') {
        expect(reach(trail, all, trail.start).has(`${spot.x},${spot.y}`)).toBe(true);
      } else {
        expect(seen.has(`${spot.x},${spot.y}`), spot.id).toBe(true);
      }
    }
  });

  it('suggests a hint on easy and nothing on normal', () => {
    const job = JOBS[0];
    const trail = createTrail(job);
    const active = {
      x: trail.start.x, y: trail.start.y, solved: { ...none }, cluesFound: [],
      following: false, petWhere: 'den',
    };
    expect(suggest(trail, job, DIFFICULTY.normal, active)).toBeNull();
    const hint = suggest(trail, job, DIFFICULTY.easy, active);
    expect(hint).toBeTruthy();
    expect(hint.id).toBe('paw');
  });
});
