"""Synthesised sound effects + room tone for "The Half-Empty Cart" (own DSP, no samples).
Every event time comes from timeline.py (voice cues), so it follows the voice-over when `npm run sync` re-times it."""
import numpy as np
import dsp
from dsp import SR, ns, tt, place, pan, st, lp, hp, bp, fades, colored, modal, dbg, TAU
import instruments as I
import sfx_gen as G
import timeline as T


# ---------------------------------------------------------------- generators
def thump(r, f=70.0, dur=0.32, heavy=1.0):
    t = tt(dur)
    y = np.sin(TAU * (f + 60 * np.exp(-t / 0.03)) * t) * np.exp(-t / 0.09) * heavy
    y += lp(r.standard_normal(len(t)), 900) * np.exp(-t / 0.012) * 0.5
    return fades(y, 0.001, 0.03)


def pop(r, f0=420.0, f1=980.0, dur=0.12):
    t = tt(dur)
    f = f0 + (f1 - f0) * (1 - np.exp(-t / 0.02))
    return fades(np.sin(np.cumsum(TAU * f / SR)) * np.exp(-t / 0.035), 0.0005, 0.02)


def boing(r, f0=170.0, f1=640.0, dur=0.55):
    """cartoon grow: pitch sweeps up with a springy wobble"""
    t = tt(dur)
    f = f0 + (f1 - f0) * (1 - np.exp(-t / 0.09)) + 38 * np.sin(TAU * 11 * t) * np.exp(-t / 0.25)
    y = np.sin(np.cumsum(TAU * f / SR)) + 0.35 * np.sin(np.cumsum(TAU * 2 * f / SR))
    return fades(y * np.exp(-t / 0.28) * 0.7, 0.004, 0.08)


def air(dur, r, peak=0.4, lo=500, hi=3200, gain=0.6):
    return G.whoosh(dur, r, peak=peak, f_lo=lo, f_hi=hi) * gain


def rub(dur, r, rate=2.4):
    """two hands rubbing: band-limited noise gated by the stroke rate (the manager's rub is sin(15 t) = 2.4 Hz)"""
    t = tt(dur)
    n = bp(r.standard_normal(len(t)), 1800, 6500) * (0.35 + 0.65 * np.abs(np.sin(TAU * rate * t / 2)) ** 1.5)
    return fades(n * 0.5, 0.05, 0.08)


def kaching(r):
    """cash-register bell + drawer: the ironic sting on the cut to the manager"""
    n = ns(1.2)
    y = np.zeros(n)
    t = tt(1.2)
    drawer = bp(r.standard_normal(n), 700, 3600) * np.exp(-t / 0.05) * 0.5
    y += drawer
    for k, t0 in enumerate([0.07, 0.15]):
        b = modal(1.0, [(2093 * (1 + 0.5 * k), 1.0, 0.5), (2637 * (1 + 0.5 * k), 0.6, 0.45), (5300, 0.25, 0.18), (7100, 0.12, 0.1)], r)
        i = ns(t0)
        y[i: i + len(b)] += b[: n - i] * (0.6 if k == 0 else 0.8)
    return fades(y, 0.001, 0.2)


def hollow(r, f=390.0):
    """a single empty-cart 'tok': a can knocking in a big metal basket"""
    y = modal(0.5, [(f, 1.0, 0.07), (f * 2.4, 0.4, 0.04), (f * 4.1, 0.2, 0.025)], r)
    t = tt(0.5)
    y += lp(r.standard_normal(len(t)), 2500) * np.exp(-t / 0.004) * 0.4
    return fades(y, 0.0005, 0.1)


def ping(f, r, dur=0.4):
    return I.musicbox(f, 0.5, r, dur)


