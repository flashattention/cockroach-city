// 전투 · 현상수배 · 경찰/군대 · 바닥 아이템
import * as THREE from 'three';
import { HALF } from '../public/js/config.js';
import { weaponStats, damageTaken, itemDef } from '../public/js/items.js';
import { randomStreetPoint } from '../public/js/citizens.js';
import { RNG } from '../public/js/utils.js';

export const UNIT = {
  cop: { name: '경찰', hp: 120, speed: 6.5, range: 22, rate: 1.1, dmg: 7, acc: 0.65, def: 10 },
  soldier: { name: '군인', hp: 200, speed: 6.8, range: 32, rate: 0.55, dmg: 8, acc: 0.6, def: 25 },
  tank: { name: '전차', hp: 1500, speed: 5, range: 45, rate: 3.2, dmg: 40, radius: 5, acc: 0.8, def: 60 },
  heli: { name: '군용 헬기', hp: 800, speed: 14, range: 55, rate: 2.4, dmg: 30, radius: 4.5, acc: 0.75, def: 40, fly: 22 },
};
export const UNIT_KINDS = Object.keys(UNIT);
const STAR_UNITS = [
  [],
  ['cop', 'cop'],
  ['cop', 'cop', 'cop', 'cop'],
  ['cop', 'cop', 'cop', 'cop', 'cop', 'cop'],
  ['soldier', 'soldier', 'soldier', 'soldier', 'cop', 'cop', 'tank'],
  ['soldier', 'soldier', 'soldier', 'soldier', 'soldier', 'soldier', 'tank', 'tank', 'heli'],
];
const STARS = [15, 60, 130, 220, 330];
const HEAT = { hitNpc: 16, killNpc: 45, hitUnit: 20, killUnit: 40, carjack: 10, hitPlayer: 6, killPlayer: 25 };
const q = (v, k = 10) => Math.round(v * k);

export class Combat {
  constructor(world) {
    this.w = world;
    this.units = [];
    this.nextUnit = 1;
    this.ground = new Map();
    this.nextGround = 1;
    this.rng = new RNG(4242);
    // 서버용 건물 충돌 박스 (유닛 이동)
    this.boxes = world.buildings.filter((b) => b.type !== 'park').map((b) => ({ minX: b.x - b.w / 2, maxX: b.x + b.w / 2, minZ: b.z - b.d / 2, maxZ: b.z + b.d / 2 }));
    world.sim.onNpcAttack = (c, pid, dmg) => {
      const p = world.players.get(pid);
      if (p) this.damagePlayer(p, dmg, { name: c.name }, this.npcPos(c));
    };
  }

  // ---------------- 피해 ----------------
  // 플레이어가 보낸 타격 처리
  hit(p, msg) {
    if (p.dead) return;
    const stats = weaponStats(msg.w, Array.isArray(msg.gems) ? msg.gems.slice(0, 3) : []);
    if (!stats.dmg) return;
    const pellets = Math.max(1, Math.min(10, msg.n || 1));
    let dmg = stats.dmg * pellets;
    const crit = this.rng.chance(stats.crit);
    if (crit) dmg *= 2;
    const maxDist = stats.range + 4;
    if (msg.tt === 'npc') {
      const c = this.w.sim.citizens[msg.id];
      if (!c || c.mode === 'dead') return;
      const src = this.npcPos(c);
      if (!src || src.distanceTo(p.pos) > maxDist) return;
      this.damageNpc(c, dmg, p, crit, stats);
    } else if (msg.tt === 'player') {
      const v = this.w.players.get(msg.id);
      if (!v || v === p || v.dead || v.loc !== p.loc || v.pos.distanceTo(p.pos) > maxDist) return;
      this.damagePlayer(v, damageTaken(dmg, v.profile.def || 0, stats.pierce), p, p.pos, crit);
      this.addHeat(p, HEAT.hitPlayer);
      this.lifesteal(p, dmg, stats);
    } else if (msg.tt === 'unit') {
      const u = this.units.find((x) => x.id === msg.id);
      if (!u || u.loc !== p.loc || u.pos.distanceTo(p.pos) > maxDist + 6) return;
      this.damageUnit(u, damageTaken(dmg, UNIT[u.kind].def, stats.pierce), p, crit);
      this.lifesteal(p, dmg, stats);
    } else if (msg.tt === 'car') {
      const car = this.w.traffic.cars[msg.id];
      if (car && p.loc < 0 && car.pos.distanceTo(p.pos) < maxDist + 4) this.damageCar(car, dmg * 0.5, p);
    }
  }

