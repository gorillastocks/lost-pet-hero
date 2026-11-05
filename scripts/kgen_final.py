#!/usr/bin/env python3
"""Final Lost Pet Hero voice renderer (Kokoro af_bella, speed 1.00, variant A)
+ rising question intonation via Praat/parselmouth PSOLA pitch-tier manipulation.

Usage (from the repo root):
  python3 scripts/kgen_final.py
  python3 scripts/kgen_final.py --semitones 4 --only title-greeting
  python3 scripts/kgen_final.py --variant ellipsis|plain
Each line -> sentences rendered separately -> questions get a pitch glide over the last
~0.45 s -> joined with 0.25 s pauses (sentences) -> loudnorm -16 LUFS / TP -1.5 -> <id>.mp3

Needs kokoro, soundfile, numpy, and praat-parselmouth. Settings live in scripts/voice-settings.json.
"""
import re, json, os, sys, argparse, subprocess, tempfile
import numpy as np, soundfile as sf
import parselmouth
from parselmouth.praat import call

SR = 24000
VOICE, SPEED = 'af_bella', 1.00
PAUSE_SENT, PAUSE_LINE = 0.25, 0.5
TAIL_S = 0.45            # glide length (s)
RISE_EXP = 1.5           # ramp shape: u**RISE_EXP (keeps rising until the very end)
FLATTEN = 1.0            # 1.0 = remove the engine's natural fall in the tail before adding the rise
_pipe = None

def pipe():
    global _pipe
    if _pipe is None:
        from kokoro import KPipeline
        _pipe = KPipeline(lang_code='a')
    return _pipe

def split_sentences(text):
    # split after . ! ? but not after an ellipsis ("Shh... the pet")
    parts = re.split(r'(?<=[.!?])(?<!\.\.\.)\s+', text.strip())
    return [s for s in parts if s]

def is_question(s): return s.rstrip().endswith('?')

def text_variant(s, variant):
    if not is_question(s): return s
    if variant == 'ellipsis': return s.rstrip()[:-1].rstrip() + '...?'
    return s

def tts(text):
    a = np.concatenate([np.asarray(r.audio, dtype=np.float32) for r in pipe()(text, voice=VOICE, speed=SPEED)])
    return trim_silence(a)

def trim_silence(a, thr_db=-45, keep=0.03):
    env = np.abs(a); thr = 10 ** (thr_db / 20) * max(env.max(), 1e-6) * 1.0
    idx = np.where(env > thr)[0]
    if len(idx) == 0: return a
    s = max(0, idx[0] - int(keep * SR)); e = min(len(a), idx[-1] + int(keep * SR))
    return a[s:e]

def f0_track(a, t0=0.0, t1=None, floor=100, ceil=420, intens_db=30):
    """Voiced F0 frames (10 ms step), dropping octave/creak junk: need energy within intens_db of the
    loudest frame and F0 inside [floor, ceil]."""
    snd = parselmouth.Sound(a.astype(np.float64), SR)
    pit = snd.to_pitch_ac(time_step=0.01, pitch_floor=floor, pitch_ceiling=ceil, voicing_threshold=0.5)
    it = snd.to_intensity(minimum_pitch=floor, time_step=0.01)
    t = pit.xs(); f = pit.selected_array['frequency']
    ii = np.array([call(it, 'Get value at time', float(x), 'cubic') for x in t], dtype=float)
    ii = np.nan_to_num(ii, nan=-200.0)
    m = (f >= floor) & (f <= ceil) & (ii >= np.nanmax(ii) - intens_db)
    if t1 is None: t1 = snd.xmax
    m &= (t >= t0) & (t <= t1)
    return t[m], f[m]

def last_run(t, f, min_frames=6, max_gap=0.035):
    """Trailing contiguous voiced run (the last real voiced stretch), ignoring isolated junk frames after it."""
    runs, cur = [], [0]
    for i in range(1, len(t)):
        if t[i] - t[i - 1] <= max_gap: cur.append(i)
        else: runs.append(cur); cur = [i]
    runs.append(cur)
    good = [r for r in runs if len(r) >= min_frames]
    r = good[-1] if good else runs[-1]
    return r

