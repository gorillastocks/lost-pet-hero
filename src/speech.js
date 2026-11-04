/** Speak a short hint. iOS only allows this from a tap, so callers run it inside one. */
export function speak(text, enabled) {
  if (!enabled || !text) return;
  const synth = globalThis.speechSynthesis;
  if (!synth || typeof globalThis.SpeechSynthesisUtterance !== 'function') return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95;
    u.pitch = 1.08;
    u.lang = 'en-US';
    synth.cancel();
    synth.speak(u);
  } catch { /* a missing voice is not a failure */ }
}

export function hush() {
  try { globalThis.speechSynthesis?.cancel(); } catch { /* ignore */ }
}
