// "The Half-Empty Cart": timeline of the short. Pure maths, no THREE: shots, cameras, lens, kicks and the staging of
// the carts / items / characters, all expressed through voice cues (timing.ts), never hard-coded seconds.
//
// Camera grammar (reports/motion.md): every move is a symmetric smootherstep glide of 18-40 f (peak speed =
// 1.875 x distance / dur); a reframe bigger than ~half a frame width is a hard CUT on its key frame; holds push in
// (0.15-0.35 %/f, ~0.6 %/f for ~35 f on punch words); rolls of 4-5 deg on emphasis beats; impacts are 7-frame kicks
// that flip sign every frame; no hand-held float. Reactions land 0-3 f BEFORE their word (LEAD).
import { FPS, TOTAL, W, ts, te, fs, fe, LEAD, DUR } from "./timing";
export { FPS, TOTAL, DUR, LEAD };

export type V3 = [number, number, number];
export const D0 = 0; // floor height (m)
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const q = (v: number, n = 120) => Math.round(v * n) / n;

// ---------------- store layout (metres; the aisle runs along +z toward the glass front at z = 26) ----------------
export const STORE = { x0: -13, x1: 13, z0: -7, z1: 26, h: 4.6, aisle: 3.1 };

// ---------------- shots ----------------
export type Light = "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: Light };
const CUT2 = fs(W.not) - 2;        // "not for your convenience": the manager
const CUT3 = fs(W.but) - 2;        // "but because a half-empty cart tricks your brain"
const CUT4 = fs(W.into) - 2;       // "into buying forty percent more food"
const CUT5 = fs(W.swapping) - 3;   // "Swapping the cart for a small hand basket" (golden hour)
if (!(0 < CUT2 && CUT2 < CUT3 && CUT3 < CUT4 && CUT4 < CUT5 && CUT5 < TOTAL)) throw new Error("shot cuts are out of order: check voice/words.json (npm run sync)");
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: CUT2, light: "day" },
  { id: 2, a: CUT2, b: CUT3, light: "day" },
  { id: 3, a: CUT3, b: CUT4, light: "day" },
  { id: 4, a: CUT4, b: CUT5, light: "day" },
  { id: 5, a: CUT5, b: TOTAL, light: "golden" },
];
/** crossfades (frames) at the place/time change; a white 4-frame flash after the hook */
export const XFADE: Record<number, number> = { 5: 8 };
export const FLASH_AT = CUT2;
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

// ---------------- the cart: "doubled" ----------------
/** cart geometry is built at the OLD size and scaled by this vector; the big cart is ~4x the volume */
export const CART_OLD: V3 = [1, 1, 1];
export const CART_BIG: V3 = [1.55, 1.45, 1.95];
const GROW_T0 = ts(W.doubled) - 0.06, GROW_D = 0.42;
const easeOutBack = (u: number) => { const x = clamp01(u), c1 = 1.9, c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };
/** 0 = old cart, 1 = big cart (overshoots to ~1.15 and settles); shots after the hook always see the big cart */
export const growK = (id: number, t: number) => (id !== 1 ? 1 : t < GROW_T0 ? 0 : easeOutBack((t - GROW_T0) / GROW_D));
export const cartScale = (id: number, t: number): V3 => {
  const k = growK(id, t);
  return [lerp(CART_OLD[0], CART_BIG[0], k), lerp(CART_OLD[1], CART_BIG[1], k), lerp(CART_OLD[2], CART_BIG[2], k)];
};
export const GROW_LAND = GROW_T0 + GROW_D * 0.62; // the moment the big cart "lands" (kick + thump)

