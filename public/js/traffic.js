import * as THREE from 'three';
import { GRID, roadC, LANE_OFF, ASPHALT_HALF, HALF } from './config.js';
import { toon, box, cyl, sph, RNG, angleLerp, signMesh } from './utils.js';

const STOP = ASPHALT_HALF + 1.6; // 교차로 중심 → 정지선
const CAR_COLORS = ['#ff8a80', '#80d8ff', '#b9f6ca', '#ffe57f', '#ea80fc', '#ffab91', '#a7ffeb', '#ffffff', '#cfd8dc', '#f48fb1'];

const node = (i, j) => new THREE.Vector3(roadC(i), 0, roadC(j));

const OCC_COLORS = ['#8a5634', '#9b6038', '#7a4a2c', '#a86b3e', '#6e3f25', '#b07945', '#ff9fb2', '#7ec8a9'];
const VEHICLE = {
  car: { len: 4, radius: 1.6, hp: 150, max: 13 },
  taxi: { len: 4, radius: 1.6, hp: 150, max: 13 },
  police: { len: 4, radius: 1.6, hp: 200, max: 15 },
  bus: { len: 8.5, radius: 2.4, hp: 400, max: 8 },
  tank: { len: 5.5, radius: 2.3, hp: 1500, max: 8 },
  heli: { len: 7, radius: 2.4, hp: 700, max: 22 },
};
export const vehicleInfo = (kind) => VEHICLE[kind] || VEHICLE.car;

// 차 안에 앉아 있는 작은 바퀴벌레 (창문으로 보임)
function miniRoach(parent, color, x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g);
  sph(g, 0.22, 0.28, 0.2, color, 0, 0, 0, { low: true });
  sph(g, 0.24, 0.22, 0.22, color, 0, 0.36, 0.02, { low: true });
  for (const sx of [-1, 1]) {
    sph(g, 0.08, 0.09, 0.05, '#ffffff', sx * 0.09, 0.4, 0.19, { low: true, cast: false });
    sph(g, 0.045, 0.05, 0.03, '#1d1410', sx * 0.09, 0.39, 0.23, { low: true, cast: false });
    const ant = cyl(g, 0.012, 0.3, '#3e2723', sx * 0.08, 0.68, 0.05, { low: true, cast: false });
    ant.rotation.z = -sx * 0.4;
  }
  return g;
}

