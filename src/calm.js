// Calming rules. One timing tap per treat or tune. A miss never ends the rescue:
// the animal hides nearby, hearts stay, and a treat comes back.

import { heartsNeeded } from './data.js';

/** The green band sits in the middle of the track. `phase` is 0..1 along one loop. */
export function inZone(phase, zone) {
  const p = ((Number(phase) % 1) + 1) % 1;
  const width = Math.min(0.95, Math.max(0.05, zone));
  const start = 0.5 - width / 2;
  return p >= start && p <= start + width;
}

export function zoneBand(zone) {
  const width = Math.min(0.95, Math.max(0.05, zone));
  return { start: 0.5 - width / 2, end: 0.5 + width / 2 };
}

export function isFavourite(animal, kind, id) {
  return animal.favourite.kind === kind && animal.favourite.id === id;
}

/**
 * Resolve one offer.
 * Easy (`deduceTreat: false`): any treat or tune can fill a heart if the tap lands.
 * Normal: only the favourite fills a heart, and the tap still has to land.
 * A miss returns the treat (we never take it) and asks the caller to hide the animal.
 */
export function judgeOffer({ animal, kind, id, phase, difficulty, hearts, treatCount }) {
  const needed = heartsNeeded(animal);
  const timed = inZone(phase, difficulty.timingZone);
  const right = difficulty.deduceTreat ? isFavourite(animal, kind, id) : true;
  const starting = { hearts, needed, treatCount };

  if (kind === 'treat' && (treatCount ?? 1) <= 0) {
    return { ...starting, ok: false, reason: 'empty', hide: false, consume: false, done: false };
  }

  if (!right) {
    return {
      ...starting, ok: false, reason: 'favourite', hide: true, consume: false, done: false,
    };
  }
  if (!timed) {
    return {
      ...starting, ok: false, reason: 'timing', hide: true, consume: false, done: false,
    };
  }
  const next = Math.min(needed, hearts + 1);
  return {
    hearts: next,
    needed,
    treatCount: kind === 'treat' ? Math.max(0, (treatCount ?? 1) - 1) : treatCount,
    ok: true,
    reason: 'heart',
    hide: false,
    consume: kind === 'treat',
    done: next >= needed,
  };
}

export function offerMessage(animal, result, { kind, id, label }) {
  if (result.reason === 'empty') return `The ${label} bag is empty.`;
  if (result.reason === 'favourite') {
    return `${animal.name} sniffs the ${label} and ducks into the leaves. Hearts stay. It is back in your bag.`;
  }
  if (result.reason === 'timing') {
    return `The tap was outside the green. ${animal.name} hid nearby. Hearts stay, and the ${label} comes back.`;
  }
  if (result.done) return `${animal.name} is calm and ready to trust you.`;
  const left = result.needed - result.hearts;
  return `A face turns into a heart. ${left === 1 ? 'One face left.' : left + ' faces left.'}`;
}