// ---------------- staging ----------------
export const HERO: V3 = [0, D0, 7.0];       // hero cart origin (floor). It heads toward the camera: yaw = PI (+z local = -z world)
export const HERO_YAW = Math.PI;
export const SHOPPER: V3 = [0.1, D0, 8.6];  // behind the handle
export const MANAGER: V3 = [0.7, D0, 9.0];
export const S2_HERO: V3 = [-0.4, D0, 12.7];
export const S2_SHOPPER: V3 = [-0.4, D0, 14.1];
export const QUEUE: V3[] = [[0.55, D0, 11.2], [-0.55, D0, 14.6], [0.6, D0, 18.0]]; // overflowing carts at the exit (shot 5)
export const CORRAL: V3[] = [[-2.45, D0, 9.6], [-2.45, D0, 9.95], [-2.45, D0, 10.3]]; // nested OLD carts, for scale
/** hero cart origin / yaw per shot */
export const heroCart = (id: number): { pos: V3; yaw: number } | null =>
  id === 2 ? { pos: S2_HERO, yaw: HERO_YAW } : id === 5 ? null : { pos: HERO, yaw: HERO_YAW };

/** where the shopper stands (shot 5: she strolls toward the camera with the basket) */
export const shopperAt = (id: number, t: number): V3 => {
  if (id === 2) return S2_SHOPPER;
  if (id === 5) { const u = Math.max(0, t - ts(W.swapping)); return [0.28 + 0.04 * Math.sin(u * 2.2), D0, 8.4 - 0.78 * u]; }
  return SHOPPER;
};
export const shopperPhase = (t: number) => (((t - ts(W.swapping)) * 1.25) % 1 + 1) % 1; // 2.5 steps/s: reference stroll cadence

// big-cart basket slots, in BIG cart local coordinates (+z = forward, handle at -z). base layer 18 + stacked layer 9
const FLOOR_Y = 0.45 * CART_BIG[1];
export type Slot = [number, number, number]; // x, z, layer
export const SLOTS: Slot[] = (() => {
  const s: Slot[] = [];
  for (const z of [-0.82, -0.5, -0.18, 0.14, 0.46, 0.78]) for (const x of [-0.23, 0, 0.23]) s.push([x, z, 0]);
  for (const z of [-0.66, -0.34, -0.02, 0.3, 0.62]) for (const x of [-0.12, 0.12]) s.push([x, z, 1]);
  return s;
})();
export const KIND_H = [0.15, 0.06, 0.13, 0.09, 0.13, 0.07]; // half heights: cereal, can, bottle, bread, milk, apple
export const INIT_SLOTS = [10, 7, 13, 4];                    // the lonely first items
export const FILL_SLOTS = [1, 16, 5, 12, 0, 15, 2, 9, 17, 3]; // order the cart fills in (ghosts show the first five)
const LAND_WORDS = [W.buying, W.forty, W.percent, W.more, W.food];
/** landing times of the 10 flying items (two per spoken word) */
export const LAND = FILL_SLOTS.map((_, i) => ts(LAND_WORDS[i >> 1]) + (i & 1 ? 0.13 : 0));
export const FLY = 0.3; // flight time (s)

const rotY = (p: [number, number], yaw: number): [number, number] => [p[0] * Math.cos(yaw) + p[1] * Math.sin(yaw), -p[0] * Math.sin(yaw) + p[1] * Math.cos(yaw)];
/** world position of a cart-local point (local axes scaled like the cart is right now) */
export const cartPoint = (cart: { pos: V3; yaw: number }, sc: V3, lx: number, ly: number, lz: number): V3 => {
  const [rx, rz] = rotY([lx * (sc[0] / CART_BIG[0]), lz * (sc[2] / CART_BIG[2])], cart.yaw);
  return [cart.pos[0] + rx, cart.pos[1] + ly, cart.pos[2] + rz];
};
const slotPos = (slot: number, kind: number, cart: { pos: V3; yaw: number }, sc: V3): V3 => {
  const [x, z, layer] = SLOTS[slot];
  const y = 0.45 * sc[1] + KIND_H[kind % 6] + layer * 0.2;
  return cartPoint(cart, sc, x, y, z);
};

