// 서버가 소유하는 공유 세계: 시계, 시민, 차량, 플레이어, LLM 대화, 저장
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import * as THREE from 'three';
import { SEED, DEFAULT_TIME_SPEED } from '../public/js/config.js';
import { setupWorld, housePrice, forSale } from '../public/js/world-setup.js';
import { Combat } from './combat.js';
import { itemDef } from '../public/js/items.js';
import { MODES, PLAN_KINDS } from '../public/js/citizens.js';
import { Traffic } from '../public/js/traffic.js';
import { buildInterior } from '../public/js/interior.js';
import { profileSystemPrompt, streetChatPrompt, memoryPrompt, fallbackReply, clampInt, INSULT } from '../public/js/prompts.js';
import { DAYS, fmtTime } from '../public/js/utils.js';
import { complete, llmEnabled } from './llm.js';

const WEATHERS = ['맑음 ☀️', '구름 조금 ⛅', '흐림 ☁️', '습하고 따뜻함 💧', '맑음 ☀️'];
const CAR_MODES = ['ai', 'player', 'parked', 'wreck', 'gone'];
const q = (v, k = 10) => Math.round(v * k);

export class World {
  constructor({ dataDir }) {
    this.dataFile = path.join(dataDir, 'world.json');
    fs.mkdirSync(dataDir, { recursive: true });
    const { buildings, city, sim, reserved } = setupWorld(SEED);
    this.buildings = buildings;
    this.city = city;
    this.sim = sim;
    this.reserved = reserved;
    const interiorCache = new Map();
    sim.interiorFor = (b) => {
      if (!interiorCache.has(b.id)) {
        const I = buildInterior(b, {});
        interiorCache.set(b.id, { building: b, workSpots: I.workSpots, visitSpots: I.visitSpots, entry: I.entry, exit: I.exit });
      }
      return interiorCache.get(b.id);
    };
    sim.onStreetChat = (a, b) => this.streetChat(a, b);
    this.traffic = new Traffic(null, city, SEED);
    this.timeSpeed = Number(process.env.TIME_SPEED) || DEFAULT_TIME_SPEED;
    this.minutes = 7 * 60 + 30;
    this.weather = WEATHERS[0];
    this.players = new Map(); // 접속 중
    this.accounts = {}; // token → { name, profile, homeId, stats }
    this.affinity = {}; // npcId → { token: value }
    this.memories = {}; // npcId → [{ token, name, text }]
    this.chatLogs = {}; // "npc:token" → [{ role, content }]
    this.extraCars = []; // 렌트로 생긴 차
    this.nextPid = 1;
    this.load();
    this.lastDay = Math.floor(this.minutes / 1440);
    sim.resolveAll(this.minutes);
    this.lastMeta = new Map();
    this.dirty = false;
    this.combat = new Combat(this);
    this.snapN = 0;
    this.hotel = city.byType.hotel[0];
    sim.onReport = (c, rep) => this.handleReport(c, rep);
    this.streetChatTimes = [];
    this.streetChatPerMin = Number(process.env.STREET_CHAT_PER_MIN ?? 6);
    sim.onTalkInterrupted = (c) => { const p = this.players.get(c.talkingTo); if (p) { this.endTalk(p, c.id); this.send(p, { t: 'talkCut', npc: c.id }); } };
  }

