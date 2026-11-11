// Cue timing: EVERYTHING in the picture is timed to voice/words.json (written by `npm run sync`).
// Re-record the voice-over, run `npm run sync`, and shots, camera keys, reactions, effects and the soundtrack
// all move with the words: nothing below holds a hard-coded second.
import raw from "../../../voice/words.json";

export const FPS = 30;
export type Word = { w: string; s: number; e: number };
export const WORDS: Word[] = (raw as { words: Word[] }).words;
export const VOICE_SECONDS: number = (raw as { duration: number }).duration;
export const TIMING_SOURCE: string = (raw as { source: string }).source;

/** index of every spoken word in the script (script order; see docs/SCRIPT.txt) */
export const W = {
  grocery: 0, stores: 1, doubled: 2, their: 3, cart1: 4, sizes: 5,
  not: 6, for1: 7, your1: 8, convenience: 9,
  but: 10, because: 11, a1: 12, halfEmpty: 13, cart2: 14, tricks: 15, your2: 16, brain: 17,
  into: 18, buying: 19, forty: 20, percent: 21, more: 22, food: 23,
  swapping: 24, the: 25, cart3: 26, for2: 27, a2: 28, small: 29, hand: 30, basket: 31,
} as const;
const EXPECT = ["grocery", "stores", "doubled", "their", "cart", "sizes", "not", "for", "your", "convenience", "but", "because", "a",
  "half-empty", "cart", "tricks", "your", "brain", "into", "buying", "forty", "percent", "more", "food", "swapping", "the", "cart",
  "for", "a", "small", "hand", "basket"];
if (WORDS.length !== EXPECT.length) throw new Error(`voice/words.json has ${WORDS.length} words, the script has ${EXPECT.length}: run npm run sync`);
EXPECT.forEach((w, i) => {
  if (WORDS[i].w.toLowerCase() !== w) throw new Error(`voice/words.json word ${i} is "${WORDS[i].w}", expected "${w}": run npm run sync`);
});

/** word onset / end in seconds */
export const ts = (i: number) => WORDS[i].s;
export const te = (i: number) => WORDS[i].e;
/** word onset as a frame number */
export const fs = (i: number) => Math.round(WORDS[i].s * FPS);
export const fe = (i: number) => Math.round(WORDS[i].e * FPS);

/** total frames = the voice-over, rounded up to a whole frame (the final mix has exactly this length) */
export const TOTAL = Math.ceil(VOICE_SECONDS * FPS);
export const DUR = TOTAL / FPS;
/** reference: expression and action changes land 0-3 f before the word onset */
export const LEAD = 2 / FPS;
