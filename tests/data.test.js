import { describe, expect, it } from 'vitest';
import {
  ANIMALS, JOBS, TREATS, TUNES, DIFFICULTY, HEARTS_BY_RARITY, PICTURES, SWITCH_SYMBOLS,
  animalById, heartsNeeded, clueText, pictureChoices, kindnessTitle,
} from '../src/data.js';

describe('content tables', () => {
  it('has three lost jobs and matching animals', () => {
    expect(JOBS).toHaveLength(3);
    for (const job of JOBS) {
      const animal = animalById(job.animalId);
      expect(animal.role).toBe('lost');
      expect(job.itemId).toBeTruthy();
      expect(job.owner).toBeTruthy();
      expect(pictureChoices(job).map((p) => p.id)).toEqual(job.pictureOrder);
    }
  });

  it('hearts follow rarity: common 2, uncommon 3, rare 4', () => {
    expect(HEARTS_BY_RARITY).toEqual({ common: 2, uncommon: 3, rare: 4 });
    expect(heartsNeeded(animalById('pip'))).toBe(2);
    expect(heartsNeeded(animalById('bramble'))).toBe(3);
    expect(heartsNeeded(animalById('luma'))).toBe(4);
    expect(heartsNeeded(animalById('dew'))).toBe(2);
    expect(heartsNeeded(animalById('star'))).toBe(4);
  });

  it('every favourite points at a real treat or tune', () => {
    for (const animal of ANIMALS) {
      const list = animal.favourite.kind === 'treat' ? TREATS : TUNES;
      expect(list.some((t) => t.id === animal.favourite.id)).toBe(true);
    }
  });

  it('normal has more clue steps and harder puzzles than easy', () => {
    expect(DIFFICULTY.easy.clueIds.length).toBeLessThan(DIFFICULTY.normal.clueIds.length);
    expect(DIFFICULTY.easy.simplePuzzles).toBe(true);
    expect(DIFFICULTY.normal.simplePuzzles).toBe(false);
    expect(DIFFICULTY.easy.deduceTreat).toBe(false);
    expect(DIFFICULTY.normal.deduceTreat).toBe(true);
    expect(DIFFICULTY.easy.timingZone).toBeGreaterThan(DIFFICULTY.normal.timingZone);
    expect(DIFFICULTY.easy.timingPeriodMs).toBeGreaterThan(DIFFICULTY.normal.timingPeriodMs);
    expect(DIFFICULTY.easy.hintArrows).toBe(true);
    expect(DIFFICULTY.normal.hintArrows).toBe(false);
    expect(DIFFICULTY.easy.spokenHints).toBe(true);
    expect(DIFFICULTY.easy.clueGlow).toBe(true);
  });

  it('puzzle orders use known symbols and cover every switch once', () => {
    const pics = new Set(PICTURES.map((p) => p.id));
    const switches = SWITCH_SYMBOLS.map((s) => s.id).sort();
    for (const job of JOBS) {
      expect(job.pictureOrder.length).toBeGreaterThanOrEqual(3);
      for (const id of job.pictureOrder) expect(pics.has(id)).toBe(true);
      expect([...job.switchOrder].sort()).toEqual(switches);
      expect(job.fernIndex).toBeGreaterThanOrEqual(0);
      expect(job.fernIndex).toBeLessThan(5);
      for (const id of DIFFICULTY.normal.clueIds) expect(clueText(job, id, 'normal').length).toBeGreaterThan(8);
      expect(clueText(job, 'log', 'easy')).not.toBe(clueText(job, 'log', 'normal'));
    }
  });

  it('kindness titles climb and never go blank', () => {
    expect(kindnessTitle(0)).toBe('Visitor');
    expect(kindnessTitle(1)).toBe('New helper');
    expect(kindnessTitle(6)).toBe("Town's friend");
  });
});