  // ---------------- 저장 ----------------
  load() {
    try {
      const d = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
      Object.assign(this, { minutes: d.minutes ?? this.minutes, weather: d.weather ?? this.weather, accounts: d.accounts || {}, affinity: d.affinity || {}, memories: d.memories || {}, chatLogs: d.chatLogs || {} });
      for (const c of d.extraCars || []) { const car = this.traffic.spawnParked(new THREE.Vector3(c.x, c.y || 0, c.z), c.h, c.kind || 'car'); if (c.gone) car.mode = 'gone'; this.extraCars.push(c); }
      console.log(`📂 저장된 세계를 불러왔어요 (계정 ${Object.keys(this.accounts).length}개)`);
    } catch { /* 처음 실행 */ }
  }
  save() {
    const extraCars = this.traffic.cars.slice(24).map((c) => ({ x: c.pos.x, y: c.pos.y || 0, z: c.pos.z, h: c.heading, kind: c.kind, gone: c.mode === 'gone' || c.mode === 'wreck' }));
    const data = { minutes: this.minutes, weather: this.weather, accounts: this.accounts, affinity: this.affinity, memories: this.memories, chatLogs: this.chatLogs, extraCars };
    const tmp = this.dataFile + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data));
    fs.renameSync(tmp, this.dataFile);
  }

  // ---------------- 플레이어 ----------------
  homeNames() {
    const out = {};
    for (const [, a] of Object.entries(this.accounts)) if (a.homeId != null) (out[a.homeId] ||= []).push(a.name);
    return Object.fromEntries(Object.entries(out).map(([id, names]) => [id, `${names.slice(0, 2).join('·')}${names.length > 2 ? ' 외' : ''}의 집`]));
  }

  join(ws, msg) {
    let token = typeof msg.token === 'string' && this.accounts[msg.token] ? msg.token : null;
    const profile = sanitizeProfile(msg.profile);
    if (!token) {
      token = crypto.randomBytes(12).toString('hex');
      this.accounts[token] = { name: profile.name, profile, homeId: null, stats: null, created: Date.now() };
    } else if (msg.profile && !msg.continue) {
      Object.assign(this.accounts[token], { name: profile.name, profile });
    }
    const acc = this.accounts[token];
    const home = acc.homeId != null ? this.buildings[acc.homeId] : this.hotel;
    const p = {
      id: this.nextPid++, token, ws, name: acc.name, profile: acc.profile,
      pos: home.door.clone().addScaledVector(new THREE.Vector3(0, 0, home.dir), 1.5), heading: 0, speed: 0,
      loc: -1, car: -1, air: 0, sleeping: false, talking: null, talkBusy: false, lastTalk: 0, carState: null,
      hp: 100, maxHp: 100, dead: false, heat: 0, stars: 0,
    };
    this.players.set(p.id, p);
    if (acc.pendingHeat) {
      const n = acc.pendingReports || 1;
      setTimeout(() => { this.combat.addHeat(p, acc.pendingHeat); this.send(p, { t: 'sys', text: `🚔 자리를 비운 사이 ${n}건의 신고가 접수됐어요! 경찰이 찾고 있어요` }); acc.pendingHeat = 0; acc.pendingReports = 0; }, 3000);
    }
    // 이 플레이어에게 맞춘 친밀도 & 기억
    const aff = {}, mem = {};
    for (const c of this.sim.citizens) {
      aff[c.id] = this.aff(c, token);
      const m = (this.memories[c.id] || []).filter((x) => x.token === token).map((x) => x.text);
      if (m.length) mem[c.id] = m;
    }
    this.send(p, {
      t: 'welcome', you: p.id, token, homeId: acc.homeId, homes: this.homeNames(), stats: acc.stats, profile: acc.profile,
      minutes: this.minutes, timeSpeed: this.timeSpeed, weather: this.weather, llm: llmEnabled,
      affinity: aff, memories: mem, players: [...this.players.values()].map(playerMeta),
      extraCars: this.traffic.cars.slice(24).map((c) => ({ id: c.id, x: c.pos.x, z: c.pos.z, h: c.heading })),
      npcMeta: this.sim.citizens.map((c) => this.npcMeta(c)),
      ground: this.combat.groundList(), hotelId: this.hotel.id,
      extraKinds: this.traffic.cars.slice(24).map((c) => c.kind),
    });
    this.broadcast({ t: 'pjoin', p: playerMeta(p) }, p.id);
    this.dirty = true;
    console.log(`👋 ${p.name} 입장 (접속 ${this.players.size}명)`);
    return p;
  }

  leave(p) {
    if (p.talking !== null) this.endTalk(p, p.talking);
    if (p.car >= 0) { const car = this.traffic.cars[p.car]; if (car) this.traffic.exit(car); }
    this.players.delete(p.id);
    this.combat.units = this.combat.units.filter((u) => u.target !== p.id);
    this.updateActiveBuildings();
    this.broadcast({ t: 'pleave', id: p.id });
    console.log(`👋 ${p.name} 퇴장 (접속 ${this.players.size}명)`);
  }

  aff(c, token) { return this.affinity[c.id]?.[token] ?? c.baseAffinity; }
  setAff(c, token, v) { (this.affinity[c.id] ||= {})[token] = Math.max(0, Math.min(100, v)); this.dirty = true; return this.affinity[c.id][token]; }

  send(p, obj) { if (p.ws.readyState === 1) p.ws.send(JSON.stringify(obj)); }
  broadcast(obj, exceptId) {
    const s = JSON.stringify(obj);
    for (const p of this.players.values()) if (p.id !== exceptId && p.ws.readyState === 1) p.ws.send(s);
  }

  // ---------------- 메시지 ----------------
  handle(p, msg) {
    switch (msg.t) {
      case 'st': {
        const loc = Number.isInteger(msg.loc) && this.buildings[msg.loc] ? msg.loc : -1;
        p.pos.set(+msg.x || 0, +msg.y || 0, +msg.z || 0);
        p.heading = +msg.h || 0; p.speed = +msg.s || 0; p.air = msg.a ? 1 : 0;
        if (loc !== p.loc) { p.loc = loc; this.updateActiveBuildings(); }
        if (p.car >= 0 && msg.car) {
          const car = this.traffic.cars[p.car];
          if (car && car.owner === p.id) { car.pos.set(+msg.car[0], +msg.car[4] || 0, +msg.car[1]); car.heading = +msg.car[2]; car.speed = +msg.car[3]; car.turret = +msg.car[5] || 0; }
        }
        break;
      }
      case 'profile': {
        const acc = this.accounts[p.token];
        acc.profile = sanitizeProfile({ ...acc.profile, ...msg.profile });
        p.profile = acc.profile;
        this.broadcast({ t: 'pmeta', p: playerMeta(p) });
        this.dirty = true;
        break;
      }
      case 'stats': this.accounts[p.token].stats = msg.stats; this.dirty = true; break;
      case 'say': {
        const text = String(msg.text || '').slice(0, 120).trim();
        if (text) this.broadcast({ t: 'psay', id: p.id, name: p.name, text });
        break;
      }
      case 'talk': this.talk(p, msg); break;
      case 'talkEnd': this.endTalk(p, msg.npc); break;
      case 'carEnter': {
        const car = this.traffic.cars[msg.id];
        if (!car || car.mode === 'player' || p.car >= 0) { this.send(p, { t: 'carDenied' }); break; }
        if (car.occ > 0) {
          this.broadcast({ t: 'eject', id: car.id, n: car.occ, x: car.pos.x, z: car.pos.z, h: car.heading });
          this.combat.addHeat(p, 10);
        }
        this.traffic.enter(car, p.id);
        car.occ = 0;
        p.car = car.id;
        this.send(p, { t: 'carOk', id: car.id });
        this.broadcast({ t: 'carSay', id: car.id, text: car.bubble?.text || '' });
        break;
      }
      case 'carExit': {
        const car = this.traffic.cars[p.car];
        if (car && car.owner === p.id) this.traffic.exit(car);
        p.car = -1;
        break;
      }
      case 'carRent': {
        if (p.car >= 0) break;
        const car = this.traffic.spawnParked(new THREE.Vector3(+msg.x, 0, +msg.z), +msg.h || 0);
        this.broadcast({ t: 'carSpawn', id: car.id, x: car.pos.x, z: car.pos.z, h: car.heading });
        this.traffic.enter(car, p.id);
        p.car = car.id;
        this.send(p, { t: 'carOk', id: car.id });
        this.dirty = true;
        break;
      }
      case 'sleep': p.sleeping = !!msg.on; this.broadcastSleep(); break;
      case 'hit': this.combat.hit(p, msg); break;
      case 'explode': this.combat.explode(p, msg); break;
      case 'fx': {
        // 다른 플레이어에게 보여줄 연출 (총알 궤적, 투사체, 휘두르기)
        const k = String(msg.k || '');
        if (['tracer', 'proj', 'swing', 'muzzle'].includes(k)) this.broadcast({ ...msg, t: 'fx', pid: p.id, loc: p.loc }, p.id);
        break;
      }
      case 'drop': {
        const it = msg.item;
        if (!it || !itemDef(it.id) || it.id === 'fist') break;
        this.combat.dropItem({ id: String(it.id), n: Math.max(1, Math.min(999, +it.n || 1)), gems: Array.isArray(it.gems) ? it.gems.slice(0, 3).map(String) : [] }, p.pos.x, p.pos.y, p.pos.z, p.loc, 60);
        break;
      }
      case 'pickup': this.combat.pickup(p, msg.gid); break;
      case 'heal': if (!p.dead) this.combat.healPlayer(p, Math.max(0, Math.min(100, +msg.v || 0))); break;
      case 'buyHouse': {
        const b = this.buildings[msg.id];
        const owned = Object.values(this.accounts).some((a) => a.homeId === msg.id);
        if (!b || !forSale(b) || owned) { this.send(p, { t: 'houseFail', reason: '이미 팔린 집이에요' }); break; }
        this.accounts[p.token].homeId = b.id;
        this.dirty = true;
        this.send(p, { t: 'houseOk', id: b.id, price: housePrice(b) });
        this.broadcast({ t: 'homes', homes: this.homeNames() });
        break;
      }
      case 'buyVehicle': {
        if (p.car >= 0 || !['tank', 'heli'].includes(msg.kind)) break;
        const car = this.traffic.spawnParked(new THREE.Vector3(+msg.x, 0, +msg.z), +msg.h || 0, msg.kind);
        this.broadcast({ t: 'carSpawn', id: car.id, x: car.pos.x, z: car.pos.z, h: car.heading, kind: car.kind });
        this.traffic.enter(car, p.id);
        p.car = car.id;
        this.send(p, { t: 'carOk', id: car.id });
        this.dirty = true;
        break;
      }
    }
  }

  updateActiveBuildings() {
    const occupied = new Set([...this.players.values()].map((p) => p.loc).filter((l) => l >= 0));
    for (const id of occupied) this.sim.activate(this.buildings[id]);
    for (const id of [...this.sim.active.keys()]) if (!occupied.has(id)) this.sim.deactivate(this.buildings[id]);
  }

  broadcastSleep() {
    const list = [...this.players.values()];
    this.broadcast({ t: 'sleepers', n: list.filter((p) => p.sleeping).length, total: list.length });
  }

  // ---------------- LLM 대화 ----------------
  timeText() {
    const m = this.minutes, h = (m % 1440) / 60, day = Math.floor(m / 1440);
    const part = h < 5 ? '새벽' : h < 9 ? '아침' : h < 12 ? '오전' : h < 14 ? '점심때' : h < 18 ? '오후' : h < 21 ? '저녁' : '밤';
    return `${day + 1}일차 ${DAYS[day % 7]}요일 ${part} (${fmtTime(m)}), 날씨 ${this.weather}`;
  }
  placeText(p) {
    if (p.loc >= 0) return `${this.buildings[p.loc].name} 안`;
    let best = null, bd = 30;
    for (const b of this.buildings) { const d = Math.hypot(b.door.x - p.pos.x, b.door.z - p.pos.z); if (d < bd) { bd = d; best = b; } }
    return best ? `${best.name} 근처 거리` : '바퀴시티의 거리';
  }
  llmCtx(p, c) {
    const pr = p.profile;
    const mem = this.memories[c.id] || [];
    return {
      city: this.city, sim: this.sim,
      player: { name: p.name, age: pr.age, gender: pr.gender, personality: pr.personality, jobName: pr.jobName || '구직 중 (최근 이사 옴)' },
      timeText: this.timeText(), placeText: this.placeText(p),
      affinity: this.aff(c, p.token),
      grudge: c.grudges[p.token]?.pts || 0,
      memories: mem.filter((x) => x.token === p.token).map((x) => x.text),
      others: [...new Set(mem.filter((x) => x.token !== p.token).map((x) => x.name))].slice(0, 3),
    };
  }

  async talk(p, msg) {
    const c = this.sim.citizens[msg.npc];
    if (!c) return;
    if (c.talkingTo !== null && c.talkingTo !== p.id) { this.send(p, { t: 'talk', npc: c.id, busy: true }); return; }
    if (['dead', 'flee', 'fight'].includes(c.mode)) { this.send(p, { t: 'talk', npc: c.id, busy: true, reason: c.mode }); return; }
    if ((c.grudges[p.token]?.pts || 0) >= 50 || c.report?.token === p.token) {
      c.say(['말 걸지 마세요 😠', '당신하고는 할 말 없어요!', '저리 가요! 신고할 거예요 🚔'][Math.floor(Math.random() * 3)], 3);
      c.emote('angry', 3);
      this.send(p, { t: 'talk', npc: c.id, busy: true, reason: 'grudge' });
      return;
    }
    if (p.talkBusy) return;
    if (p.talking !== null && p.talking !== c.id) this.endTalk(p, p.talking);
    p.talkBusy = true;
    p.lastTalk = Date.now();
    if (c.mode !== 'player') this.sim.beginPlayerTalk(c, { id: p.id, name: p.name, pos: p.pos });
    p.talking = c.id;
    const text = msg.text ? String(msg.text).slice(0, 200) : null;
    const note = msg.note ? String(msg.note).slice(0, 120) : null;
    const key = `${c.id}:${p.token}`;
    const log = (this.chatLogs[key] ||= []);
    const ctx = this.llmCtx(p, c);
    let content = text;
    if (msg.greeting) content = '(플레이어가 다가와 말을 건다. 지금 상황에 맞게 먼저 인사해.)';
    if (note) content = note;
    let r, error;
    try {
      if (!llmEnabled) throw new Error('offline');
      const out = await complete([{ role: 'system', content: profileSystemPrompt(c, ctx) }, ...log.slice(-14), { role: 'user', content }], { temperature: 0.95, max_tokens: 260 });
      r = { reply: String(out.reply || '...').slice(0, 400), emotion: out.emotion || 'neutral', affinity_delta: clampInt(out.affinity_delta, -3, 3), mood_delta: clampInt(out.mood_delta, -10, 10), insulted: out.insulted === true, action: out.action || 'none', amount: clampInt(out.amount, 0, 30) };
      // LLM이 놓친 노골적인 욕설도 잡아낸다
      if (text && INSULT.test(text) && !r.insulted) { r.insulted = true; r.mood_delta = Math.min(r.mood_delta, -6); }
    } catch (e) {
      if (e.message !== 'offline') { error = e.message; console.warn('LLM 오류:', e.message); }
      r = fallbackReply(c, ctx, text, { greeting: msg.greeting, note });
    }
    p.talkBusy = false;
    if (text) log.push({ role: 'user', content: text });
    if (note) log.push({ role: 'user', content: note });
    log.push({ role: 'assistant', content: r.reply });
    if (log.length > 24) log.splice(0, log.length - 24);
    if (text || note) p.talked = true;
    const affinity = this.setAff(c, p.token, this.aff(c, p.token) + r.affinity_delta + (note ? 4 : 0));
    // 기분 & 원한
    if (text || note) {
      const md = r.mood_delta || 0;
      this.sim.adjustMood(c, md * 1.5, r.insulted ? `${p.name}에게 욕을 들음` : md > 2 ? `${p.name}와(과) 즐거운 대화` : md < -2 ? `${p.name}의 말에 기분이 상함` : null);
      if (r.insulted) this.sim.addGrudge(c, { token: p.token, name: p.name }, 22, '욕설과 모욕');
      else if (md <= -6) this.sim.addGrudge(c, { token: p.token, name: p.name }, 8, '무례한 말');
      if (c.report?.token === p.token) r.action = 'end';
    }
    c.emote(r.emotion === 'thinking' ? 'neutral' : r.emotion, 5);
    this.sim.emit({ t: 'talking', id: c.id });
    c.say(r.reply.length > 40 ? r.reply.slice(0, 38) + '…' : r.reply, 4);
    this.send(p, { t: 'talk', npc: c.id, reply: r.reply, emotion: r.emotion, delta: r.affinity_delta, affinity, action: r.action, amount: r.amount, error, offline: !llmEnabled, mood: Math.round(c.mood), moodDelta: r.mood_delta || 0, insulted: !!r.insulted, reporting: c.report?.token === p.token });
  }

  async endTalk(p, npcId) {
    const c = this.sim.citizens[npcId];
    if (!c || c.talkingTo !== p.id) { p.talking = null; return; }
    this.sim.endPlayerTalk(c);
    p.talking = null;
    if (!p.talked) return;
    p.talked = false;
    const log = this.chatLogs[`${c.id}:${p.token}`] || [];
    let text = null;
    if (llmEnabled) {
      try {
        const recent = log.slice(-12).map((m) => `${m.role === 'user' ? p.name : c.name}: ${m.content}`).join('\n');
        const out = await complete([{ role: 'system', content: memoryPrompt(c, p.name) }, { role: 'user', content: recent }], { temperature: 0.5, max_tokens: 120 });
        text = out.memory ? String(out.memory).slice(0, 80) : null;
      } catch { /* 무시 */ }
    } else {
      const lastUser = [...log].reverse().find((m) => m.role === 'user');
      if (lastUser) text = `${this.timeText()}에 ${p.name}가 "${lastUser.content.slice(0, 30)}"라고 말했다`;
    }
    if (!text) return;
    const list = (this.memories[c.id] ||= []);
    list.push({ token: p.token, name: p.name, text });
    const mine = list.filter((x) => x.token === p.token);
    if (mine.length > 6) list.splice(list.indexOf(mine[0]), 1);
    if (list.length > 20) list.shift();
    this.dirty = true;
    this.send(p, { t: 'mem', npc: c.id, list: list.filter((x) => x.token === p.token).map((x) => x.text) });
  }

  handleReport(c, rep) {
    const p = [...this.players.values()].find((x) => x.token === rep.token);
    this.addMemory(c, rep, `${rep.name}을(를) ${rep.reason} 때문에 경찰에 신고했다`);
    const text = `🚔 ${c.name}이(가) 경찰서에 ${rep.name}님을 신고했어요! (사유: ${rep.reason})`;
    if (p) {
      this.combat.addHeat(p, rep.reason === '폭행' ? 35 : 25);
      this.send(p, { t: 'sys', text });
    } else {
      const acc = this.accounts[rep.token];
      if (acc) { acc.pendingHeat = Math.min(200, (acc.pendingHeat || 0) + 25); acc.pendingReports = (acc.pendingReports || 0) + 1; this.dirty = true; }
    }
    for (const o of this.players.values()) if (o !== p) this.send(o, { t: 'sys', text });
  }

  addMemory(c, p, text) {
    const list = (this.memories[c.id] ||= []);
    list.push({ token: p.token, name: p.name, text });
    if (list.length > 20) list.shift();
    this.dirty = true;
  }

  async streetChat(a, b) {
    if (!llmEnabled) return null;
    const now = Date.now();
    this.streetChatTimes = this.streetChatTimes.filter((t) => now - t < 60000);
    if (this.streetChatTimes.length >= this.streetChatPerMin) return null; // 비용 상한
    this.streetChatTimes.push(now);
    try {
      const out = await complete([{ role: 'user', content: streetChatPrompt(a, b, { timeText: this.timeText() }) }], { temperature: 1.0, max_tokens: 300 });
      const lines = (out.lines || []).filter((l) => l && l.text).slice(0, 6).map((l) => ({ speaker: l.speaker === 'B' ? 'B' : 'A', text: String(l.text).slice(0, 60) }));
      return lines.length ? lines : null;
    } catch { return null; }
  }

  // ---------------- 틱 ----------------
  tick(dt) {
    this.minutes += dt * this.timeSpeed;
    const day = Math.floor(this.minutes / 1440);
    if (day !== this.lastDay) { this.lastDay = day; this.weather = WEATHERS[Math.floor(Math.random() * WEATHERS.length)]; }
    const players = [...this.players.values()].map((p) => ({ id: p.id, name: p.name, pos: p.pos, loc: p.loc, car: p.car, dead: p.dead }));
    this.sim.update(dt, this.minutes, { players });
    this.traffic.update(dt, { players, sim: this.sim });
    this.combat.tick(dt);
    // 플레이어 차에 치일 뻔한 시민
    for (const p of this.players.values()) {
      if (p.car < 0) continue;
      const car = this.traffic.cars[p.car];
      if (!car || Math.abs(car.speed) < 2) continue;
      for (const c of this.sim.citizens) {
        if (c.location && c.mode !== 'park') continue;
        if ((car.pos.y || 0) < 1.5 && c.mode !== 'dead' && Math.hypot(c.pos.x - car.pos.x, c.pos.z - car.pos.z) < car.mesh.radius + 0.8) {
          this.sim.dodge(c, car.pos, { token: p.token, name: p.name });
          this.send(p, { t: 'aff', npc: c.id, v: this.setAff(c, p.token, this.aff(c, p.token) - 2) });
        }
      }
    }
    // 대화 중인 플레이어가 멀어지거나 오래 말이 없으면 대화 종료
    for (const p of this.players.values()) {
      if (p.talking === null) continue;
      const c = this.sim.citizens[p.talking];
      const src = c.location && c.prevMode === 'inside' ? c.ipos : c.pos;
      if (Date.now() - p.lastTalk > 180000 || Math.hypot(src.x - p.pos.x, src.z - p.pos.z) > 12) this.endTalk(p, p.talking);
    }
    // 모두 자면 아침으로
    const list = [...this.players.values()];
    const h = (this.minutes % 1440) / 60;
    if (list.length && list.every((p) => p.sleeping) && (h >= 20 || h < 6)) {
      this.minutes = (Math.floor(this.minutes / 1440) + (h >= 20 ? 1 : 0)) * 1440 + 7 * 60;
      this.sim.resolveAll(this.minutes);
      for (const p of list) p.sleeping = false;
      this.broadcast({ t: 'skip', minutes: this.minutes });
    }
  }

  npcMeta(c) {
    return [c.id, MODES.indexOf(c.mode), c.location ? c.location.id : -1, PLAN_KINDS.indexOf(c.plan?.kind || 'none'),
      c.plan?.building ? c.plan.building.id : -1, c.dest ? c.dest.id : -1, c.chatWith ? c.chatWith.id : -1, c.talkingTo ?? -1];
  }

  snapshot() {
    const npcs = [];
    const meta = [];
    for (const c of this.sim.citizens) {
      npcs.push(q(c.pos.x), q(c.pos.z), q(c.heading, 100), c.moving > 0 ? 1 : 0, q(c.ipos.x), q(c.ipos.z));
      const m = this.npcMeta(c);
      const key = m.join(',');
      if (this.lastMeta.get(c.id) !== key) { this.lastMeta.set(c.id, key); meta.push(m); }
    }
    const cars = [];
    for (const car of this.traffic.cars) cars.push(q(car.pos.x), q(car.pos.z), q(car.heading, 100), q(car.speed), CAR_MODES.indexOf(car.mode), car.owner ?? -1, q(car.pos.y || 0), car.occ || 0, q(car.turret || 0, 100));
    const players = [...this.players.values()].map((p) => [p.id, q(p.pos.x, 100), q(p.pos.y, 100), q(p.pos.z, 100), q(p.heading, 100), q(p.speed), p.loc, p.car, p.air, p.sleeping ? 1 : 0, Math.round(p.hp), p.dead ? 1 : 0, p.stars || 0]);
    const snap = { t: 'snap', m: this.minutes, w: this.weather, n: npcs, meta, c: cars, p: players, u: this.combat.unitSnap(), ev: this.sim.drainEvents() };
    if (++this.snapN % 10 === 0) {
      const nd = [];
      for (const c of this.sim.citizens) nd.push(Math.round(c.hp), Math.round(c.needs.hunger), Math.round(c.needs.energy), Math.round(c.needs.fun), Math.round(c.needs.social), Math.round(c.needs.hygiene), Math.round(c.mood));
      snap.nd = nd;
    }
    return snap;
  }
}

function playerMeta(p) {
  return { id: p.id, name: p.name, profile: p.profile };
}

function sanitizeProfile(pr = {}) {
  const str = (v, n, d) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, n) : d);
  return {
    name: str(pr.name, 8, '바퀴'),
    gender: ['여', '남'].includes(pr.gender) ? pr.gender : '여',
    age: Math.max(18, Math.min(80, Number(pr.age) || 25)),
    personality: str(pr.personality, 20, '명랑한 수다쟁이'),
    color: /^#[0-9a-fA-F]{6}$/.test(pr.color) ? pr.color : '#8a5634',
    accessories: Array.isArray(pr.accessories) ? pr.accessories.slice(0, 6).map((a) => String(a).slice(0, 24)) : [],
    jobName: str(pr.jobName, 20, ''),
    held: typeof pr.held === 'string' ? pr.held.slice(0, 32) : null,
    def: Math.max(0, Math.min(150, Number(pr.def) || 0)),
    charm: Math.max(0, Math.min(500, Number(pr.charm) || 0)),
    regen: Math.max(0, Math.min(6, Number(pr.regen) || 0)),
  };
}
