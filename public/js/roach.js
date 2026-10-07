import * as THREE from 'three';
import { toon, geo, G } from './utils.js';
import { DEFAULT_LOOK } from './look.js';

const rsph = () => geo('rsph', () => new THREE.SphereGeometry(1, 14, 10));
const limbGeo = () => geo('limb', () => new THREE.CapsuleGeometry(0.065, 0.32, 4, 8));
const legGeo = () => geo('leg', () => new THREE.CapsuleGeometry(0.1, 0.32, 4, 8));
const smileGeo = () => geo('smile', () => new THREE.TorusGeometry(0.07, 0.018, 6, 14, Math.PI));
const ringGeo = () => geo('ring', () => new THREE.TorusGeometry(0.1, 0.016, 6, 16));
const starGeo = () => geo('star', () => {
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 0.45 : 1, a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    if (i === 0) sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); else sh.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  sh.closePath();
  return new THREE.ExtrudeGeometry(sh, { depth: 0.4, bevelEnabled: false }).translate(0, 0, -0.2);
});
const heartGeo = () => geo('heart', () => {
  const sh = new THREE.Shape();
  sh.moveTo(0, -1); sh.bezierCurveTo(-1.4, 0, -1, 1.1, 0, 0.45); sh.bezierCurveTo(1, 1.1, 1.4, 0, 0, -1);
  return new THREE.ExtrudeGeometry(sh, { depth: 0.4, bevelEnabled: false }).translate(0, 0, -0.2);
});
const curlGeo = (side) => geo('curl' + side, () => {
  const pts = [];
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    const a = t * Math.PI * 3.2, r = 0.05 + (1 - t) * 0.12;
    pts.push(new THREE.Vector3(side * (t * 0.35 + Math.sin(a) * r * t), t * 0.5 + Math.cos(a) * r * t * 0.8, 0.08 * t));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.022, 5, false);
});
const droopGeo = (side) => geo('droop' + side, () => {
  const c = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(side * 0.18, 0.32, 0.08), new THREE.Vector3(side * 0.42, 0.34, 0.12), new THREE.Vector3(side * 0.6, 0.1, 0.1),
  ]);
  return new THREE.TubeGeometry(c, 14, 0.024, 5, false);
});
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
    const look = this.look = { ...DEFAULT_LOOK, ...(o.look || {}) };

    this.root = new THREE.Group();
    this.inner = new THREE.Group();
    this.root.add(this.inner);

    const bodyM = toon(color);
    this.bodyM = bodyM;
    const darkM = toon(shade(color, 0.72));
    const bellyM = toon(look.belly && look.belly !== 'auto' ? look.belly : shade(color, 1.45));
    const wingM = toon(shade(color, 0.85));
    const white = toon('#ffffff');
    const black = toon('#1d1410');

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
    this.buildWings(look.wings | 0, color, wingM);

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
    this.crawlK = 0; // 0 = 두 발로 걷기, 1 = 여섯 다리로 기어 달리기

    // 머리
    this.head = new THREE.Group();
    this.head.position.y = 1.95;
    this.torso.add(this.head);
    this.headMesh = mesh(rsph(), bodyM, this.head, 0, 0, 0, 0.5, 0.46, 0.47);
    this.pupilColor = look.pupil || '#1d1410';
    this.buildFace(look, color, darkM, white, black);

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

  // 날개 모양: 0 기본, 1 반짝 투명, 2 나비, 3 천사 깃털, 4 박쥐, 5 꼬마, 6 무지개, 7 접은 날개(딱지)
  buildWings(style, color, wingM) {
    const gm = this.gradient;
    const glassy = (c, op = 0.55) => new THREE.MeshToonMaterial({ color: c, transparent: true, opacity: op, emissive: c, emissiveIntensity: 0.15 });
    for (const s of [-1, 1]) {
      const w = new THREE.Group();
      w.position.set(s * 0.17, 1.12, -0.32);
      this.torso.add(w);
      this.wings.push(w);
      if (style === 2) { // 나비
        const a = mesh(rsph(), toon('#ff8fc8'), w, s * 0.32, 0.25, -0.05, 0.42, 0.4, 0.04); a.rotation.z = s * -0.4;
        const b = mesh(rsph(), toon('#b388ff'), w, s * 0.24, -0.25, -0.05, 0.28, 0.26, 0.04); b.rotation.z = s * 0.4;
        mesh(G.sphereLow(), toon('#ffffff'), w, s * 0.4, 0.32, -0.1, 0.09, 0.09, 0.02);
        mesh(G.sphereLow(), toon('#fff176'), w, s * 0.26, -0.26, -0.1, 0.07, 0.07, 0.02);
      } else if (style === 3) { // 천사
        for (let i = 0; i < 3; i++) {
          const f = mesh(rsph(), toon(i === 1 ? '#f5f5f5' : '#ffffff'), w, s * (0.1 + i * 0.07), 0.32 - i * 0.16, -0.1 - i * 0.03, 0.3 - i * 0.05, 0.11, 0.05);
          f.rotation.z = s * (1.0 - i * 0.3);
        }
      } else if (style === 4) { // 박쥐
        const m = toon('#4a2c5e');
        const a = mesh(rsph(), m, w, s * 0.36, 0.18, -0.05, 0.48, 0.3, 0.03); a.rotation.z = s * -0.25;
        for (let i = 0; i < 3; i++) mesh(rsph(), toon('#3a2048'), w, s * (0.12 + i * 0.22), -0.08, -0.05, 0.1, 0.12, 0.035);
      } else if (style === 6) { // 무지개
        ['#ff8a80', '#ffd180', '#ffff8d', '#b9f6ca', '#80d8ff', '#b388ff'].forEach((c, i) => {
          mesh(rsph(), toon(c), w, s * 0.05, 0.05 - i * 0.04, -0.02 - i * 0.012, 0.32 - i * 0.035, 0.62 - i * 0.07, 0.06);
        });
      } else {
        const sc = style === 5 ? 0.55 : 1;
        const mat = style === 1 ? glassy('#b3e5fc') : style === 7 ? toon(shade(color, 0.6)) : wingM;
        const main = mesh(rsph(), mat, w, 0, 0, 0, 0.3 * sc * (style === 7 ? 1.1 : 1), 0.62 * sc, style === 7 ? 0.14 : 0.1);
        main.rotation.set(0.12, 0, s * 0.12);
        if (style === 1) mesh(G.sphereLow(), glassy('#ffffff', 0.8), main, 0.25 * s, 0.35, 0.6, 0.15, 0.12, 0.3);
        else if (style !== 7) mesh(rsph(), toon(shade(color, 1.25)), main, 0.25 * s, 0.25, 0.6, 0.18, 0.2, 0.5);
        else mesh(G.sphereLow(), toon('#ffffff'), main, 0.3 * s, 0.4, 0.7, 0.12, 0.2, 0.2);
      }
    }
    void gm;
  }

  buildFace(look, color, darkM, white, black) {
    const H = this.head;
    // 눈: 0 동글, 1 왕눈 반짝, 2 졸린 눈, 3 웃는 실눈, 4 별 눈, 5 고양이 눈, 6 속눈썹, 7 점 눈
    this.eyes = [];
    this.pupils = [];
    const es = look.eyes | 0;
    const pm = toon(this.pupilColor);
    for (const s of [-1, 1]) {
      const eye = new THREE.Group();
      eye.position.set(s * 0.19, 0.05, 0.38);
      H.add(eye);
      if (es === 3) { // 웃는 실눈 ^^
        const arc = mesh(smileGeo(), black, eye, 0, -0.02, 0.1, 1.1, 1.1, 1);
        this.pupils.push(arc);
      } else if (es === 7) {
        const p = mesh(rsph(), pm, eye, 0, 0, 0.08, 0.06, 0.07, 0.04);
        this.pupils.push(p);
      } else {
        const big = es === 1 ? 1.22 : 1;
        mesh(rsph(), es === 5 ? toon('#f0f4c3') : white, eye, 0, 0, 0.02, 0.15 * big, 0.18 * big, 0.1);
        let p;
        if (es === 4) { p = mesh(starGeo(), pm, eye, 0, -0.01, 0.11, 0.09, 0.09, 0.05); }
        else if (es === 5) p = mesh(rsph(), pm, eye, 0, -0.01, 0.1, 0.035, 0.13, 0.05);
        else p = mesh(rsph(), pm, eye, 0, -0.01, 0.1, 0.09 * big, 0.11 * big, 0.05);
        this.pupils.push(p);
        mesh(G.sphereLow(), white, eye, s * -0.03, 0.04, 0.145, 0.03 * big, 0.03 * big, 0.02);
        if (es === 1) mesh(G.sphereLow(), white, eye, s * 0.04, -0.05, 0.145, 0.018, 0.018, 0.015);
        if (es === 2) { // 눈꺼풀
          const lid = mesh(G.hemi(), this.bodyM, eye, 0, 0.0, 0.03, 0.165, 0.2, 0.12);
          lid.rotation.x = -0.25;
        }
        if (es === 6) for (let i = 0; i < 3; i++) {
          const l = mesh(G.box(), black, eye, s * (0.06 + i * 0.05), 0.17 - i * 0.025, 0.08, 0.02, 0.08, 0.02);
          l.rotation.z = s * (-0.4 - i * 0.35);
        }
      }
      this.eyes.push(eye);
    }
    // 볼터치
    if (look.cheek !== 'none') for (const s of [-1, 1]) mesh(G.sphereLow(), toon(look.cheek || '#ff9fb2'), H, s * 0.3, -0.11, 0.36, 0.09, 0.055, 0.04);
    // 코: 0 없음, 1 콩알, 2 딸기, 3 돼지, 4 뾰족, 5 하트
    const ns = look.nose | 0;
    if (ns === 1) mesh(G.sphereLow(), toon(shade(color, 0.6)), H, 0, -0.05, 0.47, 0.045, 0.035, 0.03);
    else if (ns === 2) { mesh(G.sphereLow(), toon('#ff5252'), H, 0, -0.05, 0.47, 0.07, 0.07, 0.06); for (const [x, y] of [[-0.02, -0.03], [0.025, -0.06], [0, -0.08]]) mesh(G.sphereLow(), toon('#fff59d'), H, x, y, 0.53, 0.008, 0.008, 0.005); }
    else if (ns === 3) { const n = mesh(G.cyl(), toon('#ffab91'), H, 0, -0.05, 0.47, 0.08, 0.06, 0.06); n.rotation.x = Math.PI / 2; for (const s of [-1, 1]) mesh(G.sphereLow(), toon('#6d4c41'), H, s * 0.025, -0.05, 0.505, 0.015, 0.022, 0.01); }
    else if (ns === 4) { const n = mesh(G.cone(), toon(shade(color, 0.8)), H, 0, -0.04, 0.5, 0.05, 0.14, 0.05); n.rotation.x = Math.PI / 2; }
    else if (ns === 5) { const n = mesh(heartGeo(), toon('#ff6f91'), H, 0, -0.05, 0.47, 0.05, 0.05, 0.06); void n; }
    // 입 (그룹: 감정에 따라 뒤집힌다. 로컬 y는 화면에서 반대)
    const ms = look.mouth | 0;
    this.mouth = new THREE.Group();
    this.mouth.position.set(0, -0.15, 0.45);
    this.mouth.rotation.z = Math.PI;
    H.add(this.mouth);
    const M = this.mouth;
    if (ms === 1) { for (const s of [-1, 1]) mesh(smileGeo(), black, M, s * 0.04, 0, 0, 0.6, 0.6, 1); }
    else if (ms === 4) mesh(G.box(), black, M, 0, 0.03, 0, 0.14, 0.02, 0.02);
    else if (ms === 6) {
      const half = new THREE.Mesh(geo('halfdisc', () => new THREE.CircleGeometry(0.1, 16, 0, Math.PI)), toon('#8e2b2b'));
      half.position.set(0, 0, 0.005); M.add(half);
      mesh(G.sphereLow(), toon('#ff8a80'), M, 0, 0.06, 0.01, 0.045, 0.025, 0.01);
    } else if (ms === 7) mesh(rsph(), toon('#ffa726'), M, 0, 0.02, 0.03, 0.13, 0.05, 0.08);
    else mesh(smileGeo(), black, M, 0, 0, 0);
    if (ms === 2) for (const s of [-1, 1]) mesh(G.box(), white, M, s * 0.022, 0.075, 0.005, 0.04, 0.05, 0.015);
    if (ms === 3) mesh(G.sphereLow(), toon('#ff6f91'), M, 0.02, 0.1, 0.01, 0.04, 0.05, 0.02);
    if (ms === 5) for (const s of [-1, 1]) { const f = mesh(G.cone(), white, M, s * 0.055, 0.03, 0.01, 0.018, 0.045, 0.018); f.rotation.z = Math.PI; }
    this.mouthO = mesh(G.sphereLow(), black, H, 0, -0.17, 0.45, 0.05, 0.06, 0.03);
    this.mouthO.visible = false;
    // 눈썹 (화남)
    this.brows = [];
    for (const s of [-1, 1]) {
      const b = mesh(G.box(), black, H, s * 0.19, 0.27, 0.43, 0.16, 0.03, 0.03);
      b.rotation.z = s * -0.35; b.visible = false;
      this.brows.push(b);
    }
    // 더듬이: 0 기본, 1 짧은, 2 꼬불, 3 하트 끝, 4 별 끝, 5 축 처진, 6 길쭉, 7 방울
    const as = look.antenna | 0;
    this.antennae = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.12, 0.38, 0.15);
      H.add(pivot);
      const sc = as === 1 ? 0.55 : as === 6 ? 1.45 : 1;
      let tip = new THREE.Vector3(s * 0.5 * sc, 0.62 * sc, 0);
      if (as === 2) { mesh(curlGeo(s), darkM, pivot); tip = new THREE.Vector3(s * 0.35, 0.5, 0.08); }
      else if (as === 5) { mesh(droopGeo(s), darkM, pivot); tip = new THREE.Vector3(s * 0.6, 0.1, 0.1); }
      else mesh(antennaGeo(s), darkM, pivot, 0, 0, 0, sc, sc, sc);
      const tc = toon(shade(color, 1.1));
      if (as === 3) mesh(heartGeo(), toon('#ff6f91'), pivot, tip.x, tip.y, tip.z, 0.09, 0.09, 0.09);
      else if (as === 4) mesh(starGeo(), toon('#ffd54f'), pivot, tip.x, tip.y, tip.z, 0.1, 0.1, 0.1);
      else if (as === 7) mesh(rsph(), toon('#ff9fb2'), pivot, tip.x, tip.y, tip.z, 0.12, 0.12, 0.12);
      else mesh(G.sphereLow(), tc, pivot, tip.x, tip.y, tip.z, 0.06, 0.06, 0.06);
      pivot.userData.phase = Math.random() * 6;
      this.antennae.push(pivot);
    }
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
        // ---------------- 기본 악세서리 ----------------
        case 'sprout':
          mesh(G.cylLow(), toon('#7cb342'), g, 0, H + 0.55, 0, 0.025, 0.25, 0.025);
          for (const s of [-1, 1]) { const l = mesh(rsph(), toon('#8bc34a'), g, s * 0.1, H + 0.7, 0, 0.12, 0.05, 0.07); l.rotation.z = s * 0.4; }
          break;
        case 'bunny':
          mesh(G.cyl(), toon('#fafafa'), g, 0, H + 0.33, 0, 0.47, 0.05, 0.45);
          for (const s of [-1, 1]) {
            const e = mesh(rsph(), toon('#fafafa'), g, s * 0.2, H + 0.75, -0.05, 0.1, 0.36, 0.06); e.rotation.z = s * -0.2;
            const i2 = mesh(rsph(), toon('#ffb6c8'), g, s * 0.2, H + 0.75, -0.0, 0.05, 0.27, 0.04); i2.rotation.z = s * -0.2;
          }
          break;
        case 'flowerpin':
          for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; mesh(G.sphereLow(), toon('#ffffff'), g, 0.3 + Math.cos(a) * 0.09, H + 0.3 + Math.sin(a) * 0.09, 0.3, 0.07, 0.07, 0.03); }
          mesh(G.sphereLow(), toon('#ffd54f'), g, 0.3, H + 0.3, 0.32, 0.06, 0.06, 0.04);
          break;
        case 'starpin': mesh(starGeo(), toon('#ffd54f'), g, -0.3, H + 0.3, 0.3, 0.12, 0.12, 0.12).rotation.z = 0.3; break;
        case 'partyhat': {
          const h2 = mesh(G.cone(), stripeToon('#ff7aa2', '#fff59d'), g, 0.05, H + 0.66, 0, 0.24, 0.6, 0.24); h2.rotation.z = -0.15;
          mesh(G.sphereLow(), toon('#4fc3f7'), g, 0.15, H + 1.0, 0, 0.08, 0.08, 0.08);
          break;
        }
        case 'halo': {
          const r = mesh(ringGeo(), new THREE.MeshToonMaterial({ color: '#fff59d', emissive: '#ffd54f', emissiveIntensity: 0.8 }), g, 0, H + 0.68, 0, 2.6, 2.6, 2.2);
          r.rotation.x = Math.PI / 2;
          break;
        }
        case 'bandaid': {
          const b2 = mesh(G.box(), toon('#ffcc80'), g, 0.27, H + 0.2, 0.4, 0.16, 0.05, 0.02); b2.rotation.z = 0.5; b2.rotation.y = 0.5;
          break;
        }
        case 'mask':
          mesh(rsph(), toon('#fafafa'), g, 0, H - 0.12, 0.33, 0.3, 0.16, 0.16);
          for (const s of [-1, 1]) mesh(G.box(), toon('#eeeeee'), g, s * 0.33, H - 0.05, 0.25, 0.02, 0.02, 0.25);
          break;
        case 'stache':
          for (const s of [-1, 1]) { const m = mesh(rsph(), toon('#3e2723'), g, s * 0.075, H - 0.1, 0.47, 0.08, 0.032, 0.03); m.rotation.z = s * -0.35; }
          break;
        case 'mole': mesh(G.sphereLow(), toon('#3e2723'), g, 0.17, H - 0.14, 0.43, 0.022, 0.022, 0.015); break;
        case 'freckles':
          for (const s of [-1, 1]) for (const [x, y] of [[0.24, -0.05], [0.3, -0.08], [0.27, -0.12], [0.33, -0.03]]) mesh(G.sphereLow(), toon('#a1663e'), g, s * x, H + y, 0.38 + (0.33 - x) * 0.2, 0.014, 0.014, 0.01);
          break;
        case 'eyepatch':
          mesh(G.cyl(), toon('#212121'), g, 0.19, H + 0.05, 0.5, 0.15, 0.03, 0.15).rotation.x = Math.PI / 2;
          mesh(G.box(), toon('#212121'), g, 0, H + 0.2, 0.1, 0.98, 0.03, 0.8).rotation.z = -0.3;
          break;
        case 'heartcheek': for (const s of [-1, 1]) mesh(heartGeo(), toon('#ff4f81'), g, s * 0.3, H - 0.1, 0.4, 0.05, 0.05, 0.05); break;
        case 'minishades':
          for (const s of [-1, 1]) mesh(G.cyl(), toon('#212121'), g, s * 0.17, H + 0.05, 0.52, 0.09, 0.02, 0.09).rotation.x = Math.PI / 2;
          mesh(G.box(), toon('#212121'), g, 0, H + 0.06, 0.53, 0.12, 0.02, 0.02);
          break;
        case 'clownnose': mesh(G.sphereLow(), toon('#ff1744'), g, 0, H - 0.04, 0.5, 0.08, 0.08, 0.08); break;
        case 'tee':
          mesh(rsph(), toon(c), g, 0, 1.12, 0, 0.53, 0.5, 0.45);
          break;
        case 'stripes':
          mesh(rsph(), toon('#ffffff'), g, 0, 1.12, 0, 0.53, 0.5, 0.45);
          for (let i = 0; i < 4; i++) mesh(G.cyl(), toon(c), g, 0, 0.85 + i * 0.16, 0, 0.5 - Math.abs(i - 1.5) * 0.05, 0.05, 0.43 - Math.abs(i - 1.5) * 0.04, { cast: false });
          break;
        case 'overalls':
          mesh(rsph(), toon(c), g, 0, 0.9, 0, 0.53, 0.38, 0.45);
          mesh(G.box(), toon(c), g, 0, 1.15, 0.38, 0.4, 0.35, 0.05);
          for (const s of [-1, 1]) mesh(G.box(), toon(c), g, s * 0.16, 1.4, 0.33, 0.06, 0.4, 0.04).rotation.x = -0.25;
          for (const s of [-1, 1]) mesh(G.sphereLow(), toon('#ffd54f'), g, s * 0.16, 1.27, 0.41, 0.03, 0.03, 0.02);
          break;
        case 'cape': {
          const cp = mesh(rsph(), toon(c), g, 0, 1.05, -0.36, 0.55, 0.75, 0.12); cp.rotation.x = 0.15;
          mesh(G.cyl(), toon(c), g, 0, 1.6, 0, 0.42, 0.06, 0.36);
          break;
        }
        case 'raincoat':
          mesh(rsph(), toon('#ffeb3b'), g, 0, 1.03, 0, 0.55, 0.64, 0.47);
          mesh(G.hemi(), toon('#ffeb3b'), g, 0, H + 0.12, -0.05, 0.53, 0.48, 0.52);
          for (let i = 0; i < 3; i++) mesh(G.sphereLow(), toon('#fafafa'), g, 0, 0.9 + i * 0.2, 0.47, 0.03, 0.03, 0.02);
          break;
        case 'jersey':
          mesh(rsph(), toon(c), g, 0, 1.12, 0, 0.53, 0.5, 0.45);
          mesh(G.box(), toon('#ffffff'), g, 0, 1.15, -0.44, 0.22, 0.3, 0.02);
          mesh(G.cyl(), toon('#ffffff'), g, 0, 1.58, 0, 0.3, 0.05, 0.26);
          break;
        case 'watch':
          mesh(G.cyl(), toon('#455a64'), g, -0.55, 0.92, 0.42, 0.08, 0.06, 0.08);
          mesh(G.cyl(), toon('#e1f5fe'), g, -0.55, 0.955, 0.42, 0.055, 0.02, 0.055);
          break;
        case 'bracelet':
          for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; mesh(G.sphereLow(), toon(['#ff8a80', '#80d8ff', '#ccff90', '#ffd180'][i % 4]), g, 0.55 + Math.cos(a) * 0.08, 0.92, 0.42 + Math.sin(a) * 0.08, 0.03, 0.03, 0.03); }
          break;
        case 'balloon': {
          mesh(G.cylLow(), toon('#eeeeee'), g, 0.62, 1.6, 0.2, 0.008, 1.6, 0.008);
          const bl = mesh(rsph(), new THREE.MeshToonMaterial({ color: '#ff5252', emissive: '#ff1744', emissiveIntensity: 0.15 }), g, 0.62, 2.7, 0.2, 0.32, 0.38, 0.32);
          void bl;
          break;
        }
        case 'locket':
          { const t = mesh(ringGeo(), toon('#ffd54f'), g, 0, 1.55, 0, 3.2, 3.2, 4.5); t.rotation.x = Math.PI / 2 + 0.3; }
          mesh(heartGeo(), toon('#ff4f81'), g, 0, 1.3, 0.44, 0.07, 0.07, 0.06);
          break;
        case 'bell':
          { const t = mesh(ringGeo(), toon('#e53935'), g, 0, 1.55, 0, 3.4, 3.4, 4.5); t.rotation.x = Math.PI / 2 + 0.25; }
          mesh(G.sphereLow(), toon('#ffd54f'), g, 0, 1.36, 0.44, 0.09, 0.09, 0.09);
          break;
        case 'camera':
          { const t = mesh(ringGeo(), toon('#424242'), g, 0, 1.5, 0, 3.4, 3.4, 4.5); t.rotation.x = Math.PI / 2 + 0.35; }
          mesh(G.box(), toon('#37474f'), g, 0, 1.15, 0.5, 0.3, 0.2, 0.12);
          mesh(G.cyl(), toon('#90caf9'), g, 0, 1.15, 0.58, 0.07, 0.06, 0.07).rotation.x = Math.PI / 2;
          break;
        case 'brooch':
          for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; mesh(G.sphereLow(), toon('#f48fb1'), g, 0.2 + Math.cos(a) * 0.05, 1.4 + Math.sin(a) * 0.05, 0.43, 0.04, 0.04, 0.02); }
          mesh(G.sphereLow(), toon('#fff59d'), g, 0.2, 1.4, 0.45, 0.03, 0.03, 0.02);
          break;
      }
    }
  }

  setEmotion(e, duration = 4) {
    this.emotion = e;
    this.emotionT = duration;
    const happy = e === 'happy' || e === 'love';
    for (const eye of this.eyes) eye.scale.set(1, happy ? 0.55 : e === 'surprised' || e === 'scared' ? 1.25 : 1, 1);
    for (const p of this.pupils) p.material = toon(e === 'love' ? '#ff4f81' : this.pupilColor);
    this.mouth.rotation.z = e === 'sad' || e === 'angry' ? 0 : Math.PI;
    this.mouth.position.y = e === 'sad' || e === 'angry' ? -0.2 : -0.15;
    this.mouth.scale.y = e === 'sad' || e === 'angry' ? 0.8 : 1;
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
      case 'crossbow': {
        mesh(G.box(), wood, g, 0, -0.2, 0.02, 0.12, 0.8, 0.14);
        const arc = mesh(new THREE.TorusGeometry(0.42, 0.035, 6, 14, Math.PI), toon('#5d4037'), g, 0, -0.55, 0.02);
        arc.rotation.z = Math.PI; arc.rotation.x = Math.PI / 2;
        mesh(G.box(), toon('#ffd54f'), g, 0, -0.1, 0.12, 0.08, 0.25, 0.1);
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
      case 'rod': {
        mesh(G.cylLow(), toon(c), g, 0, -0.9, 0, 0.03, 2.2, 0.03);
        mesh(G.cylLow(), toon('#212121'), g, 0, 0.05, 0, 0.045, 0.4, 0.045);
        mesh(G.sphereLow(), toon('#90a4ae'), g, 0.08, -0.05, 0, 0.07, 0.07, 0.07);
        this.rodTip = new THREE.Object3D(); this.rodTip.position.set(0, -2.0, 0); g.add(this.rodTip);
        this.heldPose = 'rod'; break;
      }
      case 'wand': {
        mesh(G.cylLow(), toon('#5d4037'), g, 0, -0.35, 0, 0.035, 0.9, 0.035);
        const orb = mesh(G.sphereLow(), new THREE.MeshToonMaterial({ color: c, emissive: c, emissiveIntensity: 0.9 }), g, 0, -0.85, 0, 0.11, 0.11, 0.11);
        mesh(G.box(), toon('#ffd54f'), g, 0, -0.75, 0, 0.09, 0.05, 0.09);
        this.wandOrb = orb;
        this.heldPose = 'wand'; break;
      }
      case 'food': buildFood(g, spec.split(':')[1], spec.split(':')[2] || '#ffcc80'); this.heldPose = 'food'; break;
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

  // 먹기 연출: motion = bite | slurp | spoon | drink | slice | drumstick, prop = 'shape:color'
  // onTable: 식당 자리에서 먹을 때는 그릇·접시를 식탁 위(앞)에 두고 수저로 떠먹는다
  eat(motion, prop, dur = 3, emoji = null, onTable = false) {
    this.eatT = dur; this.eatDur = dur; this.eatMotion = motion; this.eatTable = onTable;
    // 머리 위에 지금 먹는 음식 그림
    if (emoji && typeof document !== 'undefined') {
      if (!this.foodSprite) {
        const cv = document.createElement('canvas'); cv.width = cv.height = 128;
        this.foodCanvas = cv;
        this.foodSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
        this.foodSprite.scale.setScalar(0.9);
        this.root.add(this.foodSprite);
      }
      const x = this.foodCanvas.getContext('2d');
      x.clearRect(0, 0, 128, 128);
      x.fillStyle = 'rgba(255,255,255,.92)'; x.beginPath(); x.arc(64, 64, 58, 0, Math.PI * 2); x.fill();
      x.strokeStyle = '#ff8a65'; x.lineWidth = 6; x.stroke();
      x.font = '72px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(emoji, 64, 70);
      this.foodSprite.material.map.needsUpdate = true;
      this.foodSprite.position.set(0, 4.4, 0);
      this.foodSprite.visible = true;
    }
    if (!this.eatProp) {
      this.eatProp = new THREE.Group();
      this.hand.add(this.eatProp);
      this.handL = new THREE.Group(); this.handL.position.set(0, -0.42, 0); this.arms[0].add(this.handL);
      this.eatPropL = new THREE.Group(); this.handL.add(this.eatPropL);
      // 식탁 위 그릇 자리 (몸 앞쪽, 식탁 높이)
      this.tableDish = new THREE.Group(); this.tableDish.position.set(0, 1.2, 0.95); this.root.add(this.tableDish);
    }
    this.eatProp.clear(); this.eatPropL.clear(); this.tableDish.clear();
    this.heldGroup.visible = false;
    const [shape, col] = (prop || 'bun:#d7a86e').split(':');
    const utensil = { spoon: 'spoon', slurp: 'chopsticks', chopsticks: 'chopsticks', knife: 'fork' }[motion];
    if (utensil) {
      // 그릇은 식탁 위 (밖에서 먹을 땐 왼손에 들고), 오른손에 수저
      const dish = new THREE.Group(); dish.position.y = 0.2; dish.scale.setScalar(1.7);
      buildFood(dish, shape, col);
      dish.children.forEach((o) => { o.position.y += 0; });
      (onTable ? this.tableDish : this.eatPropL).add(dish);
      if (!onTable) dish.position.y = 0;
      const wood = toon('#c8a165'), steel = toon('#cfd8dc');
      if (utensil === 'chopsticks') {
        for (const x of [-0.03, 0.03]) mesh(G.cylLow(), wood, this.eatProp, x, -0.3, 0.05, 0.012, 0.6, 0.012);
        // 집어 올린 면발·회 한 점
        this.bite = new THREE.Group(); this.bite.position.set(0, -0.6, 0.05); this.eatProp.add(this.bite);
        if (motion === 'slurp') for (let i = 0; i < 5; i++) mesh(G.cylLow(), toon(col), this.bite, -0.04 + i * 0.02, -0.12, 0, 0.008, 0.25, 0.008);
        else mesh(G.box(), toon(col), this.bite, 0, -0.03, 0, 0.09, 0.05, 0.07);
      } else if (utensil === 'spoon') {
        mesh(G.cylLow(), steel, this.eatProp, 0, -0.2, 0.03, 0.015, 0.4, 0.015);
        mesh(G.sphereLow(), steel, this.eatProp, 0, -0.42, 0.05, 0.06, 0.02, 0.05);
        this.bite = new THREE.Group(); this.bite.position.set(0, -0.41, 0.06); this.eatProp.add(this.bite);
        mesh(G.sphereLow(), toon(col), this.bite, 0, 0.01, 0, 0.045, 0.02, 0.04);
      } else {
        // 스테이크: 오른손 포크, 왼손 나이프
        mesh(G.cylLow(), steel, this.eatProp, 0, -0.25, 0.03, 0.012, 0.5, 0.012);
        for (const x of [-0.02, 0, 0.02]) mesh(G.cylLow(), steel, this.eatProp, x, -0.53, 0.03, 0.006, 0.08, 0.006);
        mesh(G.box(), steel, this.eatPropL, 0, -0.3, 0.03, 0.04, 0.5, 0.012);
        this.bite = new THREE.Group(); this.bite.position.set(0, -0.6, 0.04); this.eatProp.add(this.bite);
        mesh(G.box(), toon(col), this.bite, 0, 0, 0, 0.08, 0.05, 0.06);
      }
    } else { this.bite = null; buildFood(this.eatProp, shape, col); }
    this.eatProp.scale.setScalar(1.6); this.eatPropL.scale.setScalar(1.6); // 멀리서도 보이게 크게
    this.eatProp.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.tableDish.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.eatPropL.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }
  stopEat() {
    this.eatT = 0;
    this.tableDish?.clear();
    if (this.foodSprite) this.foodSprite.visible = false;
    this.eatProp?.clear(); this.eatPropL?.clear();
    this.heldGroup.visible = true;
  }

  attack(kind = 'melee') { this.attackT = kind === 'melee' ? 0.3 : kind === 'throw' ? 0.35 : 0.12; this.attackKind = kind; this.attackDur = this.attackT; }

  hurt() {
    this.hurtT = 0.15;
    const red = toon('#ff5252');
    this.body.material = red; this.headMesh.material = red;
  }

  setDead(v) { this.dead = v; }
  setFlipped(v) { this.flipped = v; }
  // 플러팅: 손키스 후 하트
  flirt() { this.flirtT = 1.2; this.setEmotion('love', 3); }
  cast() { this.castT = 0.45; }
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
    if (!this.flying) for (let i = 0; i < 2; i++) { this.wings[i].rotation.y = (i ? 1 : -1) * (opts.airborne ? 0.6 + Math.sin(this.t * 40) * 0.3 : Math.sin(this.t * 1.5) * 0.03); this.wings[i].rotation.z = 0; }

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
    // 달리기: 진짜 바퀴벌레처럼 몸을 바닥에 붙이고 여섯 다리로 기어간다 (삼각 보행)
    const wantCrawl = speed >= 7 && !this.seated && !this.dead && !this.dancing && this.attackT <= 0 && !opts.noCrawl;
    this.crawlK += ((wantCrawl ? 1 : 0) - this.crawlK) * Math.min(1, dt * 9);
    const ck = this.crawlK;
    if (ck > 0.01) {
      const tilt = 1.38 * ck;
      this.inner.rotation.x = tilt;
      this.inner.position.y = this.inner.position.y * (1 - ck) + ck * (0.46 + Math.abs(Math.sin(this.phase)) * 0.05);
      this.torso.rotation.x = 0; this.torso.rotation.z = 0;
      this.head.rotation.x = -1.15 * ck + Math.sin(this.phase * 2) * 0.04 * ck;
      // 다리 끝이 바닥을 향하도록 몸 기울기만큼 되돌리고, 곤충처럼 옆으로 벌린다
      const g = Math.sin(this.phase * 1.3);
      const tripodA = [this.arms[0], this.arms[3], this.legs[0]];
      const tripodB = [this.arms[1], this.arms[2], this.legs[1]];
      const leg = (o, side, sign, front) => {
        const swing = sign * g * 0.55;
        const tx = -tilt + swing + front;
        const tz = side * (front > 0 ? 1.15 : front < 0 ? 1.0 : 1.25);
        o.rotation.x = o.rotation.x * (1 - ck) + tx * ck;
        o.rotation.z = o.rotation.z * (1 - ck) + tz * ck;
      };
      leg(this.arms[0], -1, 1, 0.35); leg(this.arms[1], 1, -1, 0.35);   // 앞다리
      leg(this.arms[2], -1, -1, 0); leg(this.arms[3], 1, 1, 0);        // 가운뎃다리
      leg(this.legs[0], -1, 1, -0.3); leg(this.legs[1], 1, -1, -0.3);   // 뒷다리
      void tripodA; void tripodB;
      // 더듬이는 앞으로 쭉 뻗어 흔들린다
      for (const a of this.antennae) a.rotation.x = -0.6 * ck + Math.sin(this.t * 12 + a.userData.phase) * 0.15;
    } else this.inner.rotation.x = 0;

    // 무기 자세
    const ar = this.arms[1], al = this.arms[0];
    if (ck > 0.5) { /* 기어갈 때는 무기를 품에 안는다 */ } else if (this.heldPose === 'gun' || this.heldPose === 'heavy') {
      const kick = this.kick || 0; // 총 반동으로 팔이 튄다
      this.kick = Math.max(0, kick - dt * 6);
      ar.rotation.x = -1.45 - kick * 0.5; ar.rotation.z = 0.15;
      al.rotation.x = -1.3 - kick * 0.4; al.rotation.z = -0.1;
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
    // 먹기
    if (this.eatT > 0) {
      this.eatT -= dt;
      const t = this.t, m = this.eatMotion;
      const chew = Math.sin(t * 14);
      const T = this.eatTable;
      if (m === 'slurp' || m === 'chopsticks') {
        // 젓가락으로 그릇에서 집어 입으로 (면은 후루룩)
        const up = (Math.sin(t * (m === 'slurp' ? 4.5 : 3)) + 1) / 2;
        al.rotation.x = T ? -0.8 : -1.25; al.rotation.z = T ? 0.1 : 0.25;
        ar.rotation.x = (T ? -0.9 : -1.4) - up * (T ? 1.3 : 0.9); ar.rotation.z = -0.15;
        this.head.rotation.x = 0.35 - up * 0.2;
        if (this.bite) this.bite.visible = up > 0.25;
      } else if (m === 'spoon') {
        // 숟가락으로 떠서 입으로 (그릇은 식탁 위)
        al.rotation.x = T ? -0.8 : -1.1; al.rotation.z = T ? 0.15 : 0.3;
        const sc = (Math.sin(t * 3.2) + 1) / 2;
        ar.rotation.x = (T ? -0.85 : -1.2) - sc * (T ? 1.5 : 1.15); ar.rotation.z = -0.2;
        this.head.rotation.x = 0.3 - sc * 0.15;
        if (this.bite) this.bite.visible = sc > 0.15;
      } else if (m === 'knife') {
        // 썰고 → 포크로 한 입
        const ph = (t * 0.6) % 1;
        if (ph < 0.6) { ar.rotation.x = -0.85 + Math.sin(t * 9) * 0.04; al.rotation.x = -0.85 + Math.sin(t * 9 + 1) * 0.12; al.rotation.z = 0.2; if (this.bite) this.bite.visible = false; }
        else { const u = Math.sin(((ph - 0.6) / 0.4) * Math.PI); ar.rotation.x = -0.85 - u * 1.4; al.rotation.x = -0.8; if (this.bite) this.bite.visible = true; }
        ar.rotation.z = -0.2;
        this.head.rotation.x = 0.25;
      } else if (m === 'drink') {
        ar.rotation.x = -2.35 + Math.sin(t * 2) * 0.05; ar.rotation.z = -0.35;
        this.head.rotation.x = -0.3;
      } else if (m === 'slice') {
        ar.rotation.x = -2.7 + Math.sin(t * 3) * 0.15; ar.rotation.z = -0.25;
        this.head.rotation.x = -0.25 + Math.max(0, Math.sin(t * 3)) * 0.15;
      } else if (m === 'drumstick') {
        ar.rotation.x = -2.2; ar.rotation.z = -0.4; al.rotation.x = -2.0; al.rotation.z = 0.4;
        this.torso.rotation.y = Math.sin(t * 5) * 0.15;
      } else {
        ar.rotation.x = -2.0 - Math.max(0, Math.sin(t * 4)) * 0.4; ar.rotation.z = -0.35;
        this.head.rotation.x = 0.05;
      }
      this.mouthO.visible = chew > 0.2 && m !== 'drink';
      this.mouth.visible = !this.mouthO.visible;
      if (this.eatT <= 0) { this.stopEat(); this.mouthO.visible = false; this.mouth.visible = true; }
    } else if (this.heldPose === 'food') { ar.rotation.x = -0.9; ar.rotation.z = -0.1; }
    if (this.heldPose === 'rod' && ck < 0.5) { ar.rotation.x = -2.0 + (this.reel ? Math.sin(this.t * 20) * 0.15 : 0); ar.rotation.z = -0.2; al.rotation.x = -1.5; }
    // 활 당기기 (drawK 0~1)
    if (this.drawK > 0 && this.heldPose === 'gun') {
      ar.rotation.x = -1.5; ar.rotation.z = 0.1;
      al.rotation.x = -1.5 + this.drawK * 0.3; al.rotation.z = -0.2 - this.drawK * 0.7;
    }
    // 마법봉: 들고 있다가 시전할 때 앞으로 쭉
    if (this.heldPose === 'wand') {
      ar.rotation.x = this.castT > 0 ? -2.4 + (1 - this.castT / 0.45) * 0.9 : -0.9 + Math.sin(this.t * 2) * 0.05;
      if (this.wandOrb) this.wandOrb.scale.setScalar(0.11 * (1 + Math.sin(this.t * 6) * 0.15 + (this.castT > 0 ? 0.8 : 0)));
    }
    if (this.castT > 0) this.castT -= dt;
    // 플러팅: 손을 입에 댔다가 앞으로 쭉
    if (this.flirtT > 0) {
      this.flirtT -= dt;
      const p = 1 - this.flirtT / 1.2;
      ar.rotation.x = p < 0.4 ? -2.3 : -2.3 + (p - 0.4) * 2.5; ar.rotation.z = p < 0.4 ? -0.9 : -0.3;
      this.head.rotation.z = Math.sin(this.t * 8) * 0.12;
      this.torso.rotation.y = Math.sin(p * Math.PI) * 0.3;
    }
    // 날기: 날개를 활짝 펴고 파닥파닥, 몸은 앞으로 눕힌다
    if (this.flying) {
      const flap = Math.sin(this.t * 32);
      for (let i = 0; i < 2; i++) {
        const w = this.wings[i], s = i ? 1 : -1;
        w.rotation.y = s * (1.1 + flap * 0.55);
        w.rotation.z = s * (0.5 + flap * 0.25);
      }
      const lean = Math.min(0.9, speed / 14);
      this.inner.rotation.x = lean;
      this.inner.position.y = Math.sin(this.t * 6) * 0.08;
      this.head.rotation.x = -lean * 0.7;
      this.legs[0].rotation.x = 0.5 + Math.sin(this.t * 5) * 0.2; this.legs[1].rotation.x = 0.5 - Math.sin(this.t * 5) * 0.2;
      if (this.heldPose === 'none') for (let i = 0; i < 4; i++) { this.arms[i].rotation.x = 0.4 + Math.sin(this.t * 7 + i) * 0.2; }
    }
    // 벽 타기: 여섯 다리를 활짝 벌리고 번갈아 움직인다
    if (this.climbing) {
      const w = Math.sin(this.phase * 1.3);
      for (let i = 0; i < 4; i++) { this.arms[i].rotation.x = -1.9 + (i % 2 ? w : -w) * 0.5; this.arms[i].rotation.z = this.arms[i].userData.baseZ * 1.8; }
      this.legs[0].rotation.x = -0.4 + w * 0.5; this.legs[1].rotation.x = -0.4 - w * 0.5;
      this.legs[0].rotation.z = -0.5; this.legs[1].rotation.z = 0.5;
      this.inner.position.y = 0.1;
      this.head.rotation.x = -0.3;
    } else { this.legs[0].rotation.z = 0; this.legs[1].rotation.z = 0; }
    // 차에 치여 뒤집힘: 등을 대고 누워 다리를 버둥버둥
    if (this.flipped) {
      this.inner.rotation.x = -Math.PI / 2 * 0.95;
      this.inner.position.y = 0.55;
      const w = Math.sin(this.t * 24);
      for (let i = 0; i < 4; i++) { this.arms[i].rotation.x = -1.2 + w * 0.5 * (i % 2 ? 1 : -1); this.arms[i].rotation.z = this.arms[i].userData.baseZ * 1.6; }
      this.legs[0].rotation.x = -1.4 + w * 0.6; this.legs[1].rotation.x = -1.4 - w * 0.6;
      for (const a of this.antennae) a.rotation.x = Math.sin(this.t * 15 + a.userData.phase) * 0.4;
    }
    // 앉기 (운전석)
    if (this.seated) {
      this.legs[0].rotation.x = this.legs[1].rotation.x = -1.5;
      this.inner.position.y = 0;
      this.torso.rotation.x = 0;
      // 차 안에서는 더듬이를 뒤로 눕힌다 (지붕에 닿지 않게)
      for (const a of this.antennae) a.rotation.x = -1.3 + Math.sin(this.t * 3 + a.userData.phase) * 0.08;
      if (this.riding) {
        // 앞다리로 핸들을 잡고, 자전거면 뒷다리로 페달
        this.arms[0].rotation.x = this.arms[1].rotation.x = -1.25;
        if (this.pedal > 0.2) { const ph = this.t * (3 + this.pedal * 1.6); this.legs[0].rotation.x = -1.15 + Math.sin(ph) * 0.55; this.legs[1].rotation.x = -1.15 - Math.sin(ph) * 0.55; }
        else this.legs[0].rotation.x = this.legs[1].rotation.x = -1.2;
      }
    }
    // 쓰러짐
    this.inner.rotation.z = this.dead ? Math.PI / 2 * 0.92 : 0;
    if (!this.flying && !this.flipped && this.crawlK <= 0.01) this.inner.rotation.x = 0;
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

// 음식 모양 (손 기준 -y가 앞)
export function buildFood(g, shape, col) {
  const T = (c) => toon(c);
  switch (shape) {
    case 'bowl': // 면/국 그릇
      mesh(G.cyl(), T('#fafafa'), g, 0, -0.15, 0.12, 0.2, 0.14, 0.2);
      mesh(G.cyl(), T(col), g, 0, -0.08, 0.12, 0.18, 0.02, 0.18);
      mesh(G.cyl(), T('#e53935'), g, 0, -0.2, 0.12, 0.205, 0.03, 0.205);
      break;
    case 'slice': { // 피자 조각
      const sl = mesh(geo('slice', () => new THREE.CylinderGeometry(0.35, 0.35, 0.04, 3, 1, false, 0, Math.PI / 3)), T('#ffca28'), g, 0, -0.2, 0.05);
      sl.rotation.set(Math.PI / 2, 0, Math.PI / 2 + Math.PI / 6);
      mesh(G.sphereLow(), T(col), g, 0.03, -0.32, 0.08, 0.035, 0.035, 0.015);
      mesh(G.sphereLow(), T(col), g, -0.04, -0.42, 0.08, 0.03, 0.03, 0.015);
      mesh(G.cylLow(), T('#d18b3f'), g, 0, -0.05, 0.05, 0.05, 0.3, 0.05).rotation.z = Math.PI / 2;
      break;
    }
    case 'drumstick':
      mesh(G.sphereLow(), T(col), g, 0, -0.28, 0.08, 0.13, 0.17, 0.13);
      mesh(G.cylLow(), T('#fff8e1'), g, 0, -0.08, 0.08, 0.03, 0.2, 0.03);
      mesh(G.sphereLow(), T('#fff8e1'), g, 0, 0.03, 0.08, 0.045, 0.045, 0.045);
      break;
    case 'cup':
      mesh(G.cyl(), T(col), g, 0, -0.12, 0.1, 0.09, 0.26, 0.09);
      mesh(G.cyl(), T('#ffffff'), g, 0, 0.02, 0.1, 0.095, 0.03, 0.095);
      mesh(G.cylLow(), T('#ff5252'), g, 0.03, 0.12, 0.1, 0.01, 0.2, 0.01);
      break;
    case 'bun': // 햄버거
      mesh(G.hemi(), T('#e0a050'), g, 0, -0.18, 0.12, 0.17, 0.12, 0.17);
      mesh(G.cyl(), T('#6d4c41'), g, 0, -0.19, 0.12, 0.17, 0.04, 0.17);
      mesh(G.cyl(), T('#9ccc65'), g, 0, -0.215, 0.12, 0.18, 0.015, 0.18);
      mesh(G.cyl(), T(col), g, 0, -0.23, 0.12, 0.17, 0.015, 0.17);
      mesh(G.cyl(), T('#e0a050'), g, 0, -0.26, 0.12, 0.16, 0.04, 0.16);
      break;
    case 'tri': { // 삼각김밥
      const t = mesh(geo('tri', () => new THREE.CylinderGeometry(0.16, 0.16, 0.08, 3)), T('#fafafa'), g, 0, -0.22, 0.1);
      t.rotation.x = Math.PI / 2;
      mesh(G.box(), T('#263238'), g, 0, -0.3, 0.1, 0.12, 0.08, 0.09);
      break;
    }
    case 'skewer':
      mesh(G.cylLow(), T('#d7ccc8'), g, 0, -0.25, 0.08, 0.012, 0.6, 0.012);
      for (let i = 0; i < 3; i++) mesh(G.box(), T(col), g, 0, -0.32 - i * 0.1, 0.08, 0.1, 0.08, 0.06);
      break;
    case 'box': // 감자튀김/도시락
      mesh(G.box(), T(col), g, 0, -0.18, 0.1, 0.22, 0.2, 0.12);
      for (let i = 0; i < 5; i++) mesh(G.box(), T('#ffd54f'), g, -0.08 + i * 0.04, -0.05, 0.1, 0.025, 0.12, 0.025);
      break;
    case 'bread':
      mesh(new THREE.TorusGeometry(0.12, 0.06, 8, 12, Math.PI * 1.3), T(col), g, 0, -0.2, 0.1);
      break;
    case 'can':
      mesh(G.cyl(), T(col), g, 0, -0.15, 0.1, 0.07, 0.2, 0.07);
      mesh(G.cyl(), T('#cfd8dc'), g, 0, -0.04, 0.1, 0.065, 0.02, 0.065);
      break;
    case 'plate': // 접시 위 음식 (볶음밥·회·스테이크·탕수육)
      mesh(G.cyl(), T('#fafafa'), g, 0, -0.18, 0.12, 0.26, 0.03, 0.26);
      mesh(G.sphereLow(), T(col), g, 0, -0.14, 0.12, 0.17, 0.06, 0.15);
      for (let i = 0; i < 4; i++) mesh(G.sphereLow(), T(col), g, Math.cos(i * 1.6) * 0.08, -0.1, 0.12 + Math.sin(i * 1.6) * 0.07, 0.05, 0.04, 0.05);
      break;
    case 'pizzabox':
      mesh(G.box(), T('#f5deb3'), g, 0, -0.2, 0.2, 0.5, 0.08, 0.5);
      mesh(G.box(), T(col), g, 0, -0.155, 0.2, 0.2, 0.01, 0.2);
      break;
    case 'chickenbox':
      mesh(G.box(), T(col), g, 0, -0.22, 0.15, 0.36, 0.22, 0.28);
      mesh(G.box(), T('#ffffff'), g, 0, -0.1, 0.15, 0.37, 0.03, 0.29);
      break;
    default: // 포장 봉투
      mesh(G.box(), T(col), g, 0, -0.25, 0.1, 0.26, 0.32, 0.14);
      mesh(new THREE.TorusGeometry(0.06, 0.012, 5, 10), T('#5d4037'), g, 0, -0.06, 0.1);
  }
}

function stripeToon(a, b) {
  if (typeof document === 'undefined') return toon(a);
  const c = document.createElement('canvas'); c.width = 8; c.height = 64;
  const x = c.getContext('2d');
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? b : a; x.fillRect(0, i * 8, 8, 8); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshToonMaterial({ map: t });
}
