import * as THREE from 'three';
import { SEED, HALF } from './config.js';
import { buildCity, renderMapImage } from './city.js';
import { setupWorld, housePrice } from './world-setup.js';
import { Traffic } from './traffic.js';
import { Player } from './player.js';
import { buildInterior } from './interior.js';
import { CitizenView, PlayersView, UnitsView, GroundView, Runners, seatRoach } from './views.js';
import { Inventory } from './inventory.js';
import { Combat } from './combat.js';
import { itemDef, CLUB_CHARM, ENCHANT_FEE } from './items.js';
import { routeTo } from './citizens.js';
import { Net } from './net.js';
import { UI } from './ui.js';
import { settings, saveSettings } from './settings.js';
import { getJob } from './data.js';
import { DAYS, clamp, lerp, angleLerp, windowMaterials, retitleSign } from './utils.js';

// ------------------------------------------------------------------
// 렌더러 & 장면
// ------------------------------------------------------------------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = settings.shadows;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
camera.position.set(0, 30, 60);
scene.fog = new THREE.Fog('#cfefff', 90, 320);

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ------------------------------------------------------------------
// 하늘 & 조명 (낮/밤)
// ------------------------------------------------------------------
const hemi = new THREE.HemisphereLight('#fff6e8', '#9fc88a', 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff3d6', 2.0);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
const SC = 70;
Object.assign(sun.shadow.camera, { left: -SC, right: SC, top: SC, bottom: -SC, near: 1, far: 400 });
sun.shadow.bias = -0.0008;
sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);

const skyUniforms = { top: { value: new THREE.Color('#7ec8ff') }, bottom: { value: new THREE.Color('#d4f1ff') } };
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(900, 24, 12),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyUniforms,
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(normalize(vP).y * 1.6 + 0.15, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, h), 1.0); }',
  }),
);
sky.renderOrder = -1;
scene.add(sky);
const sunDisc = new THREE.Mesh(new THREE.SphereGeometry(28, 16, 12), new THREE.MeshBasicMaterial({ color: '#fff4b0', fog: false }));
const moonDisc = new THREE.Mesh(new THREE.SphereGeometry(18, 16, 12), new THREE.MeshBasicMaterial({ color: '#f5f3ff', fog: false }));
scene.add(sunDisc, moonDisc);
// 별
const starGeo = new THREE.BufferGeometry();
const starPos = [];
for (let i = 0; i < 600; i++) {
  const v = new THREE.Vector3().randomDirection(); v.y = Math.abs(v.y) * 0.9 + 0.1; v.normalize().multiplyScalar(850);
  starPos.push(v.x, v.y, v.z);
}
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3));
const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, fog: false }));
scene.add(stars);
// 구름
const clouds = new THREE.Group();
for (let i = 0; i < 16; i++) {
  const c = new THREE.Group();
  const m = new THREE.MeshToonMaterial({ color: '#ffffff', transparent: true, opacity: 0.92 });
  for (let k = 0; k < 4; k++) {
    const s = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), m);
    s.scale.setScalar(8 + Math.random() * 6);
    s.position.set(k * 9 - 13, Math.random() * 4, Math.random() * 6);
    c.add(s);
  }
  c.position.set((Math.random() - 0.5) * 700, 110 + Math.random() * 40, (Math.random() - 0.5) * 700);
  c.userData.speed = 2 + Math.random() * 3;
  clouds.add(c);
}
scene.add(clouds);

const SKY_KEYS = [
  [0, '#0b1d3a', '#1d2b55', 0.0, 0.55, '#8fa8ff'],
  [4.5, '#14234a', '#2c3566', 0.0, 0.55, '#8fa8ff'],
  [6, '#6f7fc8', '#ffb38a', 0.6, 0.65, '#ffc89a'],
  [7.5, '#86cdfa', '#ffe0c0', 1.6, 1.0, '#fff1d6'],
  [10, '#7ec8ff', '#d4f1ff', 2.1, 1.15, '#fff6e6'],
  [16, '#7ec8ff', '#d9f3ff', 2.0, 1.1, '#fff1d6'],
  [18, '#ff9e7a', '#ffd08a', 1.2, 0.85, '#ffb27a'],
  [19.5, '#3a3a7a', '#ff8a80', 0.3, 0.5, '#c3a6ff'],
  [21, '#0e1f40', '#253064', 0.0, 0.58, '#8fa8ff'],
  [24, '#0b1d3a', '#1d2b55', 0.0, 0.55, '#8fa8ff'],
];
const cA = new THREE.Color(), cB = new THREE.Color();
const INDOOR_BG = new THREE.Color('#2a2233');
function sampleSky(h) {
  let i = 0;
  while (i < SKY_KEYS.length - 2 && SKY_KEYS[i + 1][0] <= h) i++;
  const a = SKY_KEYS[i], b = SKY_KEYS[i + 1];
  const t = (h - a[0]) / (b[0] - a[0]);
  return {
    top: cA.set(a[1]).lerp(cB.set(b[1]), t).clone(),
    bottom: cA.set(a[2]).lerp(cB.set(b[2]), t).clone(),
    sun: lerp(a[3], b[3], t), hemi: lerp(a[4], b[4], t),
    sunColor: cA.set(a[5]).lerp(cB.set(b[5]), t).clone(),
  };
}

function updateEnvironment(h, focus, dt) {
  const s = sampleSky(h);
  skyUniforms.top.value.copy(s.top);
  skyUniforms.bottom.value.copy(s.bottom);
  const indoor = game.mode === 'interior';
  scene.fog.color.copy(indoor ? new THREE.Color('#2a2233') : s.bottom);
  scene.fog.near = indoor ? 60 : 90; scene.fog.far = indoor ? 200 : 320;
  sky.visible = !indoor;
  scene.background = indoor ? INDOOR_BG : null;
  // 태양 위치 (6시 동쪽 → 18시 서쪽)
  const ang = ((h - 6) / 12) * Math.PI;
  const sunDir = new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0.35).normalize();
  const moonDir = sunDir.clone().negate().setZ(0.35).normalize();
  const day = sunDir.y > -0.05;
  const lightDir = day ? sunDir : moonDir;
  sun.position.copy(focus).addScaledVector(lightDir, 150);
  sun.target.position.copy(focus);
  sun.intensity = day ? s.sun : 0.6;
  sun.color.copy(day ? s.sunColor : new THREE.Color('#9fb4ff'));
  hemi.intensity = indoor ? 0.55 : s.hemi;
  if (indoor) sun.intensity = Math.min(sun.intensity, 0.9);
  hemi.color.copy(s.sunColor).lerp(new THREE.Color('#ffffff'), 0.5);
  sky.position.copy(camera.position);
  stars.position.copy(camera.position);
  sunDisc.position.copy(camera.position).addScaledVector(sunDir, 800);
  moonDisc.position.copy(camera.position).addScaledVector(moonDir, 800);
  sunDisc.visible = !indoor && sunDir.y > -0.1;
  moonDisc.visible = !indoor && moonDir.y > -0.1;
  const night = clamp(h < 12 ? (6.5 - h) / 1.5 : (h - 18.5) / 1.5, 0, 1);
  stars.material.opacity = indoor ? 0 : night;
  clouds.visible = !indoor;
  for (const c of clouds.children) {
    c.position.x += c.userData.speed * dt;
    if (c.position.x > 400) c.position.x = -400;
  }
  clouds.children[0].children[0].material.color.set(night > 0.5 ? '#6f7aa8' : '#ffffff');
  return night;
}