export type Item = { id: number; kind: number; pos: V3; yaw: number; roll: number; scale: number };
export type Pop = { t: number; pos: V3 };
/** everything lying in or flying toward the hero cart at time t */
export const heroItems = (id: number, t: number): Item[] => {
  const cart = heroCart(id);
  if (!cart) return [];
  const sc = cartScale(id, t), out: Item[] = [];
  INIT_SLOTS.forEach((s, i) => out.push({ id: i, kind: [0, 3, 4, 5][i], pos: slotPos(s, [0, 3, 4, 5][i], cart, sc), yaw: 0.5 * i - 0.4, roll: 0, scale: 1 }));
  if (id === 4) FILL_SLOTS.forEach((s, i) => {
    const kind = (i * 5 + 1) % 6, land = LAND[i], t0 = land - FLY;
    if (t < t0) return;
    const end = slotPos(s, kind, cart, sc);
    if (t >= land) {
      const k = clamp01((t - land) / 0.16), sq = 1 + 0.28 * Math.sin(Math.PI * k) * (1 - k); // squash-pop on arrival
      out.push({ id: 10 + i, kind, pos: end, yaw: 0.9 * i, roll: 0, scale: sq });
    } else {
      const u = (t - t0) / FLY, side = i % 2 ? 1 : -1;
      const start: V3 = [side * 3.0, 1.0 + 0.28 * (i % 4), cart.pos[2] - 1.2 + (i % 5) * 0.7];
      const p: V3 = [lerp(start[0], end[0], u), lerp(start[1], end[1], u) + 4 * 0.9 * u * (1 - u), lerp(start[2], end[2], u)];
      out.push({ id: 10 + i, kind, pos: p, yaw: u * 6.5 * side, roll: u * 5 * side, scale: 1 });
    }
  });
  return out;
};
/** landing pops (star bursts) in a frame window */
export const pops = (id: number, t: number): { u: number; pos: V3 }[] => {
  const cart = heroCart(id);
  if (id !== 4 || !cart) return [];
  const sc = cartScale(id, t), out: { u: number; pos: V3 }[] = [];
  FILL_SLOTS.forEach((s, i) => {
    const u = (t - LAND[i]) / 0.32;
    if (u >= 0 && u < 1) { const p = slotPos(s, (i * 5 + 1) % 6, cart, sc); out.push({ u: q(u, 12), pos: [p[0], p[1] + 0.22, p[2]] }); }
  });
  return out;
};
/** shot 3: dashed "phantom" items that hang in the empty half of the cart once the brain is tricked */
export const GHOSTS_FROM = ts(W.tricks) - 0.05;
export const ghosts = (id: number, t: number): { kind: number; pos: V3; u: number }[] => {
  const cart = heroCart(id);
  if (id !== 3 || !cart || t < GHOSTS_FROM) return [];
  const sc = cartScale(id, t);
  return FILL_SLOTS.slice(0, 5).map((s, i) => {
    const kind = (i * 5 + 1) % 6, p = slotPos(s, kind, cart, sc);
    return { kind: kind % 3, pos: [p[0], p[1] + 0.05 + 0.03 * Math.sin((t - GHOSTS_FROM) * 5 + i), p[2]] as V3, u: clamp01((t - GHOSTS_FROM - 0.08 * i) / 0.18) };
  });
};

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
/** dolly push: the camera slides toward the look point by factor k */
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });
const v3 = (a: number, b: number, c: number): V3 => [a, b, c];
const eyeY = 1.45; // head centre of an adult card (m)

