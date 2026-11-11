"""Original score for "The Half-Empty Cart" (synthesised from scratch with our own instruments.py: no samples, no third-party music).
Light supermarket-bossa: pizzicato bass, vibraphone comping, brushes, glockenspiel sparkles.
It follows the story's harmony: C major 7 (cheerful hook) -> A minor 7 add 11 (the manager's scheme) -> F major 7 #11 (dreamy, the
brain is tricked) -> G7 (the cart fills, tension) -> C 6/9 (the golden resolve). Every section starts exactly on its shot cut and
its beats are spread evenly inside the section (~120 bpm), so the music lands with the picture whatever the voice timing is."""
import numpy as np
import dsp
from dsp import SR, ns, place, pan, st
import instruments as I
import timeline as T

m2f = I.m2f

# chords as MIDI note sets (root first)
CH = {
    "hook": [48, 55, 59, 64, 67],      # C maj7: C G B E G
    "scheme": [45, 52, 55, 60, 64],    # A m7 (add 11 colour below): A E G C E
    "brain": [41, 48, 52, 57, 59],     # F maj7 #11 flavour: F C E A B
    "fill": [43, 50, 53, 59, 62],      # G7: G D F B D
    "payoff": [48, 55, 62, 64, 69],    # C 6/9: C G D E A
}
LEVEL = {"hook": 1.0, "scheme": 0.9, "brain": 0.85, "fill": 1.05, "payoff": 1.1}


def beats(a, b, target=0.5):
    n = max(1, round((b - a) / target))
    return [a + (b - a) * i / n for i in range(n)], (b - a) / n


def score(seed=7):
    r = dsp.rng(seed)
    buf = np.zeros((2, ns(T.DUR) + SR))
    ev = []   # (time, label) for cues.md

    def note(x, t, g=1.0, p=0.0):
        x = np.asarray(x)
        place(buf, pan(x, p) if x.ndim == 1 else x, t, g)

    for name, a, b in T.SECTIONS:
        ch, lv = CH[name], LEVEL[name]
        bt, bl = beats(a, b)
        ev.append((a, f"music section '{name}' ({len(bt)} beats of {bl:.3f} s)"))
        for i, t in enumerate(bt):
            root = ch[0] - 12
            # pizzicato bass: root on 1, fifth/octave on 3, walking pickup before the next section
            if name in ("hook", "payoff"):
                m = root if i % 2 == 0 else root + 7
            elif name == "scheme":
                m = [root, root + 3, root + 7][i % 3]          # slinky, minor
            elif name == "brain":
                m = root if i % 2 == 0 else root + 12
            else:
                m = root if i % 2 == 0 else root + 7
            note(I.pluck(m2f(m), 0.75 * lv, r, dur=0.7, bright=0.45), t, 0.9, -0.15)
            if name == "fill":
                note(I.pluck(m2f(root + 12), 0.5, r, dur=0.4, bright=0.6), t + bl / 2, 0.6, -0.1)   # driving 8ths while the cart fills
            # vibes comping on the off-beat (swung)
            if name != "brain":
                off = t + bl * 0.58
                tones = ch[1:4] if name != "payoff" else ch[1:5]
                for k, m in enumerate(tones):
                    note(I.vibes(m2f(m + 12), 0.34 * lv, r, dur=1.0, damp=0.45), off + 0.006 * k, 0.55, 0.28)
            # brushes: backbeat + swish
            if i % 2 == 1:
                note(I.brush(0.42 * lv, r, 0.3), t, 0.55, 0.35)
            note(I.brush(0.22 * lv, r, 0.2, swish=True), t + bl * 0.5, 0.4, -0.3)

        if name == "brain":
            # dreamy rising glock/music-box arpeggio over the whole section, a note per item the brain "imagines"
            up = [m + 12 for m in (ch[1], ch[2], ch[3], ch[4], ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[4] + 12)]
            n = len(up)
            for k in range(n):
                t = a + 0.18 + (b - a - 0.5) * k / n
                note(I.musicbox(m2f(up[k] + 12), 0.5, r, dur=1.2), t, 0.55, -0.35 + 0.1 * k)
                note(I.glock(m2f(up[k] + 24), 0.28, r, dur=1.0), t + 0.02, 0.35, 0.3)
            note(I.pad([m2f(m) for m in ch[:4]], b - a + 0.6, 0.4, r, att=0.4, rel=0.5), a, 0.45)
        if name == "payoff":
            note(I.pad([m2f(m) for m in ch[:4]], b - a + 0.3, 0.4, r, att=0.12, rel=0.8), a, 0.5)
            # the happy tune: E G A G E . G (vibes) on the beats, ends on a glock "ting" with the last word
            tune = [76, 79, 81, 79, 76, 79]
            for k, m in enumerate(tune):
                t = bt[min(k, len(bt) - 1)] + (bl * 0.5 if k % 2 else 0) + (0.0 if k < len(bt) else 0.4)
                note(I.vibes(m2f(m + 12), 0.5, r, dur=1.2, damp=0.7), t, 0.55, 0.15)
        if name == "hook":
            note(I.glock(m2f(88), 0.4, r, dur=1.0), a + 0.05, 0.4, 0.3)
        if name == "fill":
            # a rising run on the way to "food": the last beats get faster brushes
            t0 = T.ts("more")
            for k in range(6):
                note(I.brush(0.25 + 0.07 * k, r, 0.12), t0 + 0.06 * k, 0.5, 0.2)
    # final sparkle on the last word
    note(I.glock(m2f(96), 0.55, r, dur=1.6), T.ts("basket") + 0.04, 0.55, 0.25)
    note(I.glock(m2f(100), 0.35, r, dur=1.6), T.ts("basket") + 0.12, 0.45, -0.25)
    ev.append((T.ts("basket"), "glock 'ting' on the last word"))
    # a cymbal swell into the flash, a crash with "food"
    note(I.cymbal(0.5, r, 1.4), T.ts("food"), 0.55, 0.0)
    ev.append((T.ts("food"), "cymbal crash with 'food'"))
    return buf[:, : ns(T.DUR)], ev
