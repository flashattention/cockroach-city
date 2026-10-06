// 브라우저 전투: 조준, 타격 판정, 투사체, 이펙트
import * as THREE from 'three';
import { itemDef, weaponStats, ammoName, ITEMS, SHOPS } from './items.js';
import { G } from './utils.js';
import { levelStats } from './level.js';

const ELEMENT_COLOR = { fire: '#ff5722', ice: '#4fc3f7', thunder: '#ffee58', wind: '#a5d6a7', poison: '#9ccc65', holy: '#fff59d', dark: '#7e57c2' };
const BASE_SPREAD = { revolver: 0.012, deagle: 0.016, uzi: 0.05, mp5: 0.028, ak47: 0.035, scar: 0.02, m249: 0.045, barrett: 0.003, plasma_smg: 0.025, hunting_rifle: 0.006, pistol: 0.018, blaster: 0.015, rifle: 0.03, blaster_rifle: 0.026, minigun: 0.045, sniper: 0.012 };

const tmpV = new THREE.Vector3();

// ---------------- 이펙트 ----------------
export class FX {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.flash = new THREE.PointLight('#ffb74d', 0, 30, 1.5);
    scene.add(this.flash);
    this.flashT = 0;
  }

  tracer(a, b, color = '#fff59d', width = 1) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    if (len < 0.01) return;
    const m = new THREE.Mesh(G.cylLow(), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }));
    m.scale.set(0.03 * width, len, 0.03 * width);
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    this.scene.add(m);
    this.items.push({ m, t: 0.09, life: 0.09, kind: 'fade' });
    // 총구 불꽃
    const f = new THREE.Mesh(G.sphereLow(), new THREE.MeshBasicMaterial({ color: '#fff3e0', transparent: true, opacity: 0.9 }));
    f.scale.setScalar(0.15 * width); f.position.copy(a);
    this.scene.add(f);
    this.items.push({ m: f, t: 0.05, life: 0.05, kind: 'fade' });
  }

  boom(p, r = 5, small = false) {
    const ball = new THREE.Mesh(G.sphereLow(), new THREE.MeshBasicMaterial({ color: small ? '#ffcc80' : '#ff9100', transparent: true, opacity: 0.95, depthWrite: false }));
    ball.position.copy(p); ball.scale.setScalar(0.3);
    this.scene.add(ball);
    this.items.push({ m: ball, t: 0.5, life: 0.5, kind: 'boom', r });
    for (let i = 0; i < (small ? 3 : 8); i++) {
      const s = new THREE.Mesh(G.sphereLow(), new THREE.MeshToonMaterial({ color: '#616161', transparent: true, opacity: 0.7, depthWrite: false }));
      s.position.copy(p).add(new THREE.Vector3((Math.random() - 0.5) * r * 0.6, Math.random() * r * 0.3, (Math.random() - 0.5) * r * 0.6));
      s.scale.setScalar(r * 0.18);
      this.scene.add(s);
      this.items.push({ m: s, t: 1.6, life: 1.6, kind: 'smoke' });
    }
    if (!small) { this.flash.position.copy(p); this.flash.position.y += 2; this.flash.intensity = 40; this.flashT = 0.25; }
  }

  // 지그재그 번개
  bolt(a, b, color = '#ffee58') {
    const pts = [a.clone()];
    const n = 7;
    for (let i = 1; i < n; i++) { const q = a.clone().lerp(b, i / n); q.x += (Math.random() - 0.5) * 0.9; q.y += (Math.random() - 0.5) * 0.9; q.z += (Math.random() - 0.5) * 0.9; pts.push(q); }
    pts.push(b.clone());
    for (let i = 0; i < pts.length - 1; i++) this.tracer(pts[i], pts[i + 1], color, 2.2);
  }
  // 떠오르는 하트·반짝이
  hearts(a, b, emoji = '💗') {
    for (let i = 0; i < 6; i++) {
      const sp = makeEmojiSprite(emoji);
      sp.position.copy(a);
      this.scene.add(sp);
      const to = b ? b.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, 1.6 + Math.random() * 0.6, (Math.random() - 0.5) * 0.8)) : a.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 2 + Math.random(), (Math.random() - 0.5) * 2));
      this.items.push({ m: sp, t: 1.3 + i * 0.08, life: 1.3 + i * 0.08, kind: 'fly', from: a.clone().add(new THREE.Vector3(0, 1.4, 0)), to, delay: i * 0.08 });
    }
  }
  sparkle(p, color, n = 12, r = 1.5) {
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(G.sphereLow(), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false }));
      m.scale.setScalar(0.12);
      m.position.copy(p).add(new THREE.Vector3((Math.random() - 0.5) * r, Math.random() * r, (Math.random() - 0.5) * r));
      this.scene.add(m);
      this.items.push({ m, t: 0.9, life: 0.9, kind: 'smoke' });
    }
  }
  cloud(p, color) {
    for (let i = 0; i < 9; i++) {
      const s = new THREE.Mesh(G.sphereLow(), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false }));
      s.position.copy(p).add(new THREE.Vector3((Math.random() - 0.5) * 2.5, Math.random() * 1.2, (Math.random() - 0.5) * 2.5));
      s.scale.setScalar(0.7 + Math.random() * 0.5);
      this.scene.add(s);
      this.items.push({ m: s, t: 3.5, life: 3.5, kind: 'smoke' });
    }
  }

  slash(p, heading) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.05, 4, 16, Math.PI * 0.8), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.8, depthWrite: false }));
    m.position.copy(p); m.position.y += 1.1;
    m.rotation.set(Math.PI / 2, 0, -heading + Math.PI * 0.6);
    this.scene.add(m);
    this.items.push({ m, t: 0.15, life: 0.15, kind: 'fade' });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t -= dt;
      const k = Math.max(0, it.t / it.life);
      if (it.kind === 'boom') { it.m.scale.setScalar(0.3 + (1 - k) * it.r); it.m.material.opacity = k; }
      else if (it.kind === 'fly') {
        const u = Math.min(1, Math.max(0, (it.life - it.t - (it.delay || 0)) / (it.life - (it.delay || 0)) * 1.4));
        it.m.position.copy(it.from).lerp(it.to, u); it.m.position.y += Math.sin(u * Math.PI) * 0.8;
        it.m.material.opacity = Math.min(1, k * 2.5);
      } else if (it.kind === 'smoke') { it.m.position.y += dt * 1.5; it.m.scale.multiplyScalar(1 + dt * 0.6); it.m.material.opacity = 0.7 * k; }
      else it.m.material.opacity = k;
      if (it.t <= 0) { this.scene.remove(it.m); it.m.material.dispose(); this.items.splice(i, 1); }
    }
    if (this.flashT > 0) { this.flashT -= dt; this.flash.intensity = Math.max(0, this.flashT / 0.25) * 40; }
  }
}

