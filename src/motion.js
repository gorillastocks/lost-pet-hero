// Visual walking. Game rules still move one planned path at a time.
// A path always includes the starting tile.

export const STEP_MS = 210;
export const QUEUE_LIMIT = 8;

export function samplePath(path, t) {
  const steps = Math.max(0, path.length - 1);
  const clamped = Math.min(1, Math.max(0, t));
  if (steps === 0) {
    return { x: path[0].x, y: path[0].y, frac: 0, dirx: 0, diry: 1, index: 0 };
  }
  const dist = clamped * steps;
  let index = Math.floor(dist);
  let frac = dist - index;
  if (index >= steps) {
    index = steps - 1;
    frac = 1;
  }
  const a = path[index];
  const b = path[index + 1];
  const dirx = Math.sign(b.x - a.x);
  const diry = Math.sign(b.y - a.y);
  return {
    x: a.x + (b.x - a.x) * frac,
    y: a.y + (b.y - a.y) * frac,
    frac,
    dirx,
    diry,
    index,
  };
}

/** Where the companion stands one tile behind the hero, hopping between squares. */
export function followerPose(path, t, rest) {
  const steps = Math.max(1, path.length - 1);
  const dist = Math.min(steps, Math.max(0, t) * steps);
  const landed = behind(path, dist);
  if (dist >= 1 || !rest) return landed;
  const atFirstStep = behind(path, 1);
  return {
    x: rest.x + (atFirstStep.x - rest.x) * dist,
    y: rest.y + (atFirstStep.y - rest.y) * dist,
    hop: Math.sin(dist * Math.PI),
  };
}

function behind(path, dist) {
  const steps = Math.max(1, path.length - 1);
  if (dist <= 1) {
    return {
      x: path[0].x,
      y: path[0].y,
      hop: Math.sin(Math.max(0, dist) * Math.PI),
    };
  }
  const pose = samplePath(path, (dist - 1) / steps);
  return { x: pose.x, y: pose.y, hop: Math.sin(pose.frac * Math.PI) };
}

export function walkMs(path, stepMs = STEP_MS) {
  return Math.max(stepMs, Math.max(0, path.length - 1) * stepMs);
}