def shimmer(r, dur=0.9, f0=900.0, f1=3600.0):
    """rising glassy swirl: the brain is being tricked"""
    t = tt(dur)
    y = np.zeros_like(t)
    for k in range(6):
        f = (f0 + (f1 - f0) * (t / dur) ** 1.4) * (1 + 0.5 * k) / 1.0
        y += np.sin(np.cumsum(TAU * np.minimum(f, 15000) / SR) + r.uniform(0, TAU)) * 0.2 / (k + 1)
    y *= np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.2 * (0.6 + 0.4 * np.sin(TAU * 9 * t))
    return fades(y, 0.02, 0.1)


def wobble(r, dur=0.9):
    """the brain pulsing: a wobbling soft 'woo-woo' (pulse rate matches fxBrain, 12 rad/s)"""
    t = tt(dur)
    f = 330 + 60 * np.sin(12 * t)
    y = np.sin(np.cumsum(TAU * f / SR)) * (0.6 + 0.4 * np.sin(12 * t)) * np.exp(-t / 0.7)
    return fades(y * 0.5, 0.02, 0.15)


def ding_dong(r):
    """door chime as we step out into the golden evening"""
    a = I.vibes(659.0, 0.6, r, dur=1.4, damp=0.9)
    b = I.vibes(523.0, 0.6, r, dur=1.6, damp=1.1)
    y = np.zeros(ns(1.7))
    y[: len(a)] += a
    k = ns(0.42)
    y[k: k + len(b)] += b[: len(y) - k]
    return y


def bip(r, f=2750.0, dur=0.09):
    t = tt(dur)
    return fades((np.sin(TAU * f * t) + 0.3 * np.sin(TAU * 2 * f * t)) * 0.5, 0.002, 0.01)


def cart_roll(dur, r, level=1.0, heavy=False):
    """wheels on tile: a rumble + a cloud of tiny wire rattles"""
    t = tt(dur)
    rum = lp(colored(len(t), r, 1.0, 40), 220) * (0.7 + 0.3 * np.sin(TAU * 3.1 * t))
    rat = G.rattle(dur, r, density=26 if not heavy else 14, heavy=heavy)
    rat = rat[: len(t)] if len(rat) >= len(t) else np.pad(rat, (0, len(t) - len(rat)))
    return fades((rum * 0.9 + rat * 0.22) * level, 0.2, 0.25)


def room_tone(dur, r):
    """fluorescent hum (120 Hz + harmonics) + air handling + a distant murmur of shoppers"""
    t = tt(dur)
    hum = (np.sin(TAU * 120 * t) + 0.5 * np.sin(TAU * 240 * t + 1) + 0.25 * np.sin(TAU * 360 * t + 2)) * 0.012
    air_ = lp(colored(len(t), r, 1.0, 30), 700) * 0.05
    mur = G.babble(dur, r, 150.0, 1.0)
    mur = lp(mur[: len(t)], 1400) * 0.018
    return st(hum + air_ + mur)


