#!/usr/bin/env python3
"""Earlier flat Kokoro renderer. The approved voices use scripts/kgen_final.py.

That script is af_bella at speed 1.12, with a Praat PSOLA +4 semitone
rise on sentences that end in ?. See scripts/voice-settings.json.
This file can still render a flat take (no question rise) if you pass flags.

Examples:
  python3 scripts/render_voices.py
  python3 scripts/render_voices.py --speed 1.15 --pitch 1.5
  python3 scripts/render_voices.py --blend af_bella=0.7,af_sky=0.3
  python3 scripts/render_voices.py --settings scripts/voice-settings.json

overrides in the settings file replace the spoken text for one id
without changing src/lines.json (the on-screen words stay put):
  { "overrides": { "title-greeting": "Hi! Welcome to Lost Pet Hero!" } }
"""
import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LINES = ROOT / 'src' / 'lines.json'
OUT = ROOT / 'public' / 'voice'
SAMPLE_RATE = 24000


def load_settings(path):
    if not path:
        return {}
    return json.loads(Path(path).read_text())


def parse_blend(spec):
    """'af_bella=0.7,af_sky=0.3' -> [(voice, weight), ...]. Empty means a single voice."""
    if not spec:
        return []
    parts = []
    for bit in spec.split(','):
        bit = bit.strip()
        if not bit:
            continue
        name, _, weight = bit.partition('=')
        parts.append((name.strip(), float(weight) if weight else 1.0))
    total = sum(w for _, w in parts) or 1.0
    return [(n, w / total) for n, w in parts]


def mix_voices(pipeline, blend):
    import torch
    acc = None
    for name, weight in blend:
        pack = pipeline.load_single_voice(name)
        acc = pack * weight if acc is None else acc + pack * weight
    return acc


def pitch_shift(wav_path, semitones):
    if abs(semitones) < 0.01:
        return
    factor = 2 ** (semitones / 12)
    tmp = wav_path.with_suffix('.pitched.wav')
    # asetrate raises pitch and shortens the file; atempo puts the length back.
    filt = f'asetrate={SAMPLE_RATE * factor},aresample={SAMPLE_RATE},atempo={1 / factor}'
    subprocess.check_call([
        'ffmpeg', '-y', '-i', str(wav_path), '-af', filt, str(tmp),
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    tmp.replace(wav_path)


def to_mp3(wav_path, mp3_path):
    """Two-pass loudness normalize to about -16 LUFS, then mp3."""
    measure = subprocess.run([
        'ffmpeg', '-i', str(wav_path),
        '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json',
        '-f', 'null', '-',
    ], capture_output=True, text=True)
    blob = measure.stderr
    start = blob.rfind('{')
    end = blob.rfind('}')
    if start >= 0 and end > start:
        stats = json.loads(blob[start:end + 1])
        af = (
            'loudnorm=I=-16:TP=-1.5:LRA=11:'
            f"measured_I={stats['input_i']}:measured_TP={stats['input_tp']}:"
            f"measured_LRA={stats['input_lra']}:measured_thresh={stats['input_thresh']}:"
            f"offset={stats['target_offset']}:linear=true"
        )
    else:
        af = 'loudnorm=I=-16:TP=-1.5:LRA=11'
    subprocess.check_call([
        'ffmpeg', '-y', '-i', str(wav_path), '-af', af,
        '-codec:a', 'libmp3lame', '-q:a', '4', '-ar', '44100', str(mp3_path),
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def render(settings):
    import numpy as np
    import soundfile as sf
    from kokoro import KPipeline

    lines = json.loads(LINES.read_text())
    overrides = settings.get('overrides') or {}
    voice = settings.get('voice') or 'af_bella'
    speed = float(settings.get('speed', 1.12))
    pitch = float(settings.get('pitch_semitones', 0))
    blend = parse_blend(settings.get('blend') or '')
    pipeline = KPipeline(lang_code='a')
    voice_arg = mix_voices(pipeline, blend) if blend else voice
    OUT.mkdir(parents=True, exist_ok=True)
    report = []
    for line_id, text in lines.items():
        spoken = overrides.get(line_id, text)
        chunks = []
        phonemes = []
        for _gs, ps, audio in pipeline(spoken, voice=voice_arg, speed=speed, split_pattern=r'\n+'):
            wave = audio.detach().cpu().numpy() if hasattr(audio, 'detach') else audio
            chunks.append(np.asarray(wave, dtype='float32'))
            if ps:
                phonemes.append(str(ps))
        if not chunks:
            raise SystemExit(f'Kokoro returned no audio for {line_id}')
        audio = np.concatenate(chunks)
        wav = Path(tempfile.gettempdir()) / f'lph-{line_id}.wav'
        sf.write(wav, audio, SAMPLE_RATE)
        pitch_shift(wav, pitch)
        mp3 = OUT / f'{line_id}.mp3'
        to_mp3(wav, mp3)
        wav.unlink(missing_ok=True)
        report.append((line_id, ' | '.join(phonemes)))
        print(f'{line_id}: {phonemes[0][:120] if phonemes else ""}')
    log = ROOT / 'scripts' / 'phonemes.txt'
    log.write_text('\n'.join(f'{i}\t{p}' for i, p in report) + '\n')
    print(f'wrote {len(report)} lines to {OUT} (speed {speed}, pitch {pitch:+.2f} st, voice {voice})')


def main():
    p = argparse.ArgumentParser(description='Render Lost Pet Hero voice lines with Kokoro')
    p.add_argument('--settings', default=str(ROOT / 'scripts' / 'voice-settings.json'))
    p.add_argument('--voice', help='Kokoro voice id, default af_bella')
    p.add_argument('--speed', type=float, help='Speech speed, 1.0 is the model default')
    p.add_argument('--pitch', type=float, dest='pitch_semitones', help='Pitch shift in semitones')
    p.add_argument('--blend', help='Optional mix, e.g. af_bella=0.7,af_sky=0.3')
    p.add_argument('--override', action='append', default=[], metavar='ID=TEXT',
                   help='Speak different words for one line id')
    args = p.parse_args()
    if shutil.which('ffmpeg') is None:
        sys.exit('ffmpeg is required')
    settings = load_settings(args.settings)
    for key in ('voice', 'speed', 'pitch_semitones', 'blend'):
        val = getattr(args, key)
        if val is not None:
            settings[key] = val
    overrides = dict(settings.get('overrides') or {})
    for item in args.override:
        line_id, _, text = item.partition('=')
        overrides[line_id] = text
    settings['overrides'] = overrides
    render(settings)


if __name__ == '__main__':
    main()
