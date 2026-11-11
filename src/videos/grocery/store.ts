// The 3D toon store: every mesh is procedural (no model files): checker floor, saturated walls, light-strip ceiling,
// double-sided gondola shelves with painted product blocks, the glass storefront, produce tables, wire shopping carts
// and hand baskets. Materials are two-tone Lambert (shade.ts) so the whole world shares the reference lighting:
// warm lit side, violet-blue shadow, coloured darks. Geometry is merged per material (a handful of draw calls).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { twoTone } from "./shade";
import { ctex, rng, rep } from "./paint";
import { STORE, CART_BIG, KIND_H } from "./story";

// ---------------- materials (shared, cached) ----------------
const mats = new Map<string, THREE.MeshLambertMaterial>();
export const lam = (key: string, make: () => THREE.MeshLambertMaterialParameters) => {
  let m = mats.get(key);
  if (!m) { m = twoTone(new THREE.MeshLambertMaterial(make())); mats.set(key, m); }
  return m;
};
export const flat = (hex: string) => lam("c" + hex, () => ({ color: hex }));

// palette: saturated, with COLOURED darks (never black): navy / aubergine / plum / oxblood (grade.md 6.3)
export const PAL = {
  navy: "#3a4a82", plum: "#5a3a62", oxblood: "#8a3a3a", cream: "#f3ead6", red: "#e2453c", yellow: "#f6c945", teal: "#2fa6a0", mint: "#59c7b4",
  blue: "#4a7fd6", orange: "#f08a2c", pink: "#f28fb0", green: "#58b04f", steel: "#c6d0e0", steelDark: "#8794b0", wood: "#e3b684",
};
export const PROD = [PAL.yellow, PAL.red, PAL.blue, PAL.green, PAL.orange, PAL.pink, PAL.teal, "#f3efe6"];

