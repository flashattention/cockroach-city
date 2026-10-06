import * as THREE from 'three';
import { SEED, HALF } from './config.js';
import { buildCity, renderMapImage } from './city.js';
import { setupWorld, housePrice, homeLabel, freeUnits } from './world-setup.js';
import { Traffic } from './traffic.js';
import { Player } from './player.js';
import { buildInterior } from './interior.js';
import { Lobby } from './lobby.js';
import { CitizenView, PlayersView, UnitsView, GroundView, Runners, RouteView, seatRoach } from './views.js';
import { Inventory } from './inventory.js';
import { Combat } from './combat.js';
import { itemDef, CLUB_CHARM, ENCHANT_FEE, RARITY, SHOPS, TEMP_MINUTES } from './items.js';
import { routeTo, routeLength } from './citizens.js';
import { Net } from './net.js';
import { UI } from './ui.js';
import { settings, saveSettings } from './settings.js';
import { getJob } from './data.js';
import { DAYS, clamp, lerp, angleLerp, windowMaterials, retitleSign } from './utils.js';
import { expNeed, levelStats, addExp } from './level.js';
import { dailyQuests, questDef } from './quests.js';
import { SPORT_KINDS, vehicleName, CAR_KINDS } from './traffic.js';
import { DROP_POOL } from './items.js';
import { buildWilds, renderWorldImage } from './wilds.js';
import { AnimalsView } from './animals.js';
import { WORLD_HALF, WATER_Y, regionAt } from './terrain.js';

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
  // 실내에서는 바깥 해 그림자를 끈다 (해가 움직일 때 어두운 바닥이 파바박 깜빡이던 문제)
  const wantShadow = settings.shadows && !indoor;
  if (sun.castShadow !== wantShadow) sun.castShadow = wantShadow;
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
game.regionName = (pos) => { const r = regionAt(pos.x, pos.z); return r ? `${r.emoji} ${r.name}` : null; };
game.placeText = () => {
  if (game.mode === 'interior') return `${game.interior.building.name} 안`;
  const rn = game.regionName(game.player.pos);
  if (rn) return rn;
  if (Math.abs(game.player.pos.x) > HALF || Math.abs(game.player.pos.z) > HALF) return '바퀴시티 외곽';
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
const PROFILE_KEY = 'roachcity.profile';
const lobby = new Lobby();
async function boot() {
  let status = null;
  try { status = await (await fetch('/api/status', { cache: 'no-store' })).json(); } catch { status = null; }
  ui.updateServerStatus(status);
  // 로그인 화면 뒤로 지금 서버의 실제 도시를 보여준다 (관전 연결)
  try {
    const w = await game.net.connect({ t: 'spectate' });
    buildWorld(w);
    game.spectating = true;
    startTour();
  } catch (e) { console.warn('관전 연결 실패', e.message); }
  // 서버 업데이트 후 자동 재접속
  let resume = false;
  try { resume = sessionStorage.getItem('roachcity.resume') === '1'; sessionStorage.removeItem('roachcity.resume'); } catch { /* 무시 */ }
  const { session, char } = await lobby.run(status, { resume });
  startGame(session, char);
}
boot();

async function startGame(session, char) {
  document.getElementById('start').classList.add('hidden');
  ui.disposePreview();
  ui.showLoading('바퀴시티에 입장하는 중... 🪳');
  let welcome;
  try {
    welcome = await game.net.request({ t: 'hello', session, char });
  } catch (e) {
    ui.hideLoading();
    document.getElementById('start').classList.remove('hidden');
    if (e.message === 'login') { lobby.session = null; try { localStorage.removeItem('roachcity.session'); } catch { /* 무시 */ } lobby.renderLogin(); lobby.error('🔑 로그인이 만료됐어요. 다시 로그인해 주세요'); }
    else lobby.error(`서버에 접속하지 못했어요 (${e.message})`);
    const again = await new Promise((res) => { lobby.resolve = (c) => res(c); });
    startGame(lobby.session, again);
    return;
  }
  await new Promise((r) => setTimeout(r, 30));
  game.session = session; game.char = char;
  try {
    if (!game.city) buildWorld(welcome);
    enterGame(welcome);
  } catch (e) { console.error(e); ui.showLoading('오류가 발생했어요: ' + e.message); return; }
  localStorage.setItem(PROFILE_KEY, JSON.stringify(game.profile));
  ui.hideLoading();
  ui.showHUD();
  game.spectating = false;
  game.started = true;
  const others = game.players.list.size;
  ui.toast(`바퀴시티에 오신 걸 환영해요, ${game.profile.name}! 🎉`);
  if (others) ui.toast(`👥 지금 ${others}명의 플레이어가 함께 있어요`);
  if (welcome.homeId == null) setTimeout(() => ui.toast('🏨 아직 집이 없어서 호텔에서 지내요. 부동산 🏘️ 에서 집을 살 수 있어요!'), 2000);
  if (!welcome.stats) setTimeout(() => ui.toast('시청 🏛️ 에서 일자리를 구해보세요. 숫자키로 핫바, I키로 가방!'), 4500);
}

// ------------------------------------------------------------------
// 로그인 화면 배경: 도시 명소를 천천히 비추는 카메라
// ------------------------------------------------------------------
const tour = { shots: [], i: 0, t: 0 };
function startTour() {
  const B = game.city.byType;
  const pick = (type, label, r = 34, h = 16) => { const b = B[type]?.[0]; if (b) tour.shots.push({ b, label, r, h }); };
  pick('cityhall', '🏛️ 시청 광장', 42, 20);
  pick('park', '🌳 도토리 공원', 38, 18);
  pick('hospital', '🏥 종합병원 앞', 36, 16);
  pick('pizza', '🍕 맛집 거리', 26, 11);
  pick('club', '🪩 클럽 바퀴락', 30, 13);
  const sub = game.city.buildings.find((b) => b.suburb && b.type === 'house');
  if (sub) tour.shots.push({ b: sub, label: '🏡 교외 전원주택단지', r: 40, h: 22 });
  pick('apartment', '🏢 아파트 단지', 50, 26);
  pick('dojang', '🥋 무릉도장', 40, 18);
  pick('hotel', '🏨 그랜드 바퀴 호텔', 40, 22);
  tour.i = Math.floor(Math.random() * tour.shots.length);
  tour.t = 0;
  document.getElementById('start').classList.add('live');
}
function tourFrame(dt, t) {
  const shot = tour.shots[tour.i];
  if (!shot) return;
  tour.t += dt;
  const DUR = 9;
  if (tour.t > DUR) { tour.t = 0; tour.i = (tour.i + 1) % tour.shots.length; ui.tourFade(); return; }
  const b = shot.b, k = tour.t / DUR;
  const center = new THREE.Vector3(b.x, 2, b.z + b.dir * (b.d / 2 + 6));
  const a = (b.dir === 1 ? 0 : Math.PI) + 0.9 - k * 0.9;
  camera.position.set(center.x + Math.sin(a) * shot.r, shot.h - k * 3, center.z + Math.cos(a) * shot.r);
  camera.lookAt(center);
  // 지금 이 근처에 있는 시민 수
  if (Math.floor(t * 2) !== tour.lastSec) {
    tour.lastSec = Math.floor(t * 2);
    let n = 0;
    for (const c of game.sim.citizens) if (c.visible && c.roach.root.position.distanceTo(center) < 45) n++;
    ui.tourCaption(shot.label, n, game.players.list.size, game.hour());
  }
}

// 도시·시민·차량 (관전과 플레이 공통)
function buildWorld(w) {
  game.hotelId = w.hotelId;
  game.llm = w.llm;
  const { buildings, sim } = setupWorld(SEED);
  for (const [id, name] of Object.entries(w.homes)) buildings[id].name = name;
  const city = buildCity(scene, buildings, SEED);
  // 도시 밖 넓은 세상: 지형·숲·바다·대교
  const wild = buildWilds(scene, city);
  game.wild = wild;
  const cityGround = city.groundY;
  city.groundY = (x, z, y) => (Math.abs(x) <= HALF && Math.abs(z) <= HALF ? cityGround(x, z) : wild.groundY(x, z, y));
  game.worldImage = renderWorldImage(wild.grid);
  game.animals = new AnimalsView(scene, w.animals || [], city.groundY);
  for (const key of w.smashed || []) smashProp(key, [1, 0], true);
  sim.city = city;
  game.city = city; game.sim = sim;
  game.mapImage = renderMapImage(buildings, 1024);
  game.homes = w.homes;
  game.citizens = new CitizenView(scene, sim, city);
  for (const m of w.npcMeta) game.citizens.applyMeta(m);
  game.traffic = new Traffic(scene, city, SEED);
  w.extraCars.forEach((c) => { if (c.id === game.traffic.cars.length) game.traffic.spawnParked(new THREE.Vector3(c.x, 0, c.z), c.h, c.kind || 'sedan', c.color); });
  game.players = new PlayersView(scene, w.you);
  for (const m of w.players) game.players.add(m);
  game.units = new UnitsView(scene);
  game.ground = new GroundView(scene);
  for (const g of w.ground || []) game.ground.add(g);
  game.runners = new Runners(scene);
  game.routeView = new RouteView(scene, city.groundY);
  game.minutes = w.minutes; game.timeSpeed = w.timeSpeed; game.weather = w.weather;
  game.combat = new Combat(game);
  setupNet();
}

// 내 캐릭터로 입장
function enterGame(w) {
  game.myId = w.you;
  game.token = w.token;
  game.llm = w.llm;
  game.profile = { ...w.profile };
  game.admin = !!w.admin;
  game.phone = w.phone; game.contacts = w.contacts || []; game.sms = w.sms || [];
  game.profile.phone = w.phone;
  game.players.myId = w.you;
  game.players.remove(w.you);
  for (const m of w.players) if (m.id !== w.you && !game.players.list.has(m.id)) game.players.add(m);
  for (const c of game.sim.citizens) {
    c.affinity = w.affinity[c.id] ?? c.baseAffinity;
    c.memories = w.memories[c.id] || [];
  }
  game.minutes = w.minutes;
  game.player = new Player(scene, game.profile);
  game.stats = Object.assign({
    money: 500, needs: { hunger: 80, energy: 85, fun: 70, social: 55, hygiene: 85 },
    jobId: null, workId: null, lastInterestDay: -1, workedDay: -1, workedToday: 0,
  }, w.stats || {});
  game.stats.homeId = w.homeId;
  game.stats.homeUnit = w.homeUnit;
  game.myHomes = w.myHomes || [];
  game.owned = w.owned || {};
  // 직장 건물 번호가 바뀌었으면 같은 종류의 건물로 옮긴다
  const job = game.stats.jobId ? getJob(game.stats.jobId) : null;
  if (job && game.city.buildings[game.stats.workId]?.type !== job.building) game.stats.workId = game.city.byType[job.building]?.[0]?.id ?? null;
  game.inv = new Inventory(game);
  // 새 캐릭터: 고른 기본 악세서리를 가방에 넣고 착용
  if (w.starter) for (const id of Object.values(w.starter)) { const it = game.inv.add(id); if (it) game.inv.equip(it.uid); }
  syncKeys();
  game.stats.level ||= 1; game.stats.exp ||= 0;
  game.maxMana = levelStats(game.stats.level).mana; game.mana = game.maxMana;
  ensureQuests();
  applySkills();
  game.inv.changed();
  game.sendProfile();
  placeAtHome();
  game.lastDay = game.day();
  ui.buildNeeds();
  ui.renderHotbar();
  document.getElementById('start').classList.remove('live');
}

// 내가 가진 집마다 열쇠 아이템 하나씩
function syncKeys() {
  const S = game.stats, inv = game.inv;
  const has = (h) => S.items.find((it) => it.id === 'house_key' && it.key?.bid === h.bid && it.key?.unit === h.unit);
  for (const it of S.items.filter((x) => x.id === 'house_key' && !game.myHomes.some((h) => h.bid === x.key?.bid && h.unit === x.key?.unit))) inv.remove(it.uid);
  for (const h of game.myHomes) if (!has(h)) S.items.push({ uid: Math.random().toString(36).slice(2, 10), id: 'house_key', n: 1, gems: [], key: { bid: h.bid, unit: h.unit } });
  inv.changed();
}
game.homeLabelOf = (k) => homeLabel(game.city.buildings[k.bid], k.unit);
game.ownsHome = (b, unit) => game.myHomes.some((h) => h.bid === b.id && (unit == null || h.unit === unit));

// 2단 점프와 대쉬는 기본. 3단 점프·대쉬 거리·점프력은 무릉도장 수련으로
function applySkills() {
  const sk = game.stats.skills;
  game.player.maxJumps = sk.includes('jump3') ? 3 : 2;
  game.player.canDash = true;
  game.player.dashPower = sk.includes('dashlong') || sk.includes('dash') ? 38 : 24;
  game.player.jumpV = sk.includes('jumpboost') ? 9.2 : 7.5;
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
    if (s.w !== game.weather) { game.weather = s.w; if (game.started) ui.toast(`📅 오늘 날씨: ${s.w}`); }
    for (const m of s.meta) game.citizens.applyMeta(m);
    game.citizens.applySnap(s.n);
    if (s.nd) game.citizens.applyNeeds(s.nd);
    const cars = game.traffic.cars;
    const F = 9;
    for (let i = 0; i < cars.length && i * F < s.c.length; i++) {
      const car = cars[i], o = i * F;
      const mine = !!game.player && car === game.player.inCar;
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
    if (s.a) game.animals.apply(s.a);
    for (const ev of s.ev) game.citizens.applyEvent(ev);
  });
  net.on('pjoin', (m) => { game.players.add(m.p); if (!game.started) return; ui.toast(`👋 ${m.p.name}님이 바퀴시티에 왔어요`); ui.addChatLine('sys', `${m.p.name}님이 입장했어요`); });
  net.on('pleave', (m) => { const p = game.players.list.get(m.id); if (p && game.started) ui.addChatLine('sys', `${p.name}님이 나갔어요`); game.players.remove(m.id); });
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
  net.on('carSpawn', (m) => { if (m.id === game.traffic.cars.length) game.traffic.spawnParked(new THREE.Vector3(m.x, 0, m.z), m.h, m.kind || 'sedan', m.color); });
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
  net.on('hp', (m) => { game.hp = m.hp; if (m.max) game.maxHp = m.max; });
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
    const extra = m.item.ttlMs ? { expiresAt: Date.now() + m.item.ttlMs, rarity: m.item.rarity || 'common' } : null;
    game.inv.add(m.item.id, m.item.n || 1, m.item.gems || [], extra);
    if (m.bonus) game.inv.add(m.bonus.id, m.bonus.n || 1, [], extra);
    if (m.world) {
      const r = RARITY[m.item.rarity] || RARITY.common;
      const bonus = m.bonus ? `+ ${itemDef(m.bonus.id).name.replace(/ ×\d+$/, '')} ${m.bonus.n}개` : '';
      ui.lootBanner(`${d.emoji} ${d.name}을(를) 획득했습니다!`, `(${TEMP_MINUTES}분 제한 / ${r.name})`, r.color, bonus);
    } else ui.toast(`${d.emoji} ${d.name}을(를) 주웠어요${extra ? ` (남은 시간 ${Math.ceil(m.item.ttlMs / 60000)}분)` : ''}`);
  });
  net.on('loot', (m) => { ui.addChatLine('loot', m.text); });
  net.on('knock', (m) => {
    const p = game.player;
    if (p.inCar) return;
    p.knock = { x: m.x, z: m.z, t: 0.45 };
    if (p.flying) p.flying = false;
    p.vy = m.up; p.onGround = false;
    p.roach.jumpSquash = 1;
    if (m.wind) { ui.toast('🌪️ 돌풍에 날아갔어요!'); return; }
    // 차에 치이면 벌러덩 뒤집힌다 → ← → 번갈아 눌러서 일어나기
    p.flipped = true;
    game.flip = { n: 0, need: 10, last: null };
    ui.flipHud(0, 10);
    ui.toast('🚗💥 차에 치여서 뒤집혔어요!');
  });
  net.on('xp', (m) => gainExp(m.v, m.reason));
  net.on('smash', (m) => smashProp(m.key, m.dir, true));
  net.on('unsmash', (m) => smashProp(m.key, null, false));
  net.on('hunted', (m) => { game.stats.hunted = (game.stats.hunted || 0) + 1; game.questEvent('hunt'); });
  // 휴대폰
  const refreshPhone = (tab) => { if (!document.getElementById('phone').classList.contains('hidden') && ui.phoneTab === tab) ui.openPhone(tab); };
  net.on('contacts', (m) => { game.contacts = m.list; refreshPhone('contacts'); });
  net.on('smsOut', (m) => { game.sms.push(m.m); refreshPhone('sms'); });
  net.on('smsIn', (m) => {
    game.sms.push(m.m);
    const who = game.contacts.find((c) => c.num === m.m.from)?.name || m.m.fromName;
    ui.toast(`💬 ${who}: ${m.m.text.slice(0, 40)}`);
    refreshPhone('sms');
  });
  net.on('numReq', async (m) => { if (await ui.confirm(`📞 ${m.name}님이 번호를 교환하고 싶어해요. 수락할까요?`)) net.send({ t: 'numAccept', id: m.id }); });
  net.on('flirtRes', (m) => ui.toast(m.player ? `💖 ${m.name}님에게 하트를 날렸어요!` : m.ok ? `💗 ${m.name}의 마음이 흔들려요! (친밀도 ↑)` : `💔 ${m.name}에게 안 통했어요...`));
  net.on('flirted', (m) => { ui.toast(`💖 ${m.name}님이 나에게 하트를 날렸어요!`); game.player.roach.setEmotion('love', 3); });
  net.on('slow', (m) => { game.slowT = m.s; ui.toast('❄️ 몸이 얼어서 느려졌어요!'); });
  net.on('canReport', (m) => { game.reportable = m.list; if (!game.reportHint) { game.reportHint = true; ui.toast('📱 휴대폰(Tab) → 112에서 나를 공격한 플레이어를 신고할 수 있어요'); } });
  // 집
  net.on('homes', (m) => {
    game.homes = m.homes;
    game.owned = m.owned || {};
    for (const [id, name] of Object.entries(m.homes)) {
      const b = game.city.buildings[id];
      if (b && b.name !== name) { b.name = name; retitleSign(b.signMesh, name); }
    }
  });
  const setHomes = (m) => {
    game.stats.homeId = m.homeId; game.stats.homeUnit = m.homeUnit; game.myHomes = m.myHomes || [];
    syncKeys();
  };
  net.on('houseOk', (m) => {
    game.stats.money -= m.price;
    setHomes(m);
    const b = game.city.buildings[m.id];
    ui.lootBanner(`🔑 ${homeLabel(b, m.unit)} 열쇠를 받았어요!`, `₩${m.price.toLocaleString()} · 가방(I)에 열쇠가 있어요`, '#ffb300', m.id === m.homeId ? '대표 집으로 등록 — 여기서 자고 부활해요' : '');
    setWaypoint(b, `🏠 ${homeLabel(b, m.unit)}`);
  });
  net.on('houseSold', (m) => {
    game.stats.money += m.price;
    setHomes(m);
    ui.toast(`🏷️ 집을 팔아서 ₩${m.price.toLocaleString()}을 받았어요`);
  });
  net.on('myHomes', (m) => { setHomes(m); ui.toast('🏠 대표 집을 바꿨어요. 이제 이 집에서 부활해요'); });
  net.on('houseFail', (m) => ui.toast(`🏘️ ${m.reason}`));
  net.onClose = () => { if (!game.started) return; if (game.kicked) ui.kickedOut(); else ui.disconnected(); };
  net.on('kicked', () => { game.kicked = true; });
  setInterval(() => { if (game.started) sendState(); }, 100);
  setInterval(() => { if (game.started) net.send({ t: 'stats', stats: game.stats }); }, 15000);
  window.addEventListener('beforeunload', () => { if (game.started) net.send({ t: 'stats', stats: game.stats }); });
}

