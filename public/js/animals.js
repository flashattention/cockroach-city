// 야생동물 모습과 움직임 (브라우저)
import * as THREE from 'three';
import { ANIMALS, ANIMAL_KINDS } from './fauna.js';
import { toon, G } from './utils.js';
import { WATER_Y } from './terrain.js';

const S = (parent, color, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(G.sphereLow(), toon(color)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; parent.add(m); return m; };
const B = (parent, color, x, y, z, sx, sy, sz) => { const m = new THREE.Mesh(G.box(), toon(color)); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; parent.add(m); return m; };
const C = (parent, color, x, y, z, r, h, rx = 0, rz = 0) => { const m = new THREE.Mesh(G.cylLow(), toon(color)); m.position.set(x, y, z); m.scale.set(r, h, r); m.rotation.set(rx, 0, rz); m.castShadow = true; parent.add(m); return m; };
const eyes = (head, z, y, gap, s = 0.08) => { for (const sx of [-1, 1]) { S(head, '#ffffff', sx * gap, y, z, s, s * 1.1, s * 0.6); S(head, '#1d1410', sx * gap, y - 0.01, z + s * 0.4, s * 0.55, s * 0.65, s * 0.4); } };

// 네발 동물 공통 틀
function quad(o) {
  const g = new THREE.Group();
  const body = new THREE.Group(); g.add(body);
  const { len = 1.6, wid = 0.8, hgt = 0.8, leg = 0.7, color, belly, headColor } = o;
  S(body, color, 0, leg + hgt / 2, 0, wid / 2, hgt / 2, len / 2);
  if (belly) S(body, belly, 0, leg + hgt * 0.3, 0.05, wid * 0.42, hgt * 0.32, len * 0.42);
  const legs = [];
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const piv = new THREE.Group(); piv.position.set(sx * wid * 0.3, leg + 0.05, sz * len * 0.32); body.add(piv);
    C(piv, o.legColor || color, 0, -leg / 2, 0, o.legR || 0.12, leg);
    if (o.hoof) S(piv, o.hoof, 0, -leg, 0, (o.legR || 0.12) * 1.2, 0.07, (o.legR || 0.12) * 1.3);
    legs.push(piv);
  }
  const head = new THREE.Group(); head.position.set(0, leg + hgt * (o.headUp ?? 0.85), len / 2 + (o.neck || 0.1)); body.add(head);
  S(head, headColor || color, 0, 0, 0, o.headR || 0.35, (o.headR || 0.35) * 0.9, (o.headR || 0.35) * 1.05);
  if (o.snout) S(head, o.snout, 0, -0.08, (o.headR || 0.35) * 0.9, (o.headR || 0.35) * 0.55, (o.headR || 0.35) * 0.42, (o.headR || 0.35) * 0.55);
  eyes(head, (o.headR || 0.35) * 0.8, 0.08, (o.headR || 0.35) * 0.45, (o.headR || 0.35) * 0.22);
  let tail = null;
  if (o.tail) { tail = new THREE.Group(); tail.position.set(0, leg + hgt * 0.7, -len / 2); body.add(tail); C(tail, o.tailColor || color, 0, 0, -o.tail / 2, 0.06, o.tail, Math.PI / 2 - 0.5); }
  return { g, body, legs, head, tail };
}

