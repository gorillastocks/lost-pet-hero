import { describe, expect, it } from 'vitest';
import { AVATARS, DEFAULT_AVATAR, readAvatarChoice } from '../src/avatar.js';
import { drawAvatar } from '../src/art.js';

function recordingContext() {
  const fills = [];
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    globalAlpha: 1,
    beginPath() {},
    closePath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo() {},
    arc() {},
    ellipse() {},
    arcTo() {},
    fill() { fills.push(this.fillStyle); },
    stroke() {},
    save() {},
    restore() {},
  };
  return { ctx, fills };
}

describe('hero picker', () => {
  it('keeps a chosen hero and falls back to Avery', () => {
    expect(readAvatarChoice(null)).toEqual({ avatar: DEFAULT_AVATAR, avatarChosen: false });
    expect(readAvatarChoice({ avatar: 'nope', avatarChosen: true })).toEqual({ avatar: 'avery', avatarChosen: false });
    expect(readAvatarChoice({ avatar: 'fox', avatarChosen: true })).toEqual({ avatar: 'fox', avatarChosen: true });
    expect(AVATARS).toHaveLength(8);
    expect(AVATARS.filter((a) => a.group === 'kid')).toHaveLength(4);
    expect(AVATARS.filter((a) => a.group === 'animal')).toHaveLength(4);
  });

  it('draws a different sprite for a kid and an animal hero', () => {
    const avery = recordingContext();
    const fox = recordingContext();
    drawAvatar(avery.ctx, 'avery', 40, 80, 70, 'map', 'scarf');
    drawAvatar(fox.ctx, 'fox', 40, 80, 70, 'map');
    expect(avery.fills).toContain('#14B8B0');
    expect(fox.fills).toContain('#FF8A3D');
    expect(avery.fills.join(',')).not.toBe(fox.fills.join(','));
    expect(avery.fills.length).toBeGreaterThan(4);
    expect(fox.fills.length).toBeGreaterThan(4);
  });
});