export function makeCarMesh(kind, color, occColors = []) {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const glassMat = new THREE.MeshToonMaterial({ color: '#bfe9ff', transparent: true, opacity: 0.25, depthWrite: false });
  const seats = [];
  const occ = [];
  const info = vehicleInfo(kind);
  if (kind === 'tank') {
    box(body, 3.0, 1.1, 5.2, '#556b2f', 0, 1.0, 0);
    for (const sx of [-1, 1]) {
      box(body, 0.7, 0.9, 5.6, '#263238', sx * 1.7, 0.6, 0);
      for (let i = 0; i < 5; i++) cyl(body, 0.38, 0.72, '#37474f', sx * 1.7, 0.5, -2 + i, { rz: Math.PI / 2, low: true });
    }
    const turret = new THREE.Group(); turret.position.set(0, 1.6, -0.2); body.add(turret);
    sph(turret, 1.2, 0.6, 1.4, '#4a5d23', 0, 0.1, 0);
    cyl(turret, 0.14, 3.0, '#33401a', 0, 0.25, 2.1, { rx: Math.PI / 2 });
    cyl(turret, 0.35, 0.1, '#33401a', 0, 0.7, -0.4);
    seats.push(new THREE.Vector3(0, 2.25, -0.6));
    return { g, body, turret, seats, occ, glass: null, ...info };
  }
  if (kind === 'heli') {
    sph(body, 1.3, 1.2, 2.2, color, 0, 1.6, 0.2);
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), glassMat);
    bubble.scale.set(1.05, 0.9, 1.1); bubble.position.set(0, 1.85, 1.4); body.add(bubble);
    cyl(body, 0.28, 4.2, color, 0, 1.9, -2.8, { rx: Math.PI / 2 });
    box(body, 0.1, 1.2, 0.8, color, 0, 2.4, -4.8);
    const tail = new THREE.Group(); tail.position.set(0.15, 2.4, -4.9); body.add(tail);
    box(tail, 0.05, 1.4, 0.16, '#212121', 0, 0, 0);
    const rotor = new THREE.Group(); rotor.position.set(0, 3.0, 0.2); body.add(rotor);
    cyl(rotor, 0.15, 0.4, '#212121', 0, -0.2, 0);
    for (let i = 0; i < 4; i++) { const bl = box(rotor, 0.3, 0.05, 5.5, '#263238', 0, 0, 0); bl.rotation.y = i * Math.PI / 4 * 2; bl.position.set(0, 0, 0); }
    for (const sx of [-1, 1]) {
      box(body, 0.1, 0.1, 3.2, '#424242', sx * 0.9, 0.1, 0.3);
      for (const sz of [-0.6, 1.2]) box(body, 0.08, 0.5, 0.08, '#424242', sx * 0.9, 0.35, sz);
      box(body, 0.3, 0.3, 1.2, '#37474f', sx * 1.35, 1.2, 0.6);
    }
    seats.push(new THREE.Vector3(0, 1.15, 1.2));
    return { g, body, rotor, tail, seats, occ, glass: bubble, ...info };
  }
  if (kind === 'bus') {
    box(body, 2.5, 1.0, 8, color, 0, 1.0, 0);
    box(body, 2.5, 0.25, 8, color, 0, 3.0, 0);
    for (const [x, z] of [[1.2, 3.9], [-1.2, 3.9], [1.2, -3.9], [-1.2, -3.9], [1.2, 0], [-1.2, 0]]) box(body, 0.12, 1.5, 0.12, color, x, 2.2, z);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(2.45, 1.5, 7.9), glassMat); gl.position.set(0, 2.2, 0); body.add(gl);
    box(body, 2.55, 0.3, 8.05, '#ffffff', 0, 0.55, 0);
    for (const sx of [-1, 1]) for (const sz of [-2.8, 2.8]) cyl(body, 0.55, 0.35, '#263238', sx * 1.15, 0.55, sz, { rz: Math.PI / 2 });
    const s = signMesh('바퀴 시내버스', '🚌', 3, '#ffffff', '#1565c0'); s.position.set(0, 3.3, 4.03); body.add(s);
    const pos = [[0.6, 3]];
    for (let i = 0; i < 4; i++) for (const sx of [-0.6, 0.6]) pos.push([sx, 1.4 - i * 1.6]);
    for (const [x, z] of pos) { box(body, 0.6, 0.3, 0.6, '#455a64', x, 1.55, z); seats.push(new THREE.Vector3(x, 1.75, z)); }
    for (let i = 0; i < seats.length; i++) { const r = miniRoach(body, occColors[i % occColors.length] || OCC_COLORS[i % 8], seats[i].x, seats[i].y + 0.25, seats[i].z); r.visible = false; occ.push(r); }
    return { g, body, seats, occ, glass: gl, ...info };
  }
  // 일반 승용차: 유리창 너머로 운전자와 동승자가 보인다
  box(body, 2.0, 0.7, 3.8, color, 0, 0.65, 0);
  box(body, 1.95, 0.25, 1.1, color, 0, 1.05, 1.3);
  box(body, 1.95, 0.25, 0.7, color, 0, 1.05, -1.55);
  for (const [x, z] of [[0.92, 0.75], [-0.92, 0.75], [0.92, -1.15], [-0.92, -1.15]]) box(body, 0.1, 0.8, 0.1, color, x, 1.42, z);
  box(body, 1.95, 0.12, 2.05, color, 0, 1.86, -0.2);
  const gl = new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.72, 1.95), glassMat);
  gl.position.set(0, 1.42, -0.2); gl.renderOrder = 2; body.add(gl);
  for (const [x, z] of [[0.45, 0.25], [-0.45, 0.25], [0.45, -0.75], [-0.45, -0.75]]) {
    box(body, 0.6, 0.15, 0.6, '#455a64', x, 1.0, z);
    box(body, 0.6, 0.6, 0.12, '#455a64', x, 1.3, z - 0.32);
    seats.push(new THREE.Vector3(x, 1.1, z));
  }
  for (let i = 0; i < 4; i++) { const r = miniRoach(body, occColors[i] || OCC_COLORS[i], seats[i].x, seats[i].y + 0.25, seats[i].z); r.visible = false; occ.push(r); }
  for (const sx of [-1, 1]) for (const sz of [-1.2, 1.2]) cyl(body, 0.42, 0.32, '#263238', sx * 1.0, 0.42, sz, { rz: Math.PI / 2 });
  for (const sx of [-0.65, 0.65]) sph(body, 0.18, 0.18, 0.08, toon('#fffde7', { emissive: '#fff59d', emissiveIntensity: 0.4 }), sx, 0.75, 1.91, { low: true });
  for (const sx of [-0.7, 0.7]) sph(body, 0.15, 0.12, 0.06, toon('#ff5252', { emissive: '#ff1744', emissiveIntensity: 0.4 }), sx, 0.75, -1.91, { low: true });
  if (kind === 'taxi') {
    box(body, 0.9, 0.3, 0.45, '#ffffff', 0, 2.07, -0.2);
    box(body, 2.02, 0.2, 3.82, '#212121', 0, 0.55, 0, { cast: false });
  }
  if (kind === 'police') {
    box(body, 0.45, 0.22, 0.35, toon('#ff1744', { emissive: '#ff1744' }), -0.25, 2.03, -0.2);
    box(body, 0.45, 0.22, 0.35, toon('#2979ff', { emissive: '#2979ff' }), 0.25, 2.03, -0.2);
    box(body, 2.02, 0.35, 3.82, '#23356b', 0, 0.7, 0, { cast: false });
  }
  return { g, body, seats, occ, glass: gl, ...info };
}

