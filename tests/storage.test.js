import { describe, expect, it } from 'vitest';
import { SAVE_KEY, memoryStore, readRaw, validSave, writeRaw } from '../src/storage.js';
import { freshState } from '../src/game.js';

describe('saves', () => {
  it('round-trips and restores a backup when the main copy is corrupt', () => {
    const store = memoryStore();
    const state = freshState('normal');
    state.coins = 10;
    const raw = JSON.stringify(state);
    writeRaw(store, SAVE_KEY, raw);
    expect(readRaw(store, SAVE_KEY).data.coins).toBe(10);

    store.setItem(SAVE_KEY, '{not json');
    const recovered = readRaw(store, SAVE_KEY);
    expect(recovered.recovered).toBe(true);
    expect(recovered.data.coins).toBe(10);
    expect(validSave(store.getItem(SAVE_KEY)).coins).toBe(10);
  });

  it('refuses an invalid save', () => {
    const store = memoryStore();
    expect(() => writeRaw(store, SAVE_KEY, '{"v":1}')).toThrow(/invalid/);
  });
});
