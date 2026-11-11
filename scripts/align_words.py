#!/usr/bin/env python3
"""
align_words.py  -  word timings for the voice-over  ->  voice/words.json

Everything in the picture and the sound is timed to this file, so this is the "sync" step.

  python scripts/align_words.py                       # auto: Whisper if installed, else energy estimate
  python scripts/align_words.py --engine whisper      # force Whisper (pip install faster-whisper)
  python scripts/align_words.py --engine energy       # force the offline estimate
  python scripts/align_words.py --audio voice/voice.wav --script docs/SCRIPT.txt --out voice/words.json

Engines
  whisper : faster-whisper word timestamps, matched to the script words (difflib). Best accuracy.
  energy  : no models. Splits the audio into phrases at real pauses, then places the word boundaries of each
            phrase on energy valleys (syllable gaps) with a dynamic programme that also follows the syllable counts.
            Typically within ~50-80 ms per word. Good enough to render; use whisper for the last frame of polish.

Output  voice/words.json
  { "source": "...", "duration": 11.886, "words": [ { "w": "Grocery", "s": 0.06, "e": 0.56 }, ... ] }
"""
import argparse, json, os, re, sys, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

# ----------------------------------------------------------------------------------------------- script words
SYL = {"grocery": 3, "stores": 1, "doubled": 2, "their": 1, "cart": 1, "sizes": 2, "not": 1, "for": 1, "your": 1,
       "convenience": 4, "but": 1, "because": 2, "a": 1, "half-empty": 3, "tricks": 1, "brain": 1, "into": 2,
       "buying": 2, "forty": 2, "percent": 2, "more": 1, "food": 1, "swapping": 2, "the": 1, "small": 1, "hand": 1,
       "basket": 2}
FUNC = {"the", "a", "for", "your", "their", "but", "into", "not"}


def syl(w):
    k = w.lower()
    if k in SYL:
        return SYL[k]
    n = len(re.findall(r"[aeiouy]+", k))
    return max(1, n - (1 if k.endswith("e") and n > 1 else 0))


def parse_script(text):
    """-> list of words, list of (index) where a LONG pause is expected (after the word), list of SHORT pause indices"""
    t = text.replace("\u2014", " \u2014 ").replace("...", " ... ").replace("\u2026", " ... ")
    toks = t.split()
    words, longp, shortp = [], [], []
    for tok in toks:
        if tok == "\u2014":
            if words: longp.append(len(words) - 1)
            continue
        if tok == "...":
            if words: shortp.append(len(words) - 1)
            continue
        m = re.match(r"^([\w'\-]+)([.,;:!?]*)$", tok)
        if not m:
            clean = re.sub(r"[^\w'\-]", "", tok)
            if not clean: continue
            words.append(clean); continue
        words.append(m.group(1))
        if m.group(2) and m.group(2)[-1] in ".!?" and len(words) > 0:
            longp.append(len(words) - 1)
    return words, sorted(set(longp)), sorted(set(shortp))


# ----------------------------------------------------------------------------------------------- audio helpers
def read_mono(path):
    if path.lower().endswith(".wav"):
        w = wave.open(path)
        n, sr, ch, sw = w.getnframes(), w.getframerate(), w.getnchannels(), w.getsampwidth()
        raw = w.readframes(n)
        x = np.frombuffer(raw, dtype={2: np.int16, 4: np.int32}[sw]).astype(np.float64) / float(2 ** (8 * sw - 1))
        if ch > 1: x = x.reshape(-1, ch).mean(1)
        return x, sr
    import subprocess
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ar", "48000", "-ac", "1", "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float64) / 32768.0, 48000


def envelope(x, sr, hop_s=0.005):
    hop = int(hop_s * sr)
    n = (len(x) - 2 * hop) // hop
    e = np.array([np.sqrt(np.mean(x[i * hop:i * hop + 2 * hop] ** 2)) for i in range(n)])
    return 20 * np.log10(e + 1e-9), hop_s


