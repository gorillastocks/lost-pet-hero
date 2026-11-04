// Picture clues. A 5-year-old matches the pictures and hears a short line.
// The long written hints stay in the data tables for the puzzle rules, not on screen.

export const CLUE_LINE = {
  paw: 'clue-paws',
  log: 'clue-hear',
  picture: 'clue-sparkles',
  switches: 'clue-sparkles',
  fern: 'clue-sparkles',
  favourite: 'clue-close',
};

/**
 * What to draw for a clue. `symbols` are picture ids. `mark` is the one that glows.
 * No sentences.
 */
export function cluePicture(job, clueId, difficulty) {
  const line = CLUE_LINE[clueId] || 'clue-close';
  if (clueId === 'paw') return { line, symbols: ['paw'], mark: 0 };
  if (clueId === 'log') {
    return difficulty === 'easy'
      ? { line, symbols: ['log', 'up'], mark: 1 }
      : { line, symbols: ['log', 'sun'], mark: 1 };
  }
  if (clueId === 'picture') return { line, symbols: job.pictureOrder.slice(), mark: -1 };
  if (clueId === 'switches') return { line, symbols: job.switchOrder.slice(), mark: -1 };
  if (clueId === 'fern') return { line, symbols: ['leaf', 'leaf', 'leaf', 'leaf', 'leaf'], mark: job.fernIndex };
  if (clueId === 'favourite') {
    const fav = job.animalId === 'luma' ? 'moon' : job.animalId === 'bramble' ? 'bone' : 'fish';
    return { line, symbols: [fav], mark: 0 };
  }
  return { line, symbols: ['paw'], mark: 0 };
}