function sendState() {
  const p = game.player;
  const car = p.inCar;
  game.net.send({
    t: 'st', x: +p.pos.x.toFixed(2), y: +p.pos.y.toFixed(2), z: +p.pos.z.toFixed(2), h: +p.heading.toFixed(2), s: +p.speed.toFixed(1),
    a: (p.onGround ? 0 : 1) | (p.flying ? 2 : 0) | (p.flipped ? 4 : 0), loc: game.loc(),
    car: car ? [+car.pos.x.toFixed(2), +car.pos.z.toFixed(2), +car.heading.toFixed(2), +car.speed.toFixed(1), +(car.pos.y || 0).toFixed(2), +(car.turret || 0).toFixed(2)] : null,
  });
}
game.sendProfile = () => {
  if (!game.inv) return;
  const job = game.playerJob();
  const t = game.inv.totals();
  const ls = levelStats(game.stats.level || 1);
  game.player.speedBonus = t.speed + ls.speed;
  game.maxHp = ls.maxHp;
  Object.assign(game.profile, { accessories: game.inv.visuals(), held: game.inv.heldVisual(), def: t.def, charm: t.charm, regen: t.regen, jobName: job ? job.name : '', level: game.stats.level || 1, badges: computeBadges() });
  localStorage.setItem(PROFILE_KEY, JSON.stringify(game.profile));
  game.net.send({ t: 'profile', profile: game.profile });
};
game.say = (text) => game.net.send({ t: 'say', text });
game.resetSave = () => { game.net.send({ t: 'stats', stats: game.stats }); setTimeout(() => location.reload(), 300); };