// ---------------- painted textures ----------------
const floorTex = () => ctex("floorChecker", 512, 512, (g, r) => {
  const cols = ["#f6f1e6", "#6fd0c4"];
  for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    g.fillStyle = cols[(i + j) % 2]; g.fillRect(i * 256, j * 256, 256, 256);
    for (let k = 0; k < 7; k++) { g.fillStyle = `rgba(${(i + j) % 2 ? "30,120,110" : "190,170,140"},0.07)`; g.beginPath(); g.ellipse(i * 256 + r() * 256, j * 256 + r() * 256, 40 + r() * 70, 20 + r() * 40, r() * 3, 0, 7); g.fill(); }
  }
  g.strokeStyle = "rgba(120,140,150,0.55)"; g.lineWidth = 3;
  for (const v of [0, 256, 512]) { g.beginPath(); g.moveTo(v, 0); g.lineTo(v, 512); g.moveTo(0, v); g.lineTo(512, v); g.stroke(); }
});
const ceilTex = () => ctex("ceilPanels", 512, 512, (g) => {
  g.fillStyle = "#efe9f6"; g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "rgba(140,125,175,0.6)"; g.lineWidth = 4;
  for (const v of [0, 256, 512]) { g.beginPath(); g.moveTo(v, 0); g.lineTo(v, 512); g.moveTo(0, v); g.lineTo(512, v); g.stroke(); }
});
/** painted wall mural: flat pictograms (apple, carrot, milk, bread) on a saturated field, repeating every 8 m */
const muralTex = (bg: string, key: string) => ctex("mural" + key, 1024, 256, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, 1024, 256);
  g.fillStyle = "rgba(255,255,255,0.18)"; g.fillRect(0, 196, 1024, 60);                       // wainscot band
  const ink = "#3b2a45";
  const apple = (x: number) => { g.fillStyle = "#e2453c"; g.strokeStyle = ink; g.lineWidth = 5; g.beginPath(); g.arc(x, 112, 44, 0, 7); g.fill(); g.stroke(); g.fillStyle = "#58b04f"; g.beginPath(); g.ellipse(x + 18, 62, 20, 10, -0.5, 0, 7); g.fill(); g.stroke(); };
  const carrot = (x: number) => { g.fillStyle = "#f08a2c"; g.strokeStyle = ink; g.lineWidth = 5; g.beginPath(); g.moveTo(x - 24, 70); g.lineTo(x + 24, 70); g.lineTo(x, 170); g.closePath(); g.fill(); g.stroke(); g.fillStyle = "#58b04f"; for (const d of [-14, 0, 14]) { g.beginPath(); g.ellipse(x + d, 52, 8, 22, d * 0.03, 0, 7); g.fill(); g.stroke(); } };
  const milk = (x: number) => { g.fillStyle = "#fbfaf2"; g.strokeStyle = ink; g.lineWidth = 5; g.fillRect(x - 32, 70, 64, 100); g.strokeRect(x - 32, 70, 64, 100); g.fillStyle = "#4a7fd6"; g.fillRect(x - 32, 105, 64, 34); g.beginPath(); g.moveTo(x - 32, 70); g.lineTo(x, 44); g.lineTo(x + 32, 70); g.closePath(); g.fillStyle = "#fbfaf2"; g.fill(); g.stroke(); };
  const bread = (x: number) => { g.fillStyle = "#e0a35a"; g.strokeStyle = ink; g.lineWidth = 5; g.beginPath(); g.ellipse(x, 118, 58, 38, 0, 0, 7); g.fill(); g.stroke(); g.strokeStyle = "#b9742e"; g.beginPath(); for (const d of [-26, 0, 26]) { g.moveTo(x + d - 6, 98); g.lineTo(x + d + 6, 136); } g.stroke(); };
  [apple, carrot, milk, bread].forEach((f, i) => f(128 + i * 256));
});
const glassTex = (day: boolean) => ctex("glass" + (day ? "Day" : "Gold"), 8, 256, (g) => {
  const gr = g.createLinearGradient(0, 0, 0, 256);
  if (day) { gr.addColorStop(0, "#a9cdf7"); gr.addColorStop(0.55, "#d7e8fb"); gr.addColorStop(1, "#f4f1e6"); }
  else { gr.addColorStop(0, "#c98aa8"); gr.addColorStop(0.45, "#ffb676"); gr.addColorStop(0.75, "#ffd08a"); gr.addColorStop(1, "#ffe6b8"); }
  g.fillStyle = gr; g.fillRect(0, 0, 8, 256);
});
/** HDR glass (bloom): tint > 1 makes the storefront the brightest thing in the frame */
export const glassMaterials = () => ({
  day: new THREE.MeshBasicMaterial({ map: glassTex(true), color: new THREE.Color(1.5, 1.55, 1.7), fog: false }),
  golden: new THREE.MeshBasicMaterial({ map: glassTex(false), color: new THREE.Color(2.6, 2.1, 1.5), fog: false }),
});

