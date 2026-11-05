import { describe, expect, it } from 'vitest';
import { memoryStore } from '../src/storage.js';
import { beginJob, completeReunion, freshState, movePlayer, resolveOffer } from '../src/game.js';
import {
  TUTORIAL_KEY, allows, loadTutorial, nextStep, rememberComplete, rememberOffer,
  replayTutorial, saveTutorial, shouldOffer,
} from '../src/tutorial.js';

describe('practice rescue', () => {
  it('offers the tutorial once, then remembers a later answer', () => {
    const store = memoryStore();
    expect(shouldOffer(loadTutorial(store))).toBe(true);
    saveTutorial(store, rememberOffer(loadTutorial(store), 'later'));
    expect(shouldOffer(loadTutorial(store))).toBe(false);
    expect(JSON.parse(store.getItem(TUTORIAL_KEY)).offered).toBe(true);
    expect(loadTutorial(store).completed).toBe(false);
  });

  it('ignores a wrong tap until Got it, and only the glowing tile counts', () => {
    expect(allows('walk', 'tile:5,14', false)).toBe(false);
    expect(allows('walk', 'tile:5,13', true)).toBe(false);
    expect(allows('walk', 'tile:5,14', true)).toBe(true);
    expect(allows('job', 'job-pip', true)).toBe(false);
    expect(allows('job', 'job-pebble', true)).toBe(true);
    expect(allows('calm', 'tune', true)).toBe(false);
    expect(allows('calm', 'treat', true)).toBe(true);
    expect(nextStep('home')).toBe('done');
    expect(nextStep('walk')).toBe('clue');
  });

  it('saves completion and still lets you replay', () => {
    const store = memoryStore();
    saveTutorial(store, rememberComplete({ offered: true, completed: false }));
    expect(loadTutorial(store).completed).toBe(true);
    expect(shouldOffer(loadTutorial(store))).toBe(false);
    expect(replayTutorial(loadTutorial(store)).playing).toBe(true);
  });

  it('a practice rescue pays the card and does not spend a free rescue', () => {
    const state = freshState('easy');
    const started = beginJob(state, 'pebble', () => 0, { tutorial: true });
    expect(started.ok).toBe(true);
    expect(state.active.tutorial).toBe(true);
    expect(state.active.x).toBe(5);
    expect(state.active.y).toBe(15);
    const walked = movePlayer(state, 5, 14);
    expect(walked.events.some((e) => e.type === 'clues')).toBe(true);
    const calm = resolveOffer(state, { target: 'pet', kind: 'treat', id: 'fish', phase: 0.99 });
    expect(calm.ok).toBe(true);
    expect(calm.done).toBe(true);
    state.active.following = true;
    const home = movePlayer(state, 5, 16);
    const reunion = home.events.find((e) => e.type === 'reunion').reunion;
    expect(reunion.tutorial).toBe(true);
    expect(reunion.prize.name).toBe('Pebble sticker');
    expect(state.rescues).toBe(0);
    expect(state.completedJobs).toEqual([]);
    expect(state.coins).toBe(10);
  });
});
