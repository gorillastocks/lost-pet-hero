// Tiny generated sounds. No audio files, so the game stays offline and quiet-friendly.
let ctx = null;
let muted = false;

export function setMuted(on) { muted = !!on; }

export function unlockAudio() {
  if (!ctx) {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
}

function tone(freq, dur, type, gain, at = 0) {
  if (muted || !ctx) return;
  const t0 = ctx.currentTime + at;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(ctx.destination);
  o.start(t0); o.stop(t0 + dur + 0.02);
}

export function sfx(name) {
  if (name === 'tap') tone(520, 0.08, 'triangle', 0.05);
  else if (name === 'clue') { tone(660, 0.1, 'sine', 0.05); tone(880, 0.14, 'sine', 0.04, 0.08); }
  else if (name === 'heart') { tone(523, 0.12, 'triangle', 0.06); tone(659, 0.14, 'triangle', 0.05, 0.1); tone(784, 0.18, 'triangle', 0.05, 0.18); }
  else if (name === 'miss') tone(220, 0.2, 'sine', 0.04);
  else if (name === 'open') tone(440, 0.12, 'triangle', 0.05);
  else if (name === 'home') { tone(392, 0.15, 'triangle', 0.06); tone(494, 0.15, 'triangle', 0.05, 0.12); tone(587, 0.22, 'triangle', 0.05, 0.24); }
  else if (name === 'click') tone(700, 0.05, 'square', 0.03);
}