function makeWreck() {
  const g = new THREE.Group();
  box(g, 2.0, 0.6, 3.8, '#2b2b2b', 0, 0.45, 0);
  box(g, 1.7, 0.5, 1.8, '#1b1b1b', 0, 1.0, -0.2);
  for (let i = 0; i < 3; i++) sph(g, 0.5 + i * 0.2, 0.5 + i * 0.2, 0.5 + i * 0.2, new THREE.MeshToonMaterial({ color: '#757575', transparent: true, opacity: 0.6 }), 0.2 * i, 1.6 + i * 0.7, 0, { cast: false });
  return g;
}

export class Traffic {
  // scene이 없으면(서버) 메쉬 없이 AI만 돌린다. 브라우저는 같은 시드로 같은 차를 만들고 위치는 서버에서 받는다.
  constructor(scene, city, seed) {
    this.scene = scene;
    this.city = city;
    this.rng = new RNG(seed + 99);
    this.cars = [];
    if (scene) { this.group = new THREE.Group(); scene.add(this.group); }
    const kinds = ['bus', 'bus', 'police', 'police', 'taxi', 'taxi', 'taxi', 'taxi'];
    for (let n = 0; n < 24; n++) this.spawnAI(kinds[n] || 'car');
  }

  makeMesh(kind, color, occColors) {
    if (!this.scene) return { ...vehicleInfo(kind) };
    const m = makeCarMesh(kind, color, occColors);
    this.group.add(m.g);
    return m;
  }

  spawnAI(kind) {
    const R = this.rng;
    const color = kind === 'taxi' ? '#ffd54f' : kind === 'police' ? '#ffffff' : kind === 'bus' ? '#4fc3f7' : R.pick(CAR_COLORS);
    const occColors = [0, 1, 2, 3].map(() => R.pick(OCC_COLORS));
    const m = this.makeMesh(kind, color, occColors);
    const i = R.int(0, GRID), j = R.int(0, GRID);
    const occN = kind === 'bus' ? R.int(3, 8) : kind === 'police' ? 2 : 1 + (R.chance(0.5) ? R.int(1, 3) : 0);
    const car = {
      id: this.cars.length, kind, mesh: m, mode: 'ai', owner: null, speed: 0, maxSpeed: kind === 'bus' ? 8 : R.range(9, 13), heading: 0,
      pos: new THREE.Vector3(), from: [i, j], to: null, seg: null, bubble: null, height: kind === 'bus' ? 3.5 : 2.4,
      occ: occN, occMax: occN, hp: vehicleInfo(kind).hp, color, origin: [i, j],
    };
    this.pickNext(car, true);
    const s = car.seg;
    car.pos.copy(s.p0).lerp(s.p1, s.s / s.len);
    car.heading = Math.atan2(car.dir.x, car.dir.z);
    this.cars.push(car);
    return car;
  }

