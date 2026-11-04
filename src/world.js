// Wildwood is one small dungeon. The same geometry is used for every job.
// Puzzle answers (picture order, switch order, which fern) come from the job.
// Nothing here is a quest marker. Clues are sentences you walk over.

import { clueText } from './data.js';

export const MAP_ROWS = [
  '###########',
  '###..A..###',
  '###.....###',
  '###FFFFF###',
  '###.....###',
  '#####s#####',
  '##1.2.3..##',
  '####...####',
  '#####p#####',
  '####.P.####',
  '####...####',
  '###LLL#####',
  '###....C###',
  '####...####',
  '#W.......##',
  '####.S.####',
  '####.G.####',
  '###########',
];

// Clues sit across the whole choke of that row, so a tap-to-walk path cannot slip past them.
export const CLUE_SPOTS = [
  { id: 'paw', x: 5, y: 14, x0: 4, x1: 6 },
  { id: 'log', x: 5, y: 13, x0: 4, x1: 6 },
  { id: 'picture', x: 5, y: 10, x0: 4, x1: 6 },
  { id: 'switches', x: 5, y: 7, x0: 4, x1: 6 },
  { id: 'fern', x: 5, y: 4, x0: 4, x1: 6 },
  { id: 'favourite', x: 5, y: 2, x0: 3, x1: 7 },
];

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function createTrail(job) {
  const height = MAP_ROWS.length;
  const width = MAP_ROWS[0].length;
  const tiles = [];
  let fernIndex = 0;
  let start = null;
  let gate = null;
  let den = null;
  let grove = null;
  const switches = [];
  const ferns = [];
  let picture = null;
  let crawl = null;
  const logs = [];

  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      const ch = MAP_ROWS[y][x];
      const tile = { x, y, ch, kind: 'path' };
      if (ch === '#') tile.kind = 'tree';
      else if (ch === 'L') { tile.kind = 'log'; logs.push(tile); }
      else if (ch === 'C') { tile.kind = 'crawl'; crawl = { x, y }; }
      else if (ch === 'P') { tile.kind = 'picture'; picture = { x, y }; }
      else if (ch === 'p') tile.kind = 'pictureDoor';
      else if (ch === 's') tile.kind = 'switchDoor';
      else if (ch === 'F') {
        tile.kind = 'fern';
        tile.fernIndex = fernIndex;
        tile.opens = fernIndex === job.fernIndex;
        ferns.push(tile);
        fernIndex += 1;
      } else if (ch === '1' || ch === '2' || ch === '3') {
        tile.kind = 'switch';
        const symbol = ['moon', 'star', 'leaf'][Number(ch) - 1];
        tile.symbol = symbol;
        switches.push({ x, y, symbol });
      } else if (ch === 'A') { tile.kind = 'den'; den = { x, y }; }
      else if (ch === 'W') { tile.kind = 'grove'; grove = { x, y }; }
      else if (ch === 'S') { tile.kind = 'start'; start = { x, y }; }
      else if (ch === 'G') { tile.kind = 'gate'; gate = { x, y }; }
      const clue = CLUE_SPOTS.find((c) => c.y === y && x >= c.x0 && x <= c.x1);
      if (clue && tile.kind !== 'tree') tile.clueId = clue.id;
      row.push(tile);
    }
    tiles.push(row);
  }

  return {
    width, height, tiles, start, gate, den, grove, switches, ferns, picture, crawl, logs,
    fernIndex: job.fernIndex,
    hideSpot: { x: den.x, y: den.y + 1 },
    wildHide: { x: grove.x + 1, y: grove.y },
  };
}

export function tileAt(trail, x, y) {
  if (y < 0 || x < 0 || y >= trail.height || x >= trail.width) return null;
  return trail.tiles[y][x];
}

export function isWalkable(trail, solved, x, y) {
  const tile = tileAt(trail, x, y);
  if (!tile) return false;
  if (tile.kind === 'tree') return false;
  if (tile.kind === 'log') return !!solved.log;
  if (tile.kind === 'pictureDoor') return !!solved.picture;
  if (tile.kind === 'switchDoor') return !!solved.switches;
  if (tile.kind === 'fern') return !!(solved.fern && tile.opens);
  return true;
}