  lifesteal(p, dmg, stats) {
    if (stats.lifesteal > 0) this.healPlayer(p, dmg * stats.lifesteal);
  }

  npcPos(c) {
    if (c.location && c.location.type !== 'park' && (c.mode === 'inside' || c.mode === 'player' || c.mode === 'fight' || c.mode === 'flee' || c.mode === 'dead') && this.w.sim.active.has(c.location.id)) return c.ipos;
    return c.pos;
  }

  damageNpc(c, dmg, attacker, crit = false, stats = null) {
    const r = this.w.sim.damage(c, dmg, attacker ? { id: attacker.id, name: attacker.name, pos: attacker.pos, loc: attacker.loc, token: attacker.token } : null);
    if (r.ignored) return;
    const pos = this.npcPos(c);
    this.w.broadcast({ t: 'fx', k: 'dmgnum', p: [pos.x, pos.y + 2.2, pos.z], v: Math.round(dmg), crit, loc: this.locOf(c) });
    if (stats?.poison) this.poison(c, stats.poison, attacker);
    if (!attacker) return;
    this.lifesteal(attacker, dmg, stats || {});
    const tok = attacker.token;
    this.w.setAff(c, tok, this.w.aff(c, tok) - (r.died ? 30 : 8));
    this.w.send(attacker, { t: 'aff', npc: c.id, v: this.w.aff(c, tok) });
    this.addHeat(attacker, r.died ? HEAT.killNpc : HEAT.hitNpc);
    if (r.died) {
      this.w.addMemory(c, attacker, `${attacker.name}에게 공격당해 쓰러진 적이 있다. 무섭고 화가 난다`);
      // 쓰러진 시민은 현금을 떨어뜨린다
      const cash = 5 + Math.floor(this.rng.next() * 40);
      this.dropItem({ id: 'cash', n: cash }, pos.x, pos.y, pos.z, this.locOf(c), 60);
    } else if (this.rng.chance(0.3)) this.w.addMemory(c, attacker, `${attacker.name}에게 맞았다`);
    // 목격자들도 도망
    for (const o of this.w.sim.citizens) {
      if (o === c || o.mode === 'dead' || o.mode === 'fight') continue;
      if (this.locOf(o) !== this.locOf(c)) continue;
      if (this.npcPos(o).distanceTo(pos) < 12 && this.rng.chance(0.7)) this.w.sim.flee(o, attacker.pos, this.rng.chance(0.4));
    }
  }

  poison(c, dps, attacker) {
    let n = 0;
    const iv = setInterval(() => {
      if (++n > 4 || c.mode === 'dead') { clearInterval(iv); return; }
      this.damageNpc(c, dps, null);
      void attacker;
    }, 1000);
  }

  locOf(c) {
    return c.location && c.location.type !== 'park' && this.w.sim.active.has(c.location.id) && c.mode !== 'walk' && c.mode !== 'idle' ? c.location.id : -1;
  }

