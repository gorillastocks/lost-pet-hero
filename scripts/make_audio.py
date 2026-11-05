#!/usr/bin/env python3
"""Original CC0 music and sound effects for Lost Pet Hero.

The theme is a slow forest bed: felt-piano and soft pad chords
(Cmaj7, Am7, Fmaj7, G6), a faint breeze, and a few quiet birds.
It loops seamlessly and sits quieter than the voice. The effects are
short synthesized pops and chimes. Nothing here is sampled from
another recording.
"""
import math
import struct
import subprocess
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SR = 44100


def env_adsr(n, a=0.01, d=0.08, s=0.55, r=0.12):
    out = []
    for i in range(n):
        t = i / SR
        if t < a:
            out.append(t / a)
        elif t < a + d:
            out.append(1 - (1 - s) * ((t - a) / d))
        elif t < (n / SR) - r:
            out.append(s)
        else:
            left = max(0.0001, (n / SR) - t)
            out.append(s * min(1, left / r))
    return out


def tone(freq, dur, harmonics=(1, 0.35, 0.12), curve='pluck'):
    n = int(SR * dur)
    e = env_adsr(n, 0.005, 0.12 if curve == 'pluck' else 0.04, 0.15 if curve == 'pluck' else 0.6, 0.08)
    if curve == 'pluck':
        e = [v * math.exp(-3.2 * (i / n)) for i, v in enumerate(e)]
    data = []
    for i in range(n):
        t = i / SR
        s = 0
        for k, amp in enumerate(harmonics, start=1):
            s += amp * math.sin(2 * math.pi * freq * k * t)
        data.append(s * e[i])
    return data


def mix(into, src, at):
    start = int(at * SR)
    for i, s in enumerate(src):
        j = start + i
        if j < len(into):
            into[j] += s