const spriteCache = new Map();
function makeEmojiSprite(emoji) {
  let tex = spriteCache.get(emoji);
  if (!tex) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'); x.font = '50px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(emoji, 32, 36);
    tex = new THREE.CanvasTexture(c); spriteCache.set(emoji, tex);
  }
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.setScalar(0.6);
  return sp;
}

// 수직 원기둥과 광선의 교차 (가장 가까운 t)
function rayCylinder(o, d, base, r, h) {
  let best = null;
  const take = (t) => { if (t >= 0 && (best === null || t < best)) best = t; };
  // 옆면
  const ox = o.x - base.x, oz = o.z - base.z;
  const a = d.x * d.x + d.z * d.z;
  if (a > 1e-8) {
    const b = 2 * (ox * d.x + oz * d.z), c = ox * ox + oz * oz - r * r;
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const sq = Math.sqrt(disc);
      for (const t of [(-b - sq) / (2 * a), (-b + sq) / (2 * a)]) {
        const y = o.y + d.y * t;
        if (y >= base.y && y <= base.y + h) take(t);
      }
    }
  }
  // 윗면·아랫면 (하늘에서 내려다보고 쏠 때 머리 위로 맞는다)
  if (Math.abs(d.y) > 1e-6) {
    for (const cy of [base.y + h, base.y]) {
      const t = (cy - o.y) / d.y;
      const x = ox + d.x * t, z = oz + d.z * t;
      if (x * x + z * z <= r * r) take(t);
    }
  }
  return best;
}

// 이번 프레임에 움직인 선분이 대상에 닿았는지 (빠른 투사체가 건너뛰지 않게)
function segHits(a, b, t, pad) {
  const d = b.clone().sub(a);
  const L = d.length();
  if (L < 1e-6) return false;
  d.divideScalar(L);
  const base = { x: t.base.x, y: t.base.y - pad, z: t.base.z };
  const hit = rayCylinder(a, d, base, t.r + pad, t.h + pad * 2);
  return hit !== null && hit <= L;
}