// ---------------- batching ----------------
const f32 = (a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => {
  const out = new Float32Array(a.count * a.itemSize);
  for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k);
  return new THREE.Float32BufferAttribute(out, a.itemSize);
};
export class Batch {
  private g = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(geo: THREE.BufferGeometry, mat: THREE.Material, m?: THREE.Matrix4) {
    const src = geo.index ? geo.toNonIndexed() : geo;
    const x = new THREE.BufferGeometry();
    x.setAttribute("position", f32(src.attributes.position));
    if (src.attributes.normal) x.setAttribute("normal", f32(src.attributes.normal)); else x.computeVertexNormals();
    x.setAttribute("uv", src.attributes.uv ? f32(src.attributes.uv) : new THREE.Float32BufferAttribute(new Float32Array(src.attributes.position.count * 2), 2));
    if (m) x.applyMatrix4(m);
    const l = this.g.get(mat);
    if (l) l.push(x); else this.g.set(mat, [x]);
  }
  build(parent: THREE.Object3D, cast = true, receive = true) {
    for (const [mat, list] of this.g) {
      const mesh = new THREE.Mesh(mergeGeometries(list, false), mat);
      mesh.castShadow = cast; mesh.receiveShadow = receive; mesh.matrixAutoUpdate = false;
      parent.add(mesh);
    }
    this.g.clear();
  }
}
const UNIT = new THREE.BoxGeometry(1, 1, 1);
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
const mat4 = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0, rx = 0, rz = 0) => {
  _q.setFromEuler(_e.set(rx, ry, rz)); return new THREE.Matrix4().compose(_p.set(x, y, z), _q, _s.set(sx, sy, sz));
};
/** axis-aligned (optionally yawed) box centred at (x, y, z) */
const box = (b: Batch, mat: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number, ry = 0) => b.add(UNIT, mat, mat4(x, y, z, w, h, d, ry));
/** thin square bar between two points */
const bar = (b: Batch, mat: THREE.Material, a: THREE.Vector3, c: THREE.Vector3, th: number, m0?: THREE.Matrix4) => {
  const d = c.clone().sub(a), len = d.length(), mid = a.clone().add(c).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), d.normalize());
  const m = new THREE.Matrix4().compose(mid, q, new THREE.Vector3(th, th, len));
  b.add(UNIT, mat, m0 ? m0.clone().multiply(m) : m);
};
const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ---------------- products ----------------
const CYL = new THREE.CylinderGeometry(1, 1, 1, 14), SPH = new THREE.SphereGeometry(1, 14, 10), CAP = new THREE.CapsuleGeometry(1, 1, 4, 10);
type Part = { geo: THREE.BufferGeometry; mat: THREE.Material; m: THREE.Matrix4 };
/** one product, centred on its middle (half heights = story KIND_H). kind: 0 cereal, 1 can, 2 bottle, 3 bread, 4 milk, 5 apple */
export const productParts = (kind: number, ci: number): Part[] => {
  const c = flat(PROD[ci % PROD.length]), white = flat("#fbf6e8"), steel = flat("#cfd5dc");
  switch (kind % 6) {
    case 0: return [{ geo: UNIT, mat: c, m: mat4(0, 0, 0, 0.22, 0.3, 0.08) }, { geo: UNIT, mat: white, m: mat4(0, 0.02, 0, 0.2, 0.1, 0.085) }];
    case 1: return [{ geo: CYL, mat: c, m: mat4(0, 0, 0, 0.05, 0.12, 0.05) }, { geo: CYL, mat: steel, m: mat4(0, 0.06, 0, 0.053, 0.012, 0.053) }, { geo: CYL, mat: steel, m: mat4(0, -0.06, 0, 0.053, 0.012, 0.053) }];
    case 2: return [{ geo: CYL, mat: c, m: mat4(0, -0.04, 0, 0.05, 0.18, 0.05) }, { geo: CYL, mat: c, m: mat4(0, 0.1, 0, 0.022, 0.1, 0.022) }, { geo: CYL, mat: white, m: mat4(0, 0.155, 0, 0.027, 0.03, 0.027) }];
    case 3: return [{ geo: CAP, mat: flat("#e0a35a"), m: mat4(0, 0, 0, 0.075, 0.075, 0.075, 0, 0, Math.PI / 2) }, { geo: UNIT, mat: flat("#fbe3b0"), m: mat4(0, 0.045, 0, 0.1, 0.012, 0.06, 0.3) }];
    case 4: return [{ geo: UNIT, mat: flat("#fbfaf2"), m: mat4(0, 0, 0, 0.1, 0.2, 0.1) }, { geo: UNIT, mat: flat(PAL.blue), m: mat4(0, 0, 0, 0.104, 0.07, 0.104) }, { geo: UNIT, mat: flat("#fbfaf2"), m: mat4(0, 0.125, 0, 0.1, 0.05, 0.05) }];
    default: return [{ geo: SPH, mat: flat(ci % 2 ? PAL.green : PAL.red), m: mat4(0, 0, 0, 0.07, 0.065, 0.07) }, { geo: CYL, mat: flat("#6a4a2e"), m: mat4(0, 0.07, 0, 0.007, 0.03, 0.007) }];
  }
};
/** a loose product as its own group (flying / sitting in the hero cart) */
export const makeProduct = (kind: number, ci: number) => {
  const g = new THREE.Group();
  for (const p of productParts(kind, ci)) { const m = new THREE.Mesh(p.geo, p.mat); p.m.decompose(m.position, m.quaternion, m.scale); m.castShadow = m.receiveShadow = true; g.add(m); }
  g.rotation.order = "YXZ";
  return g;
};
const addProduct = (b: Batch, kind: number, ci: number, m0: THREE.Matrix4) => { for (const p of productParts(kind, ci)) b.add(p.geo, p.mat, m0.clone().multiply(p.m)); };