export function neighbors(trail, solved, x, y) {
  const out = [];
  for (const [dx, dy] of DIRS) {
    if (isWalkable(trail, solved, x + dx, y + dy)) out.push({ x: x + dx, y: y + dy });
  }
  return out;
}

export function pathTo(trail, solved, from, to) {
  if (from.x === to.x && from.y === to.y) return [{ ...from }];
  const key = (p) => p.x + ',' + p.y;
  const goal = key(to);
  const q = [{ ...from }];
  const prev = new Map([[key(from), null]]);
  while (q.length) {
    const cur = q.shift();
    for (const n of neighbors(trail, solved, cur.x, cur.y)) {
      const k = key(n);
      if (prev.has(k)) continue;
      prev.set(k, cur);
      if (k === goal) {
        const path = [n];
        let walk = cur;
        while (walk) { path.push({ x: walk.x, y: walk.y }); walk = prev.get(key(walk)); }
        path.reverse();
        return path;
      }
      q.push(n);
    }
  }
  return null;
}

/** Path to a blocked object: stop on the nearest walkable tile beside it. */
export function pathNear(trail, solved, from, to) {
  if (isWalkable(trail, solved, to.x, to.y)) return pathTo(trail, solved, from, to);
  let best = null;
  for (const [dx, dy] of DIRS) {
    const spot = { x: to.x + dx, y: to.y + dy };
    if (!isWalkable(trail, solved, spot.x, spot.y)) continue;
    const path = pathTo(trail, solved, from, spot);
    if (path && (!best || path.length < best.length)) best = path;
  }
  return best;
}

export function adjacent(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
}

export function standingOn(a, b) {
  return a.x === b.x && a.y === b.y;
}

export function reachableSet(trail, solved, origin) {
  const seen = new Set();
  const q = [{ ...origin }];
  seen.add(origin.x + ',' + origin.y);
  while (q.length) {
    const cur = q.shift();
    for (const n of neighbors(trail, solved, cur.x, cur.y)) {
      const k = n.x + ',' + n.y;
      if (seen.has(k)) continue;
      seen.add(k);
      q.push(n);
    }
  }
  return seen;
}

export function activeClueIds(difficulty) {
  return difficulty.clueIds;
}

export function clueOn(trail, job, difficulty, x, y) {
  const tile = tileAt(trail, x, y);
  if (!tile?.clueId) return null;
  if (!difficulty.clueIds.includes(tile.clueId)) return null;
  return { id: tile.clueId, text: clueText(job, tile.clueId, difficulty.id) };
}

/**
 * Next helpful spot for the Easy idle arrow.
 * Points along the trail. It is not drawn as a pin on the goal.
 * Normal mode never gets a suggestion.
 */
export function suggest(trail, job, difficulty, active) {
  if (!difficulty.hintArrows) return null;
  const solved = active.solved;
  const from = { x: active.x, y: active.y };
  if (active.following) return trail.gate;
  if (active.petWhere === 'hidden') return trail.hideSpot;

  for (const spot of CLUE_SPOTS) {
    if (!difficulty.clueIds.includes(spot.id)) continue;
    if (active.cluesFound.includes(spot.id)) continue;
    if (reachableSet(trail, solved, from).has(spot.x + ',' + spot.y)) return spot;
  }
  if (!solved.log) return { x: 5, y: 11, what: 'log' };
  if (!solved.picture) return trail.picture;
  if (!solved.switches) return trail.switches[0];
  if (!solved.fern) {
    const fern = trail.ferns.find((f) => f.opens) || trail.ferns[0];
    return { x: fern.x, y: fern.y, what: 'fern' };
  }
  if (active.petWhere === 'den') return trail.den;
  return null;
}

export function mapSketch(trail, solved) {
  return trail.tiles.map((row) => row.map((t) => (isWalkable(trail, solved, t.x, t.y) ? '.' : '#')).join('')).join('\n');
}
