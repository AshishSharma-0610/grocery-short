"""Sound timeline: every time below is derived from voice/words.json (written by `npm run sync`), mirroring
src/videos/grocery/story.ts + timing.ts. Change the voice-over, run `npm run sync`, and picture AND sound re-time together."""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FPS = 30
_raw = json.load(open(os.path.join(ROOT, "voice", "words.json"), encoding="utf-8"))
WORDS = _raw["words"]
VOICE_SECONDS = _raw["duration"]

NAMES = ["grocery", "stores", "doubled", "their", "cart1", "sizes", "not", "for1", "your1", "convenience", "but", "because", "a1",
         "halfEmpty", "cart2", "tricks", "your2", "brain", "into", "buying", "forty", "percent", "more", "food", "swapping", "the",
         "cart3", "for2", "a2", "small", "hand", "basket"]
assert len(WORDS) == len(NAMES), f"words.json has {len(WORDS)} words, the script has {len(NAMES)}: run npm run sync"
W = {n: i for i, n in enumerate(NAMES)}
def ts(n): return WORDS[W[n]]["s"]
def te(n): return WORDS[W[n]]["e"]
def fs(n): return round(ts(n) * FPS)

TOTAL = math.ceil(VOICE_SECONDS * FPS)           # frames, identical to timing.ts
DUR = TOTAL / FPS                                 # seconds of picture = seconds of the final mix
LEAD = 2 / FPS

# shot cuts (same formulas as story.ts)
CUT2 = (fs("not") - 2) / FPS
CUT3 = (fs("but") - 2) / FPS
CUT4 = (fs("into") - 2) / FPS
CUT5 = (fs("swapping") - 3) / FPS
FLASH = CUT2
SECTIONS = [("hook", 0.0, CUT2), ("scheme", CUT2, CUT3), ("brain", CUT3, CUT4), ("fill", CUT4, CUT5), ("payoff", CUT5, DUR)]

# the cart swells on "doubled" (story.ts: GROW_T0 / GROW_D)
GROW_T0 = ts("doubled") - 0.06
GROW_D = 0.42
GROW_LAND = GROW_T0 + GROW_D * 0.62
# ten items fly into the cart, two per word (story.ts LAND / FLY)
FLY = 0.3
LAND = [ts(w) + (0.13 if i & 1 else 0.0) for i, w in enumerate(["buying", "buying", "forty", "forty", "percent", "percent", "more", "more", "food", "food"])]
GHOSTS_FROM = ts("tricks") - 0.05
# shopper strolls out in shot 5 at 2.5 steps/s
STEP = 0.4
