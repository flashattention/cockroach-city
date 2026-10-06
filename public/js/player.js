import * as THREE from 'three';
import { Roach } from './roach.js';
import { clamp, angleLerp } from './utils.js';

export class Player {
  constructor(scene, profile) {
    this.profile = profile;
    this.roach = new Roach({ color: profile.color, age: profile.age, gender: profile.gender, look: profile.look, accessories: profile.accessories || [], lashes: !profile.look && profile.gender === '여' });
    this.roach.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    scene.add(this.roach.root);
    this.pos = new THREE.Vector3();
    this.vy = 0;
    this.onGround = true;
    this.heading = 0;
    this.speed = 0;
    this.inCar = null;
    this.radius = 0.45;
    this.jumps = 0; this.maxJumps = 2;
    this.dashT = 0; this.dashCool = 0; this.canDash = true; this.dashPower = 24;
    this.flying = false; this.flipped = false;
    this.fp = false; this.aim = 0; // 1인칭, 조준 줌 (0~1)
    this.speedBonus = 0;
    this.cam = { yaw: Math.PI, pitch: 0.38, dist: 7.5, target: new THREE.Vector3() };
    this.camPos = new THREE.Vector3();
  }

  // 몸 색깔 바꾸기: 모델을 새로 만들고 장비/무기는 그대로 옮긴다
  setColor(color) {
    const old = this.roach;
    const scene = old.root.parent;
    this.profile.color = color;
    const r = new Roach({ color, age: this.profile.age, gender: this.profile.gender, look: this.profile.look, accessories: this.profile.accessories || [], lashes: !this.profile.look && this.profile.gender === '여' });
    r.root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    r.root.position.copy(old.root.position);
    r.root.rotation.y = old.root.rotation.y;
    r.setHeld(old.heldSpec || null);
    r.flying = old.flying; r.flipped = old.flipped;
    scene?.remove(old.root);
    scene?.add(r.root);
    this.roach = r;
  }

  setAccessories(list) {
    this.profile.accessories = list;
    this.roach.setAccessories(list);
  }

  // 발판을 포함한 바닥 높이
  groundAt(world, x, z, y) {
    let g = world.groundY(x, z);
    if (world.platforms) for (const p of world.platforms) {
      if (x > p.minX - 0.3 && x < p.maxX + 0.3 && z > p.minZ - 0.3 && z < p.maxZ + 0.3 && y >= p.top - 0.45) g = Math.max(g, p.top);
    }
    return g;
  }

