// Free play is two reunions. After that, a grown-up answers a math question and
// sees the full-game card. The card does not charge anyone. Only the
// isFullGameUnlocked flag (set by the dev preview, or a future purchase) opens more.

import { FREE_RESCUES } from './data.js';

export const FULL_KEY = 'lostpet.full';

export function isFullGameUnlocked(storage) {
  try { return storage?.getItem(FULL_KEY) === '1'; } catch { return false; }
}

export function setFullGameUnlocked(on, storage) {
  if (!storage) return;
  if (on) storage.setItem(FULL_KEY, '1');
  else storage.removeItem(FULL_KEY);
}

export function rescuesLeft(state, unlocked) {
  if (unlocked) return Infinity;
  return Math.max(0, FREE_RESCUES - (state.rescues || 0));
}

export function canStartRescue(state, unlocked) {
  return rescuesLeft(state, unlocked) > 0;
}

/** True only in a Vite dev server. Production builds replace import.meta.env.DEV. */
export function devUnlockAvailable() {
  return import.meta.env.DEV === true;
}

export function makeQuestion(rng = Math.random) {
  const a = 2 + Math.floor(rng() * 5);
  const b = 2 + Math.floor(rng() * 5);
  return { a, b, answer: a + b, prompt: `What is ${a} + ${b}?` };
}

export function checkAnswer(question, value) {
  if (!question) return false;
  const n = Number(String(value).trim());
  return Number.isFinite(n) && n === question.answer;
}