  neighbors(i, j) {
    const out = [];
    if (i > 0) out.push([i - 1, j]); if (i < GRID) out.push([i + 1, j]);
    if (j > 0) out.push([i, j - 1]); if (j < GRID) out.push([i, j + 1]);
    return out;
  }

  // 다음 구간 결정 (직진 구간 → 교차로 회전 구간)
  pickNext(car, initial = false) {
    const R = this.rng;
    const [i, j] = car.from;
    let opts = this.neighbors(i, j);
    if (car.prev && opts.length > 1) opts = opts.filter(([a, b]) => !(a === car.prev[0] && b === car.prev[1]));
    const to = R.pick(opts);
    const A = node(i, j), B = node(to[0], to[1]);
    const d = B.clone().sub(A).normalize();
    const right = new THREE.Vector3(-d.z, 0, d.x);
    const p0 = A.clone().addScaledVector(d, STOP).addScaledVector(right, LANE_OFF);
    const p1 = B.clone().addScaledVector(d, -STOP).addScaledVector(right, LANE_OFF);
    car.to = to;
    car.dir = d;
    car.seg = { type: 'straight', p0, p1, len: p0.distanceTo(p1), s: initial ? R.range(0, p0.distanceTo(p1)) : 0 };
    car.axis = Math.abs(d.x) > 0.5 ? 'ew' : 'ns';
  }

  makeTurn(car) {
    // 현재 to 노드에서 다음 방향 선택 후 베지어 회전
    const R = this.rng;
    const [i, j] = car.to;
    let opts = this.neighbors(i, j).filter(([a, b]) => !(a === car.from[0] && b === car.from[1]));
    if (!opts.length) opts = this.neighbors(i, j);
    const nxt = R.pick(opts);
    const C = node(i, j), N = node(nxt[0], nxt[1]);
    const d1 = car.dir, d2 = N.clone().sub(C).normalize();
    const r1 = new THREE.Vector3(-d1.z, 0, d1.x), r2 = new THREE.Vector3(-d2.z, 0, d2.x);
    const p0 = car.seg.p1.clone();
    const p2 = C.clone().addScaledVector(d2, STOP).addScaledVector(r2, LANE_OFF);
    const straight = Math.abs(d1.dot(d2)) > 0.9;
    const ctrl = straight ? p0.clone().lerp(p2, 0.5) : C.clone().addScaledVector(r1, LANE_OFF).addScaledVector(r2, LANE_OFF);
    let len = 0, prev = p0;
    for (let k = 1; k <= 8; k++) { const q = bez(p0, ctrl, p2, k / 8); len += q.distanceTo(prev); prev = q; }
    car.seg = { type: 'turn', p0, p1: p2, ctrl, len, s: 0 };
    car.prev = car.from;
    car.from = car.to;
    car.nextTo = nxt;
  }

  // 서버: AI 차량 이동
  update(dt, ctx) {
    for (const car of this.cars) {
      if (car.bubble) { car.bubble.t -= dt; if (car.bubble.t <= 0) car.bubble = null; }
      if (car.mode === 'ai') this.updateAI(car, dt, ctx);
    }
  }

