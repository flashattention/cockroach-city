import * as THREE from 'three';
import { GRID, roadC, LANE_OFF, ASPHALT_HALF, HALF } from './config.js';
import { toon, box, cyl, sph, RNG, angleLerp, signMesh } from './utils.js';

const STOP = ASPHALT_HALF + 1.6; // 교차로 중심 → 정지선
// 24가지 자동차 색
export const CAR_COLORS = ['#e53935', '#ff7043', '#ffb300', '#fdd835', '#c0ca33', '#43a047', '#00897b', '#00acc1', '#1e88e5', '#3949ab', '#5e35b1', '#8e24aa', '#d81b60', '#f48fb1', '#ffffff', '#eceff1', '#9e9e9e', '#546e7a', '#263238', '#212121', '#6d4c41', '#a1887f', '#80cbc4', '#b39ddb'];

const node = (i, j) => new THREE.Vector3(roadC(i), 0, roadC(j));

const OCC_COLORS = ['#8a5634', '#9b6038', '#7a4a2c', '#a86b3e', '#6e3f25', '#b07945', '#ff9fb2', '#7ec8a9'];

// 차종: L 길이, W 폭, c 바닥, h1 차체 높이, h2 지붕, cab [앞유리 아래, 지붕 앞, 지붕 뒤, 뒷유리 아래] (z), r 바퀴, max 최고속도
const M = (o) => ({ c: 0.32, r: 0.4, hp: 160, max: 13, ...o });
export const MODELS = {
  sedan: M({ name: '바퀴 소나타', L: 4.3, W: 2.0, h1: 0.95, h2: 1.62, cab: [0.95, 0.25, -0.8, -1.45] }),
  hatch: M({ name: '바퀴 아반떼 해치', L: 3.8, W: 1.95, h1: 0.95, h2: 1.65, cab: [0.85, 0.2, -1.4, -1.8] }),
  suv: M({ name: '바퀴 쏘렌토', L: 4.5, W: 2.15, c: 0.45, h1: 1.2, h2: 2.0, cab: [1.05, 0.55, -1.75, -2.15], r: 0.5, hp: 220 }),
  mini: M({ name: '바퀴 모닝', L: 3.2, W: 1.8, h1: 0.95, h2: 1.75, cab: [0.85, 0.35, -1.2, -1.5], r: 0.35, max: 11 }),
  wagon: M({ name: '바퀴 왜건', L: 4.6, W: 2.0, h1: 0.95, h2: 1.65, cab: [0.95, 0.3, -1.95, -2.2] }),
  van: M({ name: '바퀴 스타리아', L: 4.9, W: 2.1, c: 0.4, h1: 1.15, h2: 2.35, cab: [2.0, 1.2, -2.25, -2.4], r: 0.45, hp: 220, max: 11 }),
  taxi: M({ name: '바퀴 택시', L: 4.3, W: 2.0, h1: 0.95, h2: 1.62, cab: [0.95, 0.25, -0.8, -1.45] }),
  police: M({ name: '경찰차', L: 4.4, W: 2.0, h1: 0.95, h2: 1.62, cab: [0.95, 0.25, -0.8, -1.45], hp: 220, max: 15 }),
  ev: M({ name: '테슬바퀴 모델6', L: 4.5, W: 2.0, h1: 0.9, h2: 1.55, cab: [1.25, 0.4, -1.0, -2.0], max: 16 }),
  limo: M({ name: '바퀴 리무진', L: 6.6, W: 2.05, h1: 0.95, h2: 1.6, cab: [1.9, 1.25, -2.4, -3.0], hp: 240, max: 12 }),
  jeep: M({ name: '바퀴 랭글러', L: 4.0, W: 2.1, c: 0.5, h1: 1.25, h2: 2.05, cab: [0.75, 0.6, -1.85, -1.95], r: 0.52, hp: 240 }),
  convertible: M({ name: '바퀴 오픈카', L: 4.3, W: 2.0, h1: 0.9, h2: 1.3, cab: [0.95, 0.75, -0.5, -0.6], open: true, max: 16 }),
  icecream: M({ name: '아이스크림 트럭', L: 4.9, W: 2.1, c: 0.4, h1: 1.15, h2: 2.4, cab: [2.0, 1.2, -2.25, -2.4], r: 0.45, hp: 200, max: 10 }),
  pickup: M({ name: '바퀴 픽업트럭', L: 5.0, W: 2.15, c: 0.48, h1: 1.2, h2: 2.0, cab: [1.25, 0.75, -0.55, -0.7], r: 0.5, hp: 240, bed: true }),
  truck: M({ name: '바퀴 탑차', L: 6.4, W: 2.3, c: 0.5, h1: 1.35, h2: 2.4, cab: [2.85, 2.55, 1.75, 1.6], r: 0.55, hp: 350, max: 10, cargo: true }),
  // 스포츠카 5종
  sport_f: M({ name: '풰라리 F8 바퀴', L: 4.5, W: 2.1, c: 0.22, h1: 0.72, h2: 1.2, cab: [0.55, -0.15, -0.85, -1.6], r: 0.42, max: 26, spoiler: 'lip', sport: true }),
  sport_l: M({ name: '람부르기니 바퀴칸', L: 4.6, W: 2.2, c: 0.2, h1: 0.66, h2: 1.12, cab: [1.0, -0.05, -0.75, -1.75], r: 0.44, max: 28, spoiler: 'wing', wedge: true, sport: true }),
  sport_p: M({ name: '포르셰 911 더듬', L: 4.3, W: 2.0, c: 0.24, h1: 0.8, h2: 1.3, cab: [0.7, 0.05, -0.75, -1.9], r: 0.42, max: 24, spoiler: 'duck', round: true, sport: true }),
  sport_m: M({ name: '맥라랜 720바퀴', L: 4.6, W: 2.1, c: 0.2, h1: 0.7, h2: 1.15, cab: [0.85, 0.0, -0.7, -1.7], r: 0.43, max: 27, spoiler: 'wing', sport: true }),
  sport_b: M({ name: '부가디 시롱바퀴', L: 4.6, W: 2.15, c: 0.22, h1: 0.78, h2: 1.2, cab: [0.7, -0.05, -0.75, -1.5], r: 0.45, max: 32, spoiler: 'lip', twoTone: true, sport: true, hp: 260 }),
};
export const CAR_KINDS = Object.keys(MODELS);
export const SPORT_KINDS = CAR_KINDS.filter((k) => MODELS[k].sport);

