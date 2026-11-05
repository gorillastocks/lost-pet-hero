// All tuneable content lives here. Gameplay code reads these tables and does not
// hard-code animal names, heart counts, puzzle orders, or difficulty numbers.

export const HEARTS_BY_RARITY = { common: 2, uncommon: 3, rare: 4 };

export const REWARDS = {
  common: { coins: 10, kindness: 1 },
  uncommon: { coins: 20, kindness: 2 },
  rare: { coins: 35, kindness: 3 },
};

export const WILD_KINDNESS = 1;

export const REUNION_MS = 5200;

/** Cosmetic, treat, or sanctuary decor. One per lost pet, awarded at the cottage. */
export const PRIZES = {
  pip: { id: 'fish-tin', name: 'Fish biscuit tin', kind: 'treat', blurb: 'A shiny tin of fish biscuits.' },
  bramble: { id: 'cushion', name: 'Cozy cushion', kind: 'decor', blurb: 'A plump cushion for the sanctuary.' },
  luma: { id: 'star-ribbon', name: 'Star ribbon', kind: 'cosmetic', blurb: 'A ribbon that glitters like night.' },
};

export function prizeFor(jobId) {
  return PRIZES[jobId] || PRIZES.pip;
}

/** Where the reunion animation is. `t` is milliseconds since it started. */
export function reunionPhase(t) {
  const u = Math.min(1, Math.max(0, t / REUNION_MS));
  if (u < 0.12) return 'wait';
  if (u < 0.55) return 'run';
  if (u < 0.72) return 'hug';
  if (u < 1) return 'hearts';
  return 'card';
}

export const FREE_RESCUES = 2;

export const FULL_GAME_PRICE = '$9.99';

export const TREATS = [
  { id: 'fish', name: 'Fish biscuit', short: 'Fish' },
  { id: 'bone', name: 'Peanut bone', short: 'Bone' },
  { id: 'berry', name: 'Berry cluster', short: 'Berry' },
];

export const TUNES = [
  { id: 'moon', name: 'Moon whistle', short: 'Moon' },
  { id: 'brook', name: 'Brook song', short: 'Brook' },
  { id: 'leaf', name: 'Leaf chime', short: 'Leaf' },
];

export const ITEMS = {
  scarf: { id: 'scarf', name: 'red scarf', sentence: "Pip's red scarf" },
  ball: { id: 'ball', name: 'squeaky ball', sentence: "Bramble's squeaky ball" },
  bell: { id: 'bell', name: 'silver bell', sentence: "Luma's silver bell" },
};

export const ANIMALS = [
  {
    id: 'pip', name: 'Pip', kind: 'kitten', rarity: 'common', role: 'lost',
    favourite: { kind: 'treat', id: 'fish' },
    scared: 'Pip is tucked small, ears flat.',
    calm: 'Pip leans into you and purrs.',
  },
  {
    id: 'bramble', name: 'Bramble', kind: 'puppy', rarity: 'uncommon', role: 'lost',
    favourite: { kind: 'treat', id: 'bone' },
    scared: 'Bramble is shivering behind a root.',
    calm: 'Bramble wags, slow and happy.',
  },
  {
    id: 'luma', name: 'Luma', kind: 'owl', rarity: 'rare', role: 'lost',
    favourite: { kind: 'tune', id: 'moon' },
    scared: 'Luma is puffed up on a low branch.',
    calm: 'Luma blinks slowly, which is owl for yes.',
  },
  {
    id: 'dew', name: 'Dew', kind: 'frog', rarity: 'common', role: 'wild',
    favourite: { kind: 'treat', id: 'berry' },
    scared: 'Dew is a still green pebble with eyes.',
    calm: 'Dew hops once, then stays close.',
  },
  {
    id: 'fern', name: 'Fern', kind: 'fox', rarity: 'uncommon', role: 'wild',
    favourite: { kind: 'treat', id: 'bone' },
    scared: 'Fern watches you from the ferns.',
    calm: 'Fern pads over and sits on your boot.',
  },
  {
    id: 'star', name: 'Starling', kind: 'bird', rarity: 'rare', role: 'wild',
    favourite: { kind: 'tune', id: 'brook' },
    scared: 'Starling flicks a bright tail and waits.',
    calm: 'Starling settles on your shoulder.',
  },
];

