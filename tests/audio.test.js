import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CUES, DUCK, LINES, createAudio, musicLevel, normalise, voiceUrl } from '../src/audio.js';
import { CLUE_LINE, cluePicture } from '../src/clues.js';
import { JOBS } from '../src/data.js';

describe('audio buses', () => {
  it('keeps sounds, music, and voice as separate switches', () => {
    const s = normalise({ sfxOn: false, musicOn: true, voiceOn: true, musicVol: 0.5 });
    expect(s.sfxOn).toBe(false);
    expect(s.musicOn).toBe(true);
    expect(s.voiceOn).toBe(true);
    expect(musicLevel(s, false)).toBeCloseTo(0.5);
    expect(musicLevel(s, true)).toBeCloseTo(0.5 * DUCK);
    expect(musicLevel({ ...s, musicOn: false }, true)).toBe(0);
    expect(musicLevel(s, false, true)).toBe(0);
    expect(musicLevel(s, true, true)).toBe(0);
  });

  it('names the pet-found fanfare and the celebration tune', () => {
    expect(CUES['pet-found']).toBe('./music/pet-found.mp3');
    expect(CUES.celebration).toBe('./music/celebration.mp3');
    const hash = (path) => createHash('md5').update(readFileSync(path)).digest('hex');
    expect(hash('public/music/pet-found.mp3')).toBe('f931e359f8401aae1fe8f732361194d2');
    expect(hash('public/music/celebration.mp3')).not.toBe('80790c71745d8b66f62fba01afb29b04');
    expect(hash('public/music/celebration.mp3')).not.toBe(hash('public/music/pet-found.mp3'));
  });

  it('falls back to an audio element and stays quiet when the file will not play', async () => {
    const played = [];
    const engine = createAudio({
      forceHtml: true,
      storage: { getItem: () => null, setItem: () => {} },
      navigator: {},
      document: null,
      AudioContext: null,
      Audio: class {
        constructor() { this.paused = true; this.ended = false; this.dataset = {}; }
        set src(v) { played.push(v); this._src = v; }
        get src() { return this._src; }
        setAttribute() {}
        addEventListener() {}
        play() { this.paused = true; return Promise.reject(new Error('missing')); }
        pause() { this.paused = true; }
      },
      fetch: async () => ({ ok: false, status: 404 }),
    });
    const ok = await engine.playVoice(voiceUrl('not-a-real-line'));
    expect(ok).toBe(false);
    expect(played[0]).toContain('not-a-real-line');
    await expect(engine.line('nope')).resolves.toBeNull();
  });

  it('every spoken line has words, and every picture clue points at one', () => {
    for (const [id, text] of Object.entries(LINES)) {
      expect(text.length).toBeGreaterThan(3);
      expect(voiceUrl(id)).toBe(`./voice/${id}.mp3`);
    }
    for (const job of JOBS) {
      for (const clueId of ['paw', 'log', 'picture', 'switches', 'fern', 'favourite']) {
        const pic = cluePicture(job, clueId, 'normal');
        expect(LINES[pic.line]).toBeTruthy();
        expect(pic.symbols.length).toBeGreaterThan(0);
        expect(pic.line).toBe(CLUE_LINE[clueId]);
      }
    }
  });
});