  damagePlayer(v, dmg, attacker, fromPos, crit = false) {
    if (v.dead || dmg <= 0) return;
    v.hp -= dmg;
    v.lastHurt = Date.now();
    this.w.send(v, { t: 'dmg', v: Math.round(dmg), hp: Math.max(0, Math.round(v.hp)), from: fromPos ? [fromPos.x, fromPos.y, fromPos.z] : null, by: attacker?.name || '' });
    this.w.broadcast({ t: 'fx', k: 'dmgnum', p: [v.pos.x, v.pos.y + 2.2, v.pos.z], v: Math.round(dmg), crit, loc: v.loc, pid: v.id });
    if (v.hp <= 0) this.killPlayer(v, attacker);
  }

  healPlayer(p, amount) {
    if (p.dead) return;
    p.hp = Math.min(p.maxHp, p.hp + amount);
    this.w.send(p, { t: 'hp', hp: Math.round(p.hp) });
  }

  killPlayer(v, attacker) {
    v.hp = 0; v.dead = true; v.heat = 0; v.stars = 0;
    if (v.car >= 0) { const car = this.w.traffic.cars[v.car]; if (car) this.w.traffic.exit(car); v.car = -1; }
    if (v.talking !== null) this.w.endTalk(v, v.talking);
    this.units = this.units.filter((u) => u.target !== v.id);
    this.w.send(v, { t: 'dead', by: attacker?.name || '', wanted: 0 });
    this.w.broadcast({ t: 'sys', text: `💀 ${v.name}님이 ${attacker?.name ? attacker.name + '에게 ' : ''}쓰러졌어요` });
    if (attacker && attacker.token && attacker !== v) this.addHeat(attacker, HEAT.killPlayer);
    setTimeout(() => {
      v.dead = false; v.hp = v.maxHp;
      this.w.send(v, { t: 'respawn', hp: v.hp, homeId: this.w.accounts[v.token]?.homeId ?? null });
    }, 4500);
  }

  damageUnit(u, dmg, attacker, crit = false) {
    u.hp -= dmg;
    this.w.broadcast({ t: 'fx', k: 'dmgnum', p: [u.pos.x, u.pos.y + 2.5, u.pos.z], v: Math.round(dmg), crit, loc: u.loc });
    if (attacker) this.addHeat(attacker, HEAT.hitUnit);
    if (u.hp <= 0) {
      this.units = this.units.filter((x) => x !== u);
      this.w.broadcast({ t: 'fx', k: 'boom', p: [u.pos.x, u.pos.y + 1, u.pos.z], r: u.kind === 'tank' || u.kind === 'heli' ? 6 : 1.5, loc: u.loc, small: u.kind === 'cop' || u.kind === 'soldier' });
      if (attacker) this.addHeat(attacker, HEAT.killUnit);
    }
  }

  damageCar(car, dmg, attacker) {
    if (car.mode === 'wreck' || car.mode === 'gone') return;
    car.hp -= dmg;
    if (car.hp > 0) return;
    car.mode = 'wreck'; car.wreckT = 25; car.speed = 0;
    this.w.broadcast({ t: 'fx', k: 'boom', p: [car.pos.x, (car.pos.y || 0) + 1, car.pos.z], r: 6, loc: -1 });
    for (const p of this.w.players.values()) {
      if (p.car === car.id) { p.car = -1; car.owner = null; this.w.send(p, { t: 'carGone' }); this.damagePlayer(p, 45, attacker, car.pos); }
    }
    if (car.occ > 0 && attacker?.token) this.addHeat(attacker, HEAT.killNpc);
    car.occ = 0;
  }

  // 폭발: 범위 안의 모두에게 피해
  explode(p, msg) {
    const stats = weaponStats(msg.w, Array.isArray(msg.gems) ? msg.gems.slice(0, 3) : []);
    const def = itemDef(msg.w);
    if (!def.radius && !msg.vehicle) return;
    const center = new THREE.Vector3(+msg.x, +msg.y, +msg.z);
    if (p && center.distanceTo(p.pos) > (stats.range || 60) + 20) return;
    const R = msg.vehicle ? (msg.vehicle === 'tank' ? 5 : 4.5) : def.radius;
    const base = msg.vehicle ? (msg.vehicle === 'tank' ? 85 : 70) : stats.dmg;
    this.explodeAt(center, Number.isInteger(msg.loc) ? msg.loc : -1, R, base, p, stats);
  }