// ---------------- wire shopping cart (built at the OLD size; the hero cart is scaled up per frame) ----------------
/** cart parts into a batch; `sc` bakes a scale in (the queue carts are built at the big size) */
const cartInto = (b: Batch, sc: [number, number, number], at?: THREE.Matrix4) => {
  const wire = flat(PAL.steel), dark = flat(PAL.steelDark), grip = flat(PAL.red), wheel = flat("#3a3550"), hub = flat("#aab4c6");
  const S = (x: number, y: number, z: number) => V(x * sc[0], y * sc[1], z * sc[2]);
  const M0 = at ?? new THREE.Matrix4();
  const th = 0.026;
  const tx = 0.275, bx = 0.2, tz = 0.5, bz = 0.44, ty = 0.85, by = 0.45;
  const top = [S(-tx, ty, -tz), S(tx, ty, -tz), S(tx, ty, tz), S(-tx, ty, tz)], bot = [S(-bx, by, -bz), S(bx, by, -bz), S(bx, by, bz), S(-bx, by, bz)];
  for (let i = 0; i < 4; i++) {
    bar(b, wire, top[i], top[(i + 1) % 4], th * 1.3, M0);        // rim
    bar(b, wire, bot[i], bot[(i + 1) % 4], th, M0);              // bottom frame
    bar(b, wire, top[i], bot[i], th, M0);                        // corner posts
  }
  for (const fy of [0.33, 0.66]) { // mid rails + verticals on the long sides
    const y = by + (ty - by) * fy, x = bx + (tx - bx) * fy, z = bz + (tz - bz) * fy;
    for (const s of [-1, 1]) bar(b, wire, S(s * x, y, -z), S(s * x, y, z), th * 0.85, M0);
    bar(b, wire, S(-x, y, -z), S(x, y, -z), th * 0.85, M0); bar(b, wire, S(-x, y, z), S(x, y, z), th * 0.85, M0);
  }
  for (const zz of [-0.25, 0, 0.25]) for (const s of [-1, 1]) bar(b, wire, S(s * (tx - 0.005), ty, zz * 1.04), S(s * bx, by, zz * 0.98), th * 0.8, M0);
  for (const s of [-1, 1]) { bar(b, wire, S(0, ty, s * tz), S(0, by, s * bz), th * 0.8, M0); }
  for (const xx of [-0.1, 0.1]) bar(b, wire, S(xx, by, -bz), S(xx, by, bz), th * 0.8, M0);   // bottom slats
  for (const zz of [-0.2, 0.2]) bar(b, wire, S(-bx, by, zz), S(bx, by, zz), th * 0.8, M0);
  // chassis + wheels
  for (const s of [-1, 1]) {
    bar(b, dark, S(s * 0.2, 0.22, -0.46), S(s * 0.2, 0.22, 0.5), th * 1.2, M0);
    bar(b, dark, S(s * bx, by, -bz), S(s * 0.2, 0.22, -0.46), th, M0); bar(b, dark, S(s * bx, by, bz), S(s * 0.2, 0.22, 0.5), th, M0);
    for (const wz of [-0.4, 0.42]) {
      b.add(CYL, wheel, M0.clone().multiply(mat4(s * 0.2 * sc[0], 0.065, wz * sc[2], 0.065, 0.04, 0.065, 0, 0, Math.PI / 2)));
      b.add(CYL, hub, M0.clone().multiply(mat4(s * (0.2 * sc[0] + 0.02), 0.065, wz * sc[2], 0.03, 0.045, 0.03, 0, 0, Math.PI / 2)));
    }
  }
  // handle: two posts rising past the back rim and a red grip
  for (const s of [-1, 1]) bar(b, wire, S(s * tx, ty, -tz), S(s * tx, ty + 0.12, -tz - 0.12), th * 1.2, M0);
  bar(b, grip, S(-tx, ty + 0.12, -tz - 0.12), S(tx, ty + 0.12, -tz - 0.12), 0.045, M0);
  // red plastic child-seat flap at the back: the brand colour
  b.add(UNIT, grip, M0.clone().multiply(mat4(0, ty - 0.1 * sc[1], -tz * sc[2] + 0.02, 2 * tx * sc[0] * 0.92, 0.1 * sc[1], 0.02)));
};
/** a cart (+z forward, handle at -z). `scale` true = the merged geometry is baked at the BIG size */
export const makeCart = (big = false) => {
  const g = new THREE.Group(), b = new Batch();
  cartInto(b, big ? CART_BIG : [1, 1, 1]);
  b.build(g, true, true);
  return g;
};

