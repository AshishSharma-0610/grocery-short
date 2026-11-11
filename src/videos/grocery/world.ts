// The whole place as one three.js scene: the store (store.ts), the hero cart that swells on "doubled", the products
// that fly into it, the queue of overflowing carts at the exit, and the cast (cast.ts). update(id, f, camera, scene)
// poses everything for shot `id` at frame f: a PURE function of (id, f), so frames can be rendered in any order.
import * as THREE from "three";
import { buildStore, makeCart, makeProduct, makeHeavyCart, makeProduceTable, makeBasketStack, Built } from "./store";
import { LIGHTS, LOOK, LightPreset } from "./lights";
import { TONE, CHAR, untone } from "./shade";
import { Pool, Actor, Fx, stage } from "./cast";
import {
  FPS, SHOTS, ShotDef, camAt, heroCart, heroItems, cartScale, FOREGROUND, CORRAL, QUEUE, HERO_YAW, FILL_SLOTS, INIT_SLOTS,
} from "./story";

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export class World {
  readonly root = new THREE.Group();
  private hemi: THREE.HemisphereLight; private sun: THREE.DirectionalLight; private fill: THREE.DirectionalLight;
  private fog = new THREE.Fog("#ffffff", 10, 100);
  private built: Built;
  private hero = makeCart(false);
  private items = new Map<number, THREE.Group>();
  private corral: THREE.Group[] = [];
  private queue: THREE.Group[] = [];
  private fgs: { a: number; b: number; o: THREE.Object3D }[] = [];
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private sunCache = new Map<number, THREE.Vector3>();
  private frustum = new THREE.Frustum(); private sph = new THREE.Sphere(); private v = new THREE.Vector3(); private m4 = new THREE.Matrix4();

  constructor() {
    const R = this.root;
    this.hemi = new THREE.HemisphereLight("#cfe6ff", "#6c5c8c", 1.1);
    this.sun = new THREE.DirectionalLight("#fff0d6", 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.fill = new THREE.DirectionalLight("#9fb8ff", 0.35);
    R.add(this.hemi, this.sun, this.sun.target, this.fill, this.fill.target);
    this.built = buildStore(R);

    // hero cart + its items (ids match story.heroItems: 0-3 the lonely first items, 10-19 the ten that fly in)
    R.add(this.hero);
    const mk = (id: number, kind: number, ci: number) => { const g = makeProduct(kind, ci); g.visible = false; R.add(g); this.items.set(id, g); };
    INIT_SLOTS.forEach((_, i) => mk(i, [0, 3, 4, 5][i], i * 2 + 1));
    FILL_SLOTS.forEach((_, i) => mk(10 + i, (i * 5 + 1) % 6, i * 3 + 2));

    // a nest of old small carts for scale (they are what "doubled" is measured against)
    CORRAL.forEach((p, i) => { const g = makeCart(false); g.position.set(p[0], p[1] + 0.01 * i, p[2]); g.rotation.y = HERO_YAW; R.add(g); this.corral.push(g); });
    // the exit queue: overflowing big carts (shot 5)
    QUEUE.forEach((p, i) => { const g = makeHeavyCart(31 + i * 7, 26); g.position.set(p[0] + (i % 2 ? 0.1 : -0.1), p[1], p[2]); g.rotation.y = HERO_YAW + (i - 1) * 0.06; g.visible = false; R.add(g); this.queue.push(g); });

    // plaza dressing behind the camera: produce tables
    [[-6, 1.0, 0.4], [6.2, 2.6, -0.3], [-9, -3, 0.9], [8.6, -3.4, -0.6]].forEach(([x, z, ry], i) => { const g = makeProduceTable(5 + i); g.position.set(x, 0, z); g.rotation.y = ry; R.add(g); });

    // foreground framing objects (blurred by the lens): visible only inside their frame range
    for (const g of FOREGROUND) {
      const o = g.kind === "produce" ? makeProduceTable(7) : makeBasketStack();
      o.position.set(...g.pos); o.rotation.y = g.yaw ?? 0; o.visible = false; R.add(o); this.fgs.push({ a: g.a, b: g.b, o });
    }
  }

  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  /** camera-relative sun, frozen per shot: az measured from the shot's average view direction */
  private shotSun(id: number, s: ShotDef, L: LightPreset) {
    let v = this.sunCache.get(id);
    if (v) return v;
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) {
      const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1;
      fx += x / n; fz += z / n;
    }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(L.az), el = THREE.MathUtils.degToRad(L.el);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az); // screen right = (-fz, fx)
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = LIGHTS[s.light];
    // ---- camera ----
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.2; cam.far = 600; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    // ---- light rig: camera-relative sun frozen per shot, two-tone uniforms, shadow fit ----
    const sunDir = this.shotSun(id, s, L);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.5 + 8, 14, 40);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 120; sc.far = 340; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    this.fill.intensity = 0;
    const K = LOOK[s.light];
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...K.bounce); TONE.uSat.value = K.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- haze (indoors: pale aerial perspective so the aisle recedes) ----
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = this.fog.color.clone();
    (this.built.glass as THREE.Mesh).material = s.light === "golden" ? this.built.glassMats.golden : this.built.glassMats.day;

    // ---- hero cart, items, queue, foreground ----
    const hc = heroCart(id);
    this.hero.visible = !!hc;
    if (hc) {
      this.hero.position.set(...hc.pos); this.hero.rotation.set(0, hc.yaw, 0);
      this.hero.scale.set(...cartScale(id, t));
    }
    for (const g of this.items.values()) g.visible = false;
    for (const it of heroItems(id, t)) {
      const g = this.items.get(it.id);
      if (!g) continue;
      g.visible = true; g.position.set(...it.pos); g.rotation.set(it.roll * 0.4, it.yaw, it.roll * 0.3); g.scale.setScalar(it.scale);
    }
    for (const q of this.queue) q.visible = id === 5;
    for (const g of this.fgs) g.o.visible = f >= g.a && f < g.b && g.a < s.b && g.b > s.a;

    // ---- cast + effects ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const st = stage(id, t, { pos: cam.position, right });
    this.frustum.setFromProjectionMatrix(this.m4.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    const tint = s.light === "golden" ? "#ffcf9e" : "#ffffff";
    let ai = 0;
    const used: Actor[] = [];
    for (const p of st.places) {
      const sc2 = p.scale ?? 1;
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y + 1.1 * sc2, p.z), 3.5))) continue;
      const a = this.actor(ai++);
      const [w, h, k] = p.size ?? [300, 500, 0.5];
      a.r = this.pool.req(p.key, w, h, k, p.draw);
      a.mesh.visible = true;
      a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, p.yaw ?? Math.atan2(cam.position.x - p.x, cam.position.z - p.z), p.roll ?? 0);
      a.mesh.scale.set(p.mirror ? -sc2 : sc2, sc2, sc2);
      if (a.mat.emissiveMap) a.mat.emissive.set(tint);
      a.mesh.castShadow = L.actorShadow; // day: soft contact blobs instead; golden: real card shadows
      used.push(a);
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const fused: Fx[] = [];
    for (const p of st.fx) {
      if (!this.frustum.intersectsSphere(this.sph.set(this.v.set(p.x, p.y, p.z), Math.max(p.w, p.h)))) continue;
      const e = this.fx(fi++);
      e.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw);
      e.use(!!p.soft);
      e.mesh.visible = true;
      e.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e.mesh.quaternion.copy(cam.quaternion); e.mesh.rotateZ(p.rot ?? 0); }
      e.mesh.scale.set(p.w, p.h, 1);
      fused.push(e);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (const a of used) a.bind();
    for (const e of fused) e.bind();
    return focus;
  }
}