// ------------------------------------------------------------------
// 게임 상태
// ------------------------------------------------------------------
const game = {
  started: false, busy: false, mode: 'city',
  minutes: 7 * 60 + 30, timeSpeed: 1.5,
  scene, camera, renderer,
  city: null, sim: null, traffic: null, player: null, interior: null, mapImage: null,
  net: new Net(), players: null, myId: null, token: null, llm: false,
  profile: null, stats: null, inv: null, combat: null, units: null, ground: null, runners: null,
  waypoint: null, route: null, autoWalk: false,
  weather: '맑음 ☀️',
  sleeping: false, sleepers: { n: 0, total: 1 },
  hp: 100, maxHp: 100, dead: false, stars: 0, course: null, shakeT: 0,
  input: { forward: false, back: false, left: false, right: false, run: false, jump: false, jumpPressed: false, dashPressed: false, enabled: true },
};
window.game = game; // 디버깅용

const ui = new UI(game);
game.ui = ui;

game.hour = () => (game.minutes % 1440) / 60;
game.day = () => Math.floor(game.minutes / 1440);
game.loc = () => (game.mode === 'interior' ? game.interior.building.id : -1);
game.placeText = () => {
  if (game.mode === 'interior') return `${game.interior.building.name} 안`;
  let best = null, bd = 30;
  for (const b of game.city.buildings) {
    const d = Math.hypot(b.door.x - game.player.pos.x, b.door.z - game.player.pos.z);
    if (d < bd) { bd = d; best = b; }
  }
  return best ? `${best.name} 근처 거리` : '바퀴시티의 거리';
};
game.playerJob = () => (game.stats.jobId ? getJob(game.stats.jobId) : null);
game.workBuilding = () => (game.stats.workId != null ? game.city.buildings[game.stats.workId] : null);
game.homeBuilding = () => (game.stats.homeId != null ? game.city.buildings[game.stats.homeId] : game.city.buildings[game.hotelId]);
game.charm = () => game.inv.totals().charm;
game.shake = (k) => { game.shakeT = Math.max(game.shakeT, k * 0.5); };

// ------------------------------------------------------------------
// 시작 & 접속
// ------------------------------------------------------------------
const TOKEN_KEY = 'roachcity.token';
const PROFILE_KEY = 'roachcity.profile';
fetch('/api/status').then((r) => r.json()).then((s) => ui.updateServerStatus(s)).catch(() => ui.updateServerStatus(null));
let savedProfile = null;
try { savedProfile = JSON.parse(localStorage.getItem(PROFILE_KEY)); } catch { savedProfile = null; }
const hasToken = !!localStorage.getItem(TOKEN_KEY);
ui.showStart(hasToken ? savedProfile : null, (profile, cont, password) => startGame(profile, cont, password));
// 서버 업데이트 후 자동 재접속
let resume = false;
try { resume = sessionStorage.getItem('roachcity.resume') === '1'; sessionStorage.removeItem('roachcity.resume'); } catch { /* 무시 */ }
if (resume && hasToken && savedProfile) {
  document.getElementById('start').classList.add('hidden');
  ui.disposePreview();
  startGame(savedProfile, true, localStorage.getItem('roachcity.pw') || '');
}

const params = new URLSearchParams(location.search);
if (params.has('autostart')) {
  document.getElementById('start').classList.add('hidden');
  ui.disposePreview();
  startGame({ name: params.get('name') || '테스트', gender: '여', age: 25, personality: '명랑한 수다쟁이', color: params.get('color') || '#8a5634', accessories: [] }, false, params.get('pw') || '');
}

async function startGame(profile, cont, password) {
  ui.showLoading('바퀴시티 서버에 접속하는 중... 📡');
  let welcome;
  try {
    welcome = await game.net.connect({ t: 'hello', token: localStorage.getItem(TOKEN_KEY), password, profile, continue: cont });
  } catch (e) {
    ui.hideLoading();
    ui.startError(e.message === 'password' ? '🔒 비밀번호가 틀렸어요' : `서버에 접속하지 못했어요 (${e.message})`);
    return;
  }
  ui.showLoading('도시를 짓는 중... 🏗️');
  await new Promise((r) => setTimeout(r, 30));
  try { buildWorld(welcome); } catch (e) { console.error(e); ui.showLoading('오류가 발생했어요: ' + e.message); return; }
  localStorage.setItem(TOKEN_KEY, welcome.token);
  localStorage.setItem(PROFILE_KEY, JSON.stringify(game.profile));
  ui.hideLoading();
  ui.showHUD();
  game.started = true;
  const others = game.players.list.size;
  ui.toast(`바퀴시티에 오신 걸 환영해요, ${game.profile.name}! 🎉`);
  if (others) ui.toast(`👥 지금 ${others}명의 플레이어가 함께 있어요`);
  if (welcome.homeId == null) setTimeout(() => ui.toast('🏨 아직 집이 없어서 호텔에서 지내요. 부동산 🏘️ 에서 집을 살 수 있어요!'), 2000);
  if (!welcome.stats) setTimeout(() => ui.toast('시청 🏛️ 에서 일자리를 구해보세요. 숫자키로 핫바, I키로 가방!'), 4500);
}

function buildWorld(w) {
  game.myId = w.you;
  game.token = w.token;
  game.llm = w.llm;
  game.hotelId = w.hotelId;
  game.profile = { ...w.profile };
  const { buildings, sim } = setupWorld(SEED);
  for (const [id, name] of Object.entries(w.homes)) buildings[id].name = name;
  const city = buildCity(scene, buildings, SEED);
  sim.city = city;
  game.city = city; game.sim = sim;
  game.mapImage = renderMapImage(buildings, 1024);
  game.homes = w.homes;
  game.citizens = new CitizenView(scene, sim, city);
  for (const m of w.npcMeta) game.citizens.applyMeta(m);
  for (const c of sim.citizens) {
    c.affinity = w.affinity[c.id] ?? c.baseAffinity;
    c.memories = w.memories[c.id] || [];
  }
  game.traffic = new Traffic(scene, city, SEED);
  w.extraCars.forEach((c, i) => { if (c.id === game.traffic.cars.length) game.traffic.spawnParked(new THREE.Vector3(c.x, 0, c.z), c.h, w.extraKinds?.[i] || 'car'); });
  game.player = new Player(scene, game.profile);
  game.players = new PlayersView(scene, w.you);
  for (const m of w.players) game.players.add(m);
  game.units = new UnitsView(scene);
  game.ground = new GroundView(scene);
  for (const g of w.ground || []) game.ground.add(g);
  game.runners = new Runners(scene);
  game.minutes = w.minutes; game.timeSpeed = w.timeSpeed; game.weather = w.weather;
  game.stats = Object.assign({
    money: 500, needs: { hunger: 80, energy: 85, fun: 70, social: 55, hygiene: 85 },
    jobId: null, workId: null, lastInterestDay: -1, workedDay: -1, workedToday: 0,
  }, w.stats || {});
  game.stats.homeId = w.homeId;
  game.inv = new Inventory(game);
  game.combat = new Combat(game);
  applySkills();
  game.inv.changed();
  game.sendProfile();
  placeAtHome();
  game.lastDay = game.day();
  ui.buildNeeds();
  ui.renderHotbar();
  setupNet();
}