// ---------------- hand basket + stack ----------------
const FRUS = new THREE.CylinderGeometry(0.62, 0.5, 1, 4, 1, true), TORUS = new THREE.TorusGeometry(0.5, 0.045, 6, 16, Math.PI);
export const makeBasket = (x = 0, y = 0, z = 0, ry = 0) => {
  const g = new THREE.Group(), red = lam("basketRed", () => ({ color: PAL.red, side: THREE.DoubleSide })), white = flat("#fbe9e0");
  const body = new THREE.Mesh(FRUS, red); body.scale.set(0.34, 0.2, 0.22); body.rotation.y = Math.PI / 4; body.position.y = 0.1; body.castShadow = body.receiveShadow = true;
  const rim = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.27), white); rim.position.y = 0.205; rim.castShadow = true;
  const bottom = new THREE.Mesh(UNIT, red); bottom.scale.set(0.27, 0.01, 0.17); bottom.position.y = 0.005; bottom.castShadow = true;
  const h = new THREE.Mesh(TORUS, flat("#7a2a2a")); h.scale.set(0.34, 0.5, 0.3); h.position.y = 0.2; h.castShadow = true;
  g.add(body, rim, bottom, h); g.position.set(x, y, z); g.rotation.y = ry;
  return g;
};
/** a leaning tower of nested baskets on a small stand (foreground prop, shot 5) */
export const makeBasketStack = () => {
  const g = new THREE.Group(), b = new Batch(), stand = flat(PAL.navy);
  box(b, stand, 0.62, 0.7, 0.42, 0, 0.35, 0); box(b, flat(PAL.yellow), 0.64, 0.06, 0.44, 0, 0.72, 0);
  b.build(g, true, true);
  for (let i = 0; i < 7; i++) g.add(makeBasket(0.01 * (i % 2), 0.75 + i * 0.085, 0, 0.05 * i));
  return g;
};