  update(dt, input, world) {
    if (this.inCar) {
      this.pos.copy(this.inCar.pos);
      this.roach.root.visible = true;
      return;
    }
    if (this.roach.seated) { this.roach.setSeated(false); this.roach.root.scale.setScalar(this.roach.baseScale); }
    this.roach.root.visible = true;
    const yaw = this.cam.yaw;
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    let mx = 0, mz = 0;
    if (input.enabled) {
      const f = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
      const s = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      mx = fx * f + rx * s; mz = fz * f + rz * s;
      if (input.moveDir && !f && !s) { mx = input.moveDir.x; mz = input.moveDir.z; }
    }
    if (this.flipped) { mx = 0; mz = 0; }
    const len = Math.hypot(mx, mz);
    let speed = 0;
    if (len > 0) {
      mx /= len; mz /= len;
      speed = this.flying ? (input.run ? 19 : 11) : (input.run || input.moveDir ? 9.5 : 5.2) * (1 + this.speedBonus);
      if (world.tired) speed *= 0.6;
      this.heading = Math.atan2(mx, mz);
    }
    this.speed = THREE.MathUtils.lerp(this.speed, speed, Math.min(1, dt * 10));
    const dirx = len > 0 ? mx : Math.sin(this.heading), dirz = len > 0 ? mz : Math.cos(this.heading);
    // 대쉬
    this.dashCool -= dt;
    if (input.enabled && input.dashPressed && this.canDash && this.dashCool <= 0 && !this.flipped) {
      this.dashT = 0.2; this.dashCool = 0.9;
      this.dashDir = { x: Math.sin(this.heading), z: Math.cos(this.heading) };
      if (this.vy < 0) this.vy = 0;
      this.roach.jumpSquash = 1;
    }
    if (this.dashT > 0) {
      this.dashT -= dt;
      this.pos.x += this.dashDir.x * this.dashPower * dt; this.pos.z += this.dashDir.z * this.dashPower * dt;
      this.vy = Math.max(this.vy, -1);
    } else {
      this.pos.x += dirx * this.speed * dt;
      this.pos.z += dirz * this.speed * dt;
    }

    // 점프 & 중력 (여러 단 점프)
    const gy = this.groundAt(world, this.pos.x, this.pos.z, this.pos.y);
    this.flyDist = 0;
    if (this.flying) {
      // 날기: Space 위로, X 아래로. 땅에 닿으면 착지
      const up = (input.jump ? 1 : 0) - (input.down ? 1 : 0);
      this.vy += (up * 9 - this.vy) * Math.min(1, dt * 4);
      this.pos.y = Math.min(world.ceiling ?? 90, this.pos.y + this.vy * dt);
      this.flyDist = len > 0 ? this.speed * dt : 0;
      if (this.pos.y <= gy && this.vy <= 0) { this.pos.y = gy; this.land(); }
      this.onGround = false;
    } else if (input.enabled && input.jumpPressed && !this.flipped) {
      if (this.onGround) { this.vy = this.jumpV || 7.5; this.onGround = false; this.jumps = 1; this.roach.jumpSquash = 1; }
      else if (this.jumps < this.maxJumps) { this.vy = (this.jumpV || 7.5) - 0.3; this.jumps++; this.roach.jumpSquash = 1; this.airJump = 0.3; }
    }
    if (!this.flying) {
    this.vy -= 22 * dt;
    this.pos.y += this.vy * dt;
    }
    if (!this.flying && this.pos.y <= gy) {
      if (!this.onGround && this.vy < -4) this.roach.jumpSquash = 1;
      this.pos.y = gy;
      this.vy = 0; this.onGround = true; this.jumps = 0;
    } else if (!this.flying && this.pos.y > gy + 0.05) this.onGround = false;
    this.airJump = Math.max(0, (this.airJump || 0) - dt);

    // 충돌 (발 아래보다 높은 발판은 벽)
    this.collide(world.colliders);
    if (world.platforms) this.collide(world.platforms.filter((p) => this.pos.y < p.top - 0.45).map((p) => ({ ...p, h: p.top })), true);
    if (world.bounds) {
      const b = world.bounds;
      this.pos.x = clamp(this.pos.x, b.minX, b.maxX);
      this.pos.z = clamp(this.pos.z, b.minZ, b.maxZ);
    }
    for (const n of world.npcs) {
      if (!n.visible) continue;
      const p = n.roach.root.position;
      const dx = this.pos.x - p.x, dz = this.pos.z - p.z;
      const d = Math.hypot(dx, dz), min = this.radius + 0.4;
      if (d < min && d > 1e-4) { this.pos.x = p.x + (dx / d) * min; this.pos.z = p.z + (dz / d) * min; }
    }

    const root = this.roach.root;
    root.position.copy(this.pos);
    root.rotation.y = angleLerp(root.rotation.y, this.heading, Math.min(1, dt * 14));
    this.roach.flying = this.flying; this.roach.flipped = this.flipped;
    this.roach.update(dt, this.dashT > 0 ? 14 : this.speed, { airborne: !this.onGround && (this.airJump > 0 || this.dashT > 0), noCrawl: this.flying });
    root.visible = !this.fp;
  }

  takeOff() { if (this.inCar || this.flipped) return false; this.flying = true; this.vy = 6; this.onGround = false; return true; }
  land() { this.flying = false; this.vy = 0; this.onGround = true; this.jumps = 0; this.roach.jumpSquash = 1; }