  // 브라우저: 메쉬 위치 반영
  render(visible, camPos, dt = 0.016) {
    this.group.visible = visible;
    for (const car of this.cars) {
      const m = car.mesh;
      const wreck = car.mode === 'wreck';
      m.g.visible = !wreck;
      if (wreck) {
        if (!car.wreckMesh) { car.wreckMesh = makeWreck(); this.group.add(car.wreckMesh); }
        car.wreckMesh.visible = true;
        car.wreckMesh.position.set(car.pos.x, 0, car.pos.z); car.wreckMesh.rotation.y = car.heading;
        continue;
      } else if (car.wreckMesh) car.wreckMesh.visible = false;
      m.g.position.set(car.pos.x, car.pos.y || 0, car.pos.z);
      m.g.rotation.y = car.heading;
      m.body.position.y = car.kind === 'heli' ? 0 : Math.abs(Math.sin(performance.now() / 120 + car.pos.x)) * 0.04 * Math.min(1, Math.abs(car.speed) / 5);
      m.body.rotation.z = (car.steerVis || 0) * (car.kind === 'heli' ? -0.25 : -0.05);
      if (car.kind === 'heli') {
        m.body.rotation.x = Math.max(-0.25, Math.min(0.25, car.speed / 60));
        const spin = car.mode === 'player' || (car.pos.y || 0) > 0.3 ? 25 : 0;
        m.rotor.rotation.y += dt * spin; m.tail.rotation.x += dt * spin * 1.5;
      }
      if (car.kind === 'tank' && m.turret) m.turret.rotation.y = car.turret ?? 0;
      // 탑승자: 멀리 있으면 숨김
      const near = !camPos || Math.hypot(car.pos.x - camPos.x, car.pos.z - camPos.z) < 70;
      const shown = car.mode === 'player' ? (car.occShown ?? 0) : car.occ;
      for (let i = 0; i < m.occ.length; i++) m.occ[i].visible = near && i < shown;
    }
  }

  updateAI(car, dt, ctx) {
    const seg = car.seg;
    // 앞 장애물 검사
    let target = car.maxSpeed;
    const fwd = new THREE.Vector3(Math.sin(car.heading), 0, Math.cos(car.heading));
    const look = (p, range, lateral) => {
      const dx = p.x - car.pos.x, dz = p.z - car.pos.z;
      const ahead = dx * fwd.x + dz * fwd.z;
      if (ahead < 0.1 || ahead > range) return false;
      const lat = Math.abs(dx * fwd.z - dz * fwd.x);
      return lat < lateral;
    };
    // 오래 막혀 있으면 잠깐 무시하고 지나간다 (교착 방지)
    car.blockedT = car.blockedT || 0;
    car.ignoreT = Math.max(0, (car.ignoreT || 0) - dt);
    const checkObstacles = car.ignoreT <= 0;
    let obs = false;
    if (checkObstacles) for (const o of this.cars) {
      if (o === car) continue;
      if (look(o.pos, car.mesh.len / 2 + o.mesh.len / 2 + 3, 1.6)) { target = 0; obs = true; break; }
    }
    if (checkObstacles && target > 0) {
      for (const p of ctx.players) if (p.loc < 0 && p.car < 0 && look(p.pos, 6, 1.8)) { target = 0; obs = true; break; }
      if (!obs) for (const c of ctx.sim.citizens) {
        if (c.location) continue;
        if (Math.abs(c.pos.x - car.pos.x) > 8 || Math.abs(c.pos.z - car.pos.z) > 8) continue;
        if (look(c.pos, 5.5, 1.6)) { target = 0; obs = true; break; }
      }
    }
    if (obs) {
      car.blockedT += dt;
      if (car.blockedT > 5) { car.ignoreT = 2.5; car.blockedT = 0; if (car.kind !== 'bus') car.bubble = { text: '빵빵~ 🚗', t: 1.5 }; }
    } else car.blockedT = 0;
    // 신호
    if (seg.type === 'straight') {
      const remain = seg.len - seg.s;
      const [ti, tj] = car.to;
      const hasLight = ti > 0 && ti < GRID && tj > 0 && tj < GRID;
      const go = car.axis === 'ns' ? this.city.nsGo : this.city.ewGo;
      if (hasLight && !go && remain < 7) target = remain < 0.4 ? 0 : Math.min(target, remain * 1.2);
      else if (remain < 6) target = Math.min(target, 6);
    } else target = Math.min(target, 5.5);
    // 가감속
    const acc = target > car.speed ? 5 : 14;
    car.speed += Math.sign(target - car.speed) * Math.min(Math.abs(target - car.speed), acc * dt);
    seg.s += car.speed * dt;
    if (seg.s >= seg.len) {
      const over = seg.s - seg.len;
      if (seg.type === 'straight') this.makeTurn(car);
      else { car.from = car.from; this.continueAfterTurn(car); }
      car.seg.s = Math.min(over, car.seg.len);
    }
    const s = car.seg;
    const t = s.s / s.len;
    const p = s.type === 'straight' ? s.p0.clone().lerp(s.p1, t) : bez(s.p0, s.ctrl, s.p1, t);
    const dx = p.x - car.pos.x, dz = p.z - car.pos.z;
    if (dx * dx + dz * dz > 1e-6) car.heading = angleLerp(car.heading, Math.atan2(dx, dz), Math.min(1, dt * 12));
    car.pos.copy(p);
  }

