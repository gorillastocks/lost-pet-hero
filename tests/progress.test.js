import { describe, expect, it } from 'vitest';
import { canStartRescue, checkAnswer, isFullGameUnlocked, makeQuestion, rescuesLeft, setFullGameUnlocked } from '../src/progress.js';
import { memoryStore } from '../src/storage.js';

describe('full game gate', () => {
  const open = (rescues) => ({ rescues });

  it('allows two free rescues and then stops', () => {
    const store = memoryStore();
    expect(canStartRescue(open(0), false)).toBe(true);
    expect(canStartRescue(open(1), false)).toBe(true);
    expect(canStartRescue(open(2), false)).toBe(false);
    expect(rescuesLeft(open(2), false)).toBe(0);
    expect(isFullGameUnlocked(store)).toBe(false);
  });

  it('the unlock flag opens the rest and is named isFullGameUnlocked', () => {
    const store = memoryStore();
    setFullGameUnlocked(true, store);
    expect(isFullGameUnlocked(store)).toBe(true);
    expect(canStartRescue(open(2), true)).toBe(true);
    expect(rescuesLeft(open(9), true)).toBe(Infinity);
  });

  it('the grown-up question is simple addition', () => {
    const q = makeQuestion(() => 0);
    expect(q.answer).toBe(q.a + q.b);
    expect(q.a).toBeGreaterThanOrEqual(2);
    expect(checkAnswer(q, String(q.answer))).toBe(true);
    expect(checkAnswer(q, q.answer + 1)).toBe(false);
    expect(checkAnswer(q, 'nope')).toBe(false);
  });
});