  explodeAt(center, loc, R, base, attacker, stats = {}) {
    this.w.broadcast({ t: 'fx', k: 'boom', p: [center.x, center.y, center.z], r: R, loc });
    const fall = (d) => Math.max(0, 1 - d / R);
    for (const c of this.w.sim.citizens) {
      if (c.mode === 'dead' || this.locOf(c) !== loc) continue;
      const d = this.npcPos(c).distanceTo(center);
      if (d < R) this.damageNpc(c, base * (0.4 + 0.6 * fall(d)), attacker, false, stats);
    }
    for (const v of this.w.players.values()) {
      if (v.dead || v.loc !== loc) continue;
      const d = v.pos.distanceTo(center);
      if (d < R) {
        this.damagePlayer(v, damageTaken(base * (0.4 + 0.6 * fall(d)), v.profile.def || 0, stats.pierce || 0), attacker, center);
        if (attacker && v !== attacker && attacker.token) this.addHeat(attacker, HEAT.hitPlayer);
      }
    }
    for (const u of [...this.units]) {
      if (u.loc !== loc) continue;
      const d = u.pos.distanceTo(center);
      if (d < R + 1) this.damageUnit(u, damageTaken(base * (0.4 + 0.6 * fall(d)), UNIT[u.kind].def, stats.pierce || 0), attacker);
    }
    if (loc < 0) for (const car of this.w.traffic.cars) {
      const d = car.pos.distanceTo(center);
      if (d < R + 1.5) this.damageCar(car, base * 1.5 * (0.4 + 0.6 * fall(d)), attacker);
    }
  }

  // ---------------- 현상수배 ----------------
  addHeat(p, v) {
    if (!p || !p.token || p.dead) return;
    p.heat = Math.min(420, (p.heat || 0) + v);
    p.lastCrime = Date.now();
    this.updateStars(p);
  }
  updateStars(p) {
    let s = 0;
    for (const t of STARS) if (p.heat >= t) s++;
    if (s !== p.stars) {
      const up = s > (p.stars || 0);
      p.stars = s;
      this.w.send(p, { t: 'wanted', stars: s });
      if (up && s >= 4) this.w.broadcast({ t: 'sys', text: `🚨 ${p.name}님을 진압하기 위해 군대가 출동했습니다!` });
      else if (up && s === 1) this.w.send(p, { t: 'sys', text: '🚓 경찰에 신고가 들어갔어요!' });
    }
  }

  // ---------------- 유닛 AI ----------------
  spawnUnit(kind, p) {
    const info = UNIT[kind];
    let pos;
    const anchor = p.loc >= 0 ? this.w.buildings[p.loc].door : p.pos;
    for (let i = 0; i < 8; i++) {
      const a = this.rng.range(0, Math.PI * 2), r = this.rng.range(40, 60);
      pos = new THREE.Vector3(anchor.x + Math.cos(a) * r, 0, anchor.z + Math.sin(a) * r);
      if (Math.abs(pos.x) < HALF - 2 && Math.abs(pos.z) < HALF - 2 && !this.blocked(pos, 1)) break;
      pos = randomStreetPoint(this.rng).point;
    }
    pos.y = info.fly || 0;
    this.units.push({ id: this.nextUnit++, kind, pos, h: 0, hp: info.hp, loc: -1, target: p.id, fireT: this.rng.range(1, 3), moving: 0 });
  }

  blocked(pos, r) {
    for (const b of this.boxes) if (pos.x > b.minX - r && pos.x < b.maxX + r && pos.z > b.minZ - r && pos.z < b.maxZ + r) return true;
    return false;
  }