def speech_segments(db, hop, thr=-45.0, min_gap=0.20):
    sp = db > thr
    segs, s = [], None
    for i, v in enumerate(sp):
        if v and s is None: s = i
        if not v and s is not None: segs.append([s * hop, i * hop]); s = None
    if s is not None: segs.append([s * hop, len(sp) * hop])
    out = []
    for a, b in segs:
        if out and a - out[-1][1] < min_gap: out[-1][1] = b
        else: out.append([a, b])
    return out


# ----------------------------------------------------------------------------------------------- energy engine
def valleys(db, hop, a, b):
    from scipy.signal import find_peaks
    i0, i1 = int(a / hop), int(b / hop)
    sm = np.convolve(db, np.ones(5) / 5, "same")[i0:i1]
    pk, pr = find_peaks(-sm, prominence=6, distance=6)
    return [((i0 + p) * hop, float(q)) for p, q in zip(pk, pr["prominences"])]


def align_group(words, a, b, db, hop, last_long):
    """place len(words)-1 internal boundaries between a and b"""
    n = len(words)
    if n == 1: return [(a, b)]
    w = np.array([syl(x) * (0.6 if x.lower() in FUNC else 1.0) for x in words], float)
    if last_long: w[-1] *= 1.25
    cum = np.cumsum(w) / w.sum()
    pred = [a + (b - a) * c for c in cum[:-1]]
    vs = [(t, p) for t, p in valleys(db, hop, a, b) if a + 0.05 < t < b - 0.05]
    grid = list(np.arange(a + 0.05, b - 0.05, 0.02))
    cand = sorted(set([round(t, 3) for t, _ in vs] + [round(g, 3) for g in grid]))
    prom = {round(t, 3): p for t, p in vs}
    C = len(cand)
    INF = 1e18
    cost = np.full((n - 1, C), INF)
    back = np.zeros((n - 1, C), int)

    def local(i, c):
        t = cand[c]
        bonus = min(prom.get(t, 0.0), 30.0) / 30.0 * 4.0
        return 0.5 * ((t - pred[i]) / 0.11) ** 2 - bonus

    for c in range(C): cost[0, c] = local(0, c)
    for i in range(1, n - 1):
        for c in range(C):
            best, bj = INF, 0
            for j in range(c):
                if cand[c] - cand[j] < 0.06: continue
                if cost[i - 1, j] < best: best, bj = cost[i - 1, j], j
            if best < INF: cost[i, c] = best + local(i, c); back[i, c] = bj
    c = int(np.argmin(cost[n - 2]))
    bs = [cand[c]]
    for i in range(n - 2, 0, -1):
        c = back[i, c]; bs.append(cand[c])
    bs = [a] + bs[::-1] + [b]
    return [(bs[i], bs[i + 1]) for i in range(n)]


def energy_engine(audio, words, longp, shortp):
    x, sr = read_mono(audio)
    db, hop = envelope(x, sr)
    segs = speech_segments(db, hop)
    # phrase groups split at LONG pauses only
    cuts = [i + 1 for i in longp if i + 1 < len(words)]
    groups, last = [], 0
    for c in cuts: groups.append((last, c)); last = c
    groups.append((last, len(words)))
    if len(segs) != len(groups):
        print(f"  note: {len(segs)} speech segment(s) found for {len(groups)} script phrase(s): using one pass over the whole speech", file=sys.stderr)
        segs, groups = [[segs[0][0], segs[-1][1]]], [(0, len(words))]
    out = [None] * len(words)
    for (g0, g1), (a, b) in zip(groups, segs):
        sub = words[g0:g1]
        # inside a group, a short pause ("...") is already an energy valley: the DP finds it
        spans = align_group(sub, a, b, db, hop, last_long=True)
        for k, (s, e) in enumerate(spans): out[g0 + k] = (s, e)
    return out, len(x) / sr


# ----------------------------------------------------------------------------------------------- whisper engine
def norm(s): return re.sub(r"[^a-z0-9]", "", s.lower())