def end_pitch_stats(a, win=0.5):
    """start vs end F0 (Hz) of the final `win` s of VOICED speech (trailing silence/decay ignored):
    median of the first / last 80 ms of good voiced frames in that window."""
    t, f = f0_track(a)
    if len(f) < 8: return None
    r = last_run(t, f); t_last = t[r[-1]]
    keep = (t <= t_last) & (t >= t_last - win); t, f = t[keep], f[keep]
    k = 8
    s_, e_ = float(np.median(f[:k])), float(np.median(f[-k:]))
    return dict(start=round(s_, 1), end=round(e_, 1), peak=round(float(f.max()), 1),
                semitones=round(float(12 * np.log2(e_ / s_)), 2))

def add_rise(a, semitones=4.0, tail=TAIL_S, exp=RISE_EXP, flatten=FLATTEN):
    """Praat PSOLA (formants stay put): ramp F0 over the last `tail` s of voiced speech up by `semitones`
    (net, relative to the pitch level at the glide start; the engine's natural final fall is cancelled)."""
    dur = len(a) / SR
    snd = parselmouth.Sound(a.astype(np.float64), SR)
    man = call(snd, 'To Manipulation', 0.01, 100, 420)
    # robust voiced frames define where the glide happens
    gt, gf = f0_track(a)
    if len(gt) < 10: return a
    r = last_run(gt, gf); t_end = gt[r[-1]]; t_start = max(gt[0], t_end - tail)
    pt = call(man, 'Extract pitch tier')
    n = call(pt, 'Get number of points')
    times = np.array([call(pt, 'Get time from index', i) for i in range(1, n + 1)])
    freqs = np.array([call(pt, 'Get value at index', i) for i in range(1, n + 1)], dtype=float)
    ok = np.isfinite(freqs) & (freqs > 40)
    times, freqs = times[ok], freqs[ok]
    st = 12 * np.log2(freqs)
    gst = 12 * np.log2(gf)
    def smooth_at(tt):
        w = np.abs(gt - tt) <= 0.05
        return np.median(gst[w]) if w.any() else np.interp(tt, gt, gst)
    ref = smooth_at(t_start)
    for i in np.where(times >= t_start)[0]:
        tt = times[i]
        u = min(1.0, (tt - t_start) / max(t_end - t_start, 1e-3))
        # target = flat level at glide start + smooth rise; (1-flatten) of the engine's own contour is kept
        target = ref + semitones * (u ** exp) + (1 - flatten) * (smooth_at(min(tt, t_end)) - ref)
        st[i] = target
    newpt = call('Create PitchTier', 'p', 0, dur)
    for t_, s_ in zip(times, st): call(newpt, 'Add point', float(t_), float(2 ** (s_ / 12)))
    call([man, newpt], 'Replace pitch tier')
    out = call(man, 'Get resynthesis (overlap-add)')
    return out.values[0].astype(np.float32)

def render_line(text, semitones=4.0, variant='plain', rise=True):
    segs = []
    for s in split_sentences(text):
        a = tts(text_variant(s, variant))
        if rise and is_question(s) and semitones: a = add_rise(a, semitones)
        segs.append(a)
    parts = []
    for i, a in enumerate(segs):
        if i: parts.append(np.zeros(int(SR * PAUSE_SENT), dtype=np.float32))
        parts.append(a)
    return np.concatenate(parts)

def loudnorm_to_mp3(wav, mp3):
    tmp = mp3 + '.tmp.wav'; sf.write(tmp, wav, SR)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
                    '-ar', '24000', '-ac', '1', '-b:a', '128k', mp3], check=True)
    os.remove(tmp)

def main():
    ap = argparse.ArgumentParser()
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    ap.add_argument('--lines', default=os.path.join(root, 'src', 'lines.json'))
    ap.add_argument('--out', default=os.path.join(root, 'public', 'voice'))
    ap.add_argument('--semitones', type=float, default=4.0)
    ap.add_argument('--variant', default='plain', choices=['plain', 'ellipsis'])
    ap.add_argument('--only', default='')
    a = ap.parse_args()
    lines = json.load(open(a.lines)); os.makedirs(a.out, exist_ok=True)
    only = set(filter(None, a.only.split(',')))
    for k, text in lines.items():
        if only and k not in only: continue
        loudnorm_to_mp3(render_line(text, a.semitones, a.variant), os.path.join(a.out, k + '.mp3'))
        print('done', k, flush=True)

if __name__ == '__main__':
    main()
