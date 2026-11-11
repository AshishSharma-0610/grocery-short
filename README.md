# The Half-Empty Cart: vertical cartoon short (2D characters in a 3D toon world, three.js inside Remotion)

A 11.9 s, 1080x1920 (rendered at 1440x2560) short made with the `cartoon-3d-ytshort` style: flat 2D characters standing in a painted,
ink-lined 3D world, thin-lens depth of field, bloom, colour grade, original synthesised score and sound effects.
Script (your ElevenLabs voice-over is in `voice/`):

> Grocery stores doubled their cart sizes, not for your convenience... but because a half-empty cart tricks your brain into buying forty percent more food. Swapping the cart for a small hand basket.

**Nothing was rendered when this project was prepared.** It was type-checked, bundled with Remotion's webpack, its camera/cue logic was
swept over all 357 frames, and the audio was generated and measured. Please start with `npm run stills` (see step 4).

## 1. Install (once)
Needs: **Node 18+** (22 works), **Python 3.9+**, **ffmpeg + ffprobe** on your PATH, and a normal GPU/driver (Remotion downloads its own Chrome).
```bash
npm install
pip install -r requirements.txt          # numpy + scipy (the sound is synthesised in Python)
# optional, for frame-exact word timings:   pip install faster-whisper
```
On Windows use the same commands in PowerShell (`py -3` is tried automatically if `python` is not found).

## 2. Sync picture and sound with the voice-over  <- the sync command
```bash
npm run sync
```
One command that: converts `voice/voice.mp3` to 48 kHz wav, finds the **time of every word** (`voice/words.json`; Whisper if installed,
otherwise an offline energy estimate), builds the **soundtrack** (`audio/out/mix.wav`: voice + music + SFX, exactly the picture length),
and prints the shot-cut and key-word frames. Picture and sound both read only `voice/words.json`, so cuts, camera moves, reactions,
effects, SFX and music sections all land on the words. **Re-record or replace the voice? Drop it in `voice/voice.mp3` and run `npm run sync` again.**

The shipped `words.json` is an *estimate* made from the audio energy (about 50-80 ms accuracy). For frame-exact cues run
`pip install faster-whisper` once, then `npm run sync -- --engine whisper`.

## 3. Check the framing without a GPU (seconds)
```bash
npm run framing        # prints where each subject lands in the frame for every shot; "OUT" = off-screen
npm run typecheck
```

## 4. Look at key frames (about 1 minute), then render
```bash
npm run stills         # out/stills/*.png at half size: compare with skill/references/frames/
npm run preview        # optional: Remotion Studio, scrub the timeline
npm run render         # out/video_silent.mp4 at 1440x2560 (WebGL: allow roughly 10-30 min depending on your machine)
npm run mux            # out/final.mp4 = picture + audio/out/mix.wav, cut to the exact frame count
npm run check          # verifies frames, durations and A/V offset (all lines must say OK)
```
`npm run make` does sync + render + mux + check in one go. If the render runs out of memory add `--concurrency=1` to the `render` script;
if WebGL fails try `--gl=swangle` or `--gl=egl`.

## Project map
```
voice/            voice.mp3 (yours), voice.wav (generated), words.json (word timings: THE source of sync)
docs/             SCRIPT.txt, SHOTPLAN.md (shot by shot), STYLE_CHECKLIST.md (skill rules -> code -> what to look for)
src/videos/grocery/
  timing.ts       loads words.json; every cue is a word onset
  story.ts        shots, camera grammar, DOF, kicks, cart/item/staging maths, reactions   (pure maths, no THREE)
  store.ts        the procedural 3D store, carts, baskets, products
  world.ts        assembles + poses the scene per frame            cast.ts  character cards + effect cards per frame
  toon.ts         the 2D character drawing system (+ new props/outfits/effects)
  ink.ts lensblur.ts grade.ts shade.ts cardshade.ts lights.ts paint.ts   the look engine from the skill
  Store.tsx       Remotion composition + post chain (ink -> lens blur -> bloom -> tone map -> grade)
audio/            timeline.py music.py sfx.py mix.py (+ dsp.py instruments.py sfx_gen.py); out/ has mix.wav and cues.md
scripts/          align_words.py sync_all.py mux.mjs check.mjs stills.mjs framing.ts py.mjs
skill/            the complete cartoon-3d-ytshort skill (SKILL.md, references, bridge template) for reference
```

## Tweaking
* Cut timing / camera / reactions: `story.ts`. After moving a camera run `npm run framing`.
* Colours: `PAL` / `PROD` in `store.ts`; character outfits: top of the `toon.ts` additions (`SHOPPER`, `MANAGER`, `EXTRAS`); light: `lights.ts`.
* Sound: `audio/sfx.py` (events), `audio/music.py` (score), levels at the top of `audio/mix.py`. Each `npm run sync` rewrites `audio/out/cues.md`.
* Changing the script text: edit `docs/SCRIPT.txt` **and** the word list in `timing.ts` / `audio/timeline.py` / `scripts/align_words.py`
  (the shots are written for this script; a new story needs new shots: see `skill/SKILL.md`).

## Licence / credits
All geometry, textures, music and sound effects are generated by the code in this project (no Kenney or other third-party assets are used).
Voice-over: your ElevenLabs file. Style engine: `cartoon-3d-ytshort` skill (`skill/`).