function applySkills() {
  const sk = game.stats.skills;
  game.player.maxJumps = sk.includes('jump3') ? 3 : sk.includes('jump2') ? 2 : 1;
  game.player.canDash = sk.includes('dash');
}

function placeAtHome() {
  const home = game.homeBuilding();
  const p = game.player;
  p.pos.copy(home.door).addScaledVector(new THREE.Vector3(0, 0, home.dir), 1.5);
  p.pos.y = game.city.groundY(p.pos.x, p.pos.z);
  p.vy = 0;
  p.heading = home.dir === 1 ? 0 : Math.PI;
  p.cam.yaw = (home.dir === 1 ? 0 : Math.PI) + 0.7;
  p.cam.pitch = 0.32;
  p.snap = true;
}

// ------------------------------------------------------------------
// 네트워크
// ------------------------------------------------------------------
const CAR_MODES = ['ai', 'player', 'parked', 'wreck', 'gone'];
function setupNet() {
  const net = game.net;
  net.on('snap', (s) => {
    if (Math.abs(s.m - game.minutes) > 3) game.minutes = s.m; else game.minutes += (s.m - game.minutes) * 0.2;
    if (s.w !== game.weather) { game.weather = s.w; ui.toast(`📅 오늘 날씨: ${s.w}`); }
    for (const m of s.meta) game.citizens.applyMeta(m);
    game.citizens.applySnap(s.n);
    if (s.nd) game.citizens.applyNeeds(s.nd);
    const cars = game.traffic.cars;
    const F = 9;
    for (let i = 0; i < cars.length && i * F < s.c.length; i++) {
      const car = cars[i], o = i * F;
      const mine = car === game.player.inCar;
      car.mode = CAR_MODES[s.c[o + 4]];
      car.owner = s.c[o + 5] >= 0 ? s.c[o + 5] : null;
      car.occ = s.c[o + 7];
      if (mine) { car.mode = 'player'; continue; }
      car.target = { x: s.c[o] / 10, z: s.c[o + 1] / 10, h: s.c[o + 2] / 100, y: s.c[o + 6] / 10 };
      car.turret = s.c[o + 8] / 100;
      car.speed = s.c[o + 3] / 10;
    }
    game.players.applySnap(s.p);
    game.units.apply(s.u || []);
    for (const ev of s.ev) game.citizens.applyEvent(ev);
  });
  net.on('pjoin', (m) => { game.players.add(m.p); ui.toast(`👋 ${m.p.name}님이 바퀴시티에 왔어요`); ui.addChatLine('sys', `${m.p.name}님이 입장했어요`); });
  net.on('pleave', (m) => { const p = game.players.list.get(m.id); if (p) ui.addChatLine('sys', `${p.name}님이 나갔어요`); game.players.remove(m.id); });
  net.on('pmeta', (m) => { if (m.p.id !== game.myId) game.players.meta(m.p); });
  net.on('psay', (m) => {
    ui.addChatLine(m.id === game.myId ? 'me' : 'other', m.text, m.name);
    if (m.id === game.myId) game.myBubble = { text: m.text, t: 5 };
    else game.players.say(m.id, m.text);
  });
  net.on('sys', (m) => { ui.addChatLine('sys', m.text); ui.toast(m.text); });
  net.on('talk', (m) => ui.onTalkReply(m));
  net.on('talkCut', () => { if (ui.chatOpen()) { ui.addMsg('sys', '😱 대화가 중단됐어요!'); setTimeout(() => ui.closeChat(), 800); } });
  net.on('mem', (m) => { const c = game.sim.citizens[m.npc]; if (c) c.memories = m.list; });
  net.on('aff', (m) => { const c = game.sim.citizens[m.npc]; if (c) c.affinity = m.v; });
  net.on('carOk', (m) => {
    const car = game.traffic.cars[m.id];
    if (!car) return;
    car.mode = 'player'; car.owner = game.myId; car.occShown = 0;
    game.player.inCar = car;
    game.autoWalk = false;
    car.speed = 0; car.pos.y = car.pos.y || 0;
    if (car.kind === 'police') ui.toast('🚓 경찰차를 탔어요!');
    if (car.kind === 'tank') ui.toast('🪖 전차 탑승! 클릭하면 포를 쏴요');
    if (car.kind === 'heli') ui.toast('🚁 헬기 탑승! Space 상승 · Shift 하강 · 클릭 미사일');
  });
  net.on('carDenied', () => ui.toast('이 차는 지금 탈 수 없어요'));
  net.on('carGone', () => { ui.toast('💥 차가 폭발했어요!'); leaveCar(); });
  net.on('carSpawn', (m) => { if (m.id === game.traffic.cars.length) game.traffic.spawnParked(new THREE.Vector3(m.x, 0, m.z), m.h, m.kind || 'car'); });
  net.on('carSay', (m) => { const car = game.traffic.cars[m.id]; if (car && m.text) car.bubble = { text: m.text, t: 2.5 }; });
  net.on('eject', (m) => game.runners.spawn(m.x, m.z, m.h, m.n));
  net.on('sleepers', (m) => { game.sleepers = m; ui.updateSleep(); });
  net.on('skip', (m) => {
    game.minutes = m.minutes;
    if (game.sleeping) stopSleeping(true);
    ui.toast('☀️ 모두 푹 자고 아침이 밝았어요!');
  });
  // 전투
  net.on('fx', (m) => game.combat.remoteFx(m));
  net.on('dmg', (m) => {
    game.hp = m.hp;
    game.player.roach.hurt();
    ui.hurtFlash(m.by);
    game.shake(0.4);
  });
  net.on('hp', (m) => { game.hp = m.hp; });
  net.on('dead', (m) => {
    game.dead = true; game.hp = 0; game.stars = 0;
    game.autoWalk = false;
    if (game.sleeping) stopSleeping(false);
    if (game.player.inCar) leaveCar(true);
    if (ui.chatOpen()) ui.closeChat();
    game.player.roach.setDead(true);
    ui.showDeath(m.by);
  });
  net.on('respawn', async (m) => {
    game.dead = false; game.hp = m.hp;
    game.stats.homeId = m.homeId;
    game.player.roach.setDead(false);
    ui.showDeath(null);
    if (game.mode === 'interior') await exitBuilding(true);
    placeAtHome();
    ui.toast(game.stats.homeId != null ? '🏠 집에서 부활했어요. 체력이 가득 찼어요!' : '🏨 호텔에서 부활했어요');
  });
  net.on('wanted', (m) => { game.stars = m.stars; });
  // 바닥 아이템
  net.on('gdrop', (m) => game.ground.add(m.g));
  net.on('gpick', (m) => game.ground.remove(m.gid));
  net.on('gotItem', (m) => {
    const d = itemDef(m.item.id);
    if (m.item.id === 'cash') { game.stats.money += m.item.n; ui.toast(`💵 ₩${m.item.n}을(를) 주웠어요`); return; }
    const it = game.inv.add(m.item.id, m.item.n || 1, m.item.gems || []);
    ui.toast(`${d.emoji} ${d.name}을(를) 주웠어요`);
    void it;
  });
  // 집
  net.on('homes', (m) => {
    game.homes = m.homes;
    for (const [id, name] of Object.entries(m.homes)) {
      const b = game.city.buildings[id];
      if (b && b.name !== name) { b.name = name; retitleSign(b.signMesh, name); }
    }
  });
  net.on('houseOk', (m) => {
    game.stats.money -= m.price;
    game.stats.homeId = m.id;
    ui.toast('🏠 축하해요! 내 집이 생겼어요! 이제 이 집에서 자고 부활해요');
    setWaypoint(game.city.buildings[m.id], '🏠 내 집');
  });
  net.on('houseFail', (m) => ui.toast(`🏘️ ${m.reason}`));
  net.onClose = () => ui.disconnected();
  setInterval(sendState, 100);
  setInterval(() => net.send({ t: 'stats', stats: game.stats }), 15000);
  window.addEventListener('beforeunload', () => net.send({ t: 'stats', stats: game.stats }));
}