const VEHICLE = {
  bus: { len: 8.5, radius: 2.4, hp: 400, max: 8 },
  tank: { len: 5.5, radius: 2.3, hp: 1500, max: 8 },
  heli: { len: 7, radius: 2.4, hp: 700, max: 22 },
};
for (const [k, m] of Object.entries(MODELS)) VEHICLE[k] = { len: m.L, radius: Math.max(1.5, m.L * 0.38), hp: m.hp, max: m.max };
VEHICLE.car = VEHICLE.sedan;
export const vehicleInfo = (kind) => VEHICLE[kind] || VEHICLE.sedan;
export const vehicleName = (kind) => MODELS[kind]?.name || { bus: '시내버스', tank: '전차', heli: '헬기' }[kind] || '자동차';

// 도로 위 AI 차량 구성
export const AI_CARS = 40;
const AI_KINDS = ['bus', 'bus', 'bus', 'police', 'police', 'taxi', 'taxi', 'taxi', 'taxi', 'truck', 'truck', 'icecream', 'van', 'van', 'pickup', 'pickup',
  'sport_f', 'sport_l', 'sport_p', 'sport_m', 'sport_b', 'limo', 'jeep', 'jeep', 'convertible', 'convertible', 'ev', 'ev', 'mini', 'mini', 'suv', 'suv', 'suv', 'wagon', 'hatch', 'hatch'];

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

// 옆모습(z,y) 다각형을 폭 W만큼 x 방향으로 밀어낸 메쉬
const geoCache = new Map();
function sideGeo(key, pts, W) {
  if (geoCache.has(key)) return geoCache.get(key);
  const sh = new THREE.Shape();
  pts.forEach(([z, y], i) => (i ? sh.lineTo(z, y) : sh.moveTo(z, y)));
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: W, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 1 });
  g.rotateY(-Math.PI / 2); g.translate(W / 2, 0, 0);
  geoCache.set(key, g);
  return g;
}
function side(parent, key, pts, W, mat, x = 0) {
  const m = new THREE.Mesh(sideGeo(key, pts, W), mat);
  m.position.x = x; m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}
