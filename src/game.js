// Session rules: jobs, walking, puzzles, calming, reunion, sanctuary.
// The UI draws. This module only changes plain data, so tests can play a whole rescue.

import {
  DIFFICULTY, JOBS, REWARDS, WILD_KINDNESS, animalById, jobById, treatById, tuneById,
  heartsNeeded, favouriteName, clueText,
} from './data.js';
import {
  createTrail, pathTo, pathNear, isWalkable, adjacent, standingOn, clueOn, suggest, tileAt,
} from './world.js';
import { judgeOffer, offerMessage } from './calm.js';
import { canStartRescue } from './progress.js';

export const TREAT_START = 6;

export function freshState(difficulty = 'easy') {
  return {
    v: 1,
    savedAt: Date.now(),
    difficulty: DIFFICULTY[difficulty] ? difficulty : 'easy',
    coins: 0,
    kindness: 0,
    rescues: 0,
    completedJobs: [],
    sanctuary: [],
    settings: { sound: true, speech: true },
    active: null,
  };
}

export function stamp(state) {
  state.savedAt = Date.now();
  return state;
}

function diffOf(activeOrId) {
  const id = typeof activeOrId === 'string' ? activeOrId : activeOrId?.difficulty;
  return DIFFICULTY[id] || DIFFICULTY.easy;
}

export function trailFor(state) {
  if (!state.active) return null;
  return createTrail(jobById(state.active.jobId));
}

export function pickWild(owned, rng = Math.random) {
  const pool = ['dew', 'fern', 'star'].filter((id) => !owned.includes(id));
  if (!pool.length) return null;
  const i = Math.min(pool.length - 1, Math.floor(rng() * pool.length));
  return pool[i];
}

export function beginJob(state, jobId, rng = Math.random, { unlocked = false } = {}) {
  const job = jobById(jobId);
  if (!job) return { ok: false, reason: 'missing' };
  if (!canStartRescue(state, unlocked)) return { ok: false, reason: 'gate' };
  if (state.completedJobs.includes(jobId)) return { ok: false, reason: 'done' };
  if (state.active) return { ok: false, reason: 'busy' };
  const trail = createTrail(job);
  const difficulty = state.difficulty;
  state.active = {
    jobId,
    difficulty,
    x: trail.start.x,
    y: trail.start.y,
    solved: { log: false, picture: false, switches: false, fern: false },
    pictureSeq: [],
    switchSeq: [],
    cluesFound: [],
    treats: { fish: TREAT_START, bone: TREAT_START, berry: TREAT_START },
    petHearts: 1,
    petWhere: 'den',
    wildId: pickWild(state.sanctuary, rng),
    wildHearts: 0,
    wildWhere: 'grove',
    wildSnooze: false,
    following: false,
    pending: null,
  };
  if (!state.active.wildId) state.active.wildWhere = null;
  stamp(state);
  return { ok: true, text: job.grant, itemId: job.itemId };
}

export function abandonJob(state) {
  state.active = null;
  stamp(state);
}

function pickupClues(state, trail, steps) {
  const job = jobById(state.active.jobId);
  const difficulty = diffOf(state.active);
  const found = [];
  for (const step of steps) {
    const clue = clueOn(trail, job, difficulty, step.x, step.y);
    if (!clue || state.active.cluesFound.includes(clue.id)) continue;
    state.active.cluesFound.push(clue.id);
    found.push(clue);
  }
  return found;
}

export function movePlayer(state, x, y) {
  const active = state.active;
  if (!active) return { ok: false, reason: 'no-job' };
  if (active.pending) return { ok: false, reason: 'pending' };
  const trail = createTrail(jobById(active.jobId));
  const dest = { x, y };
  if (!isWalkable(trail, active.solved, x, y)) {
    const near = pathNear(trail, active.solved, { x: active.x, y: active.y }, dest);
    if (!near) return { ok: false, reason: 'blocked' };
    return finishMove(state, trail, near, dest);
  }
  const path = pathTo(trail, active.solved, { x: active.x, y: active.y }, dest);
  if (!path) return { ok: false, reason: 'blocked' };
  return finishMove(state, trail, path, null);
}

function finishMove(state, trail, path, interactTile) {
  const active = state.active;
  const steps = path.slice(1);
  const clues = pickupClues(state, trail, steps);
  const end = path[path.length - 1];
  active.x = end.x;
  active.y = end.y;
  const events = [];
  if (clues.length) events.push({ type: 'clues', clues });
  if (active.following && standingOn(end, trail.gate)) {
    events.push({ type: 'reunion', reunion: completeReunion(state) });
    return { ok: true, path, events };
  }
  if (interactTile) events.push({ type: 'arrive', tile: interactTile });
  stamp(state);
  return { ok: true, path, events };
}

