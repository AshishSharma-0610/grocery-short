"""Final mix for "The Half-Empty Cart": voice (your ElevenLabs take) + original score + synthesised SFX + room tone.
  python audio/mix.py            ->  audio/out/mix.wav (48 kHz / 24-bit stereo, exactly the picture's length), audio/out/cues.md
Levels: voice -16 LUFS integrated; music bed 10 LU under the voice and ducked 3 dB while he speaks; SFX peaks ~7 LU under the voice;
final programme -14.5 LUFS integrated, true peak <= -1.2 dBTP (the limiter is a look-ahead 4x-oversampled one)."""
import os, json, sys
import numpy as np
from scipy import signal, ndimage
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dsp
from dsp import SR, ns, st, dbg, integrated, momentary_max, true_peak, read_wav, write_wav, make_ir, convolve_st, lp, hp, shelf
import timeline as T
import music, sfx

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)
N = ns(T.DUR)
VOICE_LUFS = -16.0
TARGET_LUFS = -14.5
CEIL_DBTP = -1.2
DUCK_DB = -3.0

def log(*a): print(*a, flush=True)

def load_voice():
    p = os.path.join(ROOT, "voice", "voice.wav")
    x, sr = read_wav(p)
    assert sr == SR, f"voice.wav must be {SR} Hz (got {sr}); run: ffmpeg -i voice.mp3 -ar 48000 -ac 1 voice.wav"
    v = x[0] if x.shape[0] == 1 else x.mean(0)
    out = np.zeros(N)
    out[: min(N, len(v))] = v[:N]
    return st(out)

def speech_spans(words, merge=0.3):
    sp = []
    for w in words:
        s, e = float(w["s"]), float(w["e"])
        if sp and s - sp[-1][1] < merge:
            sp[-1][1] = max(sp[-1][1], e)
        else:
            sp.append([s, e])
    return sp


def duck_db(spans, depth=DUCK_DB, pre=0.08, post=0.12, att=0.07, rel=0.45):
    ctrl = 1000
    nc = int(T.DUR * ctrl) + 2
    va = np.zeros(nc)
    for s, e in spans:
        va[max(0, int((s - pre) * ctrl)): int((e + post) * ctrl)] = 1.0
    ka, kr = 1 - np.exp(-1 / (att * ctrl)), 1 - np.exp(-1 / (rel * ctrl))
    env = np.zeros(nc)
    e = 0.0
    for i in range(nc):
        tgt = va[i]
        e += (tgt - e) * (ka if tgt > e else kr)
        env[i] = e
    return np.interp(np.arange(N) / SR, np.arange(nc) / ctrl, depth * env)



def limiter(x, ceil_db=CEIL_DBTP, look=0.003, rel=0.08):
    """4x-oversampled peak detection, look-ahead min filter, release one-pole, centred smoothing -> gain curve"""
    c = dbg(ceil_db)
    n = x.shape[1]
    up = np.abs(signal.resample_poly(x, 4, 1, axis=-1)).max(0)
    pk = np.pad(up, (0, max(0, 4 * n - len(up))))[: 4 * n].reshape(n, 4).max(1)
    gr = np.minimum(1.0, c / np.maximum(pk, 1e-12))
    La = max(1, ns(look))
    g1 = ndimage.minimum_filter1d(gr, 2 * La + 1, mode="nearest")
    g2 = g1.copy()
    idx = np.flatnonzero(g1 < 1.0)
    if len(idx):
        # one-pole release, run only over clusters of reduced samples (elsewhere the gain is 1)
        kr = 1 - np.exp(-1 / (rel * SR))
        gap = ns(rel * 8)
        brk = np.flatnonzero(np.diff(idx) > gap)
        starts = np.concatenate([[idx[0]], idx[brk + 1]])
        ends = np.concatenate([idx[brk], [idx[-1]]])
        for a, b_ in zip(starts, ends):
            e = min(n, b_ + gap)
            seg = g1[a:e]
            out = np.empty(len(seg))
            g = 1.0
            for k in range(len(seg)):
                g = min(seg[k], g + (1 - g) * kr)
                out[k] = g
            g2[a:e] = out
    g3 = ndimage.uniform_filter1d(g2, 2 * La + 1, mode="nearest")
    g3 = np.minimum(g3, 1.0)
    return x * g3[None, :], g3




def main():
    v = load_voice()
    v = v * dbg(VOICE_LUFS - integrated(v))
    words = T.WORDS
    sp = speech_spans(words)
    duck = duck_db(sp)
    log("voice integrated", round(integrated(v), 2), "LUFS; speech spans", [(round(a, 2), round(b, 2)) for a, b in sp])

    m, mev = music.score()
    m = m[:, :N]
    m *= dbg(VOICE_LUFS - 10.0 - integrated(m))
    m *= dbg(duck)[None, :]
    s, amb, sev = sfx.design()
    s = s[:, :N]; amb = amb[:, :N]
    # SFX bus: loudest moment ~7 LU under the voice
    s *= dbg(VOICE_LUFS - 7.0 - momentary_max(s))
    amb *= dbg(VOICE_LUFS - 26.0 - integrated(amb))

    # one small shop-interior reverb on music + sfx (voice stays dry and close)
    ir = make_ir(0.55, 21, early=[(0.011, 0.5, -0.5), (0.019, 0.4, 0.55), (0.031, 0.3, -0.2)], hf=1.1)
    wet = convolve_st(m * 0.9 + s * 0.8, ir) * 0.16
    mix = v + m + s + amb + wet

    mix *= dbg(TARGET_LUFS - integrated(mix))
    mix, g = limiter(mix)
    mix *= dbg(TARGET_LUFS - integrated(mix)) if integrated(mix) < TARGET_LUFS - 0.5 else 1.0
    mix, g = limiter(mix)
    write_wav(os.path.join(OUT, "mix.wav"), mix, 24)
    write_wav(os.path.join(OUT, "music.wav"), m, 24)
    write_wav(os.path.join(OUT, "sfx.wav"), s + amb, 24)
    # picture folder copy so the Remotion studio can preview it
    pub = os.path.join(ROOT, "public", "audio")
    os.makedirs(pub, exist_ok=True)
    write_wav(os.path.join(pub, "mix.wav"), mix, 16)
    I = integrated(mix); tp = true_peak(mix)
    log(f"mix: {T.DUR:.3f} s, integrated {I:.2f} LUFS, true peak {tp:.2f} dBTP, max momentary {momentary_max(mix):.2f}")
    assert tp <= -1.0 + 0.05, f"true peak {tp:.2f} dBTP exceeds -1 dBTP"
    # ---- cue sheet ----
    rows = [(t, "music", l) for t, l in mev] + [(t, "sfx", l) for t, l in sev]
    with open(os.path.join(OUT, "cues.md"), "w", encoding="utf-8") as f:
        f.write("# Cue sheet (generated by audio/mix.py)\n\n")
        f.write(f"Picture: {T.TOTAL} frames @ {T.FPS} fps = {T.DUR:.3f} s. Voice: {T.VOICE_SECONDS:.3f} s ({T._raw.get('source','?')} word timings).\n\n")
        f.write(f"Mix: {I:.2f} LUFS integrated, {tp:.2f} dBTP.\n\n| time (s) | frame | kind | event |\n|---|---|---|---|\n")
        for t, k, l in sorted(rows):
            f.write(f"| {t:6.2f} | {round(t * T.FPS):4d} | {k} | {l} |\n")
    log("wrote audio/out/mix.wav, music.wav, sfx.wav, cues.md")

if __name__ == "__main__":
    main()