  pushOut(pos, r) {
    for (const b of this.boxes) {
      if (pos.x < b.minX - r || pos.x > b.maxX + r || pos.z < b.minZ - r || pos.z > b.maxZ + r) continue;
      const cx = Math.max(b.minX, Math.min(pos.x, b.maxX)), cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
      let dx = pos.x - cx, dz = pos.z - cz, d = Math.hypot(dx, dz);
      if (d < 1e-3) { dx = pos.x - (b.minX + b.maxX) / 2; dz = pos.z - (b.minZ + b.maxZ) / 2; d = Math.hypot(dx, dz) || 1; pos.x = cx + (dx / d) * r * 2; pos.z = cz + (dz / d) * r * 2; continue; }
      if (d < r) { pos.x = cx + (dx / d) * r; pos.z = cz + (dz / d) * r; }
    }
  }

  tick(dt) {
    const now = Date.now();
    for (const p of this.w.players.values()) {
      // 수배도 감소
      if ((p.heat || 0) > 0 && now - (p.lastCrime || 0) > 20000) { p.heat = Math.max(0, p.heat - 6 * dt); this.updateStars(p); }
      // 체력 재생
      if (!p.dead && p.hp < p.maxHp && now - (p.lastHurt || 0) > 8000) { p.hp = Math.min(p.maxHp, p.hp + (2 + (p.profile.regen || 0)) * dt); p.hpSendT = (p.hpSendT || 0) - dt; if (p.hpSendT <= 0) { p.hpSendT = 1; this.w.send(p, { t: 'hp', hp: Math.round(p.hp) }); } }
      // 필요한 유닛 수 맞추기
      if (p.dead) continue;
      p.spawnT = (p.spawnT || 0) - dt;
      if (p.spawnT > 0) continue;
      p.spawnT = 1.5;
      const want = STAR_UNITS[p.stars || 0];
      const have = {};
      for (const u of this.units) if (u.target === p.id) have[u.kind] = (have[u.kind] || 0) + 1;
      const need = {};
      for (const k of want) need[k] = (need[k] || 0) + 1;
      for (const k of Object.keys(need)) if ((have[k] || 0) < need[k]) { this.spawnUnit(k, p); break; }
      // 별이 줄면 철수
      for (const k of Object.keys(have)) if ((need[k] || 0) < have[k]) { const u = this.units.find((x) => x.target === p.id && x.kind === k); this.units = this.units.filter((x) => x !== u); break; }
    }
    for (const u of [...this.units]) this.updateUnit(u, dt);
    // 바닥 아이템 소멸
    for (const [id, g] of this.ground) if (now > g.expire) { this.ground.delete(id); this.w.broadcast({ t: 'gpick', gid: id }); }
    // 부서진 차
    for (const car of this.w.traffic.cars) {
      if (car.mode !== 'wreck') continue;
      car.wreckT -= dt;
      if (car.wreckT <= 0) {
        if (car.id < 24) this.w.traffic.resetAI(car);
        else car.mode = 'gone';
      }
    }
  }

