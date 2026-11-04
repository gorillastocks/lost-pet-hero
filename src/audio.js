// Sound, music, and the narrator. Same idea as Blackspire Realms:
// nothing plays until the first tap, three separate buses, music ducks under the voice,
// iOS uses the playback audio session, and a plain <audio> element is the fallback.
// A missing file stays silent.
import LINES from './lines.json';

export { LINES };
export const AUDIO_KEY = 'lostpet.audio.v1';
export const DUCK = 0.45;
export const SFX = ['tap', 'heart-pop', 'sparkle', 'reunion-fanfare'];
const SFX_LEVEL = { tap: 0.55, 'heart-pop': 0.85, sparkle: 0.7, 'reunion-fanfare': 0.9 };
export const DEFAULTS = { sfxOn: true, sfxVol: 0.85, musicOn: true, musicVol: 0.5, voiceOn: true, voiceVol: 1 };

const clamp01 = (v, d) => { v = Number(v); return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : d; };
export function normalise(o) {
  o = o && typeof o === 'object' ? o : {};
  return {
    sfxOn: o.sfxOn !== false,
    sfxVol: clamp01(o.sfxVol, DEFAULTS.sfxVol),
    musicOn: o.musicOn !== false,
    musicVol: clamp01(o.musicVol, DEFAULTS.musicVol),
    voiceOn: o.voiceOn !== false,
    voiceVol: clamp01(o.voiceVol, DEFAULTS.voiceVol),
  };
}

/** Music bus level. While a voice line is playing the theme drops to 45%. */
export function musicLevel(settings, speaking) {
  const s = normalise(settings);
  if (!s.musicOn || s.musicVol <= 0) return 0;
  return s.musicVol * (speaking ? DUCK : 1);
}

export function voiceUrl(id) { return `./voice/${id}.mp3`; }
export function sfxUrl(name) { return `./sfx/${name}.mp3`; }
export const THEME_URL = './music/title-theme.mp3';