def write_wav(path, samples):
    data = np.asarray(samples, dtype=np.float64)
    peak = max(1e-9, float(np.max(np.abs(data))))
    pcm = np.clip(data / peak * 28000, -32767, 32767).astype('<i2')
    with wave.open(str(path), 'w') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def loudnorm(wav, dest, i_lufs=-16, tp=-1.5, bitrate=None):
    spec = f'loudnorm=I={i_lufs}:TP={tp}:LRA=11'
    measure = subprocess.run([
        'ffmpeg', '-i', str(wav), '-af', spec + ':print_format=json',
        '-f', 'null', '-',
    ], capture_output=True, text=True)
    blob = measure.stderr
    a, b = blob.rfind('{'), blob.rfind('}')
    af = spec
    if a >= 0 and b > a:
        import json
        st = json.loads(blob[a:b + 1])
        finite = all(str(st.get(k, 'inf')) not in ('-inf', 'inf', 'nan') for k in ('input_i', 'input_tp', 'input_lra', 'input_thresh', 'target_offset'))
        if finite:
            af = (
                f'{spec}:'
                f"measured_I={st['input_i']}:measured_TP={st['input_tp']}:"
                f"measured_LRA={st['input_lra']}:measured_thresh={st['input_thresh']}:"
                f"offset={st['target_offset']}:linear=true"
            )
    encode = ['-codec:a', 'libmp3lame', '-ar', '44100']
    encode += ['-b:a', bitrate] if bitrate else ['-q:a', '4']
    subprocess.check_call([
        'ffmpeg', '-y', '-i', str(wav), '-af', af, *encode, str(dest),
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def _place(buf, src, at):
    start = int(at * SR)
    end = min(len(buf), start + len(src))
    if start >= len(buf) or end <= start:
        return
    buf[start:end] += src[:end - start]


def _env(n, attack, release):
    t = np.arange(n) / SR
    rise = 1 - np.exp(-t / max(attack, 0.01))
    rel = np.ones(n)
    rel_n = min(n - 1, int(release * SR))
    if rel_n > 0:
        rel[-rel_n:] = np.cos(np.linspace(0, np.pi / 2, rel_n)) ** 2
    return rise * rel


def felt(freq, dur, vel=1.0):
    """Soft felt-piano tone: slow bloom, two slightly detuned strings, little bite."""
    n = int(SR * dur)
    t = np.arange(n) / SR
    wave = (
        np.sin(2 * np.pi * freq * t)
        + 0.55 * np.sin(2 * np.pi * freq * 1.004 * t)
        + 0.12 * np.sin(2 * np.pi * freq * 2 * t)
    )
    return vel * wave * _env(n, 0.22, min(2.8, dur * 0.55))


def pad(freq, dur, vel=0.4):
    n = int(SR * dur)
    t = np.arange(n) / SR
    wave = np.sin(2 * np.pi * freq * t) + 0.65 * np.sin(2 * np.pi * freq * 0.997 * t)
    return vel * wave * _env(n, 1.15, min(2.4, dur * 0.4))


def chirp(freq, dur=0.16):
    n = int(SR * dur)
    t = np.arange(n) / SR
    sweep = freq * (1 + 0.12 * (t / dur))
    phase = 2 * np.pi * np.cumsum(sweep) / SR
    env = np.sin(np.linspace(0, np.pi, n)) ** 2
    return 0.22 * np.sin(phase) * env


def breeze(n):
    rng = np.random.default_rng(7)
    white = rng.uniform(-1, 1, n)
    kernel = np.hanning(1200)
    kernel /= kernel.sum()
    soft = np.convolve(white, kernel, mode='same')
    t = np.arange(n) / SR
    gust = 0.65 + 0.35 * np.sin(2 * np.pi * 0.06 * t)
    return soft * gust


def seamless(buf, fade_s=3.5):
    """Overlap the ending onto the opening so the file repeats on adjacent samples."""
    fade = int(SR * fade_s)
    ramp = np.linspace(0, 1, fade)
    out = buf.copy()
    out[:fade] = buf[:fade] * ramp + buf[-fade:] * (1 - ramp)
    return out[:-fade]


# Close, warm voicings. The top note stays in a bright middle register.
FOREST_CHORDS = [
    [196.00, 329.63, 392.00, 493.88],  # Cmaj7  G3 E4 G4 B4
    [220.00, 261.63, 329.63, 392.00],  # Am7    A3 C4 E4 G4
    [174.61, 261.63, 329.63, 440.00],  # Fmaj7  F3 C4 E4 A4
    [196.00, 246.94, 329.63, 392.00],  # G6     G3 B3 E4 G4
]
# One soft high tone per bar, still on the chord, so the bed keeps a little lift.
FOREST_TOPS = [
    [523.25, 659.25, 493.88, 523.25, 659.25],
    [440.00, 523.25, 392.00, 493.88, 440.00],
    [440.00, 523.25, 659.25, 698.46, 523.25],
    [587.33, 659.25, 783.99, 493.88, 587.33],
]


def title_theme():
    """About 72 seconds at 66 BPM. Four chords, five bars each, then a seamless join."""
    bpm = 66
    beat = 60 / bpm
    bars_each = 5
    chord_dur = bars_each * 4 * beat
    overlap = 1.6
    total = len(FOREST_CHORDS) * chord_dur
    n = int(SR * (total + overlap))
    buf = np.zeros(n, dtype=np.float64)
    buf += breeze(n) * 0.045
    for i, (tones, tops) in enumerate(zip(FOREST_CHORDS, FOREST_TOPS)):
        t0 = i * chord_dur
        span = chord_dur + overlap
        for k, freq in enumerate(tones):
            _place(buf, pad(freq, span, 0.34), t0)
            _place(buf, felt(freq, span * 0.92, 0.55), t0 + k * 0.07)
        for bar, top in enumerate(tops):
            _place(buf, felt(top, beat * 3.2, 0.22), t0 + bar * 4 * beat + beat)
    # A few quiet birds, not on a grid, so the woods feel lightly alive.
    for at, freq in (
        (6.2, 3100), (11.4, 2740), (18.8, 3480), (27.5, 2920),
        (36.1, 3320), (44.7, 2680), (53.4, 3560), (63.2, 3010), (69.5, 2840),
    ):
        _place(buf, chirp(freq), at)
        _place(buf, chirp(freq * 1.25, 0.11), at + 0.14)
    buf -= buf.mean()
    looped = seamless(buf, 3.5)
    peak = np.max(np.abs(looped)) or 1
    return looped / peak * 0.9


def noise_burst(dur):
    n = int(SR * dur)
    out = []
    seed = 1
    for i in range(n):
        seed = (1103515245 * seed + 12345) & 0x7fffffff
        v = (seed / 0x7fffffff) * 2 - 1
        out.append(v * math.exp(-18 * i / n) * 0.4)
    return out


def sfx_tap():
    a = tone(660, 0.09, (1, 0.2), 'bell')
    b = tone(990, 0.07, (1, 0.15), 'bell')
    buf = [0.0] * int(SR * 0.16)
    mix(buf, a, 0)
    mix(buf, b, 0.03)
    return buf


def sfx_heart():
    buf = [0.0] * int(SR * 0.55)
    for i, f in enumerate((523.25, 659.25, 783.99)):
        mix(buf, tone(f, 0.28, (1, 0.25, 0.08), 'bell'), i * 0.08)
    return buf


def sfx_sparkle():
    buf = [0.0] * int(SR * 0.7)
    notes = (1046, 1318, 1568, 2093, 1568, 1318)
    for i, f in enumerate(notes):
        mix(buf, tone(f, 0.16, (1, 0.4, 0.1), 'bell'), i * 0.07)
    return buf


def sfx_fanfare():
    buf = [0.0] * int(SR * 1.6)
    notes = (523.25, 659.25, 783.99, 1046.5)
    for i, f in enumerate(notes):
        mix(buf, tone(f, 0.42, (1, 0.3, 0.12), 'bell'), i * 0.18)
        mix(buf, tone(f / 2, 0.42, (1, 0.2), 'pluck'), i * 0.18)
    return buf


def _fade_out(buf, seconds=0.35):
    n = min(len(buf), int(SR * seconds))
    if n <= 1:
        return buf
    buf = np.asarray(buf, dtype=np.float64).copy()
    buf[-n:] *= np.linspace(1, 0, n)
    return buf


def pet_found_fanfare():
    """Bright 4-second rise in C major: pluck, bell, and a soft string."""
    dur = 4.2
    buf = np.zeros(int(SR * dur), dtype=np.float64)
    climb = (261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50)
    for i, freq in enumerate(climb):
        at = i * 0.38
        _place(buf, felt(freq, 0.85, 0.7), at)
        _place(buf, felt(freq * 2, 0.45, 0.28), at)
        _place(buf, pad(freq / 2, 0.7, 0.22), at)
    for freq in (523.25, 659.25, 783.99, 1046.50):
        _place(buf, felt(freq, 1.5, 0.45), 2.75)
        _place(buf, pad(freq, 1.6, 0.28), 2.75)
    peak = np.max(np.abs(buf)) or 1
    return _fade_out(buf / peak * 0.9, 0.4)


def _noise(n, seed):
    return np.random.default_rng(seed).uniform(-1, 1, n)


def whistle(freq, dur, vel=1.0):
    """Bright synth-flute: quick scoop, a little vibrato, soft breath."""
    n = max(8, int(SR * dur))
    t = np.arange(n) / SR
    scoop = np.minimum(1, t / 0.03)
    f = freq * (0.94 + 0.06 * scoop) * (1 + 0.004 * np.sin(2 * np.pi * 5.2 * t))
    phase = 2 * np.pi * np.cumsum(f) / SR
    tone_w = np.sin(phase) + 0.22 * np.sin(2 * phase) + 0.05 * np.sin(3 * phase)
    breath = _noise(n, int(freq) % 997) * 0.04
    return vel * (tone_w + breath) * _env(n, 0.02, min(0.09, dur * 0.45))


def glock(freq, dur, vel=0.35):
    n = max(8, int(SR * dur))
    t = np.arange(n) / SR
    wave = np.sin(2 * np.pi * freq * t) + 0.4 * np.sin(2 * np.pi * freq * 2.01 * t)
    return vel * wave * np.exp(-t / 0.18)


def bass_pluck(freq, dur, vel=0.7):
    n = max(8, int(SR * dur))
    t = np.arange(n) / SR
    wave = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(2 * np.pi * freq * 2 * t)
    return vel * wave * np.exp(-t / 0.16)


def clap(seed):
    n = int(SR * 0.09)
    burst = np.diff(_noise(n, seed), prepend=0.0)
    return burst * np.exp(-np.arange(n) / (SR * 0.018)) * 0.7


def shaker(seed):
    n = int(SR * 0.045)
    burst = np.diff(_noise(n, seed), prepend=0.0)
    return burst * np.exp(-np.arange(n) / (SR * 0.01)) * 0.22


def cymbal_swell(dur=1.05):
    n = int(SR * dur)
    raw = _noise(n, 21)
    bright = raw - np.convolve(raw, np.ones(50) / 50, mode='same')
    return bright * (np.linspace(0, 1, n) ** 2) * 0.65


def cymbal_crash():
    n = int(SR * 1.35)
    raw = _noise(n, 29)
    bright = raw - np.convolve(raw, np.ones(24) / 24, mode='same')
    return bright * np.exp(-np.arange(n) / (SR * 0.32)) * 0.85


def celebration_tune():
    """Festive G-major parade, 126 BPM, about 12 seconds, ending on a ta-da chord.

    The lead is a short hummable whistle hook, not a C-major scale run.
    """
    bpm = 126
    beat = 60 / bpm
    eighth = beat / 2
    # Eight eighth-notes a bar. Roots are the bass note for that bar.
    hook = [
        (98.00, (987.77, 987.77, 1174.66, 987.77, 880.00, 783.99, 659.25, 587.33)),  # G
        (73.42, (880.00, 880.00, 1046.50, 880.00, 783.99, 739.99, 659.25, 587.33)),  # D
        (98.00, (1174.66, 987.77, 783.99, 987.77, 1174.66, 1174.66, 987.77, 783.99)),  # G
        (65.41, (659.25, 783.99, 880.00, 783.99, 659.25, 587.33, 523.25, 587.33)),  # C
        (98.00, (987.77, 1174.66, 987.77, 783.99, 880.00, 987.77, 1174.66, 1318.51)),  # G lift
        (73.42, (739.99, 783.99, 880.00, 987.77)),  # D pickup into the button
    ]
    tada = 1.55
    dur = 5 * 8 * eighth + 4 * eighth + tada
    buf = np.zeros(int(SR * dur), dtype=np.float64)
    for bar, (root, notes) in enumerate(hook):
        t0 = bar * 8 * eighth
        _place(buf, bass_pluck(root, beat * 0.9, 0.85), t0)
        _place(buf, bass_pluck(root * 1.5, beat * 0.7, 0.55), t0 + 2 * eighth)
        _place(buf, glock(root * 4, beat * 1.2, 0.22), t0)
        for j, note in enumerate(notes):
            at = t0 + j * eighth
            _place(buf, whistle(note, eighth * 0.92, 0.78), at)
            _place(buf, glock(note * 2, eighth * 1.4, 0.16), at)
            if j % 2 == 1:
                _place(buf, shaker(bar * 8 + j), at)
            if j in (2, 6):
                _place(buf, clap(100 + bar * 8 + j), at)
    hit = 5 * 8 * eighth + 4 * eighth
    _place(buf, cymbal_swell(1.05), hit - 1.05)
    _place(buf, cymbal_crash(), hit)
    for freq, vel in ((196.00, 0.7), (246.94, 0.55), (392.00, 0.62), (493.88, 0.5), (587.33, 0.58), (783.99, 0.72)):
        _place(buf, felt(freq, 1.45, vel), hit)
        _place(buf, glock(freq * 2, 1.1, vel * 0.35), hit)
    peak = np.max(np.abs(buf)) or 1
    return _fade_out(buf / peak * 0.9, 0.4)


def celebration_jingle():
    """Short major flourish for the prize card. Original, no percussion."""
    buf = [0.0] * int(SR * 2.2)
    notes = (523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.51)
    for i, freq in enumerate(notes):
        mix(buf, tone(freq, 0.36, (1, 0.22, 0.06), 'bell'), i * 0.16)
        mix(buf, tone(freq / 2, 0.4, (1, 0.12), 'bell'), i * 0.16)
    return buf


def main():
    """Rewrite the theme only. Sound effects stay as they are unless --sfx is passed."""
    import sys
    if '--cues' in sys.argv:
        music = ROOT / 'public' / 'music'
        tmp = ROOT / 'scripts' / '.tmp-audio'
        music.mkdir(parents=True, exist_ok=True)
        tmp.mkdir(exist_ok=True)
        jobs = {'celebration': celebration_tune()}
        if '--celebration' not in sys.argv:
            jobs = {'pet-found': pet_found_fanfare(), **jobs}
        for name, samples in jobs.items():
            wav = tmp / f'{name}.wav'
            write_wav(wav, samples)
            dest = music / f'{name}.mp3'
            loudnorm(wav, dest, i_lufs=-18.0, tp=-2.0, bitrate='160k')
            with wave.open(str(wav)) as w:
                seconds = w.getnframes() / SR
            print(f'{name} {dest.stat().st_size} bytes {seconds:.2f}s')
        return
    if '--jingle' in sys.argv:
        sfx = ROOT / 'public' / 'sfx'
        tmp = ROOT / 'scripts' / '.tmp-audio'
        sfx.mkdir(parents=True, exist_ok=True)
        tmp.mkdir(exist_ok=True)
        wav = tmp / 'reunion-jingle.wav'
        write_wav(wav, celebration_jingle())
        dest = sfx / 'reunion-jingle.mp3'
        loudnorm(wav, dest, i_lufs=-16, tp=-1.5)
        print('jingle', dest.stat().st_size)
        return
    music = ROOT / 'public' / 'music'
    music.mkdir(parents=True, exist_ok=True)
    tmp = ROOT / 'scripts' / '.tmp-audio'
    tmp.mkdir(exist_ok=True)
    theme = title_theme()
    wav = tmp / 'title-theme.wav'
    write_wav(wav, theme)
    dest = music / 'title-theme.mp3'
    loudnorm(wav, dest, i_lufs=-22, tp=-2.0, bitrate='128k')
    with wave.open(str(wav)) as w:
        frames = w.getnframes()
        raw = np.frombuffer(w.readframes(frames), dtype='<i2')
    print(f'theme {dest.stat().st_size} bytes  {frames / SR:.2f}s  seam {abs(int(raw[0]) - int(raw[-1]))}')
    if '--sfx' in sys.argv:
        sfx = ROOT / 'public' / 'sfx'
        sfx.mkdir(parents=True, exist_ok=True)
        for name, samples in {
            'tap': sfx_tap(), 'heart-pop': sfx_heart(),
            'sparkle': sfx_sparkle(), 'reunion-fanfare': sfx_fanfare(),
        }.items():
            sw = tmp / f'{name}.wav'
            write_wav(sw, samples)
            loudnorm(sw, sfx / f'{name}.mp3')
            print(name, (sfx / f'{name}.mp3').stat().st_size)


if __name__ == '__main__':
    main()