def whisper_engine(audio, words, model_name):
    from faster_whisper import WhisperModel
    import difflib
    m = WhisperModel(model_name, device="auto", compute_type="auto")
    segs, _ = m.transcribe(audio, word_timestamps=True, language="en", vad_filter=False,
                           initial_prompt=" ".join(words))
    hyp = [(norm(w.word), w.start, w.end) for s in segs for w in s.words if norm(w.word)]
    ref = [norm(w) for w in words]
    # half-empty may be transcribed as two words: merge hyp tokens when needed by matching on the joined text
    sm = difflib.SequenceMatcher(None, ref, [h[0] for h in hyp], autojunk=False)
    out = [None] * len(words)
    for tag, i0, i1, j0, j1 in sm.get_opcodes():
        if tag == "equal":
            for k in range(i1 - i0): out[i0 + k] = (hyp[j0 + k][1], hyp[j0 + k][2])
        elif tag == "replace" and i1 - i0 == j1 - j0:
            for k in range(i1 - i0): out[i0 + k] = (hyp[j0 + k][1], hyp[j0 + k][2])
        elif tag == "replace" and j1 > j0:
            span = (hyp[j0][1], hyp[j1 - 1][2]); n = i1 - i0
            for k in range(n): out[i0 + k] = (span[0] + (span[1] - span[0]) * k / n, span[0] + (span[1] - span[0]) * (k + 1) / n)
    # fill holes by interpolation
    known = [i for i, v in enumerate(out) if v]
    if not known: raise RuntimeError("whisper matched no script words")
    for i in range(len(out)):
        if out[i]: continue
        l = max([k for k in known if k < i], default=None); r = min([k for k in known if k > i], default=None)
        if l is None: out[i] = (max(0, out[r][0] - 0.3 * (r - i)), out[r][0]); continue
        if r is None: out[i] = (out[l][1], out[l][1] + 0.3); continue
        gap = (out[r][0] - out[l][1]) / (r - l); k = i - l
        out[i] = (out[l][1] + gap * (k - 1), out[l][1] + gap * k)
    return out


# ----------------------------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--audio", default=os.path.join(ROOT, "voice", "voice.wav"))
    ap.add_argument("--script", default=os.path.join(ROOT, "docs", "SCRIPT.txt"))
    ap.add_argument("--out", default=os.path.join(ROOT, "voice", "words.json"))
    ap.add_argument("--engine", default="auto", choices=["auto", "whisper", "energy"])
    ap.add_argument("--model", default="small.en")
    a = ap.parse_args()
    words, longp, shortp = parse_script(open(a.script, encoding="utf-8").read())
    print(f"script: {len(words)} words, long pauses after {[words[i] for i in longp]}, short after {[words[i] for i in shortp]}")
    spans, source = None, None
    if a.engine in ("auto", "whisper"):
        try:
            spans = whisper_engine(a.audio, words, a.model); source = f"faster-whisper {a.model}"
            print("engine: whisper")
        except Exception as e:
            if a.engine == "whisper": raise
            print(f"whisper unavailable ({type(e).__name__}: {e}); using the energy estimate")
    x, sr = read_mono(a.audio)
    dur = len(x) / sr
    if spans is None:
        spans, _ = energy_engine(a.audio, words, longp, shortp)
        source = "energy-estimate"
    res = [{"w": w, "s": round(float(s), 3), "e": round(float(e), 3)} for w, (s, e) in zip(words, spans)]
    for i in range(1, len(res)):  # never overlap
        if res[i]["s"] < res[i - 1]["e"]: res[i - 1]["e"] = res[i]["s"]
    json.dump({"source": source, "duration": round(dur, 3), "words": res}, open(a.out, "w"), indent=1)
    for r in res: print(f"  {r['s']:6.2f} {r['e']:6.2f}  {r['w']}")
    print(f"wrote {a.out}  ({source}, {dur:.3f} s)")


if __name__ == "__main__":
    main()
