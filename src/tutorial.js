// Practice rescue. It is offered once, can be replayed, and never spends a free rescue.

export const TUTORIAL_KEY = 'lostpet.tutorial';

export const TUTORIAL_STEPS = ['hero', 'job', 'walk', 'clue', 'calm', 'home'];

export const WALK_TILE = { x: 5, y: 14 };
export const HOME_TILE = { x: 5, y: 16 };
export const START_TILE = { x: 5, y: 15 };

const COPY = {
  hero: {
    id: 'tutor-hero',
    text: 'This is your hero. Tap Continue when you are ready.',
    easy: 'tutor-hero-easy',
    easyText: 'This is your hero. You can tap a different picture first. Then tap Continue.',
  },
  job: {
    id: 'tutor-job',
    text: 'Pebble is lost. Tap Pebble\'s card.',
    easy: 'tutor-job-easy',
    easyText: 'Pebble is lost. Tap the card with Pebble\'s picture.',
  },
  walk: {
    id: 'tutor-walk',
    text: 'Tap the glowing tile.',
    easy: 'tutor-walk-easy',
    easyText: 'Tap the glowing tile. It is the bright circle on the path.',
  },
  clue: {
    id: 'tutor-clue',
    text: 'A picture clue! Tap OK.',
    easy: 'tutor-clue-easy',
    easyText: 'A picture clue! The picture shows paws. Tap OK.',
  },
  calm: {
    id: 'tutor-calm',
    text: 'Tap a snack. Then tap when the star is in the green.',
    easy: 'tutor-calm-easy',
    easyText: 'Tap any snack. The green zone is big. Then tap the button.',
  },
  home: {
    id: 'tutor-home',
    text: 'Walk Pebble to the cottage.',
    easy: 'tutor-home-easy',
    easyText: 'Walk Pebble south to the little house.',
  },
};

export function readTutorial(raw) {
  try {
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return { offered: data?.offered === true, completed: data?.completed === true };
  } catch {
    return { offered: false, completed: false };
  }
}

export function shouldOffer(record) {
  return !record?.offered && !record?.completed;
}

export function rememberOffer(record, choice) {
  return { offered: true, completed: record?.completed === true, playing: choice === 'yes' };
}

export function rememberComplete(record) {
  return { offered: true, completed: true, playing: false };
}

export function replayTutorial(record) {
  return { offered: true, completed: record?.completed === true, playing: true };
}

export function nextStep(step) {
  const i = TUTORIAL_STEPS.indexOf(step);
  if (i < 0 || i >= TUTORIAL_STEPS.length - 1) return 'done';
  return TUTORIAL_STEPS[i + 1];
}

export function coachCopy(step, easy) {
  const row = COPY[step] || COPY.hero;
  if (easy && row.easy) return { id: row.easy, text: row.easyText };
  return { id: row.id, text: row.text };
}

/** Wrong taps are ignored. `ready` is false until Got it. */
export function allows(step, action, ready) {
  if (!ready) return false;
  if (step === 'hero') return action === 'hero' || action === 'hero-continue';
  if (step === 'job') return action === 'job-pebble' || action === 'enter-woods';
  if (step === 'walk') return action === `tile:${WALK_TILE.x},${WALK_TILE.y}`;
  if (step === 'clue') return action === 'clue-ok';
  if (step === 'calm') return action === 'treat' || action === 'tap-green';
  if (step === 'home') return action === `tile:${HOME_TILE.x},${HOME_TILE.y}`;
  return false;
}

export function loadTutorial(store) {
  try { return readTutorial(store?.getItem(TUTORIAL_KEY)); }
  catch { return readTutorial(null); }
}

export function saveTutorial(store, record) {
  const next = {
    offered: record?.offered === true,
    completed: record?.completed === true,
  };
  try { store?.setItem(TUTORIAL_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}