function sendState() {
  const p = game.player;
  const car = p.inCar;
  game.net.send({
    t: 'st', x: +p.pos.x.toFixed(2), y: +p.pos.y.toFixed(2), z: +p.pos.z.toFixed(2), h: +p.heading.toFixed(2), s: +p.speed.toFixed(1),
    a: p.onGround ? 0 : 1, loc: game.loc(),
    car: car ? [+car.pos.x.toFixed(2), +car.pos.z.toFixed(2), +car.heading.toFixed(2), +car.speed.toFixed(1), +(car.pos.y || 0).toFixed(2), +(car.turret || 0).toFixed(2)] : null,
  });
}
game.sendProfile = () => {
  if (!game.inv) return;
  const job = game.playerJob();
  const t = game.inv.totals();
  game.player.speedBonus = t.speed;
  Object.assign(game.profile, { accessories: game.inv.visuals(), held: game.inv.heldVisual(), def: t.def, charm: t.charm, regen: t.regen, jobName: job ? job.name : '' });
  localStorage.setItem(PROFILE_KEY, JSON.stringify(game.profile));
  game.net.send({ t: 'profile', profile: game.profile });
};
game.say = (text) => game.net.send({ t: 'say', text });
game.resetSave = () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(PROFILE_KEY); location.reload(); };

// ------------------------------------------------------------------
// 입력
// ------------------------------------------------------------------
const KEYMAP = { KeyW: 'forward', ArrowUp: 'forward', KeyS: 'back', ArrowDown: 'back', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', ShiftLeft: 'run', ShiftRight: 'run', Space: 'jump' };
const typing = () => ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
window.addEventListener('keydown', (e) => {
  if (!game.started) return;
  if (e.code === 'Escape') { if (game.course) endCourse(false, '수련을 포기했어요'); ui.escape(); return; }
  if (typing()) return;
  if (e.code === 'Tab') { e.preventDefault(); ui.togglePhone(); return; }
  if (e.code === 'KeyI') { ui.toggleInventory(); return; }
  if (ui.anyPanelOpen() || game.busy || game.dead) return;
  if (e.code === 'Enter' || e.code === 'KeyT') { e.preventDefault(); clearKeys(); ui.focusPlayerChat(); return; }
  const k = KEYMAP[e.code];
  if (k) {
    if (k === 'jump' && !game.input.jump) game.input.jumpPressed = true;
    game.input[k] = true;
    if (e.code === 'Space') e.preventDefault();
    if (['forward', 'back', 'left', 'right'].includes(k) && game.autoWalk) { game.autoWalk = false; ui.toast('🚶 자동 이동을 멈췄어요'); }
  }
  if (/^Digit[0-9]$/.test(e.code)) { const n = +e.code.slice(5); game.inv.select(n === 0 ? 9 : n - 1); }
  if (e.code === 'KeyE' && !e.repeat) interact();
  if (e.code === 'KeyF' && !e.repeat) toggleCar();
  if (e.code === 'KeyQ' && !e.repeat) dropSelected();
  if (e.code === 'KeyC' && !e.repeat) game.input.dashPressed = true;
  if (e.code === 'KeyR' && !e.repeat) toggleAutoWalk();
  if (e.code === 'KeyM' && !e.repeat) ui.openWorldMap();
  if (e.code === 'KeyH' && !e.repeat) ui.toggleHelp();
});
window.addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) game.input[k] = false; });
function clearKeys() { for (const k of Object.values(KEYMAP)) game.input[k] = false; game.combat?.trigger(false); }
window.addEventListener('blur', clearKeys);

let dragging = false, lastMX = 0, lastMY = 0;
canvas.addEventListener('mousedown', (e) => {
  if (!game.started || ui.anyPanelOpen()) return;
  if (document.pointerLockElement === canvas) {
    if (e.button === 0 && !game.busy && !game.dead) useSelected(true);
    return;
  }
  dragging = true; lastMX = e.clientX; lastMY = e.clientY;
  if (e.button === 0) canvas.requestPointerLock?.()?.catch?.(() => {});
});
window.addEventListener('mouseup', (e) => { dragging = false; if (e.button === 0) game.combat?.trigger(false); });
window.addEventListener('mousemove', (e) => {
  if (!game.started || !game.player) return;
  let dx = 0, dy = 0;
  if (document.pointerLockElement === canvas) { dx = e.movementX; dy = e.movementY; }
  else if (dragging) { dx = e.clientX - lastMX; dy = e.clientY - lastMY; lastMX = e.clientX; lastMY = e.clientY; }
  else return;
  const c = game.player.cam;
  c.yaw -= dx * 0.0028;
  c.pitch = clamp(c.pitch + dy * 0.0022, -0.35, 1.25);
  game.mouseT = 1.5;
});
canvas.addEventListener('wheel', (e) => {
  if (!game.player) return;
  const c = game.player.cam;
  c.dist = clamp(c.dist * (e.deltaY > 0 ? 1.1 : 0.9), 3.2, 30);
}, { passive: true });
document.addEventListener('pointerlockchange', () => { ui.setLocked(document.pointerLockElement === canvas); });
game.releaseMouse = () => { if (document.pointerLockElement) document.exitPointerLock(); };