export function interactHere(state) {
  const active = state.active;
  if (!active) return [];
  const trail = createTrail(jobById(active.jobId));
  const here = { x: active.x, y: active.y };
  const actions = [];
  const near = (p) => standingOn(here, p) || adjacent(here, p);

  if (!active.solved.log) {
    for (const log of trail.logs) if (near(log)) actions.push({ id: 'climb', label: 'Climb the log' });
    if (near(trail.crawl)) actions.push({ id: 'crawl', label: 'Crawl through the gap' });
  }
  if (!active.solved.picture && near(trail.picture)) actions.push({ id: 'picture', label: 'Look at the pictures' });
  if (!active.solved.switches && trail.switches.some((s) => near(s))) actions.push({ id: 'switches', label: 'Try the stones' });
  if (!active.solved.fern && trail.ferns.some((f) => near(f))) actions.push({ id: 'fern', label: 'Part the ferns' });
  if (!active.following && active.petWhere === 'den' && near(trail.den) && active.solved.fern) {
    actions.push({ id: 'calm-pet', label: 'Sit with the pet' });
  }
  if (active.petWhere === 'hidden' && (standingOn(here, trail.hideSpot) || adjacent(here, trail.hideSpot))) {
    actions.push({ id: 'calm-pet', label: 'Sit with the pet' });
  }
  if (active.wildId && active.wildWhere === 'grove' && !active.following && near(trail.grove)) {
    actions.push({ id: 'calm-wild', label: 'Say hello' });
  }
  if (active.wildId && active.wildWhere === 'hidden' && (standingOn(here, trail.wildHide) || adjacent(here, trail.wildHide))) {
    actions.push({ id: 'calm-wild', label: 'Say hello again' });
  }
  return actions;
}

export function tapLog(state, how) {
  const active = state.active;
  const difficulty = diffOf(active);
  if (how === 'climb' && !difficulty.simplePuzzles) {
    return { ok: false, text: 'The log is too big to climb. Look for a gap.' };
  }
  if (how === 'climb' || how === 'crawl') {
    active.solved.log = true;
    stamp(state);
    return { ok: true, text: how === 'climb' ? 'You climb over. The path goes on.' : 'You crawl through. Leaves in your hair, path ahead.' };
  }
  return { ok: false, text: 'The log stays put.' };
}

export function tapPicture(state, symbol) {
  const active = state.active;
  const job = jobById(active.jobId);
  const difficulty = diffOf(active);
  if (difficulty.simplePuzzles) {
    if (symbol === job.pictureOrder[0]) {
      active.solved.picture = true;
      stamp(state);
      return { ok: true, text: 'The bright picture clicks. A way opens north.' };
    }
    return { ok: false, text: 'That picture stays quiet. Try the bright one.' };
  }
  const expect = job.pictureOrder[active.pictureSeq.length];
  if (symbol !== expect) {
    active.pictureSeq = [];
    stamp(state);
    return { ok: false, reset: true, text: 'The pictures shuffle back. Your clues still know the order.' };
  }
  active.pictureSeq = [...active.pictureSeq, symbol];
  if (active.pictureSeq.length === job.pictureOrder.length) {
    active.solved.picture = true;
    stamp(state);
    return { ok: true, text: 'The last picture clicks. The stone path opens.' };
  }
  stamp(state);
  return { ok: true, partial: true, text: 'That picture clicks in. Keep the order.' };
}

export function tapSwitch(state, symbol) {
  const active = state.active;
  const job = jobById(active.jobId);
  const difficulty = diffOf(active);
  if (difficulty.simplePuzzles) {
    if (symbol === job.switchOrder[0]) {
      active.solved.switches = true;
      stamp(state);
      return { ok: true, text: 'The glowing stone sinks. The north door opens.' };
    }
    return { ok: false, text: 'That stone is quiet. Try the glowing one.' };
  }
  const expect = job.switchOrder[active.switchSeq.length];
  if (symbol !== expect) {
    active.switchSeq = [];
    stamp(state);
    return { ok: false, reset: true, text: 'The stones pop back up. The clue has the order.' };
  }
  active.switchSeq = [...active.switchSeq, symbol];
  if (active.switchSeq.length === job.switchOrder.length) {
    active.solved.switches = true;
    stamp(state);
    return { ok: true, text: 'All three stones stay down. The door opens.' };
  }
  stamp(state);
  return { ok: true, partial: true, text: 'It stays down. Press the next one.' };
}

export function tapFern(state, index) {
  const active = state.active;
  const job = jobById(active.jobId);
  if (index === job.fernIndex) {
    active.solved.fern = true;
    stamp(state);
    return { ok: true, text: 'The ferns part. A hidden path was there the whole time.' };
  }
  return { ok: false, text: 'Just leaves. Another clump might hide the path.' };
}

function targetAnimal(state, target) {
  const active = state.active;
  if (target === 'wild') return animalById(active.wildId);
  return animalById(jobById(active.jobId).animalId);
}

function ensureTreat(active, animal) {
  if (animal.favourite.kind !== 'treat') return;
  const id = animal.favourite.id;
  if ((active.treats[id] || 0) <= 0) active.treats[id] = 2;
}

