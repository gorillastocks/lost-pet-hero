import { describe, expect, it } from 'vitest';
import { DIFFICULTY, animalById } from '../src/data.js';
import { inZone, judgeOffer, zoneBand } from '../src/calm.js';

const pip = animalById('pip');
const luma = animalById('luma');

describe('timing zone', () => {
  it('is wider and centered for easy', () => {
    const easy = zoneBand(DIFFICULTY.easy.timingZone);
    const normal = zoneBand(DIFFICULTY.normal.timingZone);
    expect(easy.end - easy.start).toBeGreaterThan(normal.end - normal.start);
    expect(inZone(0.5, DIFFICULTY.easy.timingZone)).toBe(true);
    expect(inZone(0.5, DIFFICULTY.normal.timingZone)).toBe(true);
    expect(inZone(0.02, DIFFICULTY.easy.timingZone)).toBe(false);
    expect(inZone(0.35, DIFFICULTY.normal.timingZone)).toBe(false);
    expect(inZone(0.35, DIFFICULTY.easy.timingZone)).toBe(true);
  });
});

describe('calming', () => {
  it('turns a good tap into a heart and uses the treat', () => {
    const result = judgeOffer({
      animal: pip, kind: 'treat', id: 'fish', phase: 0.5,
      difficulty: DIFFICULTY.easy, hearts: 1, treatCount: 6,
    });
    expect(result.ok).toBe(true);
    expect(result.hearts).toBe(2);
    expect(result.done).toBe(true);
    expect(result.consume).toBe(true);
    expect(result.treatCount).toBe(5);
  });

  it('on a miss, hides nothing permanent: hearts stay and the treat is not taken', () => {
    const result = judgeOffer({
      animal: pip, kind: 'treat', id: 'fish', phase: 0.02,
      difficulty: DIFFICULTY.easy, hearts: 1, treatCount: 6,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('timing');
    expect(result.hide).toBe(true);
    expect(result.consume).toBe(false);
    expect(result.hearts).toBe(1);
    expect(result.treatCount).toBe(6);
    expect(result.done).toBe(false);
  });

  it('normal only accepts the favourite; easy accepts any snack or tune', () => {
    const wrong = judgeOffer({
      animal: pip, kind: 'treat', id: 'berry', phase: 0.5,
      difficulty: DIFFICULTY.normal, hearts: 1, treatCount: 6,
    });
    expect(wrong.reason).toBe('favourite');
    expect(wrong.hide).toBe(true);
    expect(wrong.consume).toBe(false);
    expect(wrong.hearts).toBe(1);

    const easyBerry = judgeOffer({
      animal: pip, kind: 'treat', id: 'berry', phase: 0.5,
      difficulty: DIFFICULTY.easy, hearts: 1, treatCount: 6,
    });
    expect(easyBerry.ok).toBe(true);

    const tune = judgeOffer({
      animal: luma, kind: 'tune', id: 'moon', phase: 0.5,
      difficulty: DIFFICULTY.normal, hearts: 1, treatCount: null,
    });
    expect(tune.ok).toBe(true);
    expect(tune.consume).toBe(false);
    expect(tune.hearts).toBe(2);
    expect(tune.done).toBe(false);

    const wrongTune = judgeOffer({
      animal: luma, kind: 'tune', id: 'brook', phase: 0.5,
      difficulty: DIFFICULTY.normal, hearts: 3, treatCount: null,
    });
    expect(wrongTune.ok).toBe(false);
    expect(wrongTune.hearts).toBe(3);
  });

  it('never reports a loss state', () => {
    const result = judgeOffer({
      animal: animalById('star'), kind: 'treat', id: 'fish', phase: 0,
      difficulty: DIFFICULTY.normal, hearts: 2, treatCount: 1,
    });
    expect(result.hearts).toBe(2);
    expect(result.done).toBe(false);
    expect(result).not.toHaveProperty('gameOver');
  });
});