// ------------------------------------------------------------------
// 입력
// ------------------------------------------------------------------
const KEYMAP = { KeyW: 'forward', ArrowUp: 'forward', KeyS: 'back', ArrowDown: 'back', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', ShiftLeft: 'run', ShiftRight: 'run', Space: 'jump', KeyX: 'down' };
const typing = () => ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
window.addEventListener('keydown', (e) => {
  if (!game.started) return;
  if (e.code === 'Escape') { if (game.course) endCourse(false, '수련을 포기했어요'); ui.escape(); return; }
  if (typing()) return;
  if (e.code === 'Tab') { e.preventDefault(); ui.togglePhone(); return; }
  if (e.code === 'KeyI') { ui.toggleInventory(); return; }
  if (ui.anyPanelOpen() || game.busy || game.dead) return;
  if (e.code === 'Enter' || e.code === 'KeyT') { e.preventDefault(); clearKeys(); ui.focusPlayerChat(); return; }
  // 차에 치여 뒤집혔을 때: ← → 번갈아 빠르게
  if (game.flip && (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'KeyA' || e.code === 'KeyD') && !e.repeat) { mashFlip(e.code === 'ArrowLeft' || e.code === 'KeyA' ? 'L' : 'R'); e.preventDefault(); return; }
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
  if (e.code === 'KeyG' && !e.repeat) toggleFly();
  if (e.code === 'KeyV' && !e.repeat) toggleView();
  if (e.code === 'KeyB' && !e.repeat) flirt();
  if (e.code === 'KeyP' && !e.repeat) game.takePhoto?.();
});
window.addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) game.input[k] = false; });
function clearKeys() { for (const k of Object.values(KEYMAP)) game.input[k] = false; game.combat?.trigger(false); }
window.addEventListener('blur', clearKeys);