const lightMat = (c, e) => toon(c, { emissive: e, emissiveIntensity: 0.5 });

function wheels(body, md, zs) {
  const { W, r } = md;
  for (const sx of [-1, 1]) for (const z of zs) {
    cyl(body, r, 0.34, '#1f1f1f', sx * (W / 2 - 0.1), r, z, { rz: Math.PI / 2 });
    cyl(body, r * 0.62, 0.36, md.sport ? '#cfd8dc' : '#b0bec5', sx * (W / 2 - 0.1), r, z, { rz: Math.PI / 2, low: true });
    cyl(body, r * 0.2, 0.38, '#455a64', sx * (W / 2 - 0.1), r, z, { rz: Math.PI / 2, low: true });
  }
}

// 승용차 공통 (옆모습 압출 + 유리 + 지붕 + 기둥 + 바퀴 + 조명)
function buildCar(kind, color, occColors, glassMat) {
  const md = MODELS[kind];
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const { L, W, c, h1, h2, cab } = md;
  const [zA, zB, zC, zD] = cab;
  const paint = toon(color);
  const dark = toon('#263238');
  const F = L / 2, B = -L / 2;
  // 차체 (앞이 낮게 깎인 모양)
  const nose = md.wedge ? c + 0.12 : md.sport ? c + 0.2 : h1 - 0.25;
  const lower = [[B, c], [F - 0.1, c], [F, c + 0.12], [F, nose], [F - (md.sport ? 0.9 : 0.35), h1], [B + 0.2, h1], [B, h1 - 0.15]];
  side(body, `${kind}:low`, lower, W, paint);
  if (md.twoTone) side(body, `${kind}:tt`, [[0.4, c + 0.05], [F - 0.4, c + 0.05], [F - 0.9, h1 - 0.02], [0.9, h1 - 0.02]], W + 0.02, toon('#1a237e'));
  // 짐칸 / 화물칸
  if (md.bed) {
    for (const sx of [-1, 1]) box(body, 0.12, 0.5, zD - B, color, sx * (W / 2 - 0.06), h1 + 0.25, (zD + B) / 2);
    box(body, W, 0.5, 0.12, color, 0, h1 + 0.25, B + 0.06);
    box(body, W - 0.3, 0.06, zD - B - 0.2, '#5d4037', 0, h1 + 0.03, (zD + B) / 2);
  }
  if (md.cargo) {
    box(body, W + 0.1, 2.3, zD - B - 0.2, kind === 'truck' ? '#fafafa' : color, 0, h1 + 1.15, (zD + B) / 2 - 0.05);
    box(body, W + 0.12, 0.4, zD - B - 0.18, color, 0, h1 + 0.4, (zD + B) / 2 - 0.05, { cast: false });
  }
  // 유리 (안의 바퀴벌레가 보인다)
  const cabPts = [[zA, h1], [zB, h2], [zC, h2], [zD, h1]];
  const gl = side(body, `${kind}:glass`, cabPts, W - 0.14, glassMat);
  gl.renderOrder = 2;
  if (!md.open) {
    side(body, `${kind}:roof`, [[zB + 0.04, h2 - 0.03], [zC - 0.04, h2 - 0.03], [zC - 0.06, h2 + 0.08], [zB + 0.06, h2 + 0.08]], W - 0.06, paint);
    for (const sx of [-1, 1]) {
      const x = sx * (W / 2 - 0.08);
      side(body, `${kind}:pa`, [[zA, h1], [zA - 0.14, h1], [zB - 0.1, h2], [zB + 0.04, h2]], 0.09, paint, x);
      side(body, `${kind}:pc`, [[zD, h1], [zD + 0.16, h1], [zC + 0.1, h2], [zC - 0.04, h2]], 0.09, paint, x);
      const mid = (zB + zC) / 2;
      box(body, 0.09, h2 - h1, 0.14, color, x, (h1 + h2) / 2, mid);
    }
  } else {
    // 오픈카: 앞유리 틀만
    for (const sx of [-1, 1]) side(body, `${kind}:pa`, [[zA, h1], [zA - 0.12, h1], [zB - 0.08, h2], [zB + 0.04, h2]], 0.08, toon('#cfd8dc'), sx * (W / 2 - 0.08));
  }
  if (kind === 'icecream') {
    box(body, W + 0.05, 0.9, 1.6, '#ffffff', 0, h2 - 0.3, -1.4, { cast: false });
    cyl(body, 0.12, 1.0, '#ffcc80', 0, h2 + 0.5, -1.2);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.1, 10), toon('#e0a050')); cone.rotation.x = Math.PI; cone.position.set(0, h2 + 0.55, -1.2); body.add(cone);
    sph(body, 0.55, 0.5, 0.55, '#f8bbd0', 0, h2 + 1.25, -1.2); sph(body, 0.15, 0.15, 0.15, '#e53935', 0, h2 + 1.75, -1.2, { low: true });
  }
  // 범퍼, 그릴, 조명, 번호판, 사이드미러
  box(body, W + 0.06, 0.22, 0.2, md.sport ? toon('#212121') : toon('#b0bec5'), 0, c + 0.12, F - 0.02, { cast: false });
  box(body, W + 0.06, 0.22, 0.2, md.sport ? toon('#212121') : toon('#b0bec5'), 0, c + 0.12, B + 0.02, { cast: false });
  if (!md.sport) box(body, W * 0.45, Math.max(0.15, (nose - c) * 0.4), 0.06, dark, 0, (c + nose) / 2 + 0.05, F + 0.01, { cast: false });
  const hy = md.sport ? c + 0.28 : Math.min(nose - 0.12, h1 - 0.22);
  for (const sx of [-1, 1]) {
    box(body, md.sport ? 0.45 : 0.36, 0.12, 0.06, lightMat('#fffde7', '#fff59d'), sx * (W / 2 - 0.35), hy, F - (md.sport ? 0.25 : 0) + 0.02, { cast: false });
    box(body, 0.4, 0.14, 0.06, lightMat('#ff5252', '#ff1744'), sx * (W / 2 - 0.3), h1 - 0.25, B - 0.02, { cast: false });
    const mirror = box(body, 0.22, 0.14, 0.12, color, sx * (W / 2 + 0.08), h1 + 0.15, zA - 0.15);
    void mirror;
  }
  box(body, 0.6, 0.18, 0.03, '#fafafa', 0, c + 0.32, B - 0.04, { cast: false });
  if (md.spoiler === 'wing') { for (const sx of [-0.6, 0.6]) box(body, 0.06, 0.32, 0.06, '#212121', sx, h1 + 0.15, B + 0.35); box(body, W - 0.2, 0.06, 0.38, toon('#212121'), 0, h1 + 0.32, B + 0.35); }
  else if (md.spoiler === 'duck') box(body, W - 0.4, 0.08, 0.3, color, 0, h1 + 0.06, B + 0.25, { cast: false });
  else if (md.spoiler === 'lip') box(body, W - 0.3, 0.05, 0.18, toon('#212121'), 0, h1 + 0.03, B + 0.15, { cast: false });
  if (md.sport) {
    for (const sx of [-1, 1]) box(body, 0.04, 0.22, 0.8, dark, sx * (W / 2 + 0.03), c + 0.35, -0.6, { cast: false }); // 측면 흡기구
    if (kind === 'sport_p') box(body, 0.35, 0.02, L - 0.3, '#ffffff', 0, h1 + 0.01, 0, { cast: false });
  }
  if (kind === 'jeep') { cyl(body, 0.45, 0.25, '#212121', 0, h1 + 0.1, B - 0.15, { rx: Math.PI / 2 }); box(body, W - 0.2, 0.08, 1.4, '#424242', 0, h2 + 0.14, -0.6, { cast: false }); }
  if (kind === 'suv') for (const sx of [-0.55, 0.55]) box(body, 0.06, 0.08, zB - zC, '#9e9e9e', sx, h2 + 0.13, (zB + zC) / 2, { cast: false });
  if (kind === 'ev') box(body, W - 0.2, 0.05, 0.05, lightMat('#e1f5fe', '#80d8ff'), 0, h1 - 0.1, F - 0.3, { cast: false });
  if (kind === 'taxi') {
    box(body, 0.85, 0.32, 0.42, '#ffffff', 0, h2 + 0.22, (zB + zC) / 2);
    box(body, 0.86, 0.1, 0.43, '#212121', 0, h2 + 0.3, (zB + zC) / 2, { cast: false });
    box(body, W + 0.03, 0.18, L * 0.5, '#212121', 0, c + 0.42, 0, { cast: false });
  }
  if (kind === 'police') {
    box(body, 0.45, 0.2, 0.32, toon('#ff1744', { emissive: '#ff1744' }), -0.25, h2 + 0.18, (zB + zC) / 2);
    box(body, 0.45, 0.2, 0.32, toon('#2979ff', { emissive: '#2979ff' }), 0.25, h2 + 0.18, (zB + zC) / 2);
    box(body, W + 0.03, 0.3, L * 0.55, '#23356b', 0, c + 0.45, 0, { cast: false });
  }
  if (kind === 'truck') { const s2 = signMesh('바퀴 택배', '📦', 2.6, '#ffffff', '#e65100'); s2.position.set(W / 2 + 0.08, h1 + 1.2, (zD + B) / 2); s2.rotation.y = Math.PI / 2; body.add(s2); }
  // 바퀴
  const wz = Math.min(F - md.r - 0.35, 1.6 + (L - 4.3) * 0.5);
  wheels(body, md, md.cargo || kind === 'limo' ? [F - md.r - 0.5, B + md.r + 0.6, B + md.r * 3 + 0.7].slice(0, kind === 'limo' ? 2 : 3) : [wz, -wz]);
  // 좌석 & 탑승자
  const seats = [], occ = [];
  const zs = md.cargo ? [(zA + zD) / 2] : kind === 'limo' ? [zB - 0.2, -0.6, -1.7] : md.sport ? [(zB + zC) / 2 + 0.1] : [(zB + zC) / 2 + 0.45, (zB + zC) / 2 - 0.5];
  const sy = h1 + 0.02;
  for (const z of zs) for (const x of [0.42, -0.42]) {
    box(body, 0.55, 0.14, 0.55, '#455a64', x, sy - 0.05, z, { cast: false });
    box(body, 0.55, 0.55, 0.1, '#455a64', x, sy + 0.25, z - 0.3, { cast: false });
    seats.push(new THREE.Vector3(x, sy, z));
  }
  for (let i = 0; i < seats.length; i++) { const r = miniRoach(body, occColors[i % 4] || OCC_COLORS[i % 8], seats[i].x, seats[i].y + 0.25, seats[i].z); r.visible = false; occ.push(r); }
  return { g, body, seats, occ, glass: gl, ...vehicleInfo(kind) };
}