export const JOBS = [
  {
    id: 'pip',
    animalId: 'pip',
    owner: 'Nana Moss',
    ownerHue: 18,
    itemId: 'scarf',
    card: 'Pip the kitten slipped out after breakfast.',
    grant: 'Nana Moss lends you Pip\'s red scarf. Pip will know it.',
    reunion: 'Nana Moss kneels. Pip runs into the red scarf and purrs. You brought Pip home.',
    pictureOrder: ['paw', 'fish', 'heart'],
    switchOrder: ['moon', 'star', 'leaf'],
    fernIndex: 2,
    clues: {
      paw: 'Tiny orange paw prints point north, into Wildwood.',
      log: {
        easy: 'A red thread is caught on the log. It is low enough to climb.',
        normal: 'The log is too tall to climb. A dark gap waits on the sunrise side.',
      },
      picture: 'The stone pictures go paw, then fish, then heart.',
      switches: 'Press the moon, then the star, then the leaf.',
      fern: 'The middle fern is wiggling.',
      favourite: 'Fish bones, not berries. Pip only nibbles fish biscuits.',
    },
  },
  {
    id: 'bramble',
    animalId: 'bramble',
    owner: 'Coach Wren',
    ownerHue: 200,
    itemId: 'ball',
    card: 'Bramble the puppy chased a bird and got lost.',
    grant: 'Coach Wren hands you Bramble\'s squeaky ball. It still smells like home.',
    reunion: 'Coach Wren whistles. Bramble barrels into a hug. The ball squeaks. Home.',
    pictureOrder: ['bone', 'paw', 'heart'],
    switchOrder: ['leaf', 'moon', 'star'],
    fernIndex: 0,
    clues: {
      paw: 'Big muddy paw prints head north. A tail brushed the grass.',
      log: {
        easy: 'Bramble\'s ball-string is on the log. You can climb it.',
        normal: 'Claw marks stop at the log. The sunrise side has a crawl gap.',
      },
      picture: 'The stone pictures go bone, then paw, then heart.',
      switches: 'Press the leaf, then the moon, then the star.',
      fern: 'The fern on the sunset side is bent, like a puppy slid through.',
      favourite: 'Peanut smears on a root. Bramble wants the peanut bone, not fish.',
    },
  },
  {
    id: 'luma',
    animalId: 'luma',
    owner: 'Keeper Sol',
    ownerHue: 265,
    itemId: 'bell',
    card: 'Luma the owl glided into Wildwood at dusk.',
    grant: 'Keeper Sol gives you Luma\'s silver bell. It rings like a soft hello.',
    reunion: 'Keeper Sol lifts an arm. Luma lands, bell chiming. The woods feel kind.',
    pictureOrder: ['bell', 'leaf', 'heart'],
    switchOrder: ['star', 'leaf', 'moon'],
    fernIndex: 4,
    clues: {
      paw: 'Soft feather-prints and a downy feather point north.',
      log: {
        easy: 'A pale feather rests on the log. Climb over, quiet as an owl.',
        normal: 'Luma flew the log. You cannot. The sunrise gap is the way through.',
      },
      picture: 'The stone pictures go bell, then leaf, then heart.',
      switches: 'Press the star, then the leaf, then the moon.',
      fern: 'The fern on the sunrise side has a white feather in it.',
      favourite: 'Luma sings back to the moon whistle. The brook song is just a brook.',
    },
  },
];

export const PICTURES = [
  { id: 'paw', name: 'Paw' },
  { id: 'fish', name: 'Fish' },
  { id: 'heart', name: 'Heart' },
  { id: 'bone', name: 'Bone' },
  { id: 'bell', name: 'Bell' },
  { id: 'leaf', name: 'Leaf' },
];

export const SWITCH_SYMBOLS = [
  { id: 'moon', name: 'Moon' },
  { id: 'star', name: 'Star' },
  { id: 'leaf', name: 'Leaf' },
];

/** Easy keeps two clue steps. Normal uses every clue, including the favourite. */
export const DIFFICULTY = {
  easy: {
    id: 'easy',
    label: 'Easy',
    blurb: 'Glowing hints, a wide slow tap, and spoken help.',
    hintArrows: true,
    clueGlow: true,
    spokenHints: true,
    simplePuzzles: true,
    showFavourite: true,
    deduceTreat: false,
    timingZone: 0.42,
    timingPeriodMs: 3000,
    idleMs: 4000,
    clueIds: ['paw', 'log'],
  },
  normal: {
    id: 'normal',
    label: 'Normal',
    blurb: 'More clues, multi-step puzzles, and you figure out the favourite.',
    hintArrows: false,
    clueGlow: false,
    spokenHints: false,
    simplePuzzles: false,
    showFavourite: false,
    deduceTreat: true,
    timingZone: 0.22,
    timingPeriodMs: 1700,
    idleMs: 4000,
    clueIds: ['paw', 'log', 'picture', 'switches', 'fern', 'favourite'],
  },
};

export const KINDNESS_TITLES = [
  { at: 0, title: 'Visitor' },
  { at: 1, title: 'New helper' },
  { at: 3, title: 'Kind helper' },
  { at: 6, title: "Town's friend" },
];

export const animalById = (id) => ANIMALS.find((a) => a.id === id) || null;
export const jobById = (id) => JOBS.find((j) => j.id === id) || null;
export const treatById = (id) => TREATS.find((t) => t.id === id) || null;
export const tuneById = (id) => TUNES.find((t) => t.id === id) || null;

export function heartsNeeded(animal) {
  return HEARTS_BY_RARITY[animal.rarity] ?? 2;
}

export function clueText(job, clueId, difficulty) {
  const raw = job.clues[clueId];
  if (raw && typeof raw === 'object') return raw[difficulty] || raw.normal || raw.easy || '';
  return raw || '';
}

export function kindnessTitle(n) {
  let title = KINDNESS_TITLES[0].title;
  for (const row of KINDNESS_TITLES) if (n >= row.at) title = row.title;
  return title;
}

export function favouriteName(animal) {
  if (animal.favourite.kind === 'treat') return treatById(animal.favourite.id)?.name || 'a snack';
  return tuneById(animal.favourite.id)?.name || 'a tune';
}

/** Pictures shown for a job. Easy still shows the set, and the first one is the simple answer. */
export function pictureChoices(job) {
  return job.pictureOrder.map((id) => PICTURES.find((p) => p.id === id)).filter(Boolean);
}