function rayBox(o, d, b) {
  let tmin = 0, tmax = Infinity;
  for (const [k, mn, mx] of [['x', b.minX, b.maxX], ['y', -1, b.h ?? 10], ['z', b.minZ, b.maxZ]]) {
    if (Math.abs(d[k]) < 1e-6) { if (o[k] < mn || o[k] > mx) return null; continue; }
    let t1 = (mn - o[k]) / d[k], t2 = (mx - o[k]) / d[k];
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  return tmin;
}

// ---------------- 내 공격 ----------------
export class Combat {
  constructor(game) {
    this.g = game;
    this.fx = new FX(game.scene);
    this.cool = 0;
    this.projs = [];
    this.firing = false;
  }

  // 공격 대상 목록 (보이는 것만)
  targets() {
    const g = this.g, out = [];
    for (const c of g.sim.citizens) {
      if (!c.visible || c.mode === 'dead') continue;
      out.push({ tt: 'npc', id: c.id, base: c.roach.root.position, r: 0.55, h: c.roach.height });
    }
    for (const p of g.players.list.values()) {
      if (!p.visible || p.dead) continue;
      out.push({ tt: 'player', id: p.id, base: p.roach.root.position, r: 0.55, h: p.roach.height });
    }
    for (const u of g.units.list.values()) {
      if (!u.visible) continue;
      const big = u.kind === 'tank' || u.kind === 'heli';
      out.push({ tt: 'unit', id: u.id, base: u.obj.position, r: big ? 2.4 : 0.55, h: big ? 3 : 2 });
    }
    if (g.mode === 'city') for (const a of g.animals?.list || []) {
      if (!a.visible || !a.alive || a.def.livestock) continue;
      out.push({ tt: 'animal', id: a.id, base: a.pos, r: a.def.r, h: a.def.h });
    }
    if (g.mode === 'interior') for (const t of g.interior.targets || []) if (t.up) out.push({ tt: 'rtarget', id: t.id, base: t.obj.getWorldPosition(new THREE.Vector3()).setY(t.y0 - t.r), r: t.r, h: t.r * 2, rt: t });
    if (g.mode === 'city') for (const car of g.traffic.cars) {
      if (car === g.player.inCar || car.mode === 'wreck' || car.mode === 'gone') continue;
      if (car.pos.distanceTo(g.player.pos) > 600) continue;
      out.push({ tt: 'car', id: car.id, base: car.mesh.g.position, r: car.kind === 'bus' || car.kind === 'tank' || car.kind === 'heli' ? 2.4 : 1.6, h: 2.2 });
    }
    return out;
  }

  // 카메라 중앙 조준선이 가리키는 곳
  aimRay() {
    const cam = this.g.camera;
    const o = cam.position.clone();
    const d = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion).normalize();
    return { o, d };
  }

  raycast(o, d, range, skipSelf = true) {
    let best = null, bt = range;
    for (const t of this.targets()) {
      const hit = rayCylinder(o, d, t.base, t.r, t.h);
      if (hit !== null && hit < bt) { bt = hit; best = t; }
    }
    // 건물에 막힘
    if (this.g.mode === 'city') {
      for (const b of this.g.city.colliders) {
        if (b.small) continue;
        const t = rayBox(o, d, b);
        if (t !== null && t < bt) { bt = t; best = null; }
      }
    }
    void skipSelf;
    return { target: best, t: bt, point: o.clone().addScaledVector(d, bt) };
  }

  handPos() {
    const p = this.g.player;
    p.roach.root.updateMatrixWorld(true);
    return p.roach.hand.getWorldPosition(new THREE.Vector3());
  }

  selectedWeapon() {
    const it = this.g.inv.selected();
    if (!it) return { id: 'fist', gems: [] };
    const d = itemDef(it.id);
    if (['melee', 'gun', 'throw', 'launcher', 'wand'].includes(d.cat)) return { id: it.id, gems: it.gems || [], item: it };
    return null;
  }

  // 마우스 누름
  trigger(down) {
    const w = this.selectedWeapon();
    const d = w ? itemDef(w.id) : null;
    // 활: 누르고 있으면 시위를 당기고, 놓으면 쏜다
    if (d && d.kind === 'arrow' && !d.auto && !this.g.player.inCar) {
      if (down && !this.drawing && this.cool <= 0) this.drawing = { t: 0 };
      else if (!down && this.drawing) { const k = Math.min(1, this.drawing.t / 1.1); this.drawing = null; this.g.player.roach.drawK = 0; this.drawPower = k; this.tryFire(); this.drawPower = null; }
      return;
    }
    this.drawing = null;
    this.firing = down;
    if (down) this.tryFire();
  }
  // 상대 피해 보정 (활 당긴 정도 등)
  sendHit(t, w, extra = {}) {
    if (t.tt === 'rtarget') { this.g.hitRangeTarget?.(t.rt, extra.point); return; }
    const { point, ...rest } = extra;
    void point;
    this.g.net.send({ t: 'hit', tt: t.tt, id: t.id, w: w.id, gems: w.gems, ...rest });
  }

  update(dt) {
    this.cool -= dt;
    if (this.drawing) {
      this.drawing.t += dt;
      this.g.player.roach.drawK = Math.min(1, this.drawing.t / 1.1);
      this.g.ui.drawMeter(Math.min(1, this.drawing.t / 1.1));
    } else this.g.ui.drawMeter(null);
    if (this.firing) {
      const w = this.selectedWeapon();
      const car = this.g.player.inCar;
      // 연사 총·근접무기(주먹 포함)는 누르고 있으면 계속
      if ((w && (itemDef(w.id).auto || itemDef(w.id).kind === 'melee')) || (car && car.kind === 'heli')) this.tryFire();
    }
    this.updateProjs(dt);
    this.fx.update(dt);
  }

  tryFire() {
    if (this.cool > 0 || this.g.busy || this.g.dead) return;
    const g = this.g;
    const car = g.player.inCar;
    if (car) {
      if (car.kind === 'tank' || car.kind === 'heli') this.vehicleFire(car);
      return;
    }
    const w = this.selectedWeapon();
    if (!w) return;
    const s = weaponStats(w.id, w.gems);
    // 총과 활은 탄약이 있어야 쏠 수 있다
    if (s.ammo && !g.range) {
      if (g.inv.count(s.ammo) <= 0) {
        this.cool = 0.4;
        if (performance.now() - (this.noAmmoMsg || 0) > 2500) {
          this.noAmmoMsg = performance.now();
          const a = ITEMS[s.ammo];
          g.ui.toast(`${s.ammo === 'arrow' ? '🏹 화살이' : '🔫 총알이'} 없어요! ${SHOPS[a.shop]?.title || '상점'}에서 ${ammoName(s.ammo)}을(를) 사세요 (₩${a.price}/${a.pack}발)`);
        }
        return;
      }
      g.inv.consumeId(s.ammo, 1);
    }
    this.cool = s.rate;
    const p = g.player;
    // 공격 방향으로 몸 돌리기
    const { o, d } = this.aimRay();
    p.heading = Math.atan2(d.x, d.z);
    p.roach.root.rotation.y = p.heading;
    // 반동: 연사할수록 총구가 위로 솟고 좌우로 흔들린다 (조준하면 조금 덜)
    if (s.recoil) {
      const [up, side, shake] = s.recoil;
      const k = 1 - 0.35 * (p.aim || 0);
      const climb = 1 + Math.min(1.5, (this.burst = (performance.now() - (this.lastShot || 0) < 250 ? (this.burst || 0) + 1 : 0)) * 0.08);
      this.lastShot = performance.now();
      const dy = up * k * climb, dx = (Math.random() - 0.5) * 2 * side * k;
      p.cam.pitch -= dy; p.cam.yaw += dx;
      p.recoilBack = (p.recoilBack || 0) + dy * 0.6; // 일부는 천천히 돌아온다
      if (shake) g.shake(shake * k);
      p.roach.kick = Math.min(1, (p.roach.kick || 0) + up * 8);
    }
    if (s.kind === 'melee') return this.melee(w, s);
    if (s.kind === 'hitscan') return this.shoot(w, s, o, d);
    if (s.kind === 'grenade') return this.throwGrenade(w, s, d);
    if (s.kind === 'rocket') return this.fireRocket(w, s, o, d);
    if (s.kind === 'arrow') return this.shootArrow(w, s, o, d);
    if (s.kind === 'magic') return this.castMagic(w, s, o, d);
  }

  // ---------------- 마법 ----------------
  castMagic(w, s, o, d) {
    const g = this.g, p = g.player;
    if ((g.mana ?? 0) < s.mana) { this.cool = 0.3; g.ui.toast('💧 마나가 부족해요! 잠시 기다리거나 마나 물약을 마셔요'); return; }
    g.mana -= s.mana;
    g.questEvent?.('magic');
    p.roach.cast();
    const color = ELEMENT_COLOR[s.element];
    const hand = this.handPos();
    const el = s.element;
    if (el === 'holy') {
      this.fx.sparkle(p.pos.clone().setY(p.pos.y + 0.5), color, 24, 3);
      g.net.send({ t: 'fx', k: 'sparkle', p: [p.pos.x, p.pos.y + 0.5, p.pos.z], c: color });
      g.net.send({ t: 'holy', w: w.id });
      return;
    }
    if (el === 'wind') {
      const fwd = new THREE.Vector3(Math.sin(p.heading), 0, Math.cos(p.heading));
      this.fx.cloud(p.pos.clone().addScaledVector(fwd, 2.5), '#e8f5e9');
      g.net.send({ t: 'fx', k: 'cloud', p: [p.pos.x + fwd.x * 2.5, p.pos.y, p.pos.z + fwd.z * 2.5], c: '#e8f5e9' });
      let n = 0;
      for (const t of this.targets()) {
        if (t.tt === 'car') continue;
        tmpV.subVectors(t.base, p.pos); tmpV.y = 0;
        const dist = tmpV.length();
        if (dist > s.range || dist < 0.01 || tmpV.normalize().dot(fwd) < 0.5) continue;
        this.sendHit(t, w);
        if (++n >= 5) break;
      }
      return;
    }
    if (el === 'thunder') {
      const r = this.raycast(o, d, s.range + o.distanceTo(hand));
      this.fx.bolt(hand, r.point, color);
      g.net.send({ t: 'fx', k: 'bolt', a: [hand.x, hand.y, hand.z], b: [r.point.x, r.point.y, r.point.z], c: color });
      if (!r.target) return;
      this.sendHit(r.target, w, { point: r.point });
      // 주변 2명에게 연쇄
      let from = r.target.base.clone().setY(r.target.base.y + 1);
      const hitIds = new Set([r.target.tt + r.target.id]);
      for (let i = 0; i < 2; i++) {
        let best = null, bd = 7;
        for (const t of this.targets()) {
          if (t.tt === 'car' || hitIds.has(t.tt + t.id)) continue;
          const dd = t.base.distanceTo(from);
          if (dd < bd) { bd = dd; best = t; }
        }
        if (!best) break;
        hitIds.add(best.tt + best.id);
        const to = best.base.clone().setY(best.base.y + 1);
        this.fx.bolt(from, to, color);
        g.net.send({ t: 'fx', k: 'bolt', a: [from.x, from.y, from.z], b: [to.x, to.y, to.z], c: color });
        this.sendHit(best, w);
        from = to;
      }
      return;
    }
    // 투사체 마법 (화염구, 얼음 화살, 독구름, 암흑구)
    const r = this.raycast(o, d, s.range + 10);
    const start = hand.clone().addScaledVector(d, 0.6);
    const speed = { fire: 34, ice: 46, poison: 30, dark: 16 }[el] || 30;
    const v = r.point.clone().sub(start).normalize().multiplyScalar(speed);
    const type = 'm_' + el;
    this.spawnProj(type, start, v, w, true, r.target);
    g.net.send({ t: 'fx', k: 'proj', type, p: [start.x, start.y, start.z], v: [v.x, v.y, v.z], w: w.id });
  }

  melee(w, s) {
    const g = this.g, p = g.player;
    p.roach.attack('melee');
    this.fx.slash(p.pos, p.heading);
    g.net.send({ t: 'fx', k: 'swing' });
    const fwd = new THREE.Vector3(Math.sin(p.heading), 0, Math.cos(p.heading));
    let n = 0;
    for (const t of this.targets()) {
      if (t.tt === 'car') continue;
      tmpV.subVectors(t.base, p.pos); tmpV.y = 0;
      const dist = tmpV.length();
      if (dist > s.range + t.r || dist < 0.01) continue;
      if (tmpV.normalize().dot(fwd) < 0.45) continue;
      this.sendHit(t, w);
      if (++n >= 3) break;
    }
  }

  shoot(w, s, o, d) {
    const g = this.g;
    g.player.roach.attack('shoot');
    const hand = this.handPos();
    const pellets = s.pellets || 1;
    const hits = new Map();
    // 명중률: 레벨이 높을수록, 조준(우클릭) 중일수록 덜 퍼진다
    const acc = levelStats(g.stats?.level || 1).acc * (1 - 0.7 * (g.player.aim || 0));
    const base = (BASE_SPREAD[w.id] || 0.02) * acc;
    for (let i = 0; i < pellets; i++) {
      const dd = d.clone();
      const sp = pellets > 1 ? s.spread * Math.max(0.5, acc) : base;
      dd.x += (Math.random() - 0.5) * sp * 2; dd.y += (Math.random() - 0.5) * sp * 2; dd.z += (Math.random() - 0.5) * sp * 2; dd.normalize();
      const camDist = o.distanceTo(hand);
      const r = this.raycast(o, dd, s.range + camDist);
      this.fx.tracer(hand, r.point, s.tracer || '#fff59d', w.id === 'sniper' ? 1.5 : 1);
      if (i === 0) g.net.send({ t: 'fx', k: 'tracer', a: [hand.x, hand.y, hand.z], b: [r.point.x, r.point.y, r.point.z], c: s.tracer });
      if (r.target) { const k = r.target.tt + r.target.id; hits.set(k, { ...r.target, n: (hits.get(k)?.n || 0) + 1, point: r.point }); }
    }
    for (const h of hits.values()) this.sendHit(h, w, h.tt === 'rtarget' ? { point: h.point } : { n: h.n });
  }

  throwGrenade(w, s, d) {
    const g = this.g;
    if (!g.inv.consume(w.item.uid)) return;
    g.player.roach.attack('throw');
    const start = this.handPos();
    const v = d.clone().multiplyScalar(15); v.y += 6;
    this.spawnProj('grenade', start, v, w, true);
    g.net.send({ t: 'fx', k: 'proj', type: 'grenade', p: [start.x, start.y, start.z], v: [v.x, v.y, v.z], w: w.id });
  }

  fireRocket(w, s, o, d) {
    const g = this.g;
    g.player.roach.attack('shoot');
    const start = this.handPos().addScaledVector(d, 1.0);
    // 조준점으로 향하도록
    const r = this.raycast(o, d, s.range + 10);
    const dir = r.point.clone().sub(start).normalize();
    const v = dir.multiplyScalar(w.id === 'ion_cannon' ? 55 : 40);
    this.spawnProj(w.id === 'ion_cannon' ? 'ion' : 'rocket', start, v, w, true);
    g.net.send({ t: 'fx', k: 'proj', type: w.id === 'ion_cannon' ? 'ion' : 'rocket', p: [start.x, start.y, start.z], v: [v.x, v.y, v.z], w: w.id });
  }

  shootArrow(w, s, o, d) {
    const g = this.g;
    g.player.roach.attack('shoot');
    const start = this.handPos().addScaledVector(d, 0.6);
    const r = this.raycast(o, d, s.range + 10);
    // 덜 당기면 힘없이 바로 앞에 떨어지고, 끝까지 당기면 멀리 강하게
    const k = this.drawPower ?? 1;
    const v = r.point.clone().sub(start).normalize().multiplyScalar(8 + 46 * k);
    v.y += 1.2 * k;
    w = { ...w, pw: 0.25 + 0.95 * k };
    this.spawnProj('arrow', start, v, w, true);
    g.net.send({ t: 'fx', k: 'proj', type: 'arrow', p: [start.x, start.y, start.z], v: [v.x, v.y, v.z], w: w.id });
  }

  vehicleFire(car) {
    const g = this.g;
    this.cool = car.kind === 'tank' ? 2.2 : 0.8;
    const { o, d } = this.aimRay();
    const r = this.raycast(o, d, 200);
    const start = car.pos.clone();
    if (car.kind === 'tank') {
      const yaw = car.heading + (car.turret || 0);
      start.add(new THREE.Vector3(Math.sin(yaw) * 3.8, 2.0, Math.cos(yaw) * 3.8));
    } else start.add(new THREE.Vector3(Math.sin(car.heading) * 2.5, 0.8, Math.cos(car.heading) * 2.5));
    const v = r.point.clone().sub(start).normalize().multiplyScalar(60);
    this.spawnProj('shell', start, v, { id: 'rpg', gems: [], vehicle: car.kind }, true);
    g.net.send({ t: 'fx', k: 'proj', type: 'shell', p: [start.x, start.y, start.z], v: [v.x, v.y, v.z] });
  }

  // 투사체 (내 것이면 폭발 시 서버에 알림)
  spawnProj(type, start, v, w, mine, homing = null) {
    const color = type.startsWith('m_') ? ELEMENT_COLOR[type.slice(2)] : type === 'grenade' ? '#558b2f' : type === 'ion' ? '#18ffff' : type === 'shell' ? '#ffab00' : '#ff7043';
    let m;
    if (type.startsWith('m_')) {
      m = new THREE.Group();
      const core = new THREE.Mesh(G.sphereLow(), new THREE.MeshBasicMaterial({ color: '#ffffff' })); core.scale.setScalar(0.14); m.add(core);
      const glow = new THREE.Mesh(G.sphereLow(), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
      glow.scale.setScalar(type === 'm_dark' ? 0.55 : 0.32); m.add(glow);
      m.position.copy(start);
      this.g.scene.add(m);
      this.projs.push({ type, pos: start.clone(), v: v.clone(), m, w, mine, t: 0, loc: this.g.loc(), traveled: 0, homing, color });
      return;
    }
    if (type === 'arrow') {
      m = new THREE.Group();
      const shaft = new THREE.Mesh(G.cylLow(), new THREE.MeshBasicMaterial({ color: '#8d6e63' })); shaft.scale.set(0.025, 0.9, 0.025); m.add(shaft);
      const tip = new THREE.Mesh(G.cone(), new THREE.MeshBasicMaterial({ color: '#cfd8dc' })); tip.scale.set(0.06, 0.15, 0.06); tip.position.y = 0.5; m.add(tip);
      const fl = new THREE.Mesh(G.box(), new THREE.MeshBasicMaterial({ color: '#ffffff' })); fl.scale.set(0.12, 0.15, 0.01); fl.position.y = -0.4; m.add(fl);
    } else {
      m = new THREE.Mesh(G.sphereLow(), new THREE.MeshBasicMaterial({ color }));
      m.scale.setScalar(type === 'grenade' ? 0.15 : 0.22);
    }
    m.position.copy(start);
    this.g.scene.add(m);
    this.projs.push({ type, pos: start.clone(), v: v.clone(), m, w, mine, t: 0, loc: this.g.loc(), traveled: 0 });
  }

  updateProjs(dt) {
    const g = this.g;
    for (let i = this.projs.length - 1; i >= 0; i--) {
      const pr = this.projs[i];
      pr.t += dt;
      let boom = false;
      const ground = g.mode === 'city' ? g.city.groundY(pr.pos.x, pr.pos.z) : 0.1;
      if (pr.type.startsWith('m_')) {
        // 암흑구는 조준한 대상을 따라간다
        if (pr.homing && pr.type === 'm_dark') {
          const want = pr.homing.base.clone().setY(pr.homing.base.y + 1).sub(pr.pos).normalize().multiplyScalar(pr.v.length());
          pr.v.lerp(want, Math.min(1, dt * 2.5));
        }
        const step = pr.v.clone().multiplyScalar(dt);
        const prev = pr.pos.clone();
        pr.pos.add(step); pr.traveled += step.length();
        pr.m.position.copy(pr.pos);
        if (Math.random() < 0.6) { this.fx.sparkle(pr.pos, pr.color, 1, 0.3); }
        let hit = null, stop = pr.pos.y <= ground + 0.1 || pr.traveled > (pr.w.id ? (itemDef(pr.w.id).range || 60) + 10 : 70);
        if (!stop && g.mode === 'city') for (const b of g.city.colliders) {
          if (!b.small && pr.pos.x > b.minX && pr.pos.x < b.maxX && pr.pos.z > b.minZ && pr.pos.z < b.maxZ && pr.pos.y < (b.h ?? 10)) { stop = true; break; }
        }
        if (!stop && pr.t > 0.05) for (const t of this.targets()) {
          if (t.tt === 'car') continue;
          if (segHits(prev, pr.pos, t, 0.35)) { hit = t; stop = true; break; }
        }
        if (stop) {
          g.scene.remove(pr.m);
          this.projs.splice(i, 1);
          const el = pr.type.slice(2);
          if (el === 'fire' || el === 'dark') {
            if (pr.mine) {
              if (hit?.tt === 'rtarget') this.sendHit(hit, pr.w, { point: pr.pos.clone() });
              g.net.send({ t: 'explode', x: pr.pos.x, y: pr.pos.y, z: pr.pos.z, loc: pr.loc, w: pr.w.id, gems: pr.w.gems });
            } else this.fx.boom(pr.pos, el === 'dark' ? 2.5 : 3.5, true);
          } else {
            if (el === 'poison') this.fx.cloud(pr.pos, '#9ccc65');
            else this.fx.sparkle(pr.pos, pr.color, 14, 1.2);
            if (pr.mine && hit) this.sendHit(hit, pr.w, { point: pr.pos.clone() });
          }
        }
        continue;
      }
      if (pr.type === 'arrow') {
        pr.v.y -= (pr.w.pw && pr.w.pw < 0.6 ? 14 : 6) * dt;
        const step = pr.v.clone().multiplyScalar(dt);
        const prev = pr.pos.clone();
        pr.pos.add(step); pr.traveled += step.length();
        pr.m.position.copy(pr.pos);
        pr.m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pr.v.clone().normalize());
        let stop = pr.pos.y <= ground + 0.05 || pr.traveled > Math.max(130, (itemDef(pr.w.id).range || 130) * 1.1);
        if (!stop && g.mode === 'city') for (const b of g.city.colliders) {
          if (!b.small && pr.pos.x > b.minX && pr.pos.x < b.maxX && pr.pos.z > b.minZ && pr.pos.z < b.maxZ && pr.pos.y < (b.h ?? 10)) { stop = true; break; }
        }
        if (!stop && pr.mine && pr.t > 0.03) for (const t of this.targets()) {
          if (t.tt === 'car') continue;
          if (segHits(prev, pr.pos, t, 0.25)) {
            this.sendHit(t, pr.w, t.tt === 'rtarget' ? { point: pr.pos.clone() } : { pw: pr.w.pw });
            stop = true; pr.hitTarget = true; break;
          }
        }
        if (stop) {
          this.projs.splice(i, 1);
          // 벽이나 땅에 꽂힌 화살은 잠시 남는다
          if (pr.hitTarget) g.scene.remove(pr.m);
          else setTimeout(() => g.scene.remove(pr.m), 8000);
        }
        continue;
      }
      if (pr.type === 'grenade') {
        pr.v.y -= 20 * dt;
        pr.pos.addScaledVector(pr.v, dt);
        if (pr.pos.y < ground + 0.15) { pr.pos.y = ground + 0.15; pr.v.y *= -0.4; pr.v.x *= 0.6; pr.v.z *= 0.6; }
        if (pr.t > 2.2) boom = true;
      } else {
        const step = pr.v.clone().multiplyScalar(dt);
        pr.pos.add(step); pr.traveled += step.length();
        if (pr.pos.y <= ground + 0.1 || pr.traveled > Math.max(160, pr.w.id ? (itemDef(pr.w.id).range || 160) : 200)) boom = true;
        if (!boom && g.mode === 'city') for (const b of g.city.colliders) {
          if (!b.small && pr.pos.x > b.minX && pr.pos.x < b.maxX && pr.pos.z > b.minZ && pr.pos.z < b.maxZ && pr.pos.y < (b.h ?? 10)) { boom = true; break; }
        }
        if (!boom && pr.mine) for (const t of this.targets()) {
          if (pr.t < 0.08) break;
          const dx = pr.pos.x - t.base.x, dz = pr.pos.z - t.base.z;
          if (Math.hypot(dx, dz) < t.r + 0.4 && pr.pos.y > t.base.y - 0.3 && pr.pos.y < t.base.y + t.h + 0.3) { boom = true; break; }
        }
        // 연기 꼬리
        if (Math.random() < 0.5) {
          const s = new THREE.Mesh(G.sphereLow(), new THREE.MeshBasicMaterial({ color: '#bdbdbd', transparent: true, opacity: 0.5, depthWrite: false }));
          s.position.copy(pr.pos); s.scale.setScalar(0.25);
          g.scene.add(s);
          this.fx.items.push({ m: s, t: 0.5, life: 0.5, kind: 'smoke' });
        }
      }
      pr.m.position.copy(pr.pos);
      if (boom) {
        g.scene.remove(pr.m);
        this.projs.splice(i, 1);
        if (pr.mine) g.net.send({ t: 'explode', x: pr.pos.x, y: pr.pos.y, z: pr.pos.z, loc: pr.loc, w: pr.w.id, gems: pr.w.gems, vehicle: pr.w.vehicle });
        else this.fx.boom(pr.pos, 4);
      }
    }
  }

  // 다른 플레이어의 연출
  remoteFx(m) {
    const g = this.g;
    if (m.loc !== undefined && m.loc !== g.loc()) return;
    const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);
    if (m.k === 'tracer') this.fx.tracer(v3(m.a), v3(m.b), m.c || '#fff59d', m.w || 1);
    else if (m.k === 'boom') { this.fx.boom(v3(m.p), m.r || 5, m.small); if (!m.small && g.player) g.shake(Math.max(0, 1 - g.player.pos.distanceTo(v3(m.p)) / 40)); }
    else if (m.k === 'proj') this.spawnProj(m.type, v3(m.p), v3(m.v), { id: m.w }, false);
    else if (m.k === 'bolt') this.fx.bolt(v3(m.a), v3(m.b), m.c);
    else if (m.k === 'sparkle') this.fx.sparkle(v3(m.p), m.c || '#fff59d', 20, 3);
    else if (m.k === 'cloud') this.fx.cloud(v3(m.p), m.c || '#e8f5e9');
    else if (m.k === 'hearts') { const a = v3(m.a), b = m.b ? v3(m.b) : null; this.fx.hearts(a, b, m.e || '💗'); const p = g.players.list.get(m.pid); p?.roach.flirt(); }
    else if (m.k === 'eat') { const p = g.players.list.get(m.pid); if (p) p.roach.eat(m.m, m.prop, Math.min(6, +m.d || 3)); }
    else if (m.k === 'swing') { const p = g.players.list.get(m.pid); if (p && p.visible) { p.roach.attack('melee'); this.fx.slash(p.pos, p.heading); } }
    else if (m.k === 'dmgnum') {
      g.ui.floatText(v3(m.p), `${m.crit ? '💥' : ''}-${m.v}`, m.crit ? '#ffd600' : '#ff5252');
      if (m.pid !== undefined) { const p = g.players.list.get(m.pid); p?.roach.hurt(); }
    }
  }
}