// shot 1 (hook): wide low 3/4 on the shopper behind her cart -> MS on "doubled" (the cart swells) -> closer, roll
const F_DBL = fs(W.doubled) - 12, F_SIZES = fs(W.sizes) - 6;
const S1a = (f: number) => dolly(v3(3.0, 1.9, 0.0), v3(0, 1.0, 7.4), pushK(f, 0, 0.0025), { fov: 44 });
const S1b = (f: number) => dolly(v3(0.9, 1.5, 1.0), v3(0.1, 1.05, 7.4), pushK(f, F_DBL, 0.002, 0.006, 30), { fov: 42, roll: -0.04 });
const S1c = (f: number) => dolly(v3(0.7, 1.5, 2.2), v3(0.05, 1.2, 7.6), pushK(f, F_SIZES, 0.003), { fov: 40, roll: 0.04 });
// shot 2: the manager rubs his hands, the shopper smiles far behind him; closer on "convenience"
const F_CONV = fs(W.convenience) - 8;
const S2a = (f: number) => dolly(v3(-1.0, 1.4, 4.2), v3(0.4, 1.6, 11.0), pushK(f, CUT2, 0.0025), { fov: 46 });
const S2b = (f: number) => dolly(v3(-0.9, 1.5, 5.0), v3(0.7, 1.7, 9.0), pushK(f, F_CONV, 0.003), { fov: 36, roll: 0.035 });
// shot 3: MS of the half-empty cart -> cut into the cart on "half-empty" -> face + brain on "tricks"
const F_HALF = fs(W.halfEmpty) - 2, F_TRICK = fs(W.tricks) - 2;
const S3a = (f: number) => dolly(v3(0.6, 1.5, 1.8), v3(0.1, 1.15, 7.4), pushK(f, CUT3, 0.0022), { fov: 42 });
const S3b = (f: number) => dolly(v3(0.3, 2.5, 3.3), v3(0, 0.75, 7.0), pushK(f, F_HALF, 0.0025, 0.006, 30), { fov: 40, roll: -0.035 });
const S3c = (f: number) => dolly(v3(0.3, 1.5, 5.4), v3(0.1, 2.0, 8.6), pushK(f, F_TRICK, 0.003, 0.006, 25), { fov: 40, roll: 0.04 });
// shot 4: high wide while the items fly in -> low glide with roll on "forty percent" -> overflowing cart on "more food"
const F_FORTY = fs(W.forty) - 14, F_MORE = fs(W.more) - 2;
const S4a = (f: number) => dolly(v3(1.3, 3.0, 1.2), v3(0, 0.9, 8.0), pushK(f, CUT4, 0.002), { fov: 46 });
const S4b = (f: number) => dolly(v3(-2.4, 1.7, 3.6), v3(0, 1.0, 7.3), pushK(f, F_FORTY, 0.003), { fov: 42, roll: 0.05 });
const S4c = (f: number) => dolly(v3(0.3, 1.55, 4.0), v3(0, 1.05, 7.0), pushK(f, F_MORE, 0.0025, 0.006, 35), { fov: 36 });
// shot 5 (golden): low MS of the shopper strolling out with her basket -> closer on the basket -> crane out over the queue
const F_SMALL = fs(W.small) - 12, F_BASKET = fs(W.basket) - 8;
const S5a = (f: number) => dolly(v3(-0.9, 0.95, 1.0), v3(0.2, 1.3, 6.4), pushK(f, CUT5, 0.002), { fov: 42 });
const S5b = (f: number) => dolly(v3(0.4, 1.15, 3.3), v3(0.3, 1.0, 6.0), pushK(f, F_SMALL, 0.002, 0.006, 32), { fov: 34, roll: -0.04 });
const S5c = (_f: number): Shot => ({ pos: v3(3.4, 3.3, 0.2), look: v3(0.1, 1.2, 11.0), fov: 46, roll: 0 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: F_DBL, dur: 26, s: S1b }, { f: F_SIZES, dur: 22, s: S1c }],
  2: [{ f: CUT2, s: S2a }, { f: F_CONV, dur: 20, s: S2b }],
  3: [{ f: CUT3, s: S3a }, { f: F_HALF, cut: true, s: S3b }, { f: F_TRICK, cut: true, s: S3c }],
  4: [{ f: CUT4, s: S4a }, { f: F_FORTY, dur: 26, s: S4b }, { f: F_MORE, cut: true, s: S4c }],
  5: [{ f: CUT5, s: S5a }, { f: F_SMALL, dur: 24, s: S5b }, { f: F_BASKET, dur: 52, s: S5c }],
};
// impact kicks: the image offset flips sign every frame (~3 px at 720p per unit), decays to 0 in 7 f, roll +-0.23 deg per unit
const KICKS: [number, number][] = [[GROW_LAND, 0.7], [ts(W.food), 1.0], [ts(W.basket), 0.35]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(f / FPS);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};
/** frame at which the current key's move has finished */
export const keyEnd = (id: number, f: number) => {
  let e = 0;
  for (const k of CAMS[id]) if (f >= k.f) e = k.f + (k.cut ? 0 : k.dur ?? 24);
  return Math.max(f, e);
};
/** the camera keys of a shot (for the framing checker) */
export const keyFrames = (id: number) => CAMS[id].map((k) => k.f);

