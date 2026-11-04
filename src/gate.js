// Parental gate for App Store guideline 1.3 and the Kids category.
// A child should not be able to guess it: the factors are words, not digits,
// and the sum is a product from 2×2 through 9×9. Three misses start a cooldown.
// Nothing that spends money or leaves the app may open unless `purchase` is true.

export const MAX_TRIES = 3;
export const COOLDOWN_MS = 30_000;

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

export function numberWord(n) {
  return WORDS[n] || String(n);
}

/** A fresh gate. `passed` is never stored: each visit must be answered again. */
export function freshGate() {
  return { triesLeft: MAX_TRIES, lockedUntil: 0 };
}

export function isLocked(gate, now) {
  return (gate?.lockedUntil || 0) > now;
}

export function cooldownLeft(gate, now) {
  return Math.max(0, (gate?.lockedUntil || 0) - now);
}

/**
 * "Type the answer: seven times four" — the digits never appear in the prompt.
 * Factors are 2–9 so the answer is 4–81 and fits the number pad.
 */
export function makeQuestion(rng = Math.random) {
  const a = 2 + Math.floor(rng() * 8);
  const b = 2 + Math.floor(rng() * 8);
  return {
    a,
    b,
    answer: a * b,
    prompt: `Type the answer: ${numberWord(a)} times ${numberWord(b)}`,
  };
}

export function checkAnswer(question, value) {
  if (!question) return false;
  const n = Number(String(value ?? '').trim());
  return Number.isFinite(n) && n === question.answer;
}

/**
 * One attempt. `purchase` is true only for a correct answer while the gate is open.
 * A wrong answer never opens a purchase. The third wrong answer starts the cooldown.
 */
export function submitAttempt(gate, question, value, now) {
  const current = gate || freshGate();
  if (isLocked(current, now)) {
    return { gate: current, ok: false, purchase: false, reason: 'cooldown', message: 'Ask a grown-up!' };
  }
  if (checkAnswer(question, value)) {
    return {
      gate: freshGate(),
      ok: true,
      purchase: true,
      reason: 'pass',
      message: '',
    };
  }
  const triesLeft = (current.triesLeft ?? MAX_TRIES) - 1;
  if (triesLeft <= 0) {
    return {
      gate: { triesLeft: MAX_TRIES, lockedUntil: now + COOLDOWN_MS },
      ok: false,
      purchase: false,
      reason: 'fail',
      message: 'Ask a grown-up!',
    };
  }
  return {
    gate: { triesLeft, lockedUntil: 0 },
    ok: false,
    purchase: false,
    reason: 'wrong',
    triesLeft,
    message: 'Ask a grown-up!',
  };
}

/** Back or closing the gate. Never a purchase. */
export function cancelGate() {
  return { ok: false, purchase: false, reason: 'cancel' };
}
