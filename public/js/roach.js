import * as THREE from 'three';
import { toon, geo, G } from './utils.js';

const rsph = () => geo('rsph', () => new THREE.SphereGeometry(1, 14, 10));
const limbGeo = () => geo('limb', () => new THREE.CapsuleGeometry(0.065, 0.32, 4, 8));
const legGeo = () => geo('leg', () => new THREE.CapsuleGeometry(0.1, 0.32, 4, 8));
const smileGeo = () => geo('smile', () => new THREE.TorusGeometry(0.07, 0.018, 6, 14, Math.PI));
const ringGeo = () => geo('ring', () => new THREE.TorusGeometry(0.1, 0.016, 6, 16));
const antennaGeo = (side) => geo('ant' + side, () => {
  const c = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(side * 0.12, 0.3, 0.12),
    new THREE.Vector3(side * 0.32, 0.55, 0.14),
    new THREE.Vector3(side * 0.5, 0.62, 0.0),
  ]);
  return new THREE.TubeGeometry(c, 14, 0.024, 5, false);
});

function mesh(g, mat, parent, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(g, mat);
  m.position.set(x, y, z); m.scale.set(sx, sy, sz);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function shade(hex, f) {
  const c = new THREE.Color(hex);
  const hsl = {}; c.getHSL(hsl);
  c.setHSL(hsl.h, hsl.s, Math.min(1, Math.max(0, hsl.l * f)));
  return '#' + c.getHexString();
}

export class Roach {
  /**
   * @param {object} o { color, age, gender, accessories:[], lashes, mustache }
   */
  constructor(o = {}) {
    this.opts = o;
    const age = o.age ?? 30;
    let color = o.color || '#8a5634';
    if (age >= 65) color = '#' + new THREE.Color(color).lerp(new THREE.Color('#b9a99a'), 0.35).getHexString();
    this.color = color;

    this.root = new THREE.Group();
    this.inner = new THREE.Group();
    this.root.add(this.inner);

    const bodyM = toon(color);
    const darkM = toon(shade(color, 0.72));
    const bellyM = toon(shade(color, 1.45));
    const wingM = toon(shade(color, 0.85));
    const white = toon('#ffffff');
    const black = toon('#1d1410');
    const pink = toon('#ff9fb2');

    // 다리
    this.legs = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.2, 0.62, 0);
      this.inner.add(pivot);
      mesh(legGeo(), darkM, pivot, 0, -0.3, 0);
      mesh(rsph(), darkM, pivot, 0, -0.56, 0.06, 0.14, 0.09, 0.21);
      this.legs.push(pivot);
    }

    // 몸통
    this.torso = new THREE.Group();
    this.torso.position.y = 0;
    this.inner.add(this.torso);
    this.body = mesh(rsph(), bodyM, this.torso, 0, 1.05, 0, 0.5, 0.62, 0.42);
    mesh(rsph(), bellyM, this.torso, 0, 1.0, 0.2, 0.36, 0.48, 0.25);
    // 배 줄무늬
    for (let i = 0; i < 3; i++) mesh(G.box(), toon(shade(color, 1.2)), this.torso, 0, 0.82 + i * 0.16, 0.43 - Math.abs(i - 1) * 0.02, 0.38 - Math.abs(i - 1) * 0.06, 0.02, 0.03);
    // 날개 (등)
    this.wings = [];
    for (const s of [-1, 1]) {
      const w = mesh(rsph(), wingM, this.torso, s * 0.17, 1.12, -0.32, 0.3, 0.62, 0.1);
      w.rotation.set(0.12, 0, s * 0.12);
      mesh(rsph(), toon(shade(color, 1.25)), w, 0.25 * s, 0.25, 0.6, 0.18, 0.2, 0.5);
      this.wings.push(w);
    }

    // 팔 (4개)
    this.arms = [];
    const armDefs = [[1.32, 0.04, 0.55], [1.02, 0.1, 0.75]];
    for (const [y, z, spread] of armDefs) {
      for (const s of [-1, 1]) {
        const pivot = new THREE.Group();
        pivot.position.set(s * 0.42, y, z);
        pivot.rotation.z = s * spread;
        pivot.userData.baseZ = s * spread;
        this.torso.add(pivot);
        mesh(limbGeo(), darkM, pivot, 0, -0.2, 0);
        mesh(G.sphereLow(), darkM, pivot, 0, -0.4, 0, 0.085, 0.085, 0.085);
        this.arms.push(pivot);
      }
    }
    // 오른손 (무기를 쥐는 곳)
    this.hand = new THREE.Group();
    this.hand.position.set(0, -0.42, 0);
    this.arms[1].add(this.hand);
    this.heldGroup = new THREE.Group();
    this.hand.add(this.heldGroup);
    this.heldPose = 'none';
    this.attackT = 0; this.attackKind = null;
    this.dead = false; this.seated = false; this.dancing = false; this.hurtT = 0;

    // 머리
    this.head = new THREE.Group();
    this.head.position.y = 1.95;
    this.torso.add(this.head);
    this.headMesh = mesh(rsph(), bodyM, this.head, 0, 0, 0, 0.5, 0.46, 0.47);
    this.bodyM = bodyM;
    // 눈
    this.eyes = [];
    this.pupils = [];
    for (const s of [-1, 1]) {
      const eye = new THREE.Group();
      eye.position.set(s * 0.19, 0.05, 0.38);
      this.head.add(eye);
      mesh(rsph(), white, eye, 0, 0, 0.02, 0.15, 0.18, 0.1);
      const p = mesh(rsph(), black, eye, 0, -0.01, 0.1, 0.09, 0.11, 0.05);
      mesh(G.sphereLow(), white, eye, s * -0.03, 0.04, 0.145, 0.03, 0.03, 0.02);
      this.eyes.push(eye);
      this.pupils.push(p);
    }
    // 볼터치
    for (const s of [-1, 1]) mesh(G.sphereLow(), pink, this.head, s * 0.3, -0.11, 0.36, 0.09, 0.055, 0.04);
    // 입
    this.mouth = mesh(smileGeo(), black, this.head, 0, -0.15, 0.45);
    this.mouth.rotation.z = Math.PI;
    this.mouthO = mesh(G.sphereLow(), black, this.head, 0, -0.17, 0.45, 0.05, 0.06, 0.03);
    this.mouthO.visible = false;
    // 눈썹 (화남)
    this.brows = [];
    for (const s of [-1, 1]) {
      const b = mesh(G.box(), black, this.head, s * 0.19, 0.27, 0.43, 0.16, 0.03, 0.03);
      b.rotation.z = s * -0.35; b.visible = false;
      this.brows.push(b);
    }
    // 더듬이
    this.antennae = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.12, 0.38, 0.15);
      this.head.add(pivot);
      mesh(antennaGeo(s), darkM, pivot);
      mesh(G.sphereLow(), toon(shade(color, 1.1)), pivot, s * 0.5, 0.62, 0, 0.06, 0.06, 0.06);
      pivot.userData.phase = Math.random() * 6;
      this.antennae.push(pivot);
    }

    if (o.lashes) for (const s of [-1, 1]) {
      const l = mesh(G.box(), black, this.head, s * 0.3, 0.17, 0.36, 0.08, 0.02, 0.02);
      l.rotation.z = s * 0.5;
    }
    if (o.mustache) for (const s of [-1, 1]) {
      const m = mesh(G.sphereLow(), toon('#2a1a10'), this.head, s * 0.08, -0.08, 0.46, 0.09, 0.03, 0.03);
      m.rotation.z = s * 0.3;
    }

    this.accGroup = new THREE.Group();
    this.torso.add(this.accGroup);
    this.setAccessories(o.accessories || []);

    // 나이에 따른 크기
    let sc = 0.78;
    if (age < 8) { sc = 0.48; this.head.scale.setScalar(1.18); }
    else if (age < 13) { sc = 0.56; this.head.scale.setScalar(1.12); }
    else if (age < 18) { sc = 0.68; this.head.scale.setScalar(1.05); }
    else if (age >= 70) sc = 0.72;
    this.baseScale = sc;
    this.root.scale.setScalar(sc);
    this.height = 2.45 * sc;

    this.t = Math.random() * 10;
    this.phase = 0;
    this.blinkT = 2 + Math.random() * 3;
    this.waveT = 0;
    this.talking = false;
    this.emotion = 'neutral';
    this.emotionT = 0;
    this.jumpSquash = 0;
    this.far = null;
    this.detailsDirty = true;
  }

  // 멀리 있으면 얼굴 디테일과 그림자를 끈다
  setLod(far) {
    if (this.detailsDirty) {
      this.details = [];
      this.meshes = [];
      this.root.traverse((o) => {
        if (!o.isMesh) return;
        this.meshes.push(o);
        if ((Math.max(o.scale.x, o.scale.y, o.scale.z) < 0.13 && !this.pupils.includes(o)) || o.parent === this.accGroup) this.details.push(o);
      });
      this.detailsDirty = false;
      this.far = null;
    }
    if (far === this.far) return;
    this.far = far;
    for (const m of this.details) m.visible = !far;
    this.mouthO.visible = !far && this.mouthO.userData.on === true;
    for (const m of this.meshes) m.castShadow = !far;
  }

  setAccessories(list) {
    this.accGroup.clear();
    this.detailsDirty = true;
    this.hasCane = false;
    const g = this.accGroup;
    const H = 1.95; // 머리 중심 높이
    for (const a of list) {
      const [kind, col] = a.split(':');
      const c = col || '#ffffff';
      switch (kind) {
        case 'chef':
          mesh(G.cyl(), toon('#ffffff'), g, 0, H + 0.48, 0, 0.27, 0.3, 0.27);
          mesh(rsph(), toon('#ffffff'), g, 0, H + 0.68, 0, 0.36, 0.2, 0.36);
          break;
        case 'police':
          mesh(G.cyl(), toon('#23356b'), g, 0, H + 0.44, 0, 0.36, 0.18, 0.36);
          mesh(G.cyl(), toon('#1a2547'), g, 0, H + 0.37, 0.12, 0.38, 0.03, 0.38);
          mesh(G.sphereLow(), toon('#ffd54f'), g, 0, H + 0.45, 0.36, 0.07, 0.07, 0.03);
          break;
        case 'fire':
          mesh(G.hemi(), toon('#e53935'), g, 0, H + 0.28, 0, 0.44, 0.38, 0.44);
          mesh(G.cyl(), toon('#c62828'), g, 0, H + 0.28, 0.03, 0.56, 0.03, 0.56);
          mesh(G.box(), toon('#ffd54f'), g, 0, H + 0.48, 0.4, 0.14, 0.14, 0.03);
          break;
        case 'hard':
          mesh(G.hemi(), toon('#ffca28'), g, 0, H + 0.3, 0, 0.42, 0.36, 0.42);
          mesh(G.cyl(), toon('#ffb300'), g, 0, H + 0.3, 0.06, 0.5, 0.025, 0.5);
          break;
        case 'nurse':
          mesh(G.box(), toon('#ffffff'), g, 0, H + 0.45, 0.1, 0.36, 0.14, 0.2);
          mesh(G.box(), toon('#e53935'), g, 0, H + 0.45, 0.205, 0.1, 0.03, 0.01);
          mesh(G.box(), toon('#e53935'), g, 0, H + 0.45, 0.205, 0.03, 0.1, 0.01);
          break;
        case 'beret': {
          const b = mesh(rsph(), toon(c), g, 0.06, H + 0.4, 0, 0.42, 0.12, 0.42);
          b.rotation.z = -0.2;
          break;
        }
        case 'cap':
          mesh(G.hemi(), toon(c), g, 0, H + 0.25, 0, 0.44, 0.3, 0.44);
          mesh(G.box(), toon(c), g, 0, H + 0.27, 0.45, 0.4, 0.03, 0.25);
          break;
        case 'top':
          mesh(G.cyl(), toon('#1b1b1b'), g, 0, H + 0.62, 0, 0.24, 0.5, 0.24);
          mesh(G.cyl(), toon('#1b1b1b'), g, 0, H + 0.39, 0, 0.38, 0.03, 0.38);
          mesh(G.cyl(), toon('#c62828'), g, 0, H + 0.45, 0, 0.245, 0.07, 0.245);
          break;
        case 'grad':
          mesh(G.box(), toon('#1b1b1b'), g, 0, H + 0.48, 0, 0.62, 0.04, 0.62);
          mesh(G.cyl(), toon('#1b1b1b'), g, 0, H + 0.4, 0, 0.26, 0.14, 0.26);
          break;
        case 'headband':
          mesh(G.cyl(), toon(c), g, 0, H + 0.18, 0, 0.5, 0.09, 0.48);
          break;
        case 'bow':
          mesh(G.sphereLow(), toon(c), g, 0.22, H + 0.4, 0.05, 0.12, 0.08, 0.05);
          mesh(G.sphereLow(), toon(c), g, 0.38, H + 0.4, 0.05, 0.12, 0.08, 0.05);
          mesh(G.sphereLow(), toon(c), g, 0.3, H + 0.4, 0.07, 0.05, 0.05, 0.05);
          break;
        case 'headphones': {
          mesh(smileGeo(), toon('#333333'), g, 0, H + 0.04, 0, 6.8, 6.4, 2);
          for (const s of [-1, 1]) mesh(G.cyl(), toon('#ff5c8a'), g, s * 0.49, H, 0, 0.13, 0.08, 0.13).rotation.z = Math.PI / 2;
          break;
        }
        case 'glasses':
          for (const s of [-1, 1]) mesh(ringGeo(), toon('#333333'), g, s * 0.19, H + 0.05, 0.53);
          mesh(G.box(), toon('#333333'), g, 0, H + 0.07, 0.54, 0.1, 0.02, 0.02);
          break;
        case 'sunglasses':
          for (const s of [-1, 1]) mesh(rsph(), toon('#111111'), g, s * 0.19, H + 0.05, 0.53, 0.15, 0.11, 0.04);
          mesh(G.box(), toon('#111111'), g, 0, H + 0.09, 0.55, 0.16, 0.025, 0.02);
          break;
        case 'mirror': {
          const d = mesh(G.cyl(), toon('#dfe6ee'), g, 0, H + 0.3, 0.43, 0.1, 0.02, 0.1);
          d.rotation.x = Math.PI / 2 - 0.4;
          break;
        }
        case 'tie':
          mesh(G.box(), toon(c), g, 0, 1.33, 0.44, 0.08, 0.3, 0.03).rotation.x = -0.15;
          mesh(G.sphereLow(), toon(c), g, 0, 1.52, 0.4, 0.06, 0.05, 0.04);
          break;
        case 'bowtie':
          mesh(G.sphereLow(), toon('#c62828'), g, -0.07, 1.55, 0.4, 0.08, 0.05, 0.03);
          mesh(G.sphereLow(), toon('#c62828'), g, 0.07, 1.55, 0.4, 0.08, 0.05, 0.03);
          break;
        case 'apron':
          mesh(rsph(), toon(c), g, 0, 0.98, 0.24, 0.38, 0.45, 0.22);
          break;
        case 'coat':
          mesh(rsph(), toon(c), g, 0, 1.03, -0.02, 0.53, 0.63, 0.45);
          mesh(rsph(), toon(shade(color(c), 0.9)), g, 0, 1.0, 0.25, 0.2, 0.5, 0.2);
          break;
        case 'robe':
          mesh(rsph(), toon('#1b1b2f'), g, 0, 0.95, 0, 0.56, 0.7, 0.48);
          mesh(G.box(), toon('#ffffff'), g, 0, 1.45, 0.38, 0.14, 0.12, 0.04);
          break;
        case 'vest':
          mesh(rsph(), toon('#ff8a3d'), g, 0, 1.15, 0, 0.52, 0.42, 0.44);
          mesh(G.cyl(), toon('#fff176'), g, 0, 1.12, 0, 0.53, 0.05, 0.45);
          break;
        case 'sash': {
          const s = mesh(G.box(), toon('#d32f2f'), g, 0, 1.1, 0.02, 0.12, 1.1, 0.9);
          s.rotation.z = 0.7;
          break;
        }
        case 'stethoscope': {
          const t = mesh(ringGeo(), toon('#455a64'), g, 0, 1.45, 0.25, 2.2, 2.2, 2.2);
          t.rotation.x = Math.PI / 2 + 0.4;
          break;
        }
        case 'scarf': {
          const t = mesh(ringGeo(), toon(c), g, 0, 1.55, 0, 3.6, 3.6, 5);
          t.rotation.x = Math.PI / 2;
          mesh(G.box(), toon(c), g, 0.15, 1.35, 0.4, 0.1, 0.3, 0.04);
          break;
        }
        case 'backpack':
          mesh(G.box(), toon(c), g, 0, 1.1, -0.48, 0.5, 0.55, 0.25);
          mesh(G.box(), toon(shade(color(c), 0.8)), g, 0, 0.95, -0.62, 0.36, 0.22, 0.06);
          break;
        case 'bag':
          mesh(G.box(), toon('#795548'), g, 0.45, 0.85, 0.05, 0.14, 0.32, 0.36);
          break;
        // ---------------- 모자 ----------------
        case 'beanie':
          mesh(G.hemi(), toon(c), g, 0, H + 0.1, 0, 0.5, 0.44, 0.5);
          mesh(G.cyl(), toon(shade(color(c), 0.8)), g, 0, H + 0.13, 0, 0.51, 0.12, 0.51);
          mesh(G.sphereLow(), toon('#ffffff'), g, 0, H + 0.57, 0, 0.11, 0.11, 0.11);
          break;
        case 'catears':
          mesh(G.cyl(), toon('#333333'), g, 0, H + 0.38, 0, 0.42, 0.04, 0.3);
          for (const sx of [-1, 1]) {
            const e = mesh(G.cone(), toon('#333333'), g, sx * 0.26, H + 0.58, 0, 0.13, 0.3, 0.1);
            e.rotation.z = -sx * 0.35;
            const i = mesh(G.cone(), toon('#ff9fb2'), g, sx * 0.25, H + 0.56, 0.04, 0.07, 0.18, 0.05);
            i.rotation.z = -sx * 0.35;
          }
          break;
        case 'cowboy':
          mesh(G.cyl(), toon('#a1887f'), g, 0, H + 0.36, 0, 0.7, 0.04, 0.62);
          mesh(G.cyl(), toon('#a1887f'), g, 0, H + 0.55, 0, 0.3, 0.36, 0.3);
          mesh(G.cyl(), toon('#5d4037'), g, 0, H + 0.42, 0, 0.31, 0.07, 0.31);
          break;
        case 'flowercrown': {
          const t = mesh(ringGeo(), toon('#66bb6a'), g, 0, H + 0.34, 0, 4.2, 4.2, 3);
          t.rotation.x = Math.PI / 2;
          const fc = ['#ff80ab', '#ffeb3b', '#ffffff', '#ce93d8', '#ff8a65', '#80d8ff', '#ff80ab', '#ffeb3b'];
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            mesh(G.sphereLow(), toon(fc[i]), g, Math.sin(a) * 0.42, H + 0.37, Math.cos(a) * 0.42, 0.09, 0.07, 0.09);
          }
          break;
        }
        case 'pirate':
          mesh(G.box(), toon('#212121'), g, 0, H + 0.5, 0, 0.95, 0.32, 0.36);
          mesh(G.cyl(), toon('#212121'), g, 0, H + 0.38, 0, 0.44, 0.08, 0.44);
          mesh(G.box(), toon('#ffd54f'), g, 0, H + 0.62, 0.02, 0.97, 0.04, 0.37);
          mesh(G.sphereLow(), toon('#ffffff'), g, 0, H + 0.5, 0.19, 0.08, 0.08, 0.03);
          break;
        case 'wizard':
          mesh(G.cyl(), toon('#5e35b1'), g, 0, H + 0.36, 0, 0.62, 0.04, 0.62);
          mesh(G.cone(), toon('#5e35b1'), g, 0, H + 0.85, 0, 0.38, 1.0, 0.38).rotation.z = 0.15;
          mesh(G.sphereLow(), toon('#ffd54f', { emissive: '#ffd54f', emissiveIntensity: 0.5 }), g, 0.05, H + 0.75, 0.33, 0.07, 0.07, 0.03);
          break;
        case 'crown':
          mesh(G.cyl(), toon('#ffca28', { emissive: '#ff8f00', emissiveIntensity: 0.25 }), g, 0, H + 0.48, 0, 0.32, 0.2, 0.32);
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            mesh(G.cone(), toon('#ffca28', { emissive: '#ff8f00', emissiveIntensity: 0.25 }), g, Math.sin(a) * 0.27, H + 0.66, Math.cos(a) * 0.27, 0.07, 0.18, 0.07);
          }
          mesh(G.sphereLow(), toon('#e53935'), g, 0, H + 0.48, 0.32, 0.06, 0.06, 0.03);
          break;
        // ---------------- 안경 ----------------
        case 'heartglasses':
          for (const sx of [-1, 1]) {
            mesh(G.sphereLow(), toon('#ff4f81'), g, sx * 0.19 - 0.04, H + 0.08, 0.53, 0.09, 0.09, 0.04);
            mesh(G.sphereLow(), toon('#ff4f81'), g, sx * 0.19 + 0.04, H + 0.08, 0.53, 0.09, 0.09, 0.04);
            mesh(G.cone(), toon('#ff4f81'), g, sx * 0.19, H - 0.02, 0.53, 0.12, 0.12, 0.04).rotation.z = Math.PI;
          }
          mesh(G.box(), toon('#ff4f81'), g, 0, H + 0.08, 0.54, 0.12, 0.025, 0.02);
          break;
        case 'starglasses':
          for (const sx of [-1, 1]) {
            const st = new THREE.Mesh(geo('star5', () => new THREE.CylinderGeometry(1, 1, 1, 5)), toon('#ffeb3b'));
            st.scale.set(0.16, 0.04, 0.16); st.position.set(sx * 0.19, H + 0.05, 0.54); st.rotation.x = Math.PI / 2;
            g.add(st);
          }
          mesh(G.box(), toon('#ffeb3b'), g, 0, H + 0.08, 0.55, 0.12, 0.025, 0.02);
          break;
        case 'monocle':
          mesh(ringGeo(), toon('#ffca28'), g, 0.19, H + 0.05, 0.54, 1.1, 1.1, 1.1);
          mesh(G.cylLow(), toon('#ffca28'), g, 0.27, H - 0.2, 0.5, 0.01, 0.45, 0.01);
          break;
        case 'vr':
          mesh(G.box(), toon('#f5f5f5'), g, 0, H + 0.06, 0.45, 0.72, 0.28, 0.26);
          mesh(G.box(), toon('#263238'), g, 0, H + 0.06, 0.585, 0.62, 0.2, 0.02);
          mesh(G.cyl(), toon('#424242'), g, 0, H + 0.06, 0, 0.5, 0.06, 0.48);
          break;
        case 'goldshades':
          for (const sx of [-1, 1]) {
            mesh(G.sphere(), toon('#3e2723'), g, sx * 0.19, H + 0.05, 0.53, 0.16, 0.12, 0.04);
            mesh(ringGeo(), toon('#ffca28', { emissive: '#ff8f00', emissiveIntensity: 0.3 }), g, sx * 0.19, H + 0.05, 0.545, 1.5, 1.15, 1);
          }
          mesh(G.box(), toon('#ffca28'), g, 0, H + 0.09, 0.55, 0.16, 0.03, 0.02);
          break;
        case 'goggles':
          mesh(G.cyl(), toon('#37474f'), g, 0, H + 0.08, 0, 0.5, 0.08, 0.48);
          for (const sx of [-1, 1]) mesh(G.cyl(), toon('#ff9800'), g, sx * 0.19, H + 0.08, 0.5, 0.13, 0.1, 0.13).rotation.x = Math.PI / 2;
          break;
        // ---------------- 옷 ----------------
        case 'hoodie':
          mesh(rsph(), toon(c), g, 0, 1.03, 0, 0.54, 0.62, 0.46);
          mesh(rsph(), toon(shade(color(c), 0.85)), g, 0, H - 0.3, -0.32, 0.44, 0.3, 0.24);
          mesh(G.box(), toon(shade(color(c), 0.8)), g, 0, 0.85, 0.42, 0.42, 0.18, 0.06);
          break;
        case 'leather':
          mesh(rsph(), toon('#212121'), g, 0, 1.03, 0, 0.54, 0.62, 0.46);
          for (const sx of [-1, 1]) mesh(G.box(), toon('#212121'), g, sx * 0.16, 1.5, 0.33, 0.18, 0.2, 0.06).rotation.z = sx * 0.4;
          mesh(G.box(), toon('#cfd8dc'), g, 0.05, 1.05, 0.45, 0.03, 0.7, 0.02);
          break;
        case 'hanbok':
          mesh(rsph(), toon('#ffcdd2'), g, 0, 1.22, 0, 0.54, 0.38, 0.46);
          mesh(G.cone(), toon('#5c6bc0'), g, 0, 0.72, 0, 0.62, 0.9, 0.55);
          mesh(G.box(), toon('#e53935'), g, 0.08, 1.15, 0.45, 0.06, 0.32, 0.03);
          mesh(G.box(), toon('#ffffff'), g, 0, 1.45, 0.38, 0.2, 0.06, 0.06).rotation.z = 0.5;
          break;
        case 'tuxedo': case 'suit':
          mesh(rsph(), toon('#1b1b1b'), g, 0, 1.03, 0, 0.54, 0.62, 0.46);
          mesh(rsph(), toon('#ffffff'), g, 0, 1.15, 0.28, 0.17, 0.42, 0.2);
          mesh(G.sphereLow(), toon('#1b1b1b'), g, -0.07, 1.52, 0.42, 0.08, 0.05, 0.03);
          mesh(G.sphereLow(), toon('#1b1b1b'), g, 0.07, 1.52, 0.42, 0.08, 0.05, 0.03);
          break;
        case 'dress':
          mesh(rsph(), toon(c), g, 0, 1.2, 0, 0.53, 0.4, 0.46);
          mesh(G.cone(), toon(c), g, 0, 0.72, 0, 0.66, 0.95, 0.6);
          mesh(G.cyl(), toon('#ffffff'), g, 0, 1.0, 0, 0.5, 0.06, 0.44);
          break;
        case 'princess':
          mesh(rsph(), toon('#f8bbd0'), g, 0, 1.2, 0, 0.53, 0.4, 0.46);
          mesh(G.cone(), toon('#f48fb1'), g, 0, 0.66, 0, 0.85, 1.05, 0.8);
          for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; mesh(G.sphereLow(), toon('#ffffff'), g, Math.sin(a) * 0.7, 0.25, Math.cos(a) * 0.66, 0.1, 0.08, 0.1); }
          mesh(G.cone(), toon('#ffd54f', { emissive: '#ffb300', emissiveIntensity: 0.3 }), g, 0, H + 0.48, 0.1, 0.12, 0.18, 0.05);
          break;
        case 'idol':
          mesh(rsph(), toon('#e040fb'), g, 0, 1.03, 0, 0.54, 0.62, 0.46);
          for (let i = 0; i < 10; i++) mesh(G.sphereLow(), toon('#ffffff', { emissive: '#ffffff', emissiveIntensity: 0.4 }), g, Math.sin(i * 2.4) * 0.38, 0.75 + (i % 5) * 0.13, 0.36 + Math.cos(i * 1.3) * 0.05, 0.04, 0.04, 0.03);
          mesh(G.cone(), toon('#ffd54f'), g, 0, 1.25, 0.46, 0.1, 0.14, 0.03);
          break;
        case 'goldsuit':
          mesh(rsph(), toon('#ffca28', { emissive: '#ff8f00', emissiveIntensity: 0.25 }), g, 0, 1.03, 0, 0.54, 0.62, 0.46);
          mesh(rsph(), toon('#212121'), g, 0, 1.15, 0.28, 0.17, 0.42, 0.2);
          mesh(G.box(), toon('#ffca28'), g, 0, 1.25, 0.47, 0.07, 0.3, 0.03);
          break;
        case 'dobok':
          mesh(rsph(), toon('#fafafa'), g, 0, 1.03, 0, 0.54, 0.62, 0.46);
          mesh(G.box(), toon('#e0e0e0'), g, 0, 1.3, 0.4, 0.06, 0.4, 0.03).rotation.z = 0.5;
          mesh(G.cyl(), toon('#212121'), g, 0, 0.92, 0, 0.52, 0.09, 0.45);
          break;
        // ---------------- 갑옷 & 투구 ----------------
        case 'helm_leather':
          mesh(G.hemi(), toon('#8d6e63'), g, 0, H + 0.12, 0, 0.52, 0.44, 0.52);
          mesh(G.cyl(), toon('#6d4c41'), g, 0, H + 0.14, 0, 0.54, 0.08, 0.54);
          break;
        case 'helm_iron':
          mesh(G.hemi(), toon('#90a4ae'), g, 0, H + 0.12, 0, 0.53, 0.46, 0.53);
          mesh(G.box(), toon('#78909c'), g, 0, H + 0.05, 0.5, 0.06, 0.32, 0.05);
          mesh(G.cone(), toon('#b0bec5'), g, 0, H + 0.66, 0, 0.06, 0.2, 0.06);
          break;
        case 'helm_general':
          mesh(G.hemi(), toon('#ffb300'), g, 0, H + 0.12, 0, 0.53, 0.46, 0.53);
          mesh(G.cyl(), toon('#c62828'), g, 0, H + 0.14, 0, 0.55, 0.08, 0.55);
          mesh(G.cylLow(), toon('#ffb300'), g, 0, H + 0.68, 0, 0.03, 0.2, 0.03);
          mesh(G.sphereLow(), toon('#e53935'), g, 0, H + 0.82, -0.08, 0.16, 0.2, 0.16);
          for (const sx of [-1, 1]) mesh(G.box(), toon('#ffb300'), g, sx * 0.5, H - 0.05, 0, 0.06, 0.32, 0.3);
          break;
        case 'kevlar_helmet':
          mesh(G.hemi(), toon('#556b2f'), g, 0, H + 0.1, 0, 0.54, 0.47, 0.54);
          mesh(G.cyl(), toon('#4a5d23'), g, 0, H + 0.12, 0, 0.56, 0.06, 0.56);
          mesh(G.box(), toon('#33401a'), g, 0, H + 0.3, 0.45, 0.25, 0.1, 0.06);
          break;
        case 'storm_helmet':
          mesh(rsph(), toon('#fafafa'), g, 0, H + 0.04, 0, 0.55, 0.52, 0.53);
          for (const sx of [-1, 1]) mesh(G.sphere(), toon('#212121'), g, sx * 0.18, H + 0.08, 0.47, 0.13, 0.09, 0.05);
          mesh(G.box(), toon('#424242'), g, 0, H - 0.2, 0.48, 0.22, 0.12, 0.05);
          break;
        case 'armor_leather':
          mesh(rsph(), toon('#8d6e63'), g, 0, 1.1, 0, 0.54, 0.52, 0.46);
          for (const sx of [-1, 1]) mesh(G.sphere(), toon('#6d4c41'), g, sx * 0.42, 1.38, 0, 0.2, 0.14, 0.22);
          break;
        case 'armor_iron':
          mesh(rsph(), toon('#90a4ae'), g, 0, 1.1, 0, 0.55, 0.54, 0.47);
          mesh(rsph(), toon('#b0bec5'), g, 0, 1.15, 0.24, 0.36, 0.38, 0.25);
          for (const sx of [-1, 1]) mesh(G.sphere(), toon('#78909c'), g, sx * 0.43, 1.4, 0, 0.22, 0.15, 0.24);
          break;
        case 'armor_legend': {
          const gold = toon('#ffca28', { emissive: '#ff6f00', emissiveIntensity: 0.35 });
          mesh(rsph(), gold, g, 0, 1.1, 0, 0.56, 0.55, 0.48);
          for (let r = 0; r < 4; r++) for (let i = -2; i <= 2; i++) mesh(G.sphereLow(), toon('#ffe082'), g, i * 0.11, 0.85 + r * 0.14, 0.42 - Math.abs(i) * 0.03, 0.06, 0.05, 0.03);
          for (const sx of [-1, 1]) { mesh(G.sphere(), gold, g, sx * 0.45, 1.42, 0, 0.25, 0.17, 0.26); mesh(G.cone(), toon('#e53935'), g, sx * 0.5, 1.6, 0, 0.05, 0.18, 0.05); }
          mesh(G.box(), toon('#c62828'), g, 0, 0.9, -0.45, 0.8, 1.1, 0.04);
          break;
        }
        case 'vest_kevlar':
          mesh(rsph(), toon('#4a5d23'), g, 0, 1.15, 0, 0.55, 0.45, 0.47);
          for (const sx of [-0.2, 0, 0.2]) mesh(G.box(), toon('#33401a'), g, sx, 0.98, 0.43, 0.14, 0.18, 0.08);
          break;
        case 'jedi_robe':
          mesh(rsph(), toon('#6d4c41'), g, 0, 1.0, 0, 0.58, 0.68, 0.5);
          mesh(rsph(), toon('#efebe9'), g, 0, 1.12, 0.26, 0.2, 0.46, 0.22);
          mesh(G.cyl(), toon('#3e2723'), g, 0, 0.95, 0, 0.55, 0.08, 0.48);
          mesh(rsph(), toon('#6d4c41'), g, 0, H - 0.25, -0.33, 0.45, 0.3, 0.24);
          break;
        case 'mando_armor': {
          const steel = toon('#cfd8dc');
          mesh(rsph(), toon('#5d4037'), g, 0, 1.03, 0, 0.54, 0.62, 0.46);
          mesh(rsph(), steel, g, -0.13, 1.2, 0.28, 0.2, 0.25, 0.18);
          mesh(rsph(), steel, g, 0.13, 1.2, 0.28, 0.2, 0.25, 0.18);
          for (const sx of [-1, 1]) mesh(G.sphere(), steel, g, sx * 0.43, 1.4, 0, 0.22, 0.15, 0.24);
          mesh(G.box(), toon('#78909c'), g, 0, 1.15, -0.5, 0.5, 0.5, 0.2);
          break;
        }
        // ---------------- 액세서리 ----------------
        case 'wings': {
          const wm = new THREE.MeshToonMaterial({ color: '#b39ddb', transparent: true, opacity: 0.8, gradientMap: this.bodyM.gradientMap });
          for (const sx of [-1, 1]) {
            mesh(G.sphere(), wm, g, sx * 0.55, 1.35, -0.5, 0.5, 0.42, 0.04).rotation.y = sx * 0.4;
            mesh(G.sphere(), toon('#f48fb1'), g, sx * 0.45, 0.9, -0.48, 0.32, 0.28, 0.04).rotation.y = sx * 0.4;
          }
          break;
        }
        case 'pearls':
          for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2;
            mesh(G.sphereLow(), toon('#fafafa'), g, Math.sin(a) * 0.32, 1.55 - Math.max(0, Math.cos(a)) * 0.12, Math.cos(a) * 0.3, 0.045, 0.045, 0.045);
          }
          break;
        case 'cane':
          this.hasCane = true;
          mesh(G.cylLow(), toon('#6d4c41'), g, 0.62, 0.5, 0.25, 0.035, 1.0, 0.035);
          break;
      }
    }
  }

  setEmotion(e, duration = 4) {
    this.emotion = e;
    this.emotionT = duration;
    const happy = e === 'happy' || e === 'love';
    for (const eye of this.eyes) eye.scale.set(1, happy ? 0.55 : e === 'surprised' || e === 'scared' ? 1.25 : 1, 1);
    for (const p of this.pupils) p.material = toon(e === 'love' ? '#ff4f81' : '#1d1410');
    this.mouth.rotation.z = e === 'sad' || e === 'angry' ? 0 : Math.PI;
    this.mouth.position.y = e === 'sad' || e === 'angry' ? -0.2 : -0.15;
    this.mouth.visible = !(e === 'surprised' || e === 'scared');
    this.mouthO.visible = !this.mouth.visible;
    this.mouthO.userData.on = this.mouthO.visible;
    for (const b of this.brows) b.visible = e === 'angry';
  }

  wave() { this.waveT = 1.6; }

  // 손에 드는 무기/인형
  setHeld(spec) {
    if (spec === this.heldSpec) return;
    this.heldSpec = spec;
    const g = this.heldGroup;
    g.clear();
    this.detailsDirty = true;
    this.heldPose = 'none';
    if (!spec) return;
    const [kind, col] = spec.split(':');
    const c = col || '#cfd8dc';
    const dark = toon('#263238'), wood = toon('#6d4c41');
    // 손 기준 -y 방향이 앞(팔을 들면 정면)
    const blade = (len, w, color) => { mesh(G.cylLow(), wood, g, 0, 0.12, 0, 0.04, 0.3, 0.04); mesh(G.box(), toon('#ffca28'), g, 0, -0.04, 0, 0.26, 0.05, 0.08); mesh(G.box(), toon(color), g, 0, -0.06 - len / 2, 0, w, len, 0.025); };
    switch (kind) {
      case 'sword': blade(1.25, 0.1, c); this.heldPose = 'melee'; break;
      case 'knife': blade(0.45, 0.08, '#eceff1'); this.heldPose = 'melee'; break;
      case 'spear':
        mesh(G.cylLow(), wood, g, 0, -0.7, 0, 0.035, 2.6, 0.035);
        mesh(G.cone(), toon(c), g, 0, -2.15, 0, 0.08, 0.35, 0.03).rotation.x = Math.PI;
        this.heldPose = 'melee'; break;
      case 'halberd':
        mesh(G.cylLow(), wood, g, 0, -0.7, 0, 0.035, 2.6, 0.035);
        mesh(G.cone(), toon('#cfd8dc'), g, 0, -2.15, 0, 0.07, 0.35, 0.03).rotation.x = Math.PI;
        mesh(new THREE.TorusGeometry(0.22, 0.04, 6, 12, Math.PI), toon('#cfd8dc'), g, 0.2, -1.85, 0).rotation.z = Math.PI / 2;
        mesh(G.box(), toon(c), g, 0, -1.6, 0, 0.12, 0.12, 0.12);
        this.heldPose = 'melee'; break;
      case 'glaive': {
        mesh(G.cylLow(), toon('#8d1b1b'), g, 0, -0.75, 0, 0.04, 2.7, 0.04);
        const bl = mesh(G.box(), toon('#e0e0e0'), g, 0.14, -2.2, 0, 0.26, 0.75, 0.03);
        bl.rotation.z = 0.25;
        mesh(G.sphereLow(), toon(c), g, 0, -1.9, 0, 0.11, 0.13, 0.11);
        mesh(G.cone(), toon(c), g, 0.05, -1.95, 0.1, 0.05, 0.12, 0.05);
        this.heldPose = 'melee'; break;
      }
      case 'saber': {
        mesh(G.cylLow(), toon('#b0bec5'), g, 0, 0.05, 0, 0.05, 0.32, 0.05);
        const core = new THREE.Mesh(G.cylLow(), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
        core.scale.set(0.035, 1.5, 0.035); core.position.y = -0.85; g.add(core);
        const glow = new THREE.Mesh(G.cylLow(), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
        glow.scale.set(0.08, 1.55, 0.08); glow.position.y = -0.85; g.add(glow);
        this.heldPose = 'melee'; break;
      }
      case 'pistol': case 'blaster':
        mesh(G.box(), kind === 'blaster' ? toon('#37474f') : dark, g, 0, 0.0, -0.08, 0.1, 0.12, 0.22);
        mesh(G.box(), kind === 'blaster' ? toon('#37474f') : dark, g, 0, -0.22, 0.02, 0.1, 0.45, 0.13);
        if (kind === 'blaster') mesh(G.cylLow(), toon('#ff5252', { emissive: '#ff1744' }), g, 0, -0.46, 0.02, 0.04, 0.08, 0.04);
        this.heldPose = 'gun'; break;
      case 'rifle': case 'blaster_rifle': case 'shotgun': case 'sniper': {
        const body = kind === 'shotgun' ? wood : kind === 'blaster_rifle' ? toon('#eceff1') : dark;
        const len = kind === 'sniper' ? 1.5 : kind === 'shotgun' ? 1.0 : 1.05;
        mesh(G.box(), body, g, 0, -0.15, 0.02, 0.12, 0.7, 0.16);
        mesh(G.cylLow(), dark, g, 0, -0.5 - len / 2 + 0.35, 0.03, 0.035, len, 0.035);
        mesh(G.box(), body, g, 0, 0.35, 0.05, 0.1, 0.35, 0.2);
        if (kind === 'rifle' || kind === 'blaster_rifle') mesh(G.box(), dark, g, 0, -0.18, -0.12, 0.08, 0.1, 0.22);
        if (kind === 'sniper') mesh(G.cylLow(), dark, g, 0, -0.2, 0.15, 0.05, 0.4, 0.05);
        if (kind === 'blaster_rifle') mesh(G.box(), toon('#ff1744', { emissive: '#ff1744' }), g, 0, -0.3, 0.1, 0.13, 0.08, 0.05);
        this.heldPose = 'gun'; break;
      }
      case 'minigun':
        mesh(G.box(), dark, g, 0, 0.0, 0.02, 0.22, 0.4, 0.25);
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; mesh(G.cylLow(), toon('#455a64'), g, Math.sin(a) * 0.07, -0.65, 0.03 + Math.cos(a) * 0.07, 0.025, 0.9, 0.025); }
        this.heldPose = 'heavy'; break;
      case 'rpg': case 'ion': {
        const tube = kind === 'ion' ? toon('#eceff1') : toon('#556b2f');
        mesh(G.cylLow(), tube, g, 0, -0.35, 0.05, 0.11, 1.5, 0.11);
        if (kind === 'ion') mesh(G.cylLow(), toon('#18ffff', { emissive: '#18ffff', emissiveIntensity: 0.8 }), g, 0, -1.1, 0.05, 0.12, 0.1, 0.12);
        else mesh(G.cone(), toon('#795548'), g, 0, -1.25, 0.05, 0.1, 0.3, 0.1).rotation.x = Math.PI;
        this.heldPose = 'heavy'; break;
      }
      case 'bow': {
        const b = mesh(new THREE.TorusGeometry(0.6, 0.03, 6, 16, Math.PI), wood, g, 0, -0.1, 0);
        b.rotation.y = Math.PI / 2; b.rotation.x = Math.PI / 2;
        mesh(G.cylLow(), toon('#fafafa'), g, 0, -0.1, 0, 0.008, 0.01, 1.2).rotation.x = Math.PI / 2;
        this.heldPose = 'gun'; break;
      }
      case 'grenade':
        mesh(G.sphereLow(), toon('#558b2f'), g, 0, -0.08, 0, 0.13, 0.15, 0.13);
        mesh(G.box(), toon('#9e9e9e'), g, 0, 0.06, 0, 0.06, 0.06, 0.06);
        this.heldPose = 'none'; break;
      case 'thermal':
        mesh(G.sphereLow(), toon('#b0bec5'), g, 0, -0.08, 0, 0.14, 0.14, 0.14);
        mesh(G.sphereLow(), toon('#ff5252', { emissive: '#ff1744' }), g, 0, -0.08, 0.12, 0.04, 0.04, 0.04);
        this.heldPose = 'none'; break;
      case 'doll': {
        mesh(G.sphereLow(), toon(c), g, 0, -0.25, 0.15, 0.18, 0.2, 0.16);
        mesh(G.sphereLow(), toon(c), g, 0, -0.02, 0.15, 0.14, 0.13, 0.13);
        for (const sx of [-1, 1]) mesh(G.sphereLow(), toon(c), g, sx * 0.1, 0.1, 0.15, 0.05, 0.05, 0.05);
        for (const sx of [-1, 1]) mesh(G.sphereLow(), toon('#212121'), g, sx * 0.05, 0.0, 0.27, 0.02, 0.02, 0.02);
        this.heldPose = 'doll'; break;
      }
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }

  attack(kind = 'melee') { this.attackT = kind === 'melee' ? 0.3 : kind === 'throw' ? 0.35 : 0.12; this.attackKind = kind; this.attackDur = this.attackT; }

  hurt() {
    this.hurtT = 0.15;
    const red = toon('#ff5252');
    this.body.material = red; this.headMesh.material = red;
  }

  setDead(v) { this.dead = v; }
  setSeated(v) { this.seated = v; }

  /** speed: 현재 이동 속도 (m/s) */
  update(dt, speed = 0, opts = {}) {
    this.t += dt;
    const k = Math.min(1, speed / 3.2);
    this.phase += dt * (3 + speed * 2.6);
    const sw = Math.sin(this.phase);

    // 다리
    this.legs[0].rotation.x = sw * 0.75 * k;
    this.legs[1].rotation.x = -sw * 0.75 * k;
    // 팔
    for (let i = 0; i < 4; i++) {
      const a = this.arms[i];
      const s = i % 2 === 0 ? 1 : -1;
      const pair = i < 2 ? 0 : 1;
      a.rotation.x = (pair ? -1 : 1) * s * sw * 0.6 * k + Math.sin(this.t * 2 + i) * 0.05;
      a.rotation.z = a.userData.baseZ;
    }
    // 손 흔들기
    if (this.waveT > 0) {
      this.waveT -= dt;
      const a = this.arms[1];
      a.rotation.z = 2.5 + Math.sin(this.t * 14) * 0.35;
      a.rotation.x = 0;
    }
    // 몸 흔들림
    const bob = Math.abs(sw) * 0.07 * k;
    this.inner.position.y = bob;
    this.torso.rotation.z = sw * 0.05 * k;
    this.torso.rotation.x = k * 0.08;
    const breath = 1 + Math.sin(this.t * 2.2) * 0.015;
    this.body.scale.set(0.5 * breath, 0.62 / breath, 0.42 * breath);

    // 머리 (말할 때 끄덕)
    this.head.rotation.x = this.talking ? Math.sin(this.t * 9) * 0.08 : Math.sin(this.t * 1.3) * 0.03;
    this.head.rotation.z = Math.sin(this.t * 0.9) * 0.04;

    // 더듬이
    for (const a of this.antennae) {
      const ph = a.userData.phase;
      a.rotation.z = Math.sin(this.t * 3 + ph) * 0.1 + k * Math.sin(this.phase * 2) * 0.12;
      a.rotation.x = Math.sin(this.t * 2.3 + ph) * 0.12 - k * 0.15;
    }
    // 날개 살짝
    for (let i = 0; i < 2; i++) this.wings[i].rotation.y = (i ? 1 : -1) * (opts.airborne ? 0.6 + Math.sin(this.t * 40) * 0.3 : Math.sin(this.t * 1.5) * 0.03);

    // 깜빡임
    this.blinkT -= dt;
    if (this.blinkT < 0) {
      const blinkPhase = -this.blinkT;
      const happy = this.emotion === 'happy' || this.emotion === 'love';
      const base = happy ? 0.55 : this.emotion === 'surprised' || this.emotion === 'scared' ? 1.25 : 1;
      for (const e of this.eyes) e.scale.y = blinkPhase < 0.12 ? 0.1 : base;
      if (blinkPhase > 0.12) this.blinkT = 2 + Math.random() * 4;
    }
    // 감정 지속
    if (this.emotionT > 0) {
      this.emotionT -= dt;
      if (this.emotionT <= 0) this.setEmotion(this.baseEmotion || 'neutral', 0);
    }
    // 무기 자세
    const ar = this.arms[1], al = this.arms[0];
    if (this.heldPose === 'gun' || this.heldPose === 'heavy') {
      ar.rotation.x = -1.45; ar.rotation.z = 0.15;
      al.rotation.x = -1.3; al.rotation.z = -0.1;
    } else if (this.heldPose === 'melee' && this.waveT <= 0) {
      ar.rotation.x = -0.55 + Math.sin(this.t * 2) * 0.05;
    } else if (this.heldPose === 'doll') {
      ar.rotation.x = -1.0; ar.rotation.z = -0.2; al.rotation.x = -1.0; al.rotation.z = 0.2;
    }
    if (this.attackT > 0) {
      this.attackT -= dt;
      const p = 1 - Math.max(0, this.attackT) / this.attackDur;
      if (this.attackKind === 'melee') { ar.rotation.x = -2.9 + p * 2.7; ar.rotation.z = 0.3; this.torso.rotation.y = (0.5 - p) * 0.6; }
      else if (this.attackKind === 'throw') { ar.rotation.x = -2.6 + p * 2.0; }
      else { ar.rotation.x -= Math.sin(p * Math.PI) * 0.25; }
    } else this.torso.rotation.y = 0;
    // 춤
    if (this.dancing) {
      const d = Math.sin(this.t * 8);
      this.inner.position.y = Math.abs(d) * 0.15;
      this.torso.rotation.y = Math.sin(this.t * 4) * 0.4;
      for (let i = 0; i < 4; i++) { this.arms[i].rotation.z = this.arms[i].userData.baseZ * (1.5 + Math.sin(this.t * 8 + i) * 1.2); this.arms[i].rotation.x = -0.8 + Math.sin(this.t * 6 + i) * 0.5; }
      this.legs[0].rotation.x = d * 0.4; this.legs[1].rotation.x = -d * 0.4;
    }
    // 앉기 (운전석)
    if (this.seated) {
      this.legs[0].rotation.x = this.legs[1].rotation.x = -1.5;
      this.inner.position.y = 0;
      this.torso.rotation.x = 0;
    }
    // 쓰러짐
    this.inner.rotation.z = this.dead ? Math.PI / 2 * 0.92 : 0;
    if (this.dead) { this.inner.position.y = 0.42; for (const e of this.eyes) e.scale.y = 0.1; }
    // 피격 깜빡임
    if (this.hurtT > 0) {
      this.hurtT -= dt;
      if (this.hurtT <= 0) { this.body.material = this.bodyM; this.headMesh.material = this.bodyM; }
    }
    // 점프 찌그러짐
    if (this.jumpSquash > 0) {
      this.jumpSquash = Math.max(0, this.jumpSquash - dt * 4);
      const s = 1 - Math.sin(this.jumpSquash * Math.PI) * 0.15;
      this.inner.scale.set(2 - s, s, 2 - s);
    } else this.inner.scale.set(1, 1, 1);
  }
}

function color(c) { return c; }