let dragging = false, lastMX = 0, lastMY = 0;
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
canvas.addEventListener('mousedown', (e) => {
  if (!game.started || ui.anyPanelOpen()) return;
  if (e.button === 2) { game.aimHeld = true; return; }
  if (document.pointerLockElement === canvas) {
    if (e.button === 0 && !game.busy && !game.dead) useSelected(true);
    return;
  }
  dragging = true; lastMX = e.clientX; lastMY = e.clientY;
  if (e.button === 0) canvas.requestPointerLock?.()?.catch?.(() => {});
});
window.addEventListener('mouseup', (e) => { dragging = false; if (e.button === 0) game.combat?.trigger(false); if (e.button === 2) game.aimHeld = false; });
window.addEventListener('mousemove', (e) => {
  if (!game.started || !game.player) return;
  let dx = 0, dy = 0;
  if (document.pointerLockElement === canvas) { dx = e.movementX; dy = e.movementY; }
  else if (dragging) { dx = e.clientX - lastMX; dy = e.clientY - lastMY; lastMX = e.clientX; lastMY = e.clientY; }
  else return;
  const c = game.player.cam;
  const sens = 1 / (game.zoomNow || 1); // 줌 중에는 감도를 낮춘다
  c.yaw -= dx * 0.0028 * sens;
  c.pitch = clamp(c.pitch + dy * 0.0022 * sens, game.player.fp || game.player.aim > 0.5 ? -1.3 : -0.35, 1.25);
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
  if (game.player.inCar || !d || ['melee', 'gun', 'throw', 'launcher', 'wand'].includes(d.cat)) { game.combat.trigger(down); return; }
  if (!down) return;
  if (d.cat === 'food') {
    if (game.eating) return;
    game.inv.consume(it.uid);
    eatFood(it.id, 2.6, false);
  } else if (d.cat === 'carkey') {
    summonCar(it);
  } else if (d.cat === 'key') {
    setWaypoint(game.city.buildings[it.key.bid], `🔑 ${game.homeLabelOf(it.key)}`);
    ui.toast('📍 열쇠에 적힌 우리 집을 지도에 표시했어요');
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
  if (g) { const d = itemDef(g.item.id); const rar = g.rarity ? `[${g.rarity.name}] ` : ''; opts.push({ kind: 'ground', g, d: 0, label: `줍기 · ${rar}${d.emoji} ${g.item.id === 'cash' ? `₩${g.item.n}` : d.name}${g.item.n > 1 && g.item.id !== 'cash' ? ` x${g.item.n}` : ''}${g.bonus ? ` + ${itemDef(g.bonus.id).emoji}${g.bonus.n}` : ''}` }); }
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
    if (car) return { ...(f || {}), car, carLabel: car.mode === 'ai' ? (car.occ ? '자동차 빼앗기 🚗' : '자동차 타기 🚗') : car.kind === 'tank' ? '전차 타기 🪖' : car.kind === 'heli' ? '헬기 타기 🚁' : '자동차 타기 🚗' };
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
  const mine = game.myHomes.filter((h) => h.bid === b.id);
  if (b.type === 'house' && !mine.length && (game.owned[b.id] || []).length) {
    ui.toast(`🔒 ${b.name}이에요. 열쇠가 없으면 들어갈 수 없어요`);
    return;
  }
  await ui.flash();
  const isHome = mine.length > 0;
  // 여러 호수를 가졌으면 대표 집 호수를 우선
  const unit = (mine.find((h) => h.bid === game.stats.homeId && h.unit === game.stats.homeUnit) || mine[0])?.unit;
  const job = game.playerJob();
  const isWork = job && b.id === game.stats.workId;
  const I = buildInterior(b, { isHome, unit, workJob: isWork ? job : null });
  scene.add(I.group);
  game.interior = I;
  game.mode = 'interior';
  game.city.root.visible = false;
  game.wild.root.visible = false;
  const p = game.player;
  p.pos.copy(I.entry);
  p.heading = Math.PI;
  p.cam.yaw = 0;
  p.cam.target.copy(p.pos);
  p.snap = true;
  sendState();
  ui.toast(`${b.def.emoji} ${b.name}에 들어왔어요`);
  if (isHome) ui.toast(`🔑 ${homeLabel(b, unit)} — 우리 집! 침대에서 자고, 여기서 부활해요`);
  else if ((b.type === 'villa' || b.type === 'apartment') && freeUnits(b, game.owned[b.id] || []).length) ui.toast('🏘️ 빈 호수가 있어요. 부동산에서 살 수 있어요');
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
  game.wild.root.visible = true;
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
  game.net.send({ t: 'drop', item: { id: out.id, n: out.n || 1, gems: out.gems || [], ttlMs: out.expiresAt ? Math.max(0, out.expiresAt - Date.now()) : 0, rarity: out.rarity } });
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
  if (a.restyle) { ui.openStyle(a.cost); return; }
  if (a.sell) { ui.openSell(); return; }
  if (a.dealer) { ui.openDealer(); return; }
  if (a.rangeStart) { startRange(); return; }
  if (a.rangeRent) {
    if (game.inv.count('ammo_9mm') < 30) game.inv.add('ammo_9mm', 30, [], { expiresAt: Date.now() + 600000, rarity: 'common' });
    const it = game.inv.add('pistol', 1, [], { expiresAt: Date.now() + 600000, rarity: 'common' });
    if (it) game.inv.select(Math.max(0, game.stats.hotbar.indexOf(it.uid)));
    ui.toast('🔫 연습용 권총을 빌렸어요 (10분). 우클릭으로 조준해 보세요!');
    return;
  }
  if (a.menu) { ui.openMenu(game.interior.building.type, a.id === 'microwave'); return; }
  if (a.recolor) { ui.openRecolor(); return; }
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
    const hours = 4;
    await busyFor(`💼 ${job.name}(으)로 열심히 일하는 중...`, 6000);
    const pay = job.wage * hours;
    S.money += pay;
    S.workedToday += hours;
    addNeeds({ energy: -18, hunger: -10, fun: -6, social: 6, hygiene: -6 });
    ui.toast(`💰 ${hours}시간치 일을 해서 ₩${pay}를 벌었어요!`);
    gainExp(40 + Math.round(job.wage * 1.2), `${job.name} 근무`);
    game.questEvent('work');
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

// ------------------------------------------------------------------
// 음식: 먹고 가기 / 포장
// ------------------------------------------------------------------
const EAT_WORDS = { bite: ['냠냠', '와앙', '쩝쩝'], slurp: ['후루룩', '호로록', '쓰읍'], spoon: ['후~ 후~', '냠', '캬~'], drink: ['꿀꺽', '벌컥벌컥', '캬'], slice: ['쭈욱~', '냠냠', '치즈 늘어난다~'], drumstick: ['바삭!', '와구와구', '냠냠'] };
async function eatFood(id, secs, seated) {
  const d = itemDef(id);
  const [motion, prop] = d.eat || ['bite', 'bun:#ffcc80'];
  const roach = game.player.roach;
  game.eating = true;
  roach.eat(motion, prop, secs);
  game.net.send({ t: 'fx', k: 'eat', m: motion, prop, d: secs });
  const words = EAT_WORDS[motion] || EAT_WORDS.bite;
  const head = () => game.player.pos.clone().add(new THREE.Vector3(0, 2.3, 0));
  for (let i = 0; i < Math.floor(secs / 0.9); i++) setTimeout(() => { if (game.eating) ui.floatText(head(), words[i % words.length], '#ff8a65'); }, 300 + i * 900);
  await new Promise((r) => setTimeout(r, secs * 1000));
  game.eating = false;
  if (d.food) addNeeds(seated ? Object.fromEntries(Object.entries(d.food).map(([k, v]) => [k, Math.round(v * 1.2)])) : d.food);
  if (seated) addNeeds({ social: 4, fun: 3 });
  if (d.heal) game.net.send({ t: 'heal', v: d.heal });
  if (d.mana) game.mana = Math.min(game.maxMana, (game.mana || 0) + d.mana);
  roach.setEmotion('happy', 3);
  ui.toast(`${d.emoji} ${d.name} 맛있게 먹었어요!${d.heal ? ` (체력 +${d.heal})` : ''}${seated ? ' 🍽️ 매장 식사 보너스' : ''}`);
}

game.eatIn = async (id) => {
  const d = itemDef(id);
  if (game.eating) return;
  if (game.stats.money < d.price) { ui.toast('💸 돈이 부족해요!'); return; }
  game.stats.money -= d.price;
  ui.closeModal();
  // 비어 있는 자리로 가서 앉아 먹는다
  const I = game.interior, p = game.player;
  const taken = [...game.players.list.values()].filter((o) => o.loc === I.building.id).map((o) => o.pos);
  const seat = (I.seats || []).filter((st) => !taken.some((t) => t.distanceTo(st.p) < 0.8)).sort((a, b) => a.p.distanceTo(p.pos) - b.p.distanceTo(p.pos))[0];
  if (seat) { p.pos.copy(seat.p); p.heading = seat.face; p.snap = true; }
  p.cam.yaw = p.heading - 0.6; p.cam.dist = 5.2; p.cam.pitch = 0.2; // 얼굴이 보이게 앞쪽에서
  game.busy = true; clearKeys();
  await eatFood(id, 4.5, true);
  game.busy = false;
  game.questEvent('eatin');
};

game.takeout = (id) => {
  const d = itemDef(id);
  if (game.stats.money < d.price) { ui.toast('💸 돈이 부족해요!'); return false; }
  game.stats.money -= d.price;
  game.inv.add(id, 1);
  game.questEvent('takeout');
  ui.toast(`🥡 ${d.emoji} ${d.name} 포장 완료! 핫바에서 골라 클릭하면 어디서든 먹을 수 있어요`);
  return true;
};

// 상점 구매 (UI에서 호출)
game.buy = async (id) => {
  const d = itemDef(id);
  const S = game.stats;
  if (S.money < d.price) { ui.toast('💸 돈이 부족해요!'); return false; }
  if (d.cat === 'vehicle') return game.buyCar(d.vehicle, null, d.price);
  S.money -= d.price;
  game.questEvent('buy');
  const it = game.inv.add(id, d.cat === 'ammo' ? d.pack : d.stack && d.cat === 'throw' ? 3 : 1);
  if (d.slot && it && !game.stats.equip[d.slot]) game.inv.equip(it.uid);
  let gift = '';
  if (d.ammo) { const a = itemDef(d.ammo); game.inv.add(d.ammo, a.pack); gift = ` + ${a.name.replace(/ ×\d+$/, '')} ${a.pack}발 증정!`; }
  ui.toast(`${d.emoji} ${d.name}을(를) 샀어요!${gift}${d.slot ? ' (I키 가방에서 장착)' : ''}`);
  return true;
};

// 자동차 구매: 차 키를 받고 가게 앞에 배송
// 전리품 팔기
game.sell = (uid, n) => {
  const it = game.inv.find(uid);
  if (!it) return;
  const d = itemDef(it.id);
  const k = Math.min(n, it.n || 1);
  game.inv.remove(uid, k);
  game.stats.money += d.sell * k;
  ui.toast(`💰 ${d.emoji} ${d.name} ${k}개를 ₩${(d.sell * k).toLocaleString()}에 팔았어요`);
  game.sendProfile();
};

game.buyCar = async (kind, color, price) => {
  const S = game.stats;
  if (S.money < price) { ui.toast('💸 돈이 부족해요!'); return false; }
  S.money -= price;
  game.questEvent('buy');
  const it = { uid: Math.random().toString(36).slice(2, 10), id: 'car_key', n: 1, gems: [], car: { kind, color } };
  S.items.push(it);
  game.inv.changed();
  ui.closeModal();
  const b = game.interior.building;
  await exitBuilding();
  const pos = b.walk.clone().add(new THREE.Vector3(0, 0, b.dir * 3));
  game.net.send({ t: 'buyVehicle', kind, color, x: pos.x, z: pos.z, h: Math.PI / 2 });
  ui.lootBanner(`🔑 ${vehicleName(kind)} 출고!`, '가방(I)의 차 키를 핫바에서 쓰면 언제든 내 앞으로 불러요', SPORT_KINDS.includes(kind) ? '#ff1744' : '#42a5f5', '');
  return true;
};
// 차 키로 내 차 부르기
function summonCar(it) {
  const p = game.player;
  if (game.mode !== 'city' || p.inCar) { ui.toast('🔑 거리에서만 차를 부를 수 있어요'); return; }
  const side = new THREE.Vector3(Math.cos(p.heading), 0, -Math.sin(p.heading));
  const pos = p.pos.clone().addScaledVector(side, 3.2);
  game.net.send({ t: 'summonCar', kind: it.car.kind, color: it.car.color, x: pos.x, z: pos.z, h: p.heading });
  ui.toast(`🔑 ${vehicleName(it.car.kind)}을(를) 불렀어요! F로 타세요`);
}

// 차로 들이받은 가로등·나무 (c: 도시, w: 야생)
function smashProp(key, dir, broken) {
  if (!key || !game.city) return;
  const props = key[0] === 'c' ? game.city.props : game.wild?.props;
  props?.setBroken(+key.slice(1), broken, dir || [1, 0]);
}
// 지금 위치 근처의 충돌 상자 (도시 + 숲 나무)
function wildColliders(pos) {
  if (Math.abs(pos.x) < HALF - 20 && Math.abs(pos.z) < HALF - 20) return game.city.colliders;
  return game.city.colliders.concat(game.wild.near(pos.x, pos.z, 6));
}

// ------------------------------------------------------------------
// 레벨 · 경험치 · 퀘스트
// ------------------------------------------------------------------
function gainExp(v, reason = '') {
  const S = game.stats;
  const before = S.level || 1;
  const ups = addExp(S, v);
  ui.xpPop(`+${Math.round(v)} EXP${reason ? ' · ' + reason : ''}`);
  if (ups) {
    const ls = levelStats(S.level);
    game.maxMana = ls.mana;
    ui.celebrate(`⬆️ 레벨 업! Lv.${before} → Lv.${S.level}`, `체력 ${ls.maxHp} · 파워 ×${ls.dmg.toFixed(2)} · 명중률 +${Math.round((1 - ls.acc) * 100)}%`);
    game.combat.fx.sparkle(game.player.pos.clone(), '#ffd54f', 30, 2.5);
    game.net.send({ t: 'fx', k: 'sparkle', p: [game.player.pos.x, game.player.pos.y, game.player.pos.z], c: '#ffd54f' });
    game.sendProfile();
  }
  ui.renderXp?.();
}
game.gainExp = gainExp;

function ensureQuests() {
  const S = game.stats;
  const day = game.day();
  if (S.quests?.day === day) return;
  S.quests = { day, list: dailyQuests(day, game.token || '').map((id) => ({ id, p: 0, done: false })) };
  ui.renderQuests?.();
}
game.questEvent = (ev, n = 1) => {
  if (!game.stats?.quests) return;
  for (const q of game.stats.quests.list) {
    const d = questDef(q.id);
    if (!d || q.done || d.ev !== ev) continue;
    q.p = d.max ? Math.max(q.p, n) : q.p + n;
    if (q.p >= d.n) {
      q.done = true; q.p = d.n;
      game.stats.money += d.money;
      ui.lootBanner(`📋 퀘스트 완료! ${d.text}`, `+${d.xp} EXP · ₩${d.money}`, '#7e57c2', '');
      gainExp(d.xp);
    }
  }
  ui.renderQuests?.();
};

// 훈장: 이름표 아래에 보이는 자랑거리
function computeBadges() {
  const S = game.stats, out = [];
  const legend = new Set(DROP_POOL.legendary || []);
  const legends = S.items.filter((it) => legend.has(it.id) && !it.expiresAt).length;
  if (legends) out.push(`🌟전설무기 ${legends}개`);
  const keys = S.items.filter((it) => it.id === 'car_key');
  const cnt = (k) => keys.filter((it) => it.car?.kind === k).length;
  if (cnt('sport_f')) out.push(`🐎풰라리 ${cnt('sport_f')}대`);
  if (cnt('sport_l')) out.push(`🐂람부르기니${cnt('sport_l') > 1 ? ' ' + cnt('sport_l') + '대' : ''}`);
  if (cnt('sport_b')) out.push('💎부가디');
  if (cnt('sport_m') || cnt('sport_p')) out.push(`🏁스포츠카 ${cnt('sport_m') + cnt('sport_p')}대`);
  const types = new Set(game.myHomes.map((h) => game.city.buildings[h.bid]?.type));
  if (types.has('house')) out.push('🏡개인주택');
  if (types.has('apartment')) out.push('🏢아파트');
  if (types.has('villa')) out.push('🏘️빌라');
  if (S.skills.includes('jump3')) out.push('🥋무릉고수');
  if ((S.rangeBest || 0) >= 800) out.push('🎯명사수');
  return out.slice(0, 6);
}

// ------------------------------------------------------------------
// 날기 · 1인칭 · 플러팅 · 뒤집힘
// ------------------------------------------------------------------
function toggleFly() {
  const p = game.player;
  if (p.inCar) return;
  if (p.flying) { p.flying = false; ui.toast('🪽 날개를 접었어요'); return; }
  if (game.stats.needs.energy < 10) { ui.toast('😪 너무 지쳐서 날 수 없어요'); return; }
  if (p.takeOff()) ui.toast('🪽 날기! Space 위로 · X 아래로 · Shift 빠르게 · G 착지');
}
function toggleView() {
  const p = game.player;
  p.fp = !p.fp;
  if (p.fp) p.cam.pitch = 0;
  ui.toast(p.fp ? '👀 1인칭 시점 (V로 되돌리기)' : '🎥 3인칭 시점');
}
function flirt() {
  const p = game.player;
  if (p.inCar || game.dead) return;
  if (performance.now() - (game.lastFlirt || 0) < 2000) return;
  game.lastFlirt = performance.now();
  // 바라보는 방향의 가장 가까운 상대
  const fwd = new THREE.Vector3(Math.sin(p.heading), 0, Math.cos(p.heading));
  let best = null, bd = 9;
  for (const t of game.combat.targets()) {
    if (t.tt !== 'npc' && t.tt !== 'player') continue;
    const v = t.base.clone().sub(p.pos); v.y = 0;
    const d = v.length();
    if (d < bd && v.normalize().dot(fwd) > 0.3) { bd = d; best = t; }
  }
  p.roach.flirt();
  const a = p.pos.clone();
  game.combat.fx.hearts(a, best ? best.base.clone() : null);
  game.net.send({ t: 'flirt', tt: best?.tt || 'none', id: best?.id ?? -1 });
  game.questEvent('flirt');
}
function mashFlip(side) {
  const f = game.flip;
  if (!f || side === f.last) return;
  f.last = side; f.n++;
  game.player.roach.jumpSquash = 0.6;
  if (f.n >= f.need) {
    game.flip = null;
    game.player.flipped = false;
    game.player.vy = 5; game.player.onGround = false;
    ui.flipHud(null);
    ui.toast('💪 영차! 다시 일어났어요');
  } else ui.flipHud(f.n, f.need);
}

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

game.setLook = (look) => {
  game.profile.look = look;
  game.player.setColor(game.profile.color);
  game.inv.lastKey = null;
  game.inv.changed();
  game.sendProfile();
};

game.setBodyColor = (color) => {
  game.player.setColor(color);
  game.inv.lastKey = null;
  game.inv.changed();
  game.sendProfile();
};

game.buyHouse = (b, unit) => {
  const price = housePrice(b, unit);
  if (game.stats.money < price) { ui.toast(`💸 ₩${price.toLocaleString()}이 필요해요`); return; }
  game.net.send({ t: 'buyHouse', id: b.id, unit });
};
game.sellHouse = (bid, unit) => game.net.send({ t: 'sellHouse', id: bid, unit });
game.setMainHome = (bid, unit) => game.net.send({ t: 'setHome', id: bid, unit });

// ------------------------------------------------------------------
// 사격 연습장
// ------------------------------------------------------------------
function startRange() {
  const w = game.combat.selectedWeapon();
  const d = w ? itemDef(w.id) : null;
  if (!d || !['gun', 'launcher', 'wand'].includes(d.cat)) { ui.toast('🔫 총·활·마법봉을 핫바에서 골라 들고 시작하세요 (연습용 총 빌리기도 있어요)'); return; }
  game.range = { score: 0, hits: 0, left: 60 };
  for (const t of game.interior.targets) { t.up = 1; t.downT = 0; }
  ui.toast('🎯 60초 사격 시작! 탄약은 무료예요');
}
function updateRange(dt) {
  const R = game.range;
  if (!R) return;
  if (game.mode !== 'interior' || game.interior.building.type !== 'range') { game.range = null; ui.rangeHud(null); return; }
  R.left -= dt;
  ui.rangeHud(`🎯 점수 <b>${R.score}</b> · 명중 ${R.hits} · ⏱️ ${Math.max(0, R.left).toFixed(1)}초`);
  if (R.left <= 0) {
    game.range = null;
    ui.rangeHud(null);
    const best = Math.max(game.stats.rangeBest || 0, R.score);
    const isBest = R.score > (game.stats.rangeBest || 0);
    game.stats.rangeBest = best;
    ui.celebrate(`🎯 사격 종료! ${R.score}점`, `명중 ${R.hits}발 · 최고 기록 ${best}점${isBest ? ' 🏆 신기록!' : ''}`);
    gainExp(Math.round(R.score / 4), '사격 연습');
    game.questEvent('range', R.score);
    game.sendProfile();
  }
}
game.hitRangeTarget = (t, point) => {
  if (!t.up) return;
  const c = t.obj.getWorldPosition(new THREE.Vector3()); c.y = t.y0;
  const d = point ? Math.hypot(point.x - c.x, point.y - c.y) / t.r : 0.6;
  const pts = d < 0.22 ? 100 : d < 0.5 ? 50 : 25;
  const bonus = Math.round(t.speed * 10);
  t.up = 0; t.downT = 1.6;
  if (!game.range) { ui.scorePop(`${pts === 100 ? '🎯 정중앙!' : '명중!'} (연습)`, '#fff'); return; }
  game.range.score += pts + bonus; game.range.hits++;
  ui.scorePop(pts === 100 ? `🎯 BULLSEYE +${pts + bonus}` : `+${pts + bonus}`, pts === 100 ? '#ffd54f' : '#fff');
};

// ------------------------------------------------------------------
// 사진 찍기 (렌더 직후 캔버스를 저장)
// ------------------------------------------------------------------
game.takePhoto = () => new Promise((resolve) => {
  if (!game.started || !game.session) { resolve(null); return; }
  game.capture = async (dataUrl) => {
    ui.shutter();
    try {
      const r = await fetch('/api/photo', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${game.session}` }, body: JSON.stringify({ char: game.char, data: dataUrl }) });
      if (!r.ok) throw new Error((await r.json()).error);
      ui.toast('📷 찰칵! 갤러리에 저장했어요 (Tab → 🖼️ 갤러리)');
      game.questEvent('photo');
    } catch (e) { ui.toast(`📷 사진 저장 실패: ${e.message}`); }
    resolve(true);
  };
});
// 셀카: 카메라를 얼굴 앞으로 돌리고 찍는다
game.selfie = () => {
  const p = game.player;
  const prev = { yaw: p.cam.yaw, dist: p.cam.dist, pitch: p.cam.pitch, fp: p.fp };
  p.fp = false; p.cam.yaw = p.heading; p.cam.dist = 3.6; p.cam.pitch = 0.15;
  p.roach.setEmotion('happy', 3); p.roach.wave();
  setTimeout(() => game.takePhoto().finally(() => Object.assign(p.cam, { yaw: prev.yaw, dist: prev.dist, pitch: prev.pitch }) && (p.fp = prev.fp)), 700);
};
function grabCanvas() {
  const W = 1280, H = Math.round((canvas.height / canvas.width) * W);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  x.drawImage(canvas, 0, 0, W, H);
  // 워터마크
  x.font = 'bold 22px sans-serif'; x.fillStyle = 'rgba(255,255,255,.85)'; x.shadowColor = '#000'; x.shadowBlur = 4;
  x.fillText(`🪳 바퀴시티 · ${game.profile.name} · ${DAYS[game.day() % 7]}요일`, 18, H - 20);
  return c.toDataURL('image/jpeg', 0.82);
}

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
      ui.celebrate(`🥋 ${c.rewardName}을(를) 전수받았어요!`, { dashlong: '이제 C키 대쉬가 훨씬 멀리 나가요', jumpboost: '점프가 더 높아졌어요', jump3: '공중에서 점프를 두 번 더! 3단 점프' }[c.reward] || '');
      gainExp(400, `${c.name} 첫 클리어`);
    } else { ui.toast(`🏁 ${c.name} 클리어!`); gainExp(60, `${c.name} 클리어`); }
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
  game.questEvent('sleep');
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

const DECAY = { hunger: 4.5, fun: 3, social: 2.5, hygiene: 2 }; // 에너지는 없앴어요 (언제든 달리고 날 수 있게)
function decayNeeds(mins) {
  const N = game.stats.needs;
  for (const k of Object.keys(DECAY)) N[k] = clamp(N[k] - (DECAY[k] * mins) / 60, 0, 100);
}
const warned = {};
const NEED_MSG = { hunger: '🍜 포만감이 바닥이에요! 식당이나 편의점에 가보세요', fun: '🎈 심심해요! 영화관이나 클럽은 어때요?', social: '💬 외로워요... 이웃과 대화해보세요', hygiene: '🚿 씻을 때가 됐어요 (집, 헬스장, 미용실)' };
function checkNeeds() {
  for (const [k, v] of Object.entries(game.stats.needs)) {
    if (v < 20 && !warned[k]) { warned[k] = true; ui.toast(NEED_MSG[k]); }
    if (v > 35) warned[k] = false;
  }
}
function checkNewDay() {
  const d = game.day();
  if (d !== game.lastDay) { game.lastDay = d; ui.toast(`📅 ${d + 1}일차 ${DAYS[d % 7]}요일이 밝았어요! 새 퀘스트가 생겼어요 📋`); ensureQuests(); }
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
  const to = game.waypoint.pos;
  const out = (v) => Math.abs(v.x) > HALF - 4 || Math.abs(v.z) > HALF - 4;
  // 도시 밖이 끼면: 가장 가까운 도시 출입구(사방 고속도로)를 거쳐 곧장
  const GATES = [new THREE.Vector3(0, 0, -HALF), new THREE.Vector3(0, 0, HALF), new THREE.Vector3(-HALF, 0, 0), new THREE.Vector3(HALF, 0, 0)];
  const gateNear = (v) => GATES.reduce((a, b) => (a.distanceTo(v) < b.distanceTo(v) ? a : b));
  if (out(from) && out(to)) game.route = [to.clone()];
  else if (out(to)) { const gate = gateNear(to); game.route = [...routeTo(from, { point: gate }, game.sim.blockers), to.clone()]; }
  else if (out(from)) { const gate = gateNear(from); game.route = [gate, ...routeTo(gate, game.waypoint.building || { point: to }, game.sim.blockers)]; }
  else game.route = routeTo(from, game.waypoint.building || { point: to }, game.sim.blockers);
  game.routeLen = routeLength(from, game.route);
}
// 1초마다: 길에서 벗어났거나 걷지 않을 때는 경로를 새로 계산
function refreshRoute() {
  const p = game.player.pos;
  if (!game.route?.length) { updateRoute(); return; }
  const next = game.route[0];
  if (!game.autoWalk || Math.hypot(next.x - p.x, next.z - p.z) > 9) updateRoute();
  else game.routeLen = routeLength(p, game.route);
  if (game.waypoint && game.waypoint.pos.distanceTo(p) < 3.5) {
    ui.toast(`📍 ${game.waypoint.label}에 도착했어요!`);
    game.waypoint = null; game.route = null; game.autoWalk = false;
  }
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
  if (!game.route.length) { game.autoWalk = false; ui.toast(`📍 ${game.waypoint.label}에 도착했어요!`); game.waypoint = null; game.route = null; return null; }
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
  if (!game.started) {
    if (game.spectating && game.city) spectateFrame(dt, t);
    return;
  }
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
    ? { colliders: game.interior.colliders, climbable: false, groundY: () => 0.1, bounds: game.interior.bounds, npcs: game.sim.citizens, cameraColliders: null, platforms: game.interior.platforms, tired: false, ceiling: 4.2 }
    : { colliders: game.autoWalk ? wildColliders(p.pos).filter((c) => !c.small) : wildColliders(p.pos), platforms: game.city.roofs, groundY: game.city.groundY, npcs: game.sim.citizens, cameraColliders: game.city.colliders, tired: false, water: WATER_Y, bounds: { minX: -WORLD_HALF + 5, maxX: WORLD_HALF - 5, minZ: -WORLD_HALF + 5, maxZ: WORLD_HALF - 5 } };
  world.mouseActive = game.mouseT > 0;

  // 차량: 내 차는 직접 운전, 나머지는 서버 위치로 보간
  const k = Math.min(1, dt * 10);
  for (const car of game.traffic.cars) {
    if (car.bubble) { car.bubble.t -= dt; if (car.bubble.t <= 0) car.bubble = null; }
    if (car === p.inCar) {
      const near = indoor ? [] : game.wild.near(car.pos.x, car.pos.z, 10);
      game.traffic.updatePlayer(car, dt, {
        input, city: game.city, colliders: near.length ? game.city.colliders.concat(near) : game.city.colliders, groundY: game.city.groundY,
        onBump: () => ui.toast('쿵! 💥'),
        onWater: () => { if (performance.now() - (game.waterMsg || 0) > 3000) { game.waterMsg = performance.now(); ui.toast('🌊 차는 물에 못 들어가요! 대교로 건너세요'); } },
        onSmash: (c, dir) => { smashProp(c.pkey, dir, true); game.net.send({ t: 'smash', key: c.pkey, dir }); game.shake(0.25); },
      });
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

  // 얼음 마법에 맞으면 느려짐
  if (game.slowT > 0) { game.slowT -= dt; p.speedBonus = -0.55; } else if (game.slowWas) game.sendProfile();
  game.slowWas = game.slowT > 0;
  const before = p.pos.clone();
  if (!game.dead) p.update(dt, input, world);
  else p.roach.update(dt, 0, {});
  // 이동 거리 퀘스트
  const moved = Math.hypot(p.pos.x - before.x, p.pos.z - before.z);
  if (moved < 5) {
    game.distAcc = (game.distAcc || 0) + moved;
    if (game.distAcc >= 20) {
      const kind = p.inCar ? 'drive' : p.flying ? 'fly' : 'walk';
      game.questEvent(kind, Math.round(game.distAcc));
      game.distAcc = 0;
    }
  }
  // 날기는 에너지를 쓴다
  // 마나 재생
  if (game.maxMana) game.mana = Math.min(game.maxMana, (game.mana || 0) + dt * 7);
  // 우클릭 조준: 총·활·마법봉 줌 (저격총은 스코프)
  const selD = game.inv.selected() ? itemDef(game.inv.selected().id) : null;
  const canZoom = !p.inCar && selD?.zoom && !blocked;
  p.aim += ((canZoom && game.aimHeld ? 1 : 0) - p.aim) * Math.min(1, dt * 10);
  game.zoomNow = 1 + ((selD?.zoom || 1) - 1) * p.aim;
  const fov = 55 / game.zoomNow;
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); }
  ui.setScope(selD?.zoom >= 4 && p.aim > 0.85);
  if (p.inCar) { seatRoach(p.roach, p.inCar); p.roach.update(dt, 0, {}); }
  game.citizens.update(dt, camera.position, game.loc());
  game.animals.update(dt, camera.position, !indoor);
  if (!indoor) game.wild.update(camera.position);
  // 지역에 들어서면 알려준다
  if ((game.regionT = (game.regionT || 0) - dt) <= 0) {
    game.regionT = 1;
    const r = indoor ? null : regionAt(p.pos.x, p.pos.z);
    if ((r?.id || null) !== (game.region || null)) {
      game.region = r?.id || null;
      if (r) ui.lootBanner(`${r.emoji} ${r.name}`, { forest: '곰·늑대·사슴이 사는 숲 — 조심하세요!', swamp: '악어가 숨어 있어요 🐊', jungle: '호랑이 출몰 지역 🐯', amazon: '아나콘다와 재규어의 땅 🐍🐆', island: '대교 건너 평화로운 목장 마을', mountain: '바퀴산 — 정상은 눈으로 덮여 있어요', valley: '맑은 강이 흐르는 계곡', meadow: '사슴과 토끼가 뛰노는 들판', sea: '' }[r.id] || '', '#43a047', '');
    }
  }
  game.players.update(dt, game.loc(), game.traffic);
  game.units.update(dt, game.loc(), game.city.groundY);
  game.ground.update(t, game.loc());
  game.runners.update(dt);
  game.routeView.update(game.mode === 'city' && !p.inCar ? game.route : null, p.pos, t);
  game.combat.update(dt);
  updateCourse(dt);
  updateRange(dt);
  game.secT = (game.secT || 0) - dt;
  if (game.secT <= 0) {
    game.secT = 1;
    for (const it of game.inv.expire()) {
      const d = itemDef(it.id);
      if (d.cat === 'ammo') continue;
      const shop = SHOPS[d.shop]?.title || '상점';
      const msg = `⌛ ${d.name}(${TEMP_MINUTES}분 제한) 사용 시간이 끝나 사라졌어요. 계속 쓰려면 ${shop}에서 ₩${d.price.toLocaleString()}에 구매하세요!`;
      ui.toast(msg); ui.addChatLine('sys', msg);
    }
    if (game.waypoint && game.mode === 'city' && !p.inCar) refreshRoute();
  }
  if (p.knock && p.knock.t > 0) { p.knock.t -= dt; p.pos.x += p.knock.x * dt; p.pos.z += p.knock.z * dt; p.collide(game.city.colliders); }
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
  if (game.capture) { const cb = game.capture; game.capture = null; cb(grabCanvas()); }
  game.input.jumpPressed = false;
  game.input.dashPressed = false;
}
// 관전 중: 시민·차량만 움직이고 카메라는 명소 투어
function spectateFrame(dt, t) {
  game.minutes += dt * game.timeSpeed;
  const k = Math.min(1, dt * 10);
  for (const car of game.traffic.cars) {
    const tg = car.target;
    if (!tg) continue;
    if (Math.hypot(tg.x - car.pos.x, tg.z - car.pos.z) > 10) car.pos.set(tg.x, tg.y, tg.z);
    car.pos.x += (tg.x - car.pos.x) * k; car.pos.z += (tg.z - car.pos.z) * k; car.pos.y = (car.pos.y || 0) + ((tg.y || 0) - (car.pos.y || 0)) * k;
    car.heading = angleLerp(car.heading, tg.h, k);
  }
  tourFrame(dt, t);
  game.wild.update(camera.position);
  game.traffic.render(true, camera.position, dt);
  game.citizens.update(dt, camera.position, -1);
  game.players.update(dt, -1, game.traffic);
  game.units.update(dt, -1, game.city.groundY);
  game.ground.update(t, -1);
  game.combat.fx.update(dt);
  const night = updateEnvironment(game.hour(), camera.position, dt);
  game.city.update(dt, t, night);
  windowGlow(night);
  renderer.render(scene, camera);
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