export function makeAnimalMesh(kind) {
  let m;
  switch (kind) {
    case 'bear': m = quad({ len: 1.9, wid: 1.2, hgt: 1.1, leg: 0.6, legR: 0.22, color: '#6d4c41', snout: '#a1887f', headR: 0.5, headUp: 0.95 });
      for (const sx of [-1, 1]) S(m.head, '#6d4c41', sx * 0.32, 0.38, 0, 0.14, 0.14, 0.08); break;
    case 'deer': m = quad({ len: 1.5, wid: 0.6, hgt: 0.7, leg: 1.0, legR: 0.07, color: '#b07945', belly: '#f5deb3', snout: '#3e2723', headR: 0.27, headUp: 1.6, neck: 0.05, tail: 0.25, tailColor: '#fff', hoof: '#3e2723' });
      C(m.body, '#b07945', 0, 1.55, 0.7, 0.13, 0.7, -0.6);
      for (const sx of [-1, 1]) { const a = C(m.head, '#d7ccc8', sx * 0.15, 0.4, -0.05, 0.035, 0.5, 0, sx * -0.4); C(a, '#d7ccc8', 0, 0.3, 0, 0.6, 0.6, 0, sx * 1.4); S(m.head, '#b07945', sx * 0.25, 0.2, -0.05, 0.12, 0.06, 0.04); }
      for (let i = 0; i < 5; i++) S(m.body, '#fff8e1', (i % 2 ? 0.15 : -0.12), 1.4, -0.3 + i * 0.15, 0.05, 0.05, 0.05); break;
    case 'wolf': m = quad({ len: 1.3, wid: 0.55, hgt: 0.55, leg: 0.6, legR: 0.08, color: '#78909c', belly: '#cfd8dc', snout: '#b0bec5', headR: 0.3, tail: 0.6, headUp: 1.0 });
      for (const sx of [-1, 1]) { const e = new THREE.Mesh(G.cone(), toon('#607d8b')); e.scale.set(0.09, 0.2, 0.09); e.position.set(sx * 0.16, 0.3, -0.02); m.head.add(e); } break;
    case 'boar': m = quad({ len: 1.4, wid: 0.75, hgt: 0.7, leg: 0.4, legR: 0.1, color: '#5d4037', snout: '#d7a6a0', headR: 0.33, headUp: 0.6, tail: 0.2 });
      for (const sx of [-1, 1]) { const t = new THREE.Mesh(G.cone(), toon('#fff8e1')); t.scale.set(0.04, 0.16, 0.04); t.position.set(sx * 0.12, -0.08, 0.38); t.rotation.x = -0.6; m.head.add(t); } break;
    case 'rabbit': m = quad({ len: 0.5, wid: 0.35, hgt: 0.35, leg: 0.15, legR: 0.05, color: '#eeeeee', headR: 0.17, headUp: 1.3, tail: 0.05 });
      for (const sx of [-1, 1]) S(m.head, '#eeeeee', sx * 0.07, 0.25, -0.02, 0.05, 0.18, 0.03);
      S(m.body, '#ffffff', 0, 0.35, -0.27, 0.08, 0.08, 0.08); break;
    case 'tiger': case 'jaguar': {
      const tiger = kind === 'tiger';
      m = quad({ len: tiger ? 2.0 : 1.6, wid: 0.7, hgt: 0.65, leg: 0.6, legR: 0.12, color: tiger ? '#ff8f00' : '#e0a040', belly: '#fff8e1', snout: '#fff8e1', headR: 0.38, tail: 0.9, headUp: 0.9 });
      for (const sx of [-1, 1]) S(m.head, tiger ? '#ff8f00' : '#e0a040', sx * 0.24, 0.3, -0.05, 0.1, 0.1, 0.06);
      if (tiger) for (let i = 0; i < 7; i++) B(m.body, '#212121', 0, 0.95 + (i % 2) * 0.05, -0.8 + i * 0.25, 0.72, 0.08, 0.06);
      else for (let i = 0; i < 18; i++) S(m.body, '#3e2723', (Math.sin(i * 7.3) * 0.3), 0.75 + Math.cos(i * 3.1) * 0.25 + 0.2, -0.7 + (i / 18) * 1.4, 0.06, 0.06, 0.06);
      break;
    }
    case 'croc': {
      m = quad({ len: 3.0, wid: 0.8, hgt: 0.35, leg: 0.22, legR: 0.1, color: '#4e6b3a', belly: '#c5d6a0', headR: 0.32, headUp: 0.4, neck: 0.25, tail: 1.6 });
      m.tail.rotation.x = 0.4;
      const jaw = B(m.head, '#4e6b3a', 0, -0.05, 0.55, 0.42, 0.14, 0.9);
      B(m.head, '#fff8e1', 0, -0.12, 0.6, 0.38, 0.03, 0.8); m.jaw = jaw;
      for (let i = 0; i < 8; i++) { const sp = new THREE.Mesh(G.cone(), toon('#3b5229')); sp.scale.set(0.08, 0.14, 0.08); sp.position.set(0, 0.6, -1.3 + i * 0.35); m.body.add(sp); }
      break;
    }
    case 'anaconda': {
      const g = new THREE.Group(); const body = new THREE.Group(); g.add(body);
      const segs = [];
      for (let i = 0; i < 14; i++) { const s = S(body, i % 2 ? '#556b2f' : '#6b8e23', 0, 0.25, -i * 0.42, 0.28 - i * 0.01, 0.24 - i * 0.01, 0.3); segs.push(s); }
      const head = new THREE.Group(); head.position.set(0, 0.3, 0.35); body.add(head);
      S(head, '#6b8e23', 0, 0, 0, 0.3, 0.2, 0.38); eyes(head, 0.25, 0.1, 0.14, 0.07);
      const tongue = B(head, '#e53935', 0, -0.05, 0.45, 0.04, 0.02, 0.2);
      m = { g, body, legs: [], head, tail: null, segs, tongue };
      break;
    }
    case 'cow': m = quad({ len: 1.9, wid: 0.9, hgt: 0.9, leg: 0.8, legR: 0.12, color: '#fafafa', snout: '#f8bbd0', headR: 0.38, tail: 0.7, hoof: '#3e2723', headUp: 1.0 });
      for (const [x, y, z] of [[0.3, 1.4, 0.3], [-0.35, 1.2, -0.4], [0.1, 1.6, -0.1]]) S(m.body, '#212121', x, y, z, 0.25, 0.2, 0.3);
      for (const sx of [-1, 1]) { const h = new THREE.Mesh(G.cone(), toon('#fff8e1')); h.scale.set(0.05, 0.18, 0.05); h.position.set(sx * 0.22, 0.32, 0); h.rotation.z = -sx * 0.6; m.head.add(h); } break;
    case 'sheep': m = quad({ len: 1.1, wid: 0.8, hgt: 0.75, leg: 0.5, legR: 0.07, color: '#fafafa', legColor: '#424242', headColor: '#424242', headR: 0.25, headUp: 0.9 });
      for (let i = 0; i < 10; i++) S(m.body, '#ffffff', Math.sin(i * 2.4) * 0.35, 0.95 + Math.cos(i * 1.7) * 0.25, Math.cos(i * 2.4) * 0.4, 0.25, 0.25, 0.25); break;
    case 'horse': m = quad({ len: 1.9, wid: 0.65, hgt: 0.8, leg: 1.1, legR: 0.1, color: '#8d5a3a', snout: '#6d4c41', headR: 0.3, headUp: 1.65, tail: 0.8, tailColor: '#3e2723', hoof: '#212121' });
      C(m.body, '#8d5a3a', 0, 1.75, 0.85, 0.16, 0.8, -0.55);
      B(m.body, '#3e2723', 0, 2.0, 0.75, 0.06, 0.6, 0.35); break;
    default: m = quad({ color: '#9e9e9e' });
  }
  m.g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return m;
}