export function resolveOffer(state, { target, kind, id, phase }) {
  const active = state.active;
  const animal = targetAnimal(state, target);
  const difficulty = diffOf(active);
  ensureTreat(active, animal);
  const hearts = target === 'wild' ? active.wildHearts : active.petHearts;
  const treatCount = kind === 'treat' ? (active.treats[id] || 0) : null;
  const result = judgeOffer({ animal, kind, id, phase, difficulty, hearts, treatCount });
  if (result.consume && kind === 'treat') active.treats[id] = result.treatCount;

  const label = kind === 'treat' ? (treatById(id)?.name || 'snack') : (tuneById(id)?.name || 'tune');
  if (target === 'wild') active.wildHearts = result.hearts;
  else active.petHearts = result.hearts;

  if (result.hide) {
    if (target === 'wild') active.wildWhere = 'hidden';
    else active.petWhere = 'hidden';
  }

  let doneEvent = null;
  if (result.done && target === 'pet') {
    active.following = true;
    active.petWhere = 'follow';
    doneEvent = { type: 'follow', text: `${animal.name} pads along behind you. The town gate is south.` };
  } else if (result.done && target === 'wild') {
    if (!state.sanctuary.includes(active.wildId)) state.sanctuary.push(active.wildId);
    state.kindness += WILD_KINDNESS;
    active.wildWhere = 'saved';
    active.pending = 'sanctuary';
    doneEvent = { type: 'sanctuary', animalId: active.wildId };
  }
  stamp(state);
  return {
    ...result,
    text: offerMessage(animal, result, { kind, id, label }),
    doneEvent,
    animal,
  };
}

export function snoozeWild(state) {
  if (state.active) state.active.wildSnooze = true;
}

export function completeReunion(state) {
  const active = state.active;
  const job = jobById(active.jobId);
  const animal = animalById(job.animalId);
  const reward = REWARDS[animal.rarity];
  state.coins += reward.coins;
  state.kindness += reward.kindness;
  state.rescues += 1;
  if (!state.completedJobs.includes(job.id)) state.completedJobs.push(job.id);
  const summary = {
    jobId: job.id,
    owner: job.owner,
    animalId: animal.id,
    animalName: animal.name,
    text: job.reunion,
    coins: reward.coins,
    kindness: reward.kindness,
    totalCoins: state.coins,
    totalKindness: state.kindness,
  };
  state.active = null;
  stamp(state);
  return summary;
}

export function dismissPending(state) {
  if (state.active) state.active.pending = null;
  stamp(state);
}

export function hintTarget(state) {
  if (!state.active) return null;
  const job = jobById(state.active.jobId);
  const trail = createTrail(job);
  return suggest(trail, job, diffOf(state.active), state.active);
}

export function hintSpeech(state) {
  const target = hintTarget(state);
  if (!target) return '';
  const active = state.active;
  const job = jobById(active.jobId);
  const difficulty = diffOf(active);
  if (target.id && difficulty.clueIds.includes(target.id) && !active.cluesFound.includes(target.id)) {
    return clueText(job, target.id, difficulty.id);
  }
  if (active.following) return 'The way home is south, to the town gate.';
  if (active.petWhere === 'hidden') return `${animalById(job.animalId).name} hid nearby. Hearts are still there.`;
  if (!active.solved.log) return difficulty.simplePuzzles ? 'The log is low enough to climb.' : 'Find a way past the log.';
  if (!active.solved.picture) return 'The picture stone is ahead.';
  if (!active.solved.switches) return 'The stone switches are ahead.';
  if (!active.solved.fern) return 'One clump of ferns is hiding a path.';
  return `${animalById(job.animalId).name} is close.`;
}

export function favouriteHint(state, target = 'pet') {
  const animal = targetAnimal(state, target);
  const difficulty = diffOf(state.active);
  if (!difficulty.showFavourite) return '';
  return `${animal.name} loves ${favouriteName(animal)}.`;
}

export function journal(state) {
  if (!state.active) return [];
  const job = jobById(state.active.jobId);
  const difficulty = diffOf(state.active);
  return state.active.cluesFound.map((id) => ({ id, text: clueText(job, id, difficulty.id) }));
}

export function statusLine(state) {
  const active = state.active;
  if (!active) return 'Pick a picture on the job board.';
  const job = jobById(active.jobId);
  const animal = animalById(job.animalId);
  if (active.following) return `${animal.name} is following you. Walk south to the town gate.`;
  if (active.petWhere === 'hidden') return `${animal.name} hid nearby. The hearts you earned are safe.`;
  if (!active.solved.log) return 'A fallen log crosses the trail.';
  if (!active.solved.picture) return 'A picture stone blocks the way north.';
  if (!active.solved.switches) return 'Switch stones sit in a little room.';
  if (!active.solved.fern) return 'Ferns crowd the path. One of them hides a way through.';
  return `${animal.name} is in the clearing.`;
}

export function describeJob(job) {
  const animal = animalById(job.animalId);
  return { job, animal, hearts: heartsNeeded(animal) };
}

export const listJobs = () => JOBS.map(describeJob);

export function playerTile(state) {
  if (!state.active) return null;
  return tileAt(trailFor(state), state.active.x, state.active.y);
}