# ---------------------------------------------------------------- the sound design
def design(seed=5):
    r = dsp.rng(seed)
    N = ns(T.DUR)
    sfx = np.zeros((2, N + SR))
    amb = room_tone(T.DUR + 1.0, dsp.rng(seed + 1))[:, : N + SR]
    amb = np.pad(amb, ((0, 0), (0, max(0, N + SR - amb.shape[1]))))
    ev = []

    def at(t, label, x, g=1.0, p=0.0):
        place(sfx, pan(x, p) if np.asarray(x).ndim == 1 else x, t, g)
        ev.append((t, label))

    # shot 1: the cart rolls, then swells on "doubled"
    at(0.0, "cart wheels roll in", cart_roll(T.ts("doubled") + 0.1, r, 0.8), 0.7, 0.0)
    at(T.GROW_T0, "boing: the cart swells (doubled)", boing(r), 0.9, 0.0)
    at(T.GROW_T0 - 0.02, "whoosh under the swell", air(0.5, r), 0.7, 0.0)
    at(T.GROW_LAND, "thump + wire clatter: the big cart lands", thump(r, 62, 0.4, 1.3), 1.0, 0.0)
    at(T.GROW_LAND + 0.01, "wire clatter", G.rattle(0.5, r, density=60, env=np.exp(-np.arange(ns(0.5)) / SR / 0.15), heavy=True), 0.9, 0.0)
    # the flash cut to the manager: cash-register sting
    at(T.FLASH, "ka-ching on the flash cut", kaching(r), 0.9, 0.0)
    # shot 2: scheming hands, a glint on "convenience"
    at(T.CUT2 + 0.1, "hands rub (manager)", rub(max(0.2, T.ts("convenience") - T.CUT2 - 0.05), r), 0.8, -0.25)
    at(T.ts("convenience") - T.LEAD, "glint ting (manager)", I.glock(2349.0, 0.5, r, dur=1.2), 0.55, -0.3)
    # shot 3: hollow knock in the empty cart, phantom items ping in, the brain wobbles
    at(T.ts("halfEmpty") - T.LEAD, "hollow knock: the empty cart", hollow(r), 0.9, 0.0)
    for i, f in enumerate([880.0, 988.0, 1175.0, 1319.0, 1568.0]):
        at(T.GHOSTS_FROM + 0.08 * i + 0.08, f"phantom item ping {i + 1}", ping(f, r), 0.45, -0.4 + 0.2 * i)
    at(T.ts("tricks") - 0.05, "shimmer: tricks your brain", shimmer(r, 0.95), 0.6, 0.0)
    at(T.ts("brain") - 0.08, "brain wobble", wobble(r), 0.7, 0.2)
    # shot 4: ten items whoosh in and land; the last one overflows the cart
    for i, tl in enumerate(T.LAND):
        side = 0.55 if i % 2 else -0.55
        at(tl - T.FLY, f"item {i + 1} whoosh", air(T.FLY, r, 0.7, 700, 4200, 0.5), 0.55, side * 0.5)
        at(tl, f"item {i + 1} lands", thump(r, 95 + 6 * (i % 4), 0.22, 0.7), 0.8, 0.0)
        at(tl + 0.005, f"item {i + 1} clink", G.clink(r, 2100 + 160 * i, 0.12), 0.5, -side * 0.4)
        at(tl + 0.01, f"item {i + 1} pop", pop(r, 420 + 50 * i, 980 + 70 * i), 0.5, side * 0.3)
    tf = T.ts("food")
    at(tf, "overflow thump", thump(r, 55, 0.5, 1.5), 1.0, 0.0)
    at(tf + 0.01, "overflow rattle", G.rattle(0.7, r, density=70, env=np.exp(-np.arange(ns(0.7)) / SR / 0.25), heavy=True), 0.9, 0.0)
    at(tf, "boing (overfull)", boing(r, 220, 520, 0.4), 0.55, 0.0)
    # shot 5: door chime, soft whoosh across the crossfade, her steps, the swinging basket, the queue's heavy wheels, the final glint + beep
    at(T.CUT5 - 0.1, "door chime ding-dong", ding_dong(r), 0.8, 0.0)
    at(T.CUT5 - 0.2, "crossfade whoosh", air(0.6, r, 0.5, 300, 1800, 0.6), 0.5, 0.0)
    k = 0
    while T.ts("swapping") + 0.05 + k * T.STEP < T.DUR - 0.1:
        at(T.ts("swapping") + 0.05 + k * T.STEP, f"step {k + 1}", G.stroll_step(r, 0.4), 0.5, 0.1 + 0.05 * (k % 2))
        k += 1
    at(T.ts("small") - 0.1, "basket creak", G.swing_squeak(r, 0.35, True), 0.35, 0.3)
    at(T.CUT5 + 0.05, "queue carts rattle (heavy)", cart_roll(T.DUR - T.CUT5 - 0.1, r, 0.55, True), 0.55, -0.1)
    at(T.ts("basket"), "basket clink + glint", G.clink(r, 3300, 0.14), 0.5, 0.3)
    at(T.DUR - 0.17, "checkout scanner bip", bip(r), 0.6, 0.0)
    return sfx[:, :N], amb[:, :N], sorted(ev)
