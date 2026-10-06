// 브라우저 전투: 조준, 타격 판정, 투사체, 이펙트
import * as THREE from 'three';
import { itemDef, weaponStats } from './items.js';
import { G } from './utils.js';

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
      else if (it.kind === 'smoke') { it.m.position.y += dt * 1.5; it.m.scale.multiplyScalar(1 + dt * 0.6); it.m.material.opacity = 0.7 * k; }
      else it.m.material.opacity = k;
      if (it.t <= 0) { this.scene.remove(it.m); it.m.material.dispose(); this.items.splice(i, 1); }
    }
    if (this.flashT > 0) { this.flashT -= dt; this.flash.intensity = Math.max(0, this.flashT / 0.25) * 40; }
  }
}

// 수직 원기둥과 광선의 교차 (가장 가까운 t)
function rayCylinder(o, d, base, r, h) {
  const ox = o.x - base.x, oz = o.z - base.z;
  const a = d.x * d.x + d.z * d.z;
  if (a < 1e-8) return null;
  const b = 2 * (ox * d.x + oz * d.z), c = ox * ox + oz * oz - r * r;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const s = Math.sqrt(disc);
  for (const t of [(-b - s) / (2 * a), (-b + s) / (2 * a)]) {
    if (t < 0) continue;
    const y = o.y + d.y * t;
    if (y >= base.y && y <= base.y + h) return t;
  }
  return null;
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
    if (g.mode === 'city') for (const car of g.traffic.cars) {
      if (car === g.player.inCar || car.mode === 'wreck' || car.mode === 'gone') continue;
      if (car.pos.distanceTo(g.player.pos) > 150) continue;
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
    if (['melee', 'gun', 'throw', 'launcher'].includes(d.cat)) return { id: it.id, gems: it.gems || [], item: it };
    return null;
  }

  // 마우스 누름
  trigger(down) {
    this.firing = down;
    if (down) this.tryFire();
  }

  update(dt) {
    this.cool -= dt;
    if (this.firing) {
      const w = this.selectedWeapon();
      const car = this.g.player.inCar;
      if ((w && itemDef(w.id).auto) || (car && car.kind === 'heli')) this.tryFire();
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
    this.cool = s.rate;
    const p = g.player;
    // 공격 방향으로 몸 돌리기
    const { o, d } = this.aimRay();
    p.heading = Math.atan2(d.x, d.z);
    p.roach.root.rotation.y = p.heading;
    if (s.kind === 'melee') return this.melee(w, s);
    if (s.kind === 'hitscan') return this.shoot(w, s, o, d);
    if (s.kind === 'grenade') return this.throwGrenade(w, s, d);
    if (s.kind === 'rocket') return this.fireRocket(w, s, o, d);
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
      g.net.send({ t: 'hit', tt: t.tt, id: t.id, w: w.id, gems: w.gems });
      if (++n >= 3) break;
    }
  }

  shoot(w, s, o, d) {
    const g = this.g;
    g.player.roach.attack('shoot');
    const hand = this.handPos();
    const pellets = s.pellets || 1;
    const hits = new Map();
    for (let i = 0; i < pellets; i++) {
      const dd = d.clone();
      if (pellets > 1) { dd.x += (Math.random() - 0.5) * s.spread * 2; dd.y += (Math.random() - 0.5) * s.spread * 2; dd.z += (Math.random() - 0.5) * s.spread * 2; dd.normalize(); }
      const camDist = o.distanceTo(hand);
      const r = this.raycast(o, dd, s.range + camDist);
      this.fx.tracer(hand, r.point, s.tracer || '#fff59d', w.id === 'sniper' ? 1.5 : 1);
      if (i === 0) g.net.send({ t: 'fx', k: 'tracer', a: [hand.x, hand.y, hand.z], b: [r.point.x, r.point.y, r.point.z], c: s.tracer });
      if (r.target) { const k = r.target.tt + r.target.id; hits.set(k, { ...r.target, n: (hits.get(k)?.n || 0) + 1 }); }
    }
    for (const h of hits.values()) g.net.send({ t: 'hit', tt: h.tt, id: h.id, w: w.id, gems: w.gems, n: h.n });
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
  spawnProj(type, start, v, w, mine) {
    const color = type === 'grenade' ? '#558b2f' : type === 'ion' ? '#18ffff' : type === 'shell' ? '#ffab00' : '#ff7043';
    const m = new THREE.Mesh(G.sphereLow(), new THREE.MeshBasicMaterial({ color }));
    m.scale.setScalar(type === 'grenade' ? 0.15 : 0.22);
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
      if (pr.type === 'grenade') {
        pr.v.y -= 20 * dt;
        pr.pos.addScaledVector(pr.v, dt);
        if (pr.pos.y < ground + 0.15) { pr.pos.y = ground + 0.15; pr.v.y *= -0.4; pr.v.x *= 0.6; pr.v.z *= 0.6; }
        if (pr.t > 2.2) boom = true;
      } else {
        const step = pr.v.clone().multiplyScalar(dt);
        pr.pos.add(step); pr.traveled += step.length();
        if (pr.pos.y <= ground + 0.1 || pr.traveled > 160) boom = true;
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
    else if (m.k === 'boom') { this.fx.boom(v3(m.p), m.r || 5, m.small); if (!m.small) g.shake(Math.max(0, 1 - g.player.pos.distanceTo(v3(m.p)) / 40)); }
    else if (m.k === 'proj') this.spawnProj(m.type, v3(m.p), v3(m.v), { id: m.w }, false);
    else if (m.k === 'swing') { const p = g.players.list.get(m.pid); if (p && p.visible) { p.roach.attack('melee'); this.fx.slash(p.pos, p.heading); } }
    else if (m.k === 'dmgnum') {
      g.ui.floatText(v3(m.p), `${m.crit ? '💥' : ''}-${m.v}`, m.crit ? '#ffd600' : '#ff5252');
      if (m.pid !== undefined) { const p = g.players.list.get(m.pid); p?.roach.hurt(); }
    }
  }
}