export function createAudio(deps = {}) {
  const root = deps.root || globalThis;
  const fetchImpl = deps.fetch || root.fetch?.bind(root);
  const AudioCtor = deps.Audio !== undefined ? deps.Audio : root.Audio;
  const AC = deps.AudioContext !== undefined ? deps.AudioContext : (root.AudioContext || root.webkitAudioContext);
  const doc = deps.document !== undefined ? deps.document : root.document;
  const nav = deps.navigator !== undefined ? deps.navigator : root.navigator;
  const store = deps.storage !== undefined ? deps.storage : (() => { try { return root.localStorage; } catch { return null; } })();

  let settings = normalise(null);
  try { if (store) settings = normalise(JSON.parse(store.getItem(AUDIO_KEY))); } catch { /* defaults */ }
  function save() { try { store?.setItem(AUDIO_KEY, JSON.stringify(settings)); } catch { /* ignore */ } }

  const isIOS = !!nav && (/iP(hone|ad|od)/.test(nav.userAgent || '') || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1));
  function setSession() {
    try { if (nav?.audioSession && nav.audioSession.type !== 'playback') nav.audioSession.type = 'playback'; } catch { /* ignore */ }
  }
  setSession();

  let deviceBroken = false;
  const noteDevice = (err) => { if (/audio device|InvalidState/i.test(String(err?.message || err || ''))) deviceBroken = true; };
  let ctx = null, sfxGain = null, musicGain = null, voiceGain = null;
  let voiceSrc = null, voiceTok = 0, unlocked = false, sceneOn = false, loadedSfx = false;
  let voiceEl = null, pendingVoice = null, silentUrl = null, keepAlive = null;
  const buffers = {}, loading = {}, lastPlayed = {};
  let current = null, musicTok = 0;
  const forceHtml = !!deps.forceHtml;

  function fetchBuffer(url) {
    if (!ctx || !fetchImpl) return Promise.resolve(null);
    if (buffers[url]) return Promise.resolve(buffers[url]);
    if (loading[url]) return loading[url];
    return (loading[url] = fetchImpl(url).then((r) => {
      if (!r || !r.ok) throw new Error('missing');
      return r.arrayBuffer();
    }).then((ab) => new Promise((ok, no) => {
      const p = ctx.decodeAudioData(ab.slice ? ab.slice(0) : ab, ok, no);
      if (p && p.then) p.then(ok, no);
    })).then((b) => (buffers[url] = b)).catch(() => { delete loading[url]; return null; }));
  }

  const speaking = () => !!voiceSrc || !!(voiceEl && voiceEl.src && voiceEl.src !== silentUrl && !voiceEl.paused && !voiceEl.ended);

  function applyVolumes() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const setG = (node, value, time) => { try { node.gain.setTargetAtTime(value, t, time); } catch { /* ignore */ } };
    setG(sfxGain, settings.sfxOn ? settings.sfxVol : 0, 0.02);
    setG(voiceGain, settings.voiceOn ? settings.voiceVol : 0, 0.02);
    setG(musicGain, musicLevel(settings, speaking()), 0.08);
  }

  function set(patch) {
    settings = normalise({ ...settings, ...patch });
    save();
    if (!settings.voiceOn || settings.voiceVol <= 0) stopVoice();
    applyVolumes();
    syncMusic();
  }

  function stopCurrent(fade = 0.3) {
    const c = current; current = null; if (!c || !ctx) return;
    try {
      const t = ctx.currentTime;
      c.gain.gain.cancelScheduledValues(t);
      c.gain.gain.setValueAtTime(c.gain.gain.value, t);
      c.gain.gain.linearRampToValueAtTime(0, t + fade);
      c.src.stop(t + fade + 0.05);
    } catch { /* ignore */ }
  }

  function syncMusic() {
    if (!ctx || !unlocked) return;
    if (!settings.musicOn || !sceneOn) { musicTok++; stopCurrent(0.4); return; }
    if (current && current.name === 'theme') return;
    const tok = ++musicTok;
    fetchBuffer(THEME_URL).then((buf) => {
      if (!buf || tok !== musicTok || !settings.musicOn || !sceneOn) return;
      stopCurrent(0.4);
      try {
        const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
        const g = ctx.createGain(); g.gain.value = 0;
        src.connect(g); g.connect(musicGain); src.start();
        g.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.6);
        current = { name: 'theme', src, gain: g };
      } catch { /* a bad buffer stays silent */ }
    });
  }

  function setScene(on) { sceneOn = !!on; syncMusic(); }

  function play(name) {
    if (forceHtml || !ctx || !unlocked || !settings.sfxOn || settings.sfxVol <= 0 || ctx.state !== 'running') return false;
    const buf = buffers[sfxUrl(name)];
    if (!buf) return false;
    const now = ctx.currentTime;
    if (lastPlayed[name] && now - lastPlayed[name] < 0.06) return false;
    lastPlayed[name] = now;
    try {
      const s = ctx.createBufferSource(); s.buffer = buf;
      const g = ctx.createGain(); g.gain.value = SFX_LEVEL[name] || 1;
      s.connect(g); g.connect(sfxGain); s.start();
      return true;
    } catch { return false; }
  }

  function silentWavUrl() {
    if (silentUrl) return silentUrl;
    try {
      const n = 4000, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
      const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
      w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
      v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
      w(36, 'data'); v.setUint32(40, n * 2, true);
      silentUrl = root.URL.createObjectURL(new root.Blob([buf], { type: 'audio/wav' }));
    } catch { silentUrl = null; }
    return silentUrl;
  }

  function voiceElement() {
    if (voiceEl || !AudioCtor) return voiceEl;
    try {
      voiceEl = new AudioCtor();
      voiceEl.preload = 'auto';
      voiceEl.setAttribute?.('playsinline', '');
      ['ended', 'pause', 'playing'].forEach((ev) => voiceEl.addEventListener?.(ev, () => applyVolumes()));
    } catch { voiceEl = null; }
    return voiceEl;
  }

  function primeVoiceEl() {
    if (deviceBroken || (ctx && ctx.state !== 'running')) return;
    const el = voiceElement(); if (!el || el.dataset?.primed) return;
    const u = silentWavUrl(); if (!u) return;
    if (el.dataset) el.dataset.primed = '1';
    try {
      el.src = u;
      const p = el.play();
      if (p && p.then) p.then(() => { if (el.src === u) el.pause(); }, () => { if (el.dataset) delete el.dataset.primed; });
    } catch { if (el.dataset) delete el.dataset.primed; }
  }

  function startKeepAlive() {
    if (deviceBroken || (ctx && ctx.state !== 'running')) return;
    if (!isIOS || nav?.audioSession || keepAlive === false || !AudioCtor) return;
    try {
      if (!keepAlive) {
        const u = silentWavUrl(); if (!u) { keepAlive = false; return; }
        keepAlive = new AudioCtor(u); keepAlive.loop = true; keepAlive.volume = 0.01;
      }
      if (keepAlive.paused) { const p = keepAlive.play(); if (p && p.catch) p.catch(() => {}); }
    } catch { keepAlive = false; }
  }

  function stopVoice() {
    voiceTok++; pendingVoice = null;
    const v = voiceSrc; voiceSrc = null;
    if (v) { try { v.onended = null; v.stop(); } catch { /* ignore */ } }
    if (voiceEl && voiceEl.src !== silentUrl && !voiceEl.paused) { try { voiceEl.pause(); } catch { /* ignore */ } }
    applyVolumes();
  }

  function voiceStarted(tok) {
    if (pendingVoice && pendingVoice.tok === tok) pendingVoice = null;
    applyVolumes();
    return true;
  }
  function voiceFailed(tok) {
    if (tok !== voiceTok) return null;
    if (pendingVoice && pendingVoice.tok === tok) pendingVoice.failed = true;
    return false;
  }

  function htmlVoice(url, tok) {
    const el = voiceElement();
    if (!el) return Promise.resolve(voiceFailed(tok));
    try {
      el.src = url;
      try { el.volume = settings.voiceVol; } catch { /* iOS */ }
      const p = el.play();
      return Promise.resolve(p).then(() => (tok !== voiceTok ? null : voiceStarted(tok)), () => voiceFailed(tok));
    } catch { return Promise.resolve(voiceFailed(tok)); }
  }

  function webVoice(url, tok) {
    return fetchBuffer(url).then((buf) => {
      if (tok !== voiceTok) return null;
      if (!buf) return htmlVoice(url, tok);
      try {
        const src = ctx.createBufferSource(); src.buffer = buf; src.connect(voiceGain); voiceSrc = src;
        src.onended = () => { if (voiceSrc === src) { voiceSrc = null; applyVolumes(); } };
        src.start();
        return voiceStarted(tok);
      } catch { return htmlVoice(url, tok); }
    });
  }

  function playVoice(url) {
    if (!url) return Promise.resolve(null);
    stopVoice();
    const tok = voiceTok;
    if (!settings.voiceOn || settings.voiceVol <= 0) return Promise.resolve(null);
    pendingVoice = { url, tok, failed: false };
    setSession();
    if (deviceBroken) return Promise.resolve(voiceFailed(tok));
    if (!forceHtml && ctx && unlocked && ctx.state === 'running') return webVoice(url, tok);
    // Wait for resume() before the <audio> fallback. A headless WebKit with no
    // audio device crashes the process if play() runs, and resume() tells us that.
    if (!forceHtml && ctx && ctx.resume) {
      return Promise.resolve(ctx.resume()).then(() => {
        if (tok !== voiceTok) return null;
        if (ctx.state === 'running') return webVoice(url, tok);
        return htmlVoice(url, tok);
      }, (err) => {
        noteDevice(err);
        if (tok !== voiceTok || deviceBroken) return voiceFailed(tok);
        return htmlVoice(url, tok);
      });
    }
    return htmlVoice(url, tok);
  }

  function line(id) {
    if (!LINES[id]) return Promise.resolve(null);
    return playVoice(voiceUrl(id));
  }

  /** Resolves when the current line finishes. Resolves immediately if nothing is speaking. */
  function whenEnded() {
    return new Promise((resolve) => {
      if (voiceSrc) {
        const prev = voiceSrc.onended;
        voiceSrc.onended = () => { try { prev?.(); } catch { /* ignore */ } resolve(); };
        return;
      }
      if (voiceEl && !voiceEl.paused && !voiceEl.ended && voiceEl.src !== silentUrl) {
        voiceEl.addEventListener?.('ended', () => resolve(), { once: true });
        return;
      }
      resolve();
    });
  }

  function safe(method) {
    try { const p = ctx && ctx[method](); if (p && p.then) p.then(() => {}, () => {}); } catch { /* ignore */ }
  }

  function unlock() {
    setSession();
    if (forceHtml) { unlocked = true; return; }
    if (unlocked && ctx && ctx.state === 'running') return;
    if (ctx) { safe('resume'); return; }
    if (!AC) return;
    try {
      ctx = new AC();
      sfxGain = ctx.createGain(); musicGain = ctx.createGain(); voiceGain = ctx.createGain();
      sfxGain.connect(ctx.destination); musicGain.connect(ctx.destination); voiceGain.connect(ctx.destination);
      applyVolumes();
      const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource();
      s.buffer = b; s.connect(ctx.destination); s.start(0);
      const go = () => {
        if (unlocked) return;
        unlocked = true;
        if (!loadedSfx) { loadedSfx = true; SFX.forEach((n) => fetchBuffer(sfxUrl(n))); }
        syncMusic();
      };
      if (ctx.onstatechange !== undefined) ctx.onstatechange = () => { if (ctx.state === 'running') go(); };
      if (ctx.state === 'running') go(); else safe('resume');
    } catch { ctx = null; }
  }

  function gesture() { unlock(); startKeepAlive(); primeVoiceEl(); }

  let installed = false;
  function install() {
    if (installed || !doc?.addEventListener) return;
    installed = true;
    ['touchend', 'pointerup', 'click', 'keydown'].forEach((e) => doc.addEventListener(e, gesture, true));
    doc.addEventListener('visibilitychange', () => { if (ctx) safe(doc.hidden ? 'suspend' : 'resume'); });
    root.addEventListener?.('pagehide', () => safe('suspend'));
  }

  return {
    get settings() { return settings; },
    set, setScene, play, playVoice, line, whenEnded, stopVoice, unlock, install, gesture,
    get unlocked() { return unlocked; },
    get speaking() { return speaking(); },
  };
}

export const audio = createAudio();
