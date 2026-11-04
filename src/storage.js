// Saves.
//  • Web: localStorage.
//  • iOS (Capacitor): also mirrored to @capacitor/preferences (UserDefaults),
//    which survives WebView storage purges.
//  • Writes go to .tmp, keep the previous good copy as .bak, then replace the
//    main key. Reads fall back main → .bak → .tmp.
import { Capacitor } from '@capacitor/core';

export const SAVE_KEY = 'lostpet.save.v1';
export const SETTINGS_KEY = 'lostpet.settings';

const native = () => { try { return Capacitor.isNativePlatform(); } catch { return false; } };
let Prefs = null;

export function memoryStore(seed = {}) {
  const m = new Map(Object.entries(seed));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}

function browserStore() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) return localStorage;
  } catch { /* private mode */ }
  return memoryStore();
}

export function validSave(raw) {
  try {
    const s = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!s || s.v !== 1) return false;
    if (s.difficulty !== 'easy' && s.difficulty !== 'normal') return false;
    if (!Number.isFinite(s.coins) || !Number.isFinite(s.kindness) || !Number.isFinite(s.rescues)) return false;
    if (!Array.isArray(s.completedJobs) || !Array.isArray(s.sanctuary)) return false;
    return s;
  } catch { return false; }
}

export function writeRaw(store, key, raw) {
  if (key === SAVE_KEY && !validSave(raw)) throw new Error('refusing to write an invalid save');
  store.setItem(key + '.tmp', raw);
  const prev = store.getItem(key);
  if (prev && (key !== SAVE_KEY || validSave(prev))) store.setItem(key + '.bak', prev);
  store.setItem(key, raw);
  if (!store.getItem(key + '.bak')) store.setItem(key + '.bak', raw);
  if (store.getItem(key) !== raw) throw new Error('save did not stick');
  store.removeItem(key + '.tmp');
  mirror(key, raw);
}

export function readRaw(store, key, { repair = true } = {}) {
  const check = key === SAVE_KEY ? validSave : (raw) => { try { return JSON.parse(raw); } catch { return false; } };
  for (const [k, rec] of [[key, false], [key + '.bak', true], [key + '.tmp', true]]) {
    const raw = store.getItem(k);
    const parsed = raw && check(raw);
    if (parsed) {
      if (rec && repair) { try { store.setItem(key, raw); } catch { /* ignore */ } }
      return { raw, data: parsed, recovered: rec };
    }
  }
  return null;
}

function mirror(key, raw) {
  if (Prefs) Prefs.set({ key, value: raw }).catch(() => {});
}

/** On a native launch, copy the newest Preferences save back into localStorage. */
export async function initStorage(store = browserStore()) {
  if (!native()) return 'web';
  try { ({ Preferences: Prefs } = await import('@capacitor/preferences')); } catch { Prefs = null; }
  if (!Prefs) return 'local';
  for (const key of [SAVE_KEY, SETTINGS_KEY]) {
    let remote = null;
    try { remote = (await Prefs.get({ key })).value; } catch { remote = null; }
    if (!remote) continue;
    const local = store.getItem(key);
    const remoteSave = key === SAVE_KEY ? validSave(remote) : true;
    if (!remoteSave) continue;
    const rt = key === SAVE_KEY ? (validSave(remote)?.savedAt || 0) : 0;
    const lt = key === SAVE_KEY ? (validSave(local)?.savedAt || 0) : -1;
    if (key !== SAVE_KEY) {
      if (!local) store.setItem(key, remote);
    } else if (rt >= lt) {
      try { writeRaw(store, key, remote); } catch { /* ignore */ }
    }
  }
  return 'preferences';
}

export function defaultStore() { return browserStore(); }