  updateUnit(u, dt) {
    const info = UNIT[u.kind];
    const p = this.w.players.get(u.target);
    if (!p || p.dead) { this.units = this.units.filter((x) => x !== u); return; }
    u.moving = 0;
    // 건물 안팎 따라가기 (전차·헬기는 밖에서 대기)
    if (p.loc !== u.loc) {
      if (u.loc >= 0) { const b = this.w.buildings[u.loc]; u.loc = -1; u.pos.set(b.door.x, 0, b.door.z); return; }
      const door = this.w.buildings[p.loc].door;
      const d = Math.hypot(door.x - u.pos.x, door.z - u.pos.z);
      if (d < 3 && !info.fly && u.kind !== 'tank') {
        const I = this.w.sim.interiorFor(this.w.buildings[p.loc]);
        u.loc = p.loc; u.pos.set(I.entry.x + this.rng.range(-1, 1), 0.1, I.entry.z);
        return;
      }
      if (d > 6) this.moveUnit(u, door, info, dt);
      return;
    }
    const tp = p.pos;
    const dx = tp.x - u.pos.x, dz = tp.z - u.pos.z, d = Math.hypot(dx, dz);
    u.h = Math.atan2(dx, dz);
    if (d > info.range * 0.6) this.moveUnit(u, tp, info, dt);
    u.fireT -= dt;
    if (u.fireT <= 0 && d < info.range) {
      u.fireT = info.rate * this.rng.range(0.85, 1.2);
      const muzzle = new THREE.Vector3(u.pos.x, u.pos.y + (info.fly ? 0 : u.kind === 'tank' ? 2.2 : 1.3), u.pos.z);
      const hitChance = info.acc * (1 - (d / info.range) * 0.4);
      const hit = this.rng.chance(hitChance);
      const aim = new THREE.Vector3(tp.x + (hit ? 0 : this.rng.range(-3, 3)), tp.y + 1, tp.z + (hit ? 0 : this.rng.range(-3, 3)));
      if (info.radius) {
        this.w.broadcast({ t: 'fx', k: 'tracer', a: [muzzle.x, muzzle.y, muzzle.z], b: [aim.x, aim.y, aim.z], c: '#ff9100', w: 3, loc: u.loc });
        this.explodeAt(aim, u.loc, info.radius, info.dmg, null);
      } else {
        this.w.broadcast({ t: 'fx', k: 'tracer', a: [muzzle.x, muzzle.y, muzzle.z], b: [aim.x, aim.y, aim.z], c: '#fff59d', loc: u.loc });
        if (hit) this.damagePlayer(p, damageTaken(info.dmg, p.profile.def || 0), { name: info.name }, muzzle);
      }
    }
  }

  moveUnit(u, target, info, dt) {
    const dx = target.x - u.pos.x, dz = target.z - u.pos.z, d = Math.hypot(dx, dz) || 1;
    const st = Math.min(d, info.speed * dt);
    u.pos.x += (dx / d) * st; u.pos.z += (dz / d) * st;
    u.h = Math.atan2(dx, dz);
    if (!info.fly && u.loc < 0) this.pushOut(u.pos, u.kind === 'tank' ? 2.2 : 0.6);
    if (u.loc >= 0) {
      const I = this.w.sim.interiorFor(this.w.buildings[u.loc]);
      u.pos.x = Math.max(I.entry.x - 35, Math.min(I.entry.x + 35, u.pos.x));
      u.pos.z = Math.max(I.entry.z - 50, Math.min(I.entry.z + 1, u.pos.z));
    }
    u.moving = 1;
  }

  // ---------------- 바닥 아이템 ----------------
  dropItem(item, x, y, z, loc, life = 60) {
    const g = { id: this.nextGround++, item, x, y, z, loc, expire: Date.now() + life * 1000 };
    this.ground.set(g.id, g);
    this.w.broadcast({ t: 'gdrop', g: groundMsg(g) });
    return g;
  }
  pickup(p, gid) {
    const g = this.ground.get(gid);
    if (!g || g.loc !== p.loc || Math.hypot(g.x - p.pos.x, g.z - p.pos.z) > 4) return;
    this.ground.delete(gid);
    this.w.broadcast({ t: 'gpick', gid });
    this.w.send(p, { t: 'gotItem', item: g.item });
  }
  groundList() { return [...this.ground.values()].map(groundMsg); }

  unitSnap() {
    return this.units.map((u) => [u.id, UNIT_KINDS.indexOf(u.kind), q(u.pos.x), q(u.pos.y), q(u.pos.z), q(u.h, 100), u.loc, u.moving, Math.round((u.hp / UNIT[u.kind].hp) * 100)]);
  }
}

function groundMsg(g) { return { id: g.id, item: g.item, x: g.x, y: g.y, z: g.z, loc: g.loc, ttl: Math.round((g.expire - Date.now()) / 1000) }; }
