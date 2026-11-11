#!/usr/bin/env python3
"""
npm run sync   =   make PICTURE and SOUND agree with the voice-over, in one command.

  1. voice/voice.mp3 -> voice/voice.wav (48 kHz mono) when the wav is missing or older
  2. word timings   -> voice/words.json    (Whisper if installed, else the offline energy estimate)
  3. soundtrack     -> audio/out/mix.wav   (voice + score + SFX, exactly the picture's length)
  4. report         -> the shot cuts, key cue frames and the frame count the render will use

Why this keeps them in sync: story.ts / timing.ts (picture) and audio/timeline.py (sound) both read ONLY voice/words.json.
Re-record the voice, run `npm run sync`, and every cut, camera key, reaction, effect, sound effect and music section moves with the words.

  npm run sync                    auto engine
  npm run sync -- --engine whisper     best accuracy (pip install faster-whisper)
  npm run sync -- --engine energy      offline estimate (no model download)
"""
import json, math, os, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
PY = sys.executable


def run(*a):
    print("\n$", " ".join(str(x) for x in a), flush=True)
    r = subprocess.run([str(x) for x in a], cwd=ROOT)
    if r.returncode:
        sys.exit(r.returncode)


def main():
    engine = "auto"
    if "--engine" in sys.argv:
        engine = sys.argv[sys.argv.index("--engine") + 1]
    mp3, wav = os.path.join(ROOT, "voice", "voice.mp3"), os.path.join(ROOT, "voice", "voice.wav")
    if not os.path.exists(mp3) and not os.path.exists(wav):
        sys.exit("Put your voice-over at voice/voice.mp3 (or voice/voice.wav) first.")
    if os.path.exists(mp3) and (not os.path.exists(wav) or os.path.getmtime(mp3) > os.path.getmtime(wav)):
        if not shutil.which("ffmpeg"):
            sys.exit("ffmpeg is needed (https://ffmpeg.org/download.html) to convert voice.mp3 -> voice.wav")
        run("ffmpeg", "-y", "-v", "error", "-i", mp3, "-ar", "48000", "-ac", "1", wav)
    run(PY, os.path.join("scripts", "align_words.py"), "--engine", engine)
    run(PY, os.path.join("audio", "mix.py"))

    d = json.load(open(os.path.join(ROOT, "voice", "words.json"), encoding="utf-8"))
    total = math.ceil(d["duration"] * 30)
    w = d["words"]
    fs = lambda i: round(w[i]["s"] * 30)
    print("\n================ SYNC REPORT ================")
    print(f"voice {d['duration']:.3f} s  ->  {total} frames @ 30 fps = {total / 30:.3f} s   (timings: {d['source']})")
    print(f"shot cuts (frames): 2 @ {fs(6) - 2}  3 @ {fs(10) - 2}  4 @ {fs(18) - 2}  5 @ {fs(24) - 3}")
    print(f"key words (frames): doubled {fs(2)}, convenience {fs(9)}, half-empty {fs(13)}, tricks {fs(15)}, brain {fs(17)}, buying {fs(19)}, food {fs(23)}, basket {fs(31)}")
    if d["source"] == "energy-estimate":
        print("NOTE: word timings are an ESTIMATE from the audio energy. For frame-exact cues run:  pip install faster-whisper  &&  npm run sync")
    print("Next:  npm run stills   (quick look)   |   npm run render  then  npm run mux  then  npm run check")


if __name__ == "__main__":
    main()
