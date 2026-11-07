import { describe, expect, it } from 'vitest';
import { followerPose, samplePath, walkMs } from '../src/motion.js';
import { beginJob, freshState, movePlayer, planMove } from '../src/game.js';
import { jobById } from '../src/data.js';
import { createTrail, isWalkable } from '../src/world.js';

describe('walking pose', () => {
  const path = [{ x: 5, y: 15 }, { x: 5, y: 14 }, { x: 5, y: 13 }];

  it('stands on the start, then the middle of the next square', () => {
    const start = samplePath(path, 0);
    expect(start.x).toBe(5);
    expect(start.y).toBe(15);
    const mid = samplePath(path, 0.25);
    expect(mid.x).toBe(5);
    expect(mid.y).toBeCloseTo(14.5);
    expect(mid.diry).toBe(-1);
    const end = samplePath(path, 1);
    expect(end.y).toBe(13);
  });

  it('hops the companion onto the square the hero just left', () => {
    const rest = { x: 5, y: 16 };
    const atStart = followerPose(path, 0, rest);
    expect(atStart.x).toBe(5);
    expect(atStart.y).toBe(16);
    expect(atStart.hop).toBe(0);
    const midHop = followerPose(path, 0.25, rest);
    expect(midHop.hop).toBeGreaterThan(0.9);
    const landed = followerPose(path, 1, rest);
    expect(landed.x).toBe(5);
    expect(landed.y).toBe(14);
    expect(landed.hop).toBe(0);
  });

  it('times one beat per square', () => {
    expect(walkMs(path)).toBe(420);
    expect(walkMs([{ x: 1, y: 1 }, { x: 2, y: 1 }])).toBe(210);
  });
});

describe('planned steps', () => {
  it('does not move the hero until the step is committed', () => {
    const state = freshState('easy');
    beginJob(state, 'pip', () => 0, { unlocked: true });
    const y = state.active.y;
    const plan = planMove(state, 5, 14);
    expect(plan.ok).toBe(true);
    expect(plan.path.length).toBeGreaterThan(1);
    expect(state.active.y).toBe(y);
    expect(plan.path.every((step, i) => i === 0 || step.y !== y || step.x !== state.active.x)).toBe(true);
  });

  it('queues the next step from the end of the current path', () => {
    const state = freshState('easy');
    beginJob(state, 'pip', () => 0, { unlocked: true });
    const first = planMove(state, 5, 14);
    const end = first.path[first.path.length - 1];
    const ghost = { ...state, active: { ...state.active, x: end.x, y: end.y } };
    const second = planMove(ghost, end.x, end.y - 1);
    expect(second.ok).toBe(true);
    expect(second.path[0]).toEqual({ x: end.x, y: end.y });
    const trail = createTrail(jobById('pip'));
    for (const step of second.path) {
      expect(isWalkable(trail, state.active.solved, step.x, step.y)).toBe(true);
    }
    movePlayer(state, 5, 14, first);
    expect(state.active.x).toBe(end.x);
    expect(state.active.y).toBe(end.y);
  });

  it('still refuses a step into the trees', () => {
    const state = freshState('easy');
    beginJob(state, 'pip', () => 0, { unlocked: true });
    const blocked = planMove(state, 0, 0);
    expect(blocked.ok).toBe(false);
    expect(state.active.x).toBe(5);
  });
});