// 선택한 핫바 아이템 사용 (무기면 공격, 음식이면 먹기)
function useSelected(down) {
  const it = game.inv.selected();
  const d = it ? itemDef(it.id) : null;
  if (game.player.inCar || !d || ['melee', 'gun', 'throw', 'launcher'].includes(d.cat)) { game.combat.trigger(down); return; }
  if (!down) return;
  if (d.cat === 'food') {
    game.inv.consume(it.uid);
    if (d.food) addNeeds(d.food);
    if (d.heal) game.net.send({ t: 'heal', v: d.heal });
    game.player.roach.attack('throw');
    ui.toast(`${d.emoji} ${d.name}을(를) 먹었어요${d.heal ? ` (체력 +${d.heal})` : ''}`);
  } else if (d.cat === 'doll') {
    game.player.roach.wave();
    game.myBubble = { text: `${d.emoji} 귀여워~ 💕`, t: 2 };
    addNeeds({ fun: 2 });
  }
}

// ------------------------------------------------------------------
// 상호작용
// ------------------------------------------------------------------
let focus = null;

function findFocus() {
  const p = game.player;
  const opts = [];
  if (p.inCar) return { kind: 'car-exit', label: '내리기', key: 'F' };
  const pos = p.pos;
  let npc = null, nd = 2.8;
  for (const c of game.sim.citizens) {
    if (!c.visible || c.mode === 'dead') continue;
    const d = c.roach.root.position.distanceTo(pos);
    if (d < nd) { nd = d; npc = c; }
  }
  if (npc) {
    const busy = npc.mode === 'player' && npc.talkingTo !== game.myId;
    const scared = npc.mode === 'flee' || npc.mode === 'fight';
    opts.push({ kind: 'npc', c: npc, d: nd - 0.6, label: busy ? `${npc.name} — 다른 플레이어와 대화 중 💬` : scared ? `${npc.name} — 지금은 대화할 수 없어요 😱` : `대화하기 · ${npc.name} (${npc.job.name})` });
  }
  const g = game.ground.nearest(pos, game.loc());
  if (g) { const d = itemDef(g.item.id); opts.push({ kind: 'ground', g, d: 0, label: `줍기 · ${d.emoji} ${g.item.id === 'cash' ? `₩${g.item.n}` : d.name}${g.item.n > 1 && g.item.id !== 'cash' ? ` x${g.item.n}` : ''}` }); }
  if (game.mode === 'city') {
    for (const b of game.city.buildings) {
      if (b.type === 'park') continue;
      const d = Math.hypot(b.door.x - pos.x, b.door.z - pos.z);
      if (d < 3.2) {
        const n = game.sim.citizens.filter((c) => c.location === b && c.mode === 'inside').length;
        const pl = [...game.players.list.values()].filter((o) => o.loc === b.id).length;
        const lock = b.type === 'club' ? ` (매력 ${CLUB_CHARM}+)` : '';
        opts.push({ kind: 'door', b, d, label: `들어가기 · ${b.def.emoji} ${b.name}${lock}${n ? ` (${n}명)` : ''}${pl ? ` 🎮${pl}` : ''}` });
      }
    }
  } else {
    const I = game.interior;
    for (const a of I.actions) {
      const d = Math.hypot(a.pos.x - pos.x, a.pos.z - pos.z);
      if (d < 1.7 && Math.abs(a.pos.y - pos.y) < 1.5) {
        const cost = a.action.cost ? ` (₩${a.action.cost})` : '';
        opts.push({ kind: 'action', a, d, label: `${a.action.label}${cost}` });
      }
    }
    const de = Math.hypot(I.exit.x - pos.x, I.exit.z - pos.z);
    if (de < 2.0) opts.push({ kind: 'exit', d: de, label: '밖으로 나가기 🚪' });
  }
  opts.sort((a, b) => a.d - b.d);
  const f = opts[0] || null;
  if (f) f.key = 'E';
  if (game.mode === 'city') {
    const car = game.traffic.nearestCar(pos, 3.6);
    if (car) return { ...(f || {}), car, carLabel: car.mode === 'ai' ? (car.occ ? '자동차 빼앗기 (GTA 스타일!) 🚗' : '자동차 타기 🚗') : car.kind === 'tank' ? '전차 타기 🪖' : car.kind === 'heli' ? '헬기 타기 🚁' : '자동차 타기 🚗' };
  }
  return f;
}

function interact() {
  if (!focus) return;
  if (focus.kind === 'npc') {
    const c = focus.c;
    if (c.mode === 'player' && c.talkingTo !== game.myId) { ui.toast('💬 다른 플레이어와 대화 중이에요. 잠시 후 말을 걸어보세요'); return; }
    if (c.mode === 'flee' || c.mode === 'fight') { ui.toast('😱 지금은 겁에 질려서 대화할 수 없어요'); return; }
    ui.openChat(c);
  } else if (focus.kind === 'ground') game.net.send({ t: 'pickup', gid: focus.g.id });
  else if (focus.kind === 'door') enterBuilding(focus.b);
  else if (focus.kind === 'exit') exitBuilding();
  else if (focus.kind === 'action') doAction(focus.a.action);
}

function leaveCar(silent) {
  const p = game.player;
  const car = p.inCar;
  if (!car) return;
  const out = game.traffic.exit(car);
  if (!silent) game.net.send({ t: 'carExit' });
  if (car.kind === 'heli') { car.pos.y = 0; }
  p.pos.copy(out); p.pos.y = game.city.groundY(out.x, out.z);
  p.collide(game.city.colliders);
  p.inCar = null;
  p.roach.setSeated(false);
  p.roach.root.scale.setScalar(p.roach.baseScale);
  p.cam.dist = 7.5;
}

function toggleCar() {
  const p = game.player;
  if (p.inCar) {
    if (p.inCar.kind === 'heli' && (p.inCar.pos.y || 0) > 2) { ui.toast('🚁 먼저 착륙하세요 (Shift로 하강)'); return; }
    game.net.send({ t: 'carExit' });
    leaveCar(true);
    return;
  }
  if (game.mode !== 'city' || !focus?.car) return;
  game.net.send({ t: 'carEnter', id: focus.car.id });
}

async function enterBuilding(b) {
  if (b.type === 'club' && game.charm() < CLUB_CHARM) {
    const msg = `매력 ${CLUB_CHARM} 이상만 입장 가능합니다. 😎 (지금 ${game.charm()})`;
    game.bouncerSay = { b, text: msg, t: 3.5 };
    b.bouncers?.forEach((r) => r.setEmotion('angry', 3));
    ui.toast('🕶️ 경호원: ' + msg + ' 모자·안경·옷 가게에서 꾸며보세요!');
    return;
  }
  if (b.type === 'club') { game.bouncerSay = { b, text: '어서 오십시오. 즐거운 시간 되세요 🎶', t: 2.5 }; b.bouncers?.forEach((r) => r.wave()); }
  await ui.flash();
  const isHome = b.id === game.stats.homeId;
  const job = game.playerJob();
  const isWork = job && b.id === game.stats.workId;
  const I = buildInterior(b, { isHome, workJob: isWork ? job : null });
  scene.add(I.group);
  game.interior = I;
  game.mode = 'interior';
  game.city.root.visible = false;
  const p = game.player;
  p.pos.copy(I.entry);
  p.heading = Math.PI;
  p.cam.yaw = 0;
  p.cam.target.copy(p.pos);
  p.snap = true;
  sendState();
  ui.toast(`${b.def.emoji} ${b.name}에 들어왔어요`);
  if (isHome) ui.toast('🏠 우리 집! 침대에서 잘 수 있어요');
  if (b.type === 'dojang') ui.toast('🥋 시작 발판 위에서 E를 눌러 수련을 시작해요');
}

