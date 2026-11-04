import { describe, expect, it } from 'vitest';
import {
  COOLDOWN_MS, MAX_TRIES, cancelGate, checkAnswer, freshGate, isLocked, makeQuestion, submitAttempt,
} from '../src/gate.js';

const zero = () => 0;
const next = (() => { let i = 0; return () => (i++ % 7) / 7; })();

describe('parental gate', () => {
  it('asks a worded multiplication and never prints the digits', () => {
    const q = makeQuestion(zero);
    expect(q.prompt).toBe('Type the answer: two times two');
    expect(q.answer).toBe(4);
    expect(q.prompt).not.toMatch(/\d/);
    const other = makeQuestion(() => 0.99);
    expect(other.prompt).toBe('Type the answer: nine times nine');
    expect(other.answer).toBe(81);
    expect(other.prompt).not.toBe(q.prompt);
  });

  it('does not open a purchase until the answer is right', () => {
    let gate = freshGate();
    const q = makeQuestion(zero);
    const wrong = submitAttempt(gate, q, '1', 1_000);
    expect(wrong.purchase).toBe(false);
    expect(wrong.ok).toBe(false);
    expect(wrong.triesLeft).toBe(2);
    gate = wrong.gate;
    const again = submitAttempt(gate, q, '', 2_000);
    expect(again.purchase).toBe(false);
    const passed = submitAttempt(again.gate, q, '4', 3_000);
    expect(passed.purchase).toBe(true);
    expect(passed.ok).toBe(true);
    expect(cancelGate().purchase).toBe(false);
  });

  it('locks after 3 misses and still refuses a correct answer during the cooldown', () => {
    let gate = freshGate();
    const q = makeQuestion(next);
    let now = 10_000;
    for (let i = 0; i < MAX_TRIES - 1; i++) {
      const step = submitAttempt(gate, q, '0', now);
      expect(step.purchase).toBe(false);
      expect(step.reason).toBe('wrong');
      gate = step.gate;
      now += 10;
    }
    const failed = submitAttempt(gate, q, '0', now);
    expect(failed.purchase).toBe(false);
    expect(failed.reason).toBe('fail');
    expect(failed.message).toBe('Ask a grown-up!');
    expect(isLocked(failed.gate, now + 1)).toBe(true);
    expect(failed.gate.lockedUntil - now).toBe(COOLDOWN_MS);
    const sneaky = submitAttempt(failed.gate, q, String(q.answer), now + 1000);
    expect(sneaky.purchase).toBe(false);
    expect(sneaky.reason).toBe('cooldown');
    const later = submitAttempt(failed.gate, q, String(q.answer), now + COOLDOWN_MS + 1);
    expect(later.purchase).toBe(true);
    expect(checkAnswer(q, String(q.answer))).toBe(true);
  });
});