// ---------------- lens: depth of field ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
const shopperEyes = (id: number) => (f: number): V3 => { const p = shopperAt(id, f / FPS); return [p[0], eyeY, p[2]]; };
const managerEyes = (): V3 => [MANAGER[0], eyeY, MANAGER[2]];
export const DOF: Dof[] = [
  { f: 0, cInf: 12, focus: shopperEyes(1) },                       // hook wide: shopper sharp, shelves soft
  { f: F_DBL, dur: 26, cInf: 14, focus: shopperEyes(1) },          // MS as the cart swells
  { f: CUT2, cInf: 13, focus: () => managerEyes() },               // manager sharp, foreground produce + far shopper soft
  { f: CUT3, cInf: 10, focus: shopperEyes(3) },
  { f: F_HALF, cInf: 14, focus: () => [0, 0.8, 7.0] },             // the empty cart interior
  { f: F_TRICK, cInf: 14, focus: shopperEyes(3) },                 // face + brain
  { f: CUT4, cInf: 0 },                                            // high wide, items in flight: kept readable
  { f: F_FORTY, dur: 26, cInf: 8, focus: () => [0, 1.0, 7.3] },
  { f: F_MORE, cInf: 12, focus: () => [0, 1.05, 7.0] },            // overflowing cart
  { f: CUT5, cInf: 10, focus: shopperEyes(5) },                    // golden MS
  { f: F_SMALL, dur: 24, cInf: 12, focus: (f) => { const p = shopperAt(5, f / FPS); return [p[0] + 0.3, 0.75, p[2]]; } }, // basket
  { f: F_BASKET, dur: 52, cInf: 0 },                               // crane out: queue readable
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
export const focusAt = (id: number, f: number): V3 => { const d = dofAt(f); return d.focus ? d.focus(f) : camAt(id, f).look; };

/** near framing objects (blurred by the lens): visible while a <= f < b; built by world.ts */
export type Fg = { a: number; b: number; kind: "produce" | "baskets"; pos: V3; yaw?: number };
export const FOREGROUND: Fg[] = [
  { a: CUT2, b: CUT3, kind: "produce", pos: [-0.2, D0, 6.1], yaw: -0.3 },          // produce table in the bottom-left corner of the manager shot
  { a: CUT5, b: F_SMALL, kind: "baskets", pos: [-0.9, D0, 3.25], yaw: 0 },            // the stack she took her basket from
];

// ---------------- reactions (land LEAD before the word) ----------------
export type Expr = "neutral" | "stern" | "grin" | "laugh" | "whistle" | "nervous" | "shock" | "relief" | "relief_open" | "dazed"
  | "pained" | "smile" | "smile_closed" | "lick";
const at = (t: number, i: number) => t >= ts(i) - LEAD;
/** the shopper's face */
export const shopperExpr = (id: number, t: number): Expr => {
  if (id === 1) return at(t, W.sizes) ? "nervous" : at(t, W.doubled) ? "shock" : "smile";
  if (id === 2) return "smile";
  if (id === 3) return at(t, W.brain) ? "dazed" : at(t, W.tricks) ? "nervous" : at(t, W.halfEmpty) ? "neutral" : "smile";
  if (id === 4) return at(t, W.food) ? "relief_open" : "dazed";
  return at(t, W.basket) ? "laugh" : at(t, W.small) ? "grin" : "smile_closed";
};
export const managerExpr = (t: number): Expr => (at(t, W.convenience) ? "laugh" : "grin");
export const queueExpr = (i: number, t: number): Expr => {
  const set: Expr[] = ["dazed", "pained", "nervous"];
  return at(t, W.basket) ? (["pained", "nervous", "dazed"] as Expr[])[i] : set[i];
};
