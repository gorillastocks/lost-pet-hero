#!/usr/bin/env python3
"""Cheerful title loop and four sound effects, written for this game.

The music is an original 8-bar loop (ukulele-ish pluck, glockenspiel, soft clap)
that starts and ends on the same sample so it repeats cleanly. The effects are
short synthesized pops and chimes. Both are released CC0 with the game.
"""
import math
import struct
import subprocess
import wave
from pathlib import Path

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
    peak = max(1e-9, max(abs(s) for s in samples))
    buf = b''.join(struct.pack('<h', max(-32767, min(32767, int(s / peak * 28000)))) for s in samples)
    with wave.open(str(path), 'w') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(buf)


def loudnorm(wav, dest):
    measure = subprocess.run([
        'ffmpeg', '-i', str(wav), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json',
        '-f', 'null', '-',
    ], capture_output=True, text=True)
    blob = measure.stderr
    a, b = blob.rfind('{'), blob.rfind('}')
    af = 'loudnorm=I=-16:TP=-1.5:LRA=11'
    if a >= 0 and b > a:
        import json
        st = json.loads(blob[a:b + 1])
        finite = all(str(st.get(k, 'inf')) not in ('-inf', 'inf', 'nan') for k in ('input_i', 'input_tp', 'input_lra', 'input_thresh', 'target_offset'))
        if finite:
            af = (
                'loudnorm=I=-16:TP=-1.5:LRA=11:'
                f"measured_I={st['input_i']}:measured_TP={st['input_tp']}:"
                f"measured_LRA={st['input_lra']}:measured_thresh={st['input_thresh']}:"
                f"offset={st['target_offset']}:linear=true"
            )
    subprocess.check_call([
        'ffmpeg', '-y', '-i', str(wav), '-af', af,
        '-codec:a', 'libmp3lame', '-q:a', '4', '-ar', '44100', str(dest),
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def title_theme():
    bpm = 115
    beat = 60 / bpm
    bars = 8
    dur = bars * 4 * beat
    n = int(SR * dur)
    buf = [0.0] * n
    # C major, bouncy: C G Am F, then C G F C
    chords = [261.63, 392.00, 220.00, 174.61, 261.63, 392.00, 174.61, 261.63]
    for bar, root in enumerate(chords):
        t0 = bar * 4 * beat
        for step in range(8):
            mix(buf, tone(root * (2 if step % 2 == 0 else 1.5), 0.16), t0 + step * beat / 2)
            mix(buf, tone(root * 2, 0.09, (1, 0.2), 'bell'), t0 + step * beat / 2 + beat * 0.25)
        # clap on 2 and 4
        for clap_beat in (1, 3):
            mix(buf, noise_burst(0.05), t0 + clap_beat * beat)
    # force a seamless join: fade the last 12 ms into the first 12 ms shape
    fade = int(0.012 * SR)
    for i in range(fade):
        w = i / fade
        buf[i] = buf[i] * w + buf[-fade + i] * (1 - w)
        buf[-fade + i] *= (1 - w)
    return buf


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


def main():
    music = ROOT / 'public' / 'music'
    sfx = ROOT / 'public' / 'sfx'
    music.mkdir(parents=True, exist_ok=True)
    sfx.mkdir(parents=True, exist_ok=True)
    jobs = {
        music / 'title-theme.mp3': title_theme(),
        sfx / 'tap.mp3': sfx_tap(),
        sfx / 'heart-pop.mp3': sfx_heart(),
        sfx / 'sparkle.mp3': sfx_sparkle(),
        sfx / 'reunion-fanfare.mp3': sfx_fanfare(),
    }
    tmp = ROOT / 'scripts' / '.tmp-audio'
    tmp.mkdir(exist_ok=True)
    for dest, samples in jobs.items():
        wav = tmp / (dest.stem + '.wav')
        write_wav(wav, samples)
        loudnorm(wav, dest)
        print(dest.name, dest.stat().st_size)
    # confirm the theme joins
    import array
    wav = tmp / 'title-theme.wav'
    # re-measure seam on the pre-mp3 loop
    w = wave.open(str(wav))
    raw = array.array('h')
    raw.frombytes(w.readframes(w.getnframes()))
    w.close()
    print('theme seam', abs(raw[0] - raw[-1]))


if __name__ == '__main__':
    main()