export class AnimalsView {
  constructor(scene, kinds, groundY) {
    this.scene = scene;
    this.groundY = groundY;
    this.list = kinds.map((k, id) => ({ id, kind: ANIMAL_KINDS[k], def: ANIMALS[ANIMAL_KINDS[k]], mesh: null, pos: new THREE.Vector3(), target: null, h: 0, mv: 0, hp: 100, alive: true, seen: 0, t: Math.random() * 10 }));
    for (const a of this.list) a.hostile = !!a.def.hostile;
  }
  apply(arr) {
    const now = performance.now();
    for (let i = 0; i < arr.length; i += 7) {
      const a = this.list[arr[i]];
      if (!a) continue;
      const tgt = new THREE.Vector3(arr[i + 1] / 10, 0, arr[i + 2] / 10);
      if (!a.target || a.target.distanceTo(tgt) > 30) a.pos.copy(tgt);
      a.target = tgt; a.th = arr[i + 3] / 100; a.mv = arr[i + 4]; a.hp = arr[i + 5];
      const fl = arr[i + 6];
      if (a.alive && fl & 1) a.dieT = 0;
      a.alive = !(fl & 1); a.attacking = !!(fl & 2);
      a.seen = now;
    }
  }
  update(dt, camPos, show) {
    const now = performance.now();
    for (const a of this.list) {
      const near = show && a.target && now - a.seen < 1500 && Math.hypot(a.pos.x - camPos.x, a.pos.z - camPos.z) < (this.viewDist || 220);
      if (!near) { if (a.mesh) a.mesh.g.visible = false; a.visible = false; continue; }
      if (!a.mesh) { a.mesh = makeAnimalMesh(a.kind); this.scene.add(a.mesh.g); }
      const m = a.mesh;
      m.g.visible = true; a.visible = true;
      a.pos.lerp(a.target, Math.min(1, dt * 4));
      let dh = a.th - a.h; while (dh > Math.PI) dh -= Math.PI * 2; while (dh < -Math.PI) dh += Math.PI * 2;
      a.h += dh * Math.min(1, dt * 6);
      const gy = this.groundY(a.pos.x, a.pos.z);
      a.pos.y = a.def.swim ? Math.max(gy, WATER_Y - 0.25) : gy;
      m.g.position.copy(a.pos); m.g.rotation.y = a.h;
      a.t += dt * (a.mv === 2 ? 14 : a.mv === 1 ? 7 : 0);
      const sw = Math.sin(a.t);
      m.legs.forEach((l, i) => { l.rotation.x = (i % 2 === (i < 2 ? 0 : 1) ? 1 : -1) * sw * 0.6; });
      if (m.tail) m.tail.rotation.y = Math.sin(now / 300 + a.id) * 0.4;
      if (m.segs) m.segs.forEach((s, i) => { s.position.x = Math.sin(a.t * 0.6 - i * 0.6) * 0.25; });
      if (m.tongue) m.tongue.visible = Math.sin(now / 150 + a.id) > 0.3;
      if (m.jaw) m.jaw.rotation.x = a.attacking ? -0.5 : 0;
      m.head.rotation.x = a.attacking ? -0.4 + Math.sin(now / 60) * 0.2 : a.mv === 0 ? Math.sin(now / 900 + a.id) * 0.25 + 0.2 : 0;
      m.body.position.y = a.mv === 2 ? Math.abs(sw) * 0.12 : 0;
      // 쓰러짐: 옆으로 눕는다
      m.body.rotation.z += ((a.alive ? 0 : Math.PI / 2) - m.body.rotation.z) * Math.min(1, dt * 5);
    }
  }
  nearest(pos, r = 3) {
    let best = null, bd = r;
    for (const a of this.list) { if (!a.visible) continue; const d = a.pos.distanceTo(pos); if (d < bd) { bd = d; best = a; } }
    return best;
  }
}