async function exitBuilding(silent) {
  const b = game.interior.building;
  if (!silent) await ui.flash();
  if (game.sleeping) stopSleeping(false);
  if (game.course) endCourse(false, null);
  game.interior.dispose();
  game.interior = null;
  game.mode = 'city';
  game.city.root.visible = true;
  const p = game.player;
  p.pos.copy(b.door).addScaledVector(new THREE.Vector3(0, 0, b.dir), 1.2);
  p.pos.y = game.city.groundY(p.pos.x, p.pos.z);
  p.heading = b.dir === 1 ? 0 : Math.PI;
  p.cam.yaw = (b.dir === 1 ? 0 : Math.PI) + 0.5;
  p.cam.target.copy(p.pos);
  p.snap = true;
  sendState();
  if (ui.chatOpen()) ui.closeChat();
}

// ------------------------------------------------------------------
// 아이템 버리기
// ------------------------------------------------------------------
async function dropSelected() {
  const it = game.inv.selected();
  if (!it) { ui.toast('선택한 칸이 비어 있어요'); return; }
  const d = itemDef(it.id);
  const value = (d.price || 0) * (it.n || 1);
  if (value >= 300 && !(await ui.confirm(`${d.emoji} ${d.name}${it.n > 1 ? ` x${it.n}` : ''} (₩${value})<br>정말 버리시겠습니까?<br><small>버린 아이템은 1분 뒤에 사라지고, 다른 사람이 주울 수 있어요.</small>`))) return;
  const out = game.inv.remove(it.uid);
  game.net.send({ t: 'drop', item: { id: out.id, n: out.n || 1, gems: out.gems || [] } });
  ui.toast(`${d.emoji} ${d.name}을(를) 바닥에 버렸어요`);
}
game.dropItem = async (u) => { const sel = game.stats.hotbar.indexOf(u); if (sel >= 0) { game.inv.select(sel); await dropSelected(); } else { const old = game.stats.hotbar[game.stats.sel]; game.stats.hotbar[game.stats.sel] = u; await dropSelected(); if (game.inv.find(old)) game.stats.hotbar[game.stats.sel] = old; game.inv.changed(); } };

// ------------------------------------------------------------------
// 행동
// ------------------------------------------------------------------
async function busyFor(text, ms) {
  game.busy = true;
  clearKeys();
  await ui.fade(text, ms);
  game.busy = false;
}
const actionMs = (dur) => Math.min(5000, 1200 + (dur || 0) * 30);

async function doAction(a) {
  const S = game.stats;
  if (a.jobBoard) { ui.openJobBoard(); return; }
  if (a.shop) { ui.openShop(game.interior.building.type); return; }
  if (a.enchant) { ui.openEnchant(); return; }
  if (a.houses) { ui.openHouses(); return; }
  if (a.course) { startCourse(a.course); return; }
  if (a.cost && S.money < a.cost) { ui.toast('💸 돈이 부족해요! 일을 해서 돈을 벌어보세요'); return; }
  if (a.interest) {
    if (S.lastInterestDay === game.day()) { ui.toast('오늘 이자는 이미 받았어요 🏦'); return; }
    const v = Math.max(2, Math.floor(S.money * 0.03));
    S.money += v; S.lastInterestDay = game.day();
    ui.toast(`🏦 이자 ₩${v}를 받았어요!`);
    return;
  }
  if (a.work) {
    const job = game.playerJob();
    if (S.workedDay !== game.day()) { S.workedDay = game.day(); S.workedToday = 0; }
    if (S.workedToday >= 24) { ui.toast('😮‍💨 오늘은 충분히 일했어요. 내일 또 해요!'); return; }
    if (S.needs.energy < 15) { ui.toast('😪 너무 피곤해서 일할 수 없어요. 좀 쉬세요!'); return; }
    const hours = 4;
    await busyFor(`💼 ${job.name}(으)로 열심히 일하는 중...`, 6000);
    const pay = job.wage * hours;
    S.money += pay;
    S.workedToday += hours;
    addNeeds({ energy: -18, hunger: -10, fun: -6, social: 6, hygiene: -6 });
    ui.toast(`💰 ${hours}시간치 일을 해서 ₩${pay}를 벌었어요!`);
    return;
  }
  if (a.rent) {
    S.money -= a.cost;
    const b = game.interior.building;
    await exitBuilding();
    const pos = b.walk.clone().add(new THREE.Vector3(0, 0, b.dir * 2.5));
    game.net.send({ t: 'carRent', x: pos.x, z: pos.z, h: Math.PI / 2 });
    ui.toast('🚗 렌트한 자동차를 탔어요! F 키로 내릴 수 있어요');
    return;
  }
  if (a.sleep) {
    S.money -= a.cost || 0;
    if (a.fx?.hygiene) addNeeds({ hygiene: a.fx.hygiene });
    startSleeping();
    return;
  }
  S.money -= a.cost || 0;
  if (a.id === 'dance') game.player.roach.dancing = true;
  if (a.dur) await busyFor(`${a.label.split(' (')[0]} 중...`, actionMs(a.dur));
  game.player.roach.dancing = false;
  if (a.fx) addNeeds(a.fx);
  if (a.heal) game.net.send({ t: 'heal', v: a.heal });
  if (a.earn) { S.money += a.earn; ui.toast(`📺 출연료 ₩${a.earn}을 받았어요!`); }
  ui.toast(`${a.label} 완료!`);
}

// 상점 구매 (UI에서 호출)
game.buy = async (id) => {
  const d = itemDef(id);
  const S = game.stats;
  if (S.money < d.price) { ui.toast('💸 돈이 부족해요!'); return false; }
  if (d.cat === 'vehicle') {
    S.money -= d.price;
    ui.closeModal();
    const b = game.interior.building;
    await exitBuilding();
    const pos = b.walk.clone().add(new THREE.Vector3(0, 0, b.dir * 3));
    game.net.send({ t: 'buyVehicle', kind: d.vehicle, x: pos.x, z: pos.z, h: Math.PI / 2 });
    ui.toast(`${d.emoji} ${d.name}이(가) 가게 앞에 배송됐어요!`);
    return true;
  }
  S.money -= d.price;
  const it = game.inv.add(id, d.stack && d.cat === 'throw' ? 3 : 1);
  if (d.slot && it && !game.stats.equip[d.slot]) game.inv.equip(it.uid);
  ui.toast(`${d.emoji} ${d.name}을(를) 샀어요!${d.slot ? ' (I키 가방에서 장착)' : ''}`);
  return true;
};