  continueAfterTurn(car) {
    // 회전 후: from = 교차로, to = nextTo
    const [i, j] = car.from;
    const to = car.nextTo;
    const A = node(i, j), B = node(to[0], to[1]);
    const d = B.clone().sub(A).normalize();
    const right = new THREE.Vector3(-d.z, 0, d.x);
    const p0 = A.clone().addScaledVector(d, STOP).addScaledVector(right, LANE_OFF);
    const p1 = B.clone().addScaledVector(d, -STOP).addScaledVector(right, LANE_OFF);
    car.to = to; car.dir = d;
    car.seg = { type: 'straight', p0, p1, len: p0.distanceTo(p1), s: 0 };
    car.axis = Math.abs(d.x) > 0.5 ? 'ew' : 'ns';
  }

  // ------------- 플레이어 운전 -------------
  updateHeli(car, dt, ctx) {
    const inp = ctx.input;
    car.pos.y = car.pos.y || 0;
    const f = (inp.forward ? 1 : 0) - (inp.back ? 1 : 0);
    const steer = (inp.left ? 1 : 0) - (inp.right ? 1 : 0);
    const up = (inp.jump ? 1 : 0) - (inp.run ? 1 : 0);
    car.pos.y = Math.max(0, Math.min(70, car.pos.y + up * 9 * dt));
    const airborne = car.pos.y > 0.5;
    const target = airborne ? f * 22 : 0;
    car.speed += (target - car.speed) * Math.min(1, dt * 1.5);
    if (airborne) car.heading += steer * 1.6 * dt;
    car.steerVis = steer;
    car.pos.x += Math.sin(car.heading) * car.speed * dt;
    car.pos.z += Math.cos(car.heading) * car.speed * dt;
    const L = HALF + 80;
    car.pos.x = Math.max(-L, Math.min(L, car.pos.x));
    car.pos.z = Math.max(-L, Math.min(L, car.pos.z));
    const r = car.mesh.radius;
    for (const c of ctx.city.colliders) {
      if (c.small || car.pos.y > (c.h ?? 10)) continue;
      if (car.pos.x < c.minX - r || car.pos.x > c.maxX + r || car.pos.z < c.minZ - r || car.pos.z > c.maxZ + r) continue;
      const cx = Math.max(c.minX, Math.min(car.pos.x, c.maxX)), cz = Math.max(c.minZ, Math.min(car.pos.z, c.maxZ));
      const dx = car.pos.x - cx, dz = car.pos.z - cz, d = Math.hypot(dx, dz);
      if (d < r && d > 1e-4) { car.pos.x = cx + (dx / d) * r; car.pos.z = cz + (dz / d) * r; car.speed *= -0.3; }
    }
  }

