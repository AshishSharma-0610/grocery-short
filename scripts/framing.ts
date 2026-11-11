// Framing checker (no GPU): projects the main subjects of every shot through the shot's camera and prints where they
// land in the 1080x1920 frame (x, y as 0..1 from the top-left) so a bad framing is caught before a 10 minute render.
//   npm run framing
import { camAt, SHOTS, keyFrames, shopperAt, MANAGER, HERO, S2_HERO, QUEUE, FOREGROUND, V3, cartScale, TOTAL } from "../src/videos/grocery/story";
import { W, fs } from "../src/videos/grocery/timing";

const ASPECT = 1080 / 1920;
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
function project(id: number, f: number, p: V3) {
  const c = camAt(id, f);
  const fw = norm(sub(c.look, c.pos));
  let r = norm(cross(fw, [0, 1, 0]));
  let u = cross(r, fw);
  const cr = Math.cos(c.roll), sr = Math.sin(c.roll);
  [r, u] = [[r[0] * cr + u[0] * sr, r[1] * cr + u[1] * sr, r[2] * cr + u[2] * sr], [u[0] * cr - r[0] * sr, u[1] * cr - r[1] * sr, u[2] * cr - r[2] * sr]];
  const d = sub(p, c.pos), z = dot(d, fw);
  const th = Math.tan((c.fov * Math.PI) / 360);
  return { x: 0.5 + (dot(d, r) / z) / (2 * th * ASPECT), y: 0.5 - (dot(d, u) / z) / (2 * th), z };
}
const fmt = (n: string, p: { x: number; y: number; z: number }) => {
  const inside = p.z > 0.3 && p.x > 0.02 && p.x < 0.98 && p.y > -0.02 && p.y < 1.02;
  return `${n}:(${p.x.toFixed(2)},${p.y.toFixed(2)} d${p.z.toFixed(1)})${inside ? "" : " OUT"}`;
};
const sh = (id: number, t: number) => shopperAt(id, t);
for (const s of SHOTS) {
  const fr = [...new Set([...keyFrames(s.id).flatMap((k) => [k + 3, k + 14]), s.b - 2])].filter((f) => f >= s.a && f < s.b);
  console.log(`\nshot ${s.id}  f${s.a}-${s.b - 1}`);
  for (const f of fr) {
    const t = f / 30, row: string[] = [];
    const P = sh(s.id, t);
    row.push(fmt("shopHead", project(s.id, f, [P[0], 1.7, P[2]])), fmt("shopFeet", project(s.id, f, [P[0], 0, P[2]])));
    if (s.id === 2) row.push(fmt("mgrHead", project(s.id, f, [MANAGER[0], 1.7, MANAGER[2]])), fmt("mgrFeet", project(s.id, f, [MANAGER[0], 0, MANAGER[2]])));
    if (s.id !== 5) {
      const hc = s.id === 2 ? S2_HERO : HERO, sc = cartScale(s.id, t);
      row.push(fmt("cartMid", project(s.id, f, [hc[0], 0.8, hc[2]])));
      if (s.id === 3) row.push(fmt("brain", project(s.id, f, [P[0], 2.55, P[2]])));
      row.push(fmt("cartRim", project(s.id, f, [hc[0], 0.85 * sc[1], hc[2] - 0.9 * sc[2]])), fmt("cartBack", project(s.id, f, [hc[0], 0.95 * sc[1], hc[2] + 0.9 * sc[2]])));
    } else QUEUE.forEach((q, i) => row.push(fmt("q" + i, project(s.id, f, [q[0], 1.0, q[2]]))));
    for (const g of FOREGROUND) if (g.a <= f && f < g.b) row.push(fmt("FG-" + g.kind, project(s.id, f, [g.pos[0], 0.5, g.pos[2]])));
    console.log(`  f${f}  ${row.join("  ")}`);
  }
}
console.log(`\n(total ${TOTAL} f; word frames: doubled ${fs(W.doubled)}, convenience ${fs(W.convenience)}, brain ${fs(W.brain)}, food ${fs(W.food)})`);