game.enchant = (itemUid, gemUid) => {
  const S = game.stats;
  const it = game.inv.find(itemUid), gem = game.inv.find(gemUid);
  if (!it || !gem) return;
  const d = itemDef(it.id);
  if ((it.gems || []).length >= (d.sockets || 0)) { ui.toast('빈 보석 칸이 없어요'); return; }
  if (S.money < ENCHANT_FEE) { ui.toast('💸 인챈트 비용이 부족해요'); return; }
  S.money -= ENCHANT_FEE;
  (it.gems ||= []).push(itemDef(gem.id).gem);
  game.inv.consume(gemUid);
  game.inv.changed();
  ui.toast(`✨ ${d.name}에 ${itemDef(gem.id).name}을(를) 박았어요!`);
};

game.buyHouse = (b) => {
  const price = housePrice(b);
  if (game.stats.money < price) { ui.toast(`💸 ₩${price}이 필요해요`); return; }
  game.net.send({ t: 'buyHouse', id: b.id });
};

// ------------------------------------------------------------------
// 무릉도장 수련
// ------------------------------------------------------------------
function startCourse(id) {
  const c = game.interior.courses.find((x) => x.id === id);
  if (!c) return;
  if (c.require && !game.stats.skills.includes(c.require)) { ui.toast('🥋 사범: 먼저 2단 점프를 익히고 오너라!'); return; }
  if (game.stats.skills.includes(c.reward)) ui.toast(`이미 ${c.rewardName}을(를) 익혔어요. 연습 모드로 도전!`);
  game.course = { c, left: c.time, falls: 0 };
  resetToCourseStart();
  ui.toast(`🥋 ${c.name} 시작! ${c.time}초 안에 깃발까지 가세요${c.lavaCourse ? ' (용암 조심!)' : ''}`);
}
function resetToCourseStart() {
  const p = game.player;
  p.pos.copy(game.course.c.start); p.vy = 0; p.heading = Math.PI;
  p.cam.yaw = 0; p.snap = true;
}
function endCourse(success, msg) {
  const c = game.course?.c;
  game.course = null;
  ui.courseHud(null);
  if (!c) return;
  if (success) {
    if (!game.stats.skills.includes(c.reward)) {
      game.stats.skills.push(c.reward);
      applySkills();
      ui.celebrate(`🥋 ${c.rewardName}을(를) 전수받았어요!`, c.reward === 'dash' ? 'C키로 대쉬! 공중에서도 쓸 수 있어요' : `점프 키를 공중에서 다시 누르면 ${c.reward === 'jump3' ? '3' : '2'}단 점프!`);
    } else ui.toast(`🏁 ${c.name} 클리어!`);
  } else if (msg) ui.toast(`❌ ${msg}`);
}
function updateCourse(dt) {
  const C = game.course;
  if (!C) return;
  const p = game.player, c = C.c;
  C.left -= dt;
  ui.courseHud(`${c.name} · 남은 시간 ${Math.max(0, C.left).toFixed(1)}초 · 낙하 ${C.falls}회`);
  if (C.left <= 0) { endCourse(false, '시간 초과! 다시 도전해보세요'); return; }
  const onLava = game.interior.lava.some((l) => p.pos.x > l.minX && p.pos.x < l.maxX && p.pos.z > l.minZ && p.pos.z < l.maxZ) && p.pos.y < 0.35;
  const fell = p.pos.y < 0.2 && p.pos.z < c.safeZ;
  if (onLava || fell) { C.falls++; ui.toast(onLava ? '🔥 앗 뜨거! 처음부터 다시!' : '😵 떨어졌어요! 처음부터 다시!'); resetToCourseStart(); return; }
  if (Math.hypot(p.pos.x - c.goal.x, p.pos.z - c.goal.z) < 2 && p.pos.y >= c.goal.y - 0.3) endCourse(true);
}

// ------------------------------------------------------------------
// 잠
// ------------------------------------------------------------------
function startSleeping() {
  game.sleeping = true;
  game.busy = true;
  clearKeys();
  game.net.send({ t: 'sleep', on: true });
  ui.showSleep(true);
}
function stopSleeping(morning) {
  if (!game.sleeping) return;
  game.sleeping = false;
  game.busy = false;
  game.net.send({ t: 'sleep', on: false });
  ui.showSleep(false);
  if (morning) addNeeds({ energy: 100, hunger: -10, hygiene: -10 });
}
game.wakeUp = () => stopSleeping(false);

function addNeeds(fx) {
  const N = game.stats.needs;
  for (const [k, v] of Object.entries(fx)) if (k in N) N[k] = clamp(N[k] + v, 0, 100);
}
game.addNeeds = addNeeds;

const DECAY = { hunger: 4.5, energy: 3.2, fun: 3, social: 2.5, hygiene: 2 };
function decayNeeds(mins) {
  const N = game.stats.needs;
  for (const k of Object.keys(DECAY)) N[k] = clamp(N[k] - (DECAY[k] * mins) / 60, 0, 100);
}
const warned = {};
const NEED_MSG = { hunger: '🍜 배가 고파요! 식당이나 편의점에 가보세요', energy: '😪 피곤해요... 집에서 자거나 커피를 마셔요', fun: '🎈 심심해요! 영화관이나 클럽은 어때요?', social: '💬 외로워요... 이웃과 대화해보세요', hygiene: '🚿 씻을 때가 됐어요 (집, 헬스장, 미용실)' };
function checkNeeds() {
  for (const [k, v] of Object.entries(game.stats.needs)) {
    if (v < 20 && !warned[k]) { warned[k] = true; ui.toast(NEED_MSG[k]); }
    if (v > 35) warned[k] = false;
  }
}
function checkNewDay() {
  const d = game.day();
  if (d !== game.lastDay) { game.lastDay = d; ui.toast(`📅 ${d + 1}일차 ${DAYS[d % 7]}요일이 밝았어요!`); }
}

game.takeJob = (job) => {
  const list = [...(game.city.byType[job.building] || [])];
  if (!list.length) return;
  const home = game.homeBuilding();
  list.sort((a, b) => a.door.distanceTo(home.door) - b.door.distanceTo(home.door));
  game.stats.jobId = job.id;
  game.stats.workId = list[0].id;
  ui.toast(`🎉 ${list[0].name}의 ${job.name}(으)로 취직했어요! 시급 ₩${job.wage}`);
  ui.toast('💼 직장에 가서 E 키로 일할 수 있어요');
  game.sendProfile();
  setWaypoint(list[0]);
};
game.quitJob = () => { game.stats.jobId = null; game.stats.workId = null; game.sendProfile(); ui.toast('직장을 그만뒀어요...'); };