  collide(colliders, plat = false) {
    const r = this.radius;
    for (const c of colliders) {
      if (this.pos.x < c.minX - r || this.pos.x > c.maxX + r || this.pos.z < c.minZ - r || this.pos.z > c.maxZ + r) continue;
      if (!plat && c.h !== undefined && this.pos.y > c.h) continue;
      const cx = clamp(this.pos.x, c.minX, c.maxX), cz = clamp(this.pos.z, c.minZ, c.maxZ);
      let dx = this.pos.x - cx, dz = this.pos.z - cz;
      let d = Math.hypot(dx, dz);
      if (d < 1e-4) {
        // 박스 안쪽: 가장 가까운 면으로 밀어냄
        const opts = [[c.minX - r - this.pos.x, 0], [c.maxX + r - this.pos.x, 0], [0, c.minZ - r - this.pos.z], [0, c.maxZ + r - this.pos.z]];
        opts.sort((a, b) => Math.abs(a[0] + a[1]) - Math.abs(b[0] + b[1]));
        this.pos.x += opts[0][0]; this.pos.z += opts[0][1];
      } else if (d < r) {
        this.pos.x = cx + (dx / d) * r; this.pos.z = cz + (dz / d) * r;
      }
    }
  }

  updateCamera(camera, dt, world) {
    const c = this.cam;
    const tgt = this.inCar ? this.inCar.pos.clone().setY((this.inCar.pos.y || 0) + 1.8) : this.pos.clone().setY(this.pos.y + 1.5);
    if (this.inCar) {
      // 차 뒤로 자연스럽게 따라감
      const behind = this.inCar.heading + Math.PI;
      if (!world.mouseActive) c.yaw = angleLerp(c.yaw, behind, Math.min(1, dt * 2.5));
    }
    if (this.snap) c.target.copy(tgt); else c.target.lerp(tgt, Math.min(1, dt * 12));
    // 1인칭: 머리 위치에서 보는 방향 그대로
    if (this.fp && !this.inCar) {
      const head = this.pos.clone(); head.y += this.roach.height * 0.85;
      const cp0 = Math.cos(c.pitch);
      camera.position.copy(head);
      this.camPos.copy(head);
      camera.lookAt(head.x - Math.sin(c.yaw) * cp0, head.y - Math.sin(c.pitch), head.z - Math.cos(c.yaw) * cp0);
      this.snap = false;
      return;
    }
    // 조준 중: 어깨 너머로 가까이
    if (this.aim > 0.01 && !this.inCar) {
      const rx = Math.cos(c.yaw), rz = -Math.sin(c.yaw);
      c.target.x += rx * 0.9 * this.aim; c.target.z += rz * 0.9 * this.aim; c.target.y += 0.25 * this.aim;
    }
    const dist0 = this.inCar ? Math.max(c.dist, this.inCar.kind === 'heli' || this.inCar.kind === 'tank' ? 16 : this.inCar.kind === 'bus' || this.inCar.kind === 'truck' ? 14 : 11) : c.dist;
    const dist = this.inCar ? dist0 : dist0 + (Math.min(dist0, 3.4) - dist0) * this.aim;
    const cp = Math.cos(c.pitch);
    const want = new THREE.Vector3(
      c.target.x + Math.sin(c.yaw) * cp * dist,
      c.target.y + Math.sin(c.pitch) * dist,
      c.target.z + Math.cos(c.yaw) * cp * dist,
    );
    // 건물에 가리지 않도록
    if (world.cameraColliders) {
      const dir = want.clone().sub(c.target);
      const L = dir.length(); dir.divideScalar(L);
      let tMin = L;
      for (const b of world.cameraColliders) {
        if (b.small) continue;
        const t = rayBox(c.target, dir, b);
        if (t !== null && t < tMin) tMin = t;
      }
      if (tMin < L) want.copy(c.target).addScaledVector(dir, Math.max(1.2, tMin - 0.4));
    }
    this.camPos.lerp(want, Math.min(1, dt * 14));
    if (this.snap || this.camPos.distanceTo(want) > 30) this.camPos.copy(want);
    this.snap = false;
    camera.position.copy(this.camPos);
    camera.lookAt(c.target);
  }
}

// 광선-AABB (y: 0~h)
function rayBox(o, d, b) {
  let tmin = 0, tmax = Infinity;
  const axes = [['x', b.minX, b.maxX], ['y', -1, b.h ?? 10], ['z', b.minZ, b.maxZ]];
  for (const [k, mn, mx] of axes) {
    if (Math.abs(d[k]) < 1e-6) { if (o[k] < mn || o[k] > mx) return null; continue; }
    let t1 = (mn - o[k]) / d[k], t2 = (mx - o[k]) / d[k];
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return null;
  }
  return tmin;
}