  nearestCar(pos, maxD = 4.5) {
    let best = null, bd = maxD;
    for (const c of this.cars) {
      if (c.mode === 'player' || c.mode === 'wreck') continue;
      const d = Math.hypot(c.pos.x - pos.x, c.pos.z - pos.z) - (c.kind === 'bus' || c.kind === 'heli' ? 2.5 : c.kind === 'tank' ? 1.5 : 0);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  enter(car, owner) {
    if (car.mode === 'ai' && car.occ > 0) car.bubble = { text: '어?! 내 차!! 😱', t: 2.5 };
    car.mode = 'player';
    car.owner = owner;
    car.speed = 0;
  }

  exit(car) {
    car.mode = 'parked';
    car.owner = null;
    car.speed = 0;
    const side = new THREE.Vector3(Math.cos(car.heading), 0, -Math.sin(car.heading));
    return car.pos.clone().addScaledVector(side, -2.4);
  }

  spawnParked(pos, heading, kind = 'car') {
    const color = kind === 'heli' ? '#37474f' : kind === 'tank' ? '#556b2f' : '#ff8a65';
    const m = this.makeMesh(kind, color);
    const car = { id: this.cars.length, kind, mesh: m, mode: 'parked', owner: null, speed: 0, maxSpeed: vehicleInfo(kind).max, heading, pos: pos.clone(), height: kind === 'heli' ? 3.5 : 2.4, bubble: null, occ: 0, occMax: 0, hp: vehicleInfo(kind).hp, color };
    this.cars.push(car);
    return car;
  }

  // 부서진 AI 차를 새 위치에서 다시 출발
  resetAI(car) {
    const R = this.rng;
    car.from = [R.int(0, GRID), R.int(0, GRID)]; car.prev = null;
    car.mode = 'ai'; car.owner = null; car.speed = 0; car.hp = vehicleInfo(car.kind).hp; car.occ = car.occMax || 1;
    this.pickNext(car, true);
    const s = car.seg;
    car.pos.copy(s.p0).lerp(s.p1, s.s / s.len);
    car.heading = Math.atan2(car.dir.x, car.dir.z);
  }

  updatePlayer(car, dt, ctx) {
    const inp = ctx.input;
    const throttle = (inp.forward ? 1 : 0) - (inp.back ? 1 : 0);
    const steer = (inp.left ? 1 : 0) - (inp.right ? 1 : 0);
    if (car.kind === 'heli') return this.updateHeli(car, dt, ctx);
    const max = car.kind === 'tank' ? 8 : car.kind === 'bus' ? 14 : inp.run ? 26 : 18;
    if (throttle > 0) car.speed += (car.speed < 0 ? 22 : 9) * dt;
    else if (throttle < 0) car.speed -= (car.speed > 0 ? 22 : 6) * dt;
    else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 5 * dt);
    if (inp.jump) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 30 * dt);
    car.speed = Math.max(-8, Math.min(max, car.speed));
    const turn = car.kind === 'tank' ? steer * 1.2 : steer * 1.9 * Math.min(1, Math.abs(car.speed) / 6) * Math.sign(car.speed || 1);
    car.heading += turn * dt;
    car.steerVis = steer * Math.min(1, Math.abs(car.speed) / 8);
    car.pos.x += Math.sin(car.heading) * car.speed * dt;
    car.pos.z += Math.cos(car.heading) * car.speed * dt;
    // 경계
    const L = HALF + 60;
    car.pos.x = Math.max(-L, Math.min(L, car.pos.x));
    car.pos.z = Math.max(-L, Math.min(L, car.pos.z));
    // 건물 충돌
    const r = car.mesh.radius;
    for (const c of ctx.city.colliders) {
      if (car.pos.x < c.minX - r || car.pos.x > c.maxX + r || car.pos.z < c.minZ - r || car.pos.z > c.maxZ + r) continue;
      const cx = Math.max(c.minX, Math.min(car.pos.x, c.maxX));
      const cz = Math.max(c.minZ, Math.min(car.pos.z, c.maxZ));
      const dx = car.pos.x - cx, dz = car.pos.z - cz;
      const d = Math.hypot(dx, dz);
      if (d < r && d > 1e-4) {
        car.pos.x = cx + (dx / d) * r; car.pos.z = cz + (dz / d) * r;
        if (Math.abs(car.speed) > 6) ctx.onBump?.(car);
        car.speed *= -0.3;
      }
    }
    // 다른 차 충돌
    for (const o of this.cars) {
      if (o === car) continue;
      const dx = car.pos.x - o.pos.x, dz = car.pos.z - o.pos.z;
      const d = Math.hypot(dx, dz), min = r + o.mesh.radius * 0.9;
      if (d < min && d > 1e-4) {
        car.pos.x = o.pos.x + (dx / d) * min; car.pos.z = o.pos.z + (dz / d) * min;
        if (Math.abs(car.speed) > 5 && !o.bubble) o.bubble = { text: '빵빵! 조심해요! 😤', t: 2.5 };
        car.speed *= -0.25;
      }
    }
  }
}

function bez(a, c, b, t) {
  const u = 1 - t;
  return new THREE.Vector3(
    u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    0,
    u * u * a.z + 2 * u * t * c.z + t * t * b.z,
  );
}