// ------------------------------------------------------------------
// 목적지 & 자동 이동
// ------------------------------------------------------------------
function setWaypoint(target, label) {
  const isB = !!target.door;
  const pos = isB ? target.door.clone() : target.clone();
  game.waypoint = { pos, label: label || (isB ? target.name : '목적지'), building: isB ? target : null };
  updateRoute();
}
game.setWaypoint = setWaypoint;
function updateRoute() {
  if (!game.waypoint) { game.route = null; return; }
  const from = game.mode === 'interior' ? game.interior.building.door : game.player.pos;
  game.route = routeTo(from, game.waypoint.building || { point: game.waypoint.pos });
}
game.updateRoute = updateRoute;
function toggleAutoWalk() {
  if (!game.waypoint) { ui.toast('🗺️ 먼저 지도(M)에서 목적지를 찍어주세요'); return; }
  if (game.player.inCar || game.mode === 'interior') { ui.toast('🚶 거리에서만 자동으로 걸을 수 있어요'); return; }
  game.autoWalk = !game.autoWalk;
  if (game.autoWalk) { updateRoute(); ui.toast(`🚶 ${game.waypoint.label}(으)로 자동 이동! (R 또는 방향키로 멈춤)`); }
}
game.toggleAutoWalk = toggleAutoWalk;
function autoWalkDir() {
  if (!game.autoWalk || !game.route || game.mode !== 'city' || game.player.inCar) return null;
  const p = game.player.pos;
  while (game.route.length && Math.hypot(game.route[0].x - p.x, game.route[0].z - p.z) < 1.2) game.route.shift();
  if (!game.route.length) { game.autoWalk = false; ui.toast(`📍 ${game.waypoint.label}에 도착했어요!`); game.waypoint = null; return null; }
  const t = game.route[0];
  const d = new THREE.Vector3(t.x - p.x, 0, t.z - p.z).normalize();
  return d;
}

// ------------------------------------------------------------------
// NPC 대화
// ------------------------------------------------------------------
game.talk = (c, text, opts = {}) => game.net.send({ t: 'talk', npc: c.id, text, ...opts });
game.endTalk = (c) => game.net.send({ t: 'talkEnd', npc: c.id });
game.onTalkResult = (c, m) => {
  c.affinity = m.affinity;
  if (m.action === 'give_money' && m.amount > 0) { game.stats.money += m.amount; ui.toast(`💝 ${c.name}이(가) ₩${m.amount}를 줬어요!`); }
  addNeeds({ social: 5, fun: 1 });
};

// ------------------------------------------------------------------
// 메인 루프
// ------------------------------------------------------------------
const clock = new THREE.Clock();
const NO_INPUT = { forward: false, back: false, left: false, right: false, run: false, jump: false, jumpPressed: false, dashPressed: false, enabled: false };
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;
  game.frames = (game.frames || 0) + 1;
  if (!game.started) { ui.renderPreview(dt); return; }
  const gm = dt * game.timeSpeed;
  game.minutes += gm;
  decayNeeds(gm);
  if (game.sleeping) addNeeds({ energy: dt * 6 });
  checkNeeds();
  checkNewDay();
  game.mouseT = Math.max(0, (game.mouseT || 0) - dt);
  const p = game.player;
  const panel = ui.anyPanelOpen() || typing();
  const blocked = panel || game.busy || game.dead;
  const input = blocked ? NO_INPUT : game.input;
  input.enabled = !blocked;
  input.moveDir = blocked ? null : autoWalkDir();
  const indoor = game.mode === 'interior';
  const world = indoor
    ? { colliders: game.interior.colliders, groundY: () => 0.1, bounds: game.interior.bounds, npcs: game.sim.citizens, cameraColliders: null, platforms: game.interior.platforms, tired: game.stats.needs.energy < 8 }
    : { colliders: game.city.colliders, groundY: game.city.groundY, npcs: game.sim.citizens, cameraColliders: game.city.colliders, tired: game.stats.needs.energy < 8, bounds: { minX: -HALF - 50, maxX: HALF + 50, minZ: -HALF - 50, maxZ: HALF + 50 } };
  world.mouseActive = game.mouseT > 0;

  // 차량: 내 차는 직접 운전, 나머지는 서버 위치로 보간
  const k = Math.min(1, dt * 10);
  for (const car of game.traffic.cars) {
    if (car.bubble) { car.bubble.t -= dt; if (car.bubble.t <= 0) car.bubble = null; }
    if (car === p.inCar) {
      game.traffic.updatePlayer(car, dt, { input, city: game.city, onBump: () => ui.toast('쿵! 💥') });
      if (car.kind === 'tank') car.turret = angleLerp(car.turret || 0, (p.cam.yaw + Math.PI) - car.heading, Math.min(1, dt * 6));
      continue;
    }
    const tg = car.target;
    if (!tg) continue;
    if (Math.hypot(tg.x - car.pos.x, tg.z - car.pos.z) > 10) car.pos.set(tg.x, tg.y, tg.z);
    car.pos.x += (tg.x - car.pos.x) * k; car.pos.z += (tg.z - car.pos.z) * k; car.pos.y = (car.pos.y || 0) + ((tg.y || 0) - (car.pos.y || 0)) * k;
    car.heading = angleLerp(car.heading, tg.h, k);
  }
  game.traffic.render(!indoor, camera.position, dt);

  if (!game.dead) p.update(dt, input, world);
  else p.roach.update(dt, 0, {});
  if (p.inCar) { seatRoach(p.roach, p.inCar); p.roach.update(dt, 0, {}); }
  game.citizens.update(dt, camera.position, game.loc());
  game.players.update(dt, game.loc(), game.traffic);
  game.units.update(dt, game.loc(), game.city.groundY);
  game.ground.update(t, game.loc());
  game.runners.update(dt);
  game.combat.update(dt);
  updateCourse(dt);
  if (game.myBubble) { game.myBubble.t -= dt; if (game.myBubble.t <= 0) game.myBubble = null; }
  if (game.bouncerSay) { game.bouncerSay.t -= dt; if (game.bouncerSay.t <= 0) game.bouncerSay = null; }
  const night = updateEnvironment(game.hour(), p.cam.target, dt);
  game.city.update(dt, t, night);
  windowGlow(night);
  if (game.interior) game.interior.update(dt, t, camera.position);
  p.updateCamera(camera, dt, world);
  if (game.shakeT > 0) {
    game.shakeT -= dt;
    camera.position.x += (Math.random() - 0.5) * game.shakeT * 1.2;
    camera.position.y += (Math.random() - 0.5) * game.shakeT * 1.2;
  }

  focus = blocked ? null : findFocus();
  ui.setPrompt(focus);
  ui.update(dt);
  renderer.render(scene, camera);
  game.input.jumpPressed = false;
  game.input.dashPressed = false;
}
let lastGlow = -1;
function windowGlow(night) {
  if (Math.abs(night - lastGlow) < 0.01) return;
  lastGlow = night;
  for (const m of Object.values(windowMaterials())) m.emissiveIntensity = night * 1.3;
}
requestAnimationFrame(frame);

game.applySettings = () => {
  renderer.shadowMap.enabled = settings.shadows;
  sun.castShadow = settings.shadows;
  scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; });
  saveSettings();
};