export function makeCarMesh(kind, color, occColors = []) {
  if (kind === 'car') kind = 'sedan';
  const glassMat = new THREE.MeshToonMaterial({ color: '#bfe9ff', transparent: true, opacity: 0.3, depthWrite: false });
  if (MODELS[kind]) return buildCar(kind, color, occColors, glassMat);
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
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
  // 버스
  box(body, 2.5, 1.0, 8, color, 0, 1.0, 0);
  box(body, 2.55, 0.35, 8.05, '#fafafa', 0, 0.55, 0);
  box(body, 2.5, 0.3, 8, color, 0, 3.0, 0);
  box(body, 2.3, 0.15, 7.6, '#eceff1', 0, 3.2, 0, { cast: false });
  for (const [x, z] of [[1.2, 3.9], [-1.2, 3.9], [1.2, -3.9], [-1.2, -3.9], [1.2, 0], [-1.2, 0], [1.2, 2], [-1.2, -2]]) box(body, 0.12, 1.5, 0.12, color, x, 2.2, z);
  const gl = new THREE.Mesh(new THREE.BoxGeometry(2.45, 1.5, 7.9), glassMat); gl.position.set(0, 2.2, 0); body.add(gl);
  for (const sx of [-1, 1]) for (const sz of [-2.8, 2.8]) { cyl(body, 0.55, 0.35, '#1f1f1f', sx * 1.15, 0.55, sz, { rz: Math.PI / 2 }); cyl(body, 0.32, 0.37, '#b0bec5', sx * 1.15, 0.55, sz, { rz: Math.PI / 2, low: true }); }
  for (const sx of [-0.85, 0.85]) box(body, 0.45, 0.2, 0.06, lightMat('#fffde7', '#fff59d'), sx, 0.95, 4.02, { cast: false });
  const s = signMesh('바퀴 시내버스', '🚌', 3, '#ffffff', '#1565c0'); s.position.set(0, 3.3, 4.03); body.add(s);
  const pos = [[0.6, 3]];
  for (let i = 0; i < 4; i++) for (const sx of [-0.6, 0.6]) pos.push([sx, 1.4 - i * 1.6]);
  for (const [x, z] of pos) { box(body, 0.6, 0.3, 0.6, '#455a64', x, 1.55, z); seats.push(new THREE.Vector3(x, 1.75, z)); }
  for (let i = 0; i < seats.length; i++) { const r = miniRoach(body, occColors[i % occColors.length] || OCC_COLORS[i % 8], seats[i].x, seats[i].y + 0.25, seats[i].z); r.visible = false; occ.push(r); }
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
    for (let n = 0; n < AI_CARS; n++) this.spawnAI(AI_KINDS[n] || 'sedan');
  }

  makeMesh(kind, color, occColors) {
    if (!this.scene) return { ...vehicleInfo(kind) };
    const m = makeCarMesh(kind, color, occColors);
    this.group.add(m.g);
    return m;
  }

  spawnAI(kind) {
    const R = this.rng;
    const color = kind === 'taxi' ? '#ffb300' : kind === 'police' ? '#ffffff' : kind === 'bus' ? R.pick(['#4fc3f7', '#43a047', '#1e88e5']) : kind === 'icecream' ? '#f8bbd0' : kind === 'sport_f' ? R.pick(['#e53935', '#fdd835']) : kind === 'sport_l' ? R.pick(['#c0ca33', '#ff7043', '#5e35b1']) : R.pick(CAR_COLORS);
    const occColors = [0, 1, 2, 3].map(() => R.pick(OCC_COLORS));
    const m = this.makeMesh(kind, color, occColors);
    const i = R.int(0, GRID), j = R.int(0, GRID);
    const seatsN = kind === 'bus' ? 9 : MODELS[kind]?.sport || MODELS[kind]?.cargo ? 2 : kind === 'limo' ? 6 : 4;
    const occN = kind === 'bus' ? R.int(3, 8) : kind === 'police' ? 2 : Math.min(seatsN, 1 + (R.chance(0.5) ? R.int(1, 3) : 0));
    const car = {
      id: this.cars.length, kind, mesh: m, mode: 'ai', owner: null, speed: 0, maxSpeed: kind === 'bus' ? 8 : kind === 'truck' ? 9 : MODELS[kind]?.sport ? R.range(12, 15) : R.range(9, 13), heading: 0,
      pos: new THREE.Vector3(), from: [i, j], to: null, seg: null, bubble: null, height: kind === 'bus' || kind === 'truck' ? 3.5 : 2.4,
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
    const L = HALF - 1;
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
      const d = Math.hypot(c.pos.x - pos.x, c.pos.z - pos.z) - (c.kind === 'bus' || c.kind === 'heli' || c.kind === 'truck' || c.kind === 'limo' ? 2.5 : c.kind === 'tank' ? 1.5 : 0);
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

  spawnParked(pos, heading, kind = 'sedan', color = null) {
    if (kind === 'car') kind = 'sedan';
    color = color || (kind === 'heli' ? '#37474f' : kind === 'tank' ? '#556b2f' : '#ff8a65');
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
    const md = MODELS[car.kind];
    const top = md ? md.max * 1.4 : 18;
    const max = car.kind === 'tank' ? 8 : car.kind === 'bus' ? 14 : inp.run ? top * 1.35 : top;
    const accel = md?.sport ? 16 : 9;
    if (throttle > 0) car.speed += (car.speed < 0 ? 22 : accel) * dt;
    else if (throttle < 0) car.speed -= (car.speed > 0 ? 22 : 6) * dt;
    else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 5 * dt);
    if (inp.jump) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 30 * dt);
    car.speed = Math.max(-8, Math.min(max, car.speed));
    const turn = car.kind === 'tank' ? steer * 1.2 : steer * 1.9 * Math.min(1, Math.abs(car.speed) / 6) * Math.sign(car.speed || 1);
    car.heading += turn * dt;
    car.steerVis = steer * Math.min(1, Math.abs(car.speed) / 8);
    car.pos.x += Math.sin(car.heading) * car.speed * dt;
    car.pos.z += Math.cos(car.heading) * car.speed * dt;
    // 경계: 외곽 도로 끝까지
    const L = HALF - car.mesh.radius;
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