// ---------------- produce table ----------------
export const makeProduceTable = (seed = 3) => {
  const g = new THREE.Group(), b = new Batch(), r = rng(seed);
  const wood = flat(PAL.wood), leg = flat(PAL.plum), crate = flat("#c98a52");
  for (const sx of [-0.42, 0.42]) for (const sz of [-0.27, 0.27]) box(b, leg, 0.06, 0.62, 0.06, sx, 0.31, sz);
  box(b, wood, 0.98, 0.06, 0.66, 0, 0.65, 0);
  box(b, crate, 0.9, 0.18, 0.58, 0, 0.77, 0);
  // piled fruit: red, green and orange apples/oranges in two rows
  const fruit = [PAL.red, PAL.green, PAL.orange, PAL.red];
  for (let i = 0; i < 20; i++) {
    const x = -0.36 + (i % 5) * 0.18 + (r() - 0.5) * 0.03, z = -0.2 + Math.floor(i / 5) * 0.14 + (r() - 0.5) * 0.03, y = 0.9 + (i % 2) * 0.03;
    b.add(SPH, flat(fruit[(i * 3 + Math.floor(i / 5)) % 4]), mat4(x, y, z, 0.075, 0.07, 0.075));
  }
  b.build(g, true, true);
  return g;
};

// ---------------- a cart overflowing with food (the queue at the exit) ----------------
export const makeHeavyCart = (seed: number, count: number) => {
  const g = new THREE.Group(), b = new Batch(), r = rng(seed);
  cartInto(b, CART_BIG);
  for (let i = 0; i < count; i++) {
    const layer = Math.floor(i / 12), kind = Math.floor(r() * 6);
    const x = (r() - 0.5) * 0.5, z = (r() - 0.5) * 1.65, y = 0.45 * CART_BIG[1] + KIND_H[kind] + layer * 0.22 + r() * 0.05;
    addProduct(b, kind, Math.floor(r() * 8), mat4(x, y, z, 1, 1, 1, r() * 6.28, (r() - 0.5) * 0.3, (r() - 0.5) * 0.3));
  }
  b.build(g, true, true);
  return g;
};

