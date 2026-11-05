# Attribution

Lost Pet Hero: Wildwood draws its pictures in the game itself, with canvas and CSS shapes.

## Pictures and fonts

- Art and animation: original plush-toy drawings made for this project. No toy-brand assets or names are used.
- Fonts: [Fredoka](https://fonts.google.com/specimen/Fredoka), [Baloo 2](https://fonts.google.com/specimen/Baloo+2), and [Nunito](https://fonts.google.com/specimen/Nunito), all SIL Open Font License, self-hosted.

## Voice

The spoken lines are AI-generated with [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) (`hexgrad/Kokoro-82M`), voice `af_bella`.

- Model license: Apache-2.0. https://github.com/hexgrad/kokoro and https://huggingface.co/hexgrad/Kokoro-82M
- Words: `src/lines.json` (original). Files: `public/voice/*.mp3`, same ids as that file.
- How they were made: `scripts/kgen_final.py`. Kokoro speaks each sentence at speed 1.00. Sentences that end in `?` get a +4 semitone rise (Praat PSOLA, formants kept) over the last ~0.45 seconds, then loudness is set to −16 LUFS with a true-peak ceiling of −1.5 dBTP. Those settings are recorded in `scripts/voice-settings.json`.
- Words on screen stay in `src/lines.json`. Re-render with `python3 scripts/kgen_final.py`.
- Pronunciation help: [eSpeak NG](https://github.com/espeak-ng/espeak-ng) (GPL-3.0) was used only while rendering. The game does not ship eSpeak.

## Music and sound effects

Original sounds written for this game and released **CC0 1.0** (public domain). Fine for a children's game, including a paid app. No third-party music or effects are included.

| File | What it is | License | Source |
|---|---|---|---|
| `public/music/title-theme.mp3` | Calm forest bed, 66 BPM, about 72 seconds. Felt piano and soft pad on Cmaj7–Am7–Fmaj7–G6, quiet birds and a faint breeze. Around −22 LUFS so the voice stays clearer. | CC0 1.0 | `scripts/make_audio.py` in this repo |
| `public/music/pet-found.mp3` | 4-second rising C-major fanfare when a lost pet is calmed. Around −18 LUFS. | CC0 1.0 | `scripts/make_audio.py` |
| `public/music/celebration.mp3` | About 12 seconds at 126 BPM in G major. Whistle lead, playful bass, light claps and shaker, then a cymbal swell into a G-major ta-da. Around −18.5 LUFS. | CC0 1.0 | `scripts/make_audio.py` |
| `public/sfx/tap.mp3` | Short two-note pop | CC0 1.0 | `scripts/make_audio.py` |
| `public/sfx/heart-pop.mp3` | Three-note chime | CC0 1.0 | `scripts/make_audio.py` |
| `public/sfx/sparkle.mp3` | Rising sparkle | CC0 1.0 | `scripts/make_audio.py` |
| `public/sfx/reunion-fanfare.mp3` | Short major fanfare | CC0 1.0 | `scripts/make_audio.py` |
| `public/sfx/reunion-jingle.mp3` | Cheerful prize jingle, about 2 seconds | CC0 1.0 | `scripts/make_audio.py` |

CC0 text: https://creativecommons.org/publicdomain/zero/1.0/

## App tools

- App shell: [Capacitor](https://capacitorjs.com/) (MIT), including `@capacitor/preferences` for on-device saves.
- Web build: [Vite](https://vitejs.dev/) (MIT).
- Tests: [Vitest](https://vitest.dev/) (MIT) and [Playwright](https://playwright.dev/) (Apache-2.0).