// ---------------- the store ----------------
export const buildStore = (root: THREE.Object3D) => {
  const { x0, x1, z0, z1, h } = STORE, W = x1 - x0, L = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const plane = (w: number, hgt: number, mat: THREE.Material, p: THREE.Vector3, rx = 0, ry = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, hgt), mat);
    m.rotation.set(rx, ry, 0); m.position.copy(p); m.castShadow = false; m.receiveShadow = true; root.add(m); return m;
  };
  // floor, ceiling
  plane(W, L, lam("floor", () => ({ map: rep(floorTex(), W / 2, L / 2) })), V(cx, 0, cz), -Math.PI / 2);
  plane(W, L, lam("ceil", () => ({ map: rep(ceilTex(), W / 2, L / 2) })), V(cx, h, cz), Math.PI / 2);
  // walls: mural strips (left mint, right sunny) + back wall coral
  const mural = (bg: string, key: string, len: number) => lam("mural" + key, () => ({ map: rep(muralTex(bg, key), len / 8, 1) }));
  plane(L, h, mural("#5cc9a8", "L", L), V(x0, h / 2, cz), 0, Math.PI / 2);
  plane(L, h, mural("#f2b84a", "R", L), V(x1, h / 2, cz), 0, -Math.PI / 2);
  plane(W, h, mural("#ef7a5a", "B", W), V(cx, h / 2, z0), 0, 0);
  // glass storefront (z1): sill, header, mullions, door posts, HDR glass
  const b = new Batch(), navy = flat(PAL.navy), red = flat(PAL.red), yel = flat(PAL.yellow);
  box(b, flat(PAL.teal), W, 0.9, 0.4, cx, 0.45, z1); box(b, navy, W, 0.7, 0.4, cx, h - 0.35, z1);
  for (let x = x0 + 3.25; x < x1 - 1; x += 3.25) box(b, navy, 0.16, h - 1.6, 0.18, x, 0.9 + (h - 1.6) / 2, z1 - 0.02);
  for (const s of [-1, 1]) box(b, red, 0.2, h - 1.6, 0.22, s * 1.25, 0.9 + (h - 1.6) / 2, z1 - 0.04);
  box(b, red, 2.7, 0.18, 0.22, 0, h - 0.82, z1 - 0.04);
  const glass = glassMaterials();
  const gl = plane(W, h - 1.6, glass.day, V(cx, 0.9 + (h - 1.6) / 2, z1 + 0.1), 0, Math.PI); // faces -z (toward the shop)
  gl.castShadow = false; gl.receiveShadow = false;
  // ceiling light strips (HDR emissive: they bloom) + hanging aisle signs
  const light = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.0, 2.9, 2.6), fog: false });
  for (const z of [0, 4.5, 9, 13.5, 18, 22.5]) {
    const m = new THREE.Mesh(UNIT, light); m.scale.set(W - 2, 0.06, 0.5); m.position.set(cx, h - 0.04, z); root.add(m);
  }
  const signCols = [PAL.red, PAL.yellow, PAL.teal, PAL.blue];
  [[0, 6.6, 0], [-3.7, 5.6, 1], [3.7, 5.6, 2], [-8.2, 5.6, 3], [8.2, 5.6, 0], [0, 13, 2]].forEach(([x, z, ci]) => {
    const y = 3.55, c = flat(signCols[ci]);
    box(b, c, 1.7, 0.62, 0.09, x, y, z); box(b, flat("#fbf6e8"), 0.44, 0.44, 0.1, x - 0.5, y, z);
    b.add(SPH, flat(["#e2453c", "#f08a2c", "#4a7fd6", "#58b04f"][ci]), mat4(x - 0.5, y, z + 0.06, 0.13, 0.13, 0.05));
    for (const sx of [-0.7, 0.7]) box(b, navy, 0.03, h - y - 0.3, 0.03, x + sx, (h + y + 0.3) / 2, z);
  });
  // gondolas: [centre x, z from, z to, shelves facing]
  const r = rng(11);
  const gondola = (gx: number, za: number, zb: number, near: boolean) => {
    const len = zb - za, zc = (za + zb) / 2, hh = 1.9, bays = Math.round(len / 1.2), bl = len / bays;
    box(b, navy, 0.95, 0.2, len, gx, 0.1, zc);                       // plinth
    box(b, flat(PAL.cream), 0.05, hh, len, gx, hh / 2, zc);          // back panel
    box(b, red, 1.0, 0.16, len, gx, hh + 0.08, zc);                  // header
    for (let i = 0; i <= bays; i++) box(b, red, 0.96, hh, 0.06, gx, hh / 2, za + i * bl);   // uprights
    for (const sy of [0.55, 1.05, 1.55]) for (const s of [-1, 1]) {
      box(b, flat("#efe6d4"), 0.44, 0.035, len, gx + s * 0.25, sy, zc);
      const nBlocks = near ? 4 : 3;
      for (let i = 0; i < bays; i++) for (let k = 0; k < nBlocks; k++) {
        const w = bl / nBlocks, z = za + i * bl + (k + 0.5) * w, ph = 0.22 + r() * 0.14, ci = Math.floor(r() * PROD.length);
        const px = gx + s * 0.3;
        box(b, flat(PROD[ci]), 0.26, ph, w * 0.84, px, sy + 0.018 + ph / 2, z);
        box(b, flat("#fbf6e8"), 0.265, ph * 0.38, w * 0.86, px, sy + 0.018 + ph * 0.55, z);
        if (near && r() < 0.35) box(b, flat(PROD[(ci + 3) % PROD.length]), 0.2, 0.1, w * 0.7, px, sy + 0.018 + ph + 0.05, z);
      }
    }
  };
  gondola(-3.7, 6, 21, true); gondola(3.7, 6, 21, true);
  gondola(-8.2, 6, 21, false); gondola(8.2, 6, 21, false);
  // end-cap crates at the aisle mouth
  for (const sx of [-1, 1]) { box(b, flat(PAL.orange), 0.9, 0.5, 0.7, sx * 3.7, 0.25, 5.4); box(b, flat(PAL.yellow), 0.8, 0.3, 0.6, sx * 3.7, 0.65, 5.4); }
  b.build(root, true, true);
  // the glass material is swapped per light by world.ts
  return { glass: gl, glassMats: glass, lightMat: light };
};
export type Built = ReturnType<typeof buildStore>;
