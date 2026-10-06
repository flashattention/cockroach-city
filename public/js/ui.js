import * as THREE from 'three';
import { HALF, CITY } from './config.js';
import { PERSONALITIES, BODY_COLORS, JOBS, BUILDING_TYPES, EMOTE } from './data.js';
import { ITEMS, GEMS, SHOPS, ENCHANT_FEE, CLUB_CHARM, itemDef, shopItems, weaponStats, isWeapon } from './items.js';
import { SLOTS } from './inventory.js';
import { housePrice, forSale } from './world-setup.js';
import { moodLabel, moodEmoji } from './citizens.js';
import { Roach } from './roach.js';
import { settings, saveSettings } from './settings.js';
import { fmtTime, DAYS, escapeHtml } from './utils.js';

const $ = (id) => document.getElementById(id);
const NEEDS = [
  ['hunger', '🍙', '배고픔', '#ff9f6b'],
  ['energy', '⚡', '에너지', '#ffd54f'],
  ['fun', '🎈', '재미', '#c99bff'],
  ['social', '💬', '사교', '#7ec8a9'],
  ['hygiene', '🫧', '청결', '#80d8ff'],
];

export class UI {
  constructor(game) {
    this.game = game;
    this.labels = new Map();
    this.toastQ = [];
    this.chatC = null;
    this.chatTalked = false;
    this.busy = false;
    this.phoneTab = 'citizens';
    this.mapT = 0;
    this.setupChat();
    this.setupPhone();
    this.setupPlayerChat();
    $('minimap').addEventListener('click', () => this.openWorldMap());
    $('confirm-yes').onclick = () => this.confirmResolve?.(true);
    $('confirm-no').onclick = () => this.confirmResolve?.(false);
    $('sleep-wake').onclick = () => game.wakeUp();
  }

  // ---------------- 시작 화면 ----------------
  showStart(saved, onStart) {
    const sel = $('p-personality');
    for (const p of PERSONALITIES) sel.insertAdjacentHTML('beforeend', `<option value="${p.id}">${p.name}</option>`);
    sel.value = 'chatty';
    const colors = [...BODY_COLORS.slice(0, 5), '#ff9fb2', '#7ec8a9', '#9fa8ff', '#ffd54f'];
    let color = colors[0];
    const wrap = $('p-colors');
    colors.forEach((c, i) => {
      const s = document.createElement('div');
      s.className = 'swatch' + (i === 0 ? ' sel' : '');
      s.style.background = c;
      s.onclick = () => { wrap.querySelectorAll('.swatch').forEach((x) => x.classList.remove('sel')); s.classList.add('sel'); color = c; this.updatePreview(color); };
      wrap.appendChild(s);
    });
    // 미리보기
    const pv = $('start-preview');
    this.pvRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.pvRenderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.pvRenderer.setSize(200, 160);
    this.pvRenderer.outputColorSpace = THREE.SRGBColorSpace;
    pv.appendChild(this.pvRenderer.domElement);
    this.pvRenderer.domElement.style.margin = '0 auto';
    this.pvRenderer.domElement.style.display = 'block';
    this.pvScene = new THREE.Scene();
    this.pvScene.add(new THREE.HemisphereLight('#fff6e8', '#c9a28a', 1.4));
    const dl = new THREE.DirectionalLight('#ffffff', 1.6); dl.position.set(2, 4, 5); this.pvScene.add(dl);
    this.pvCam = new THREE.PerspectiveCamera(35, 200 / 160, 0.1, 50);
    this.pvCam.position.set(0, 1.6, 6.2); this.pvCam.lookAt(0, 1.15, 0);
    this.updatePreview(color);

    const st = $('start-btn');
    const pw = () => $('p-password').value;
    try { $('p-password').value = localStorage.getItem('roachcity.pw') || ''; } catch { /* 무시 */ }
    const go = (profile, cont) => {
      try { localStorage.setItem('roachcity.pw', pw()); } catch { /* 무시 */ }
      $('start').classList.add('hidden');
      onStart(profile, cont, pw());
    };
    if (saved) {
      const cont = document.createElement('button');
      cont.id = 'continue-btn';
      cont.textContent = `이어하기 (${saved.name}) ▶`;
      cont.style.cssText = 'display:block;margin:10px auto 0;background:#7ec8a9;color:#fff;border:0;border-radius:16px;padding:10px 20px;font-size:17px;';
      st.after(cont);
      cont.onclick = () => go(saved, true);
      st.textContent = '새 캐릭터로 시작 🏠';
    }
    st.onclick = () => {
      const name = ($('p-name').value || '바퀴').trim().slice(0, 8);
      const age = Math.max(18, Math.min(80, parseInt($('p-age').value, 10) || 25));
      const pers = PERSONALITIES.find((p) => p.id === sel.value);
      go({ name, gender: $('p-gender').value, age, personality: pers.name, color, accessories: [] }, false);
    };
    $('p-password').addEventListener('keydown', (e) => { if (e.key === 'Enter') (saved ? $('continue-btn') : st).click(); });
  }

  startError(msg) {
    $('start').classList.remove('hidden');
    $('start-error').textContent = msg;
    $('start-error').classList.remove('hidden');
  }

  updatePreview(color) {
    if (this.pvRoach) this.pvScene.remove(this.pvRoach.root);
    this.pvRoach = new Roach({ color, age: 25, accessories: [] });
    this.pvRoach.root.scale.setScalar(1);
    this.pvScene.add(this.pvRoach.root);
  }
  renderPreview(dt) {
    if (!this.pvRoach) return;
    this.pvRoach.root.rotation.y += dt * 0.8;
    this.pvRoach.update(dt, 0);
    if (Math.random() < 0.004) this.pvRoach.wave();
    this.pvRenderer.render(this.pvScene, this.pvCam);
  }
  disposePreview() { this.pvRoach = null; this.pvRenderer?.dispose(); }

  updateServerStatus(s) {
    this.serverStatus = s;
    const el = $('llm-status');
    if (!s) { el.innerHTML = '⚠️ 서버에 연결할 수 없어요. 서버가 켜져 있는지 확인하세요.'; return; }
    const who = s.players ? `지금 <b>${s.players}명</b>이 플레이 중이에요!` : '아직 아무도 없어요. 첫 주민이 되어보세요!';
    const llm = s.llm ? `🤖 LLM(<b>${escapeHtml(s.model)}</b>)으로 바퀴들이 대화해요` : '💤 서버에 LLM 키가 없어 기본 대사로 대화해요';
    el.innerHTML = `👥 ${who}<br>${llm}`;
    $('pw-row').classList.toggle('hidden', !s.password);
  }

  showLoading(text) { $('loading').classList.remove('hidden'); $('loading-text').textContent = text; }
  hideLoading() { $('loading').classList.add('hidden'); }
  showHUD() {
    for (const id of ['hud', 'minimap-wrap', 'help-hint', 'pchat', 'hotbar-wrap']) $(id).classList.remove('hidden');
    this.disposePreview();
    setTimeout(() => $('help-hint').classList.add('hidden'), 25000);
  }
  toggleHelp() { $('help-hint').classList.toggle('hidden'); }
  setLocked(v) { this.locked = v; }

  buildNeeds() {
    const el = $('needs-card');
    el.innerHTML = `<div class="need hp"><span>❤️</span><span>체력 <b id="hp-num">100</b></span><div class="bar"><div id="need-hp" style="background:#ff5252"></div></div></div>` + NEEDS.map(([k, ic, nm, col]) => `<div class="need"><span>${ic}</span><span>${nm}</span><div class="bar"><div id="need-${k}" style="background:${col}"></div></div></div>`).join('');
  }

  toast(text) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = text;
    $('toasts').appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .4s'; el.style.opacity = '0'; }, 3600);
    setTimeout(() => el.remove(), 4100);
    while ($('toasts').children.length > 4) $('toasts').firstChild.remove();
  }

  // ---------------- 패널 상태 ----------------
  anyPanelOpen() { return !$('chat').classList.contains('hidden') || !$('phone').classList.contains('hidden') || !$('modal').classList.contains('hidden'); }
  chatOpen() { return !$('chat').classList.contains('hidden'); }
  escape() {
    if (!$('confirm').classList.contains('hidden')) { this.confirmResolve?.(false); return; }
    if (!$('modal').classList.contains('hidden')) this.closeModal();
    else if (!$('phone').classList.contains('hidden')) this.closePhone();
    else if (this.chatOpen()) this.closeChat();
  }

  async flash() {
    const f = $('fade');
    $('fade-text').textContent = '';
    $('fade-bar').style.display = 'none';
    f.style.transition = 'opacity .18s'; f.style.opacity = '0';
    f.classList.remove('hidden');
    await sleep(10); f.style.opacity = '1';
    await sleep(200);
    setTimeout(() => { f.style.opacity = '0'; setTimeout(() => { f.classList.add('hidden'); $('fade-bar').style.display = ''; }, 200); }, 120);
  }

  async fade(text, ms) {
    const f = $('fade');
    f.style.opacity = '1';
    $('fade-text').textContent = text;
    f.classList.remove('hidden');
    const bar = $('fade-bar').firstElementChild;
    bar.style.transition = 'none'; bar.style.width = '0';
    await sleep(30);
    bar.style.transition = `width ${ms}ms linear`; bar.style.width = '100%';
    await sleep(ms + 100);
    f.classList.add('hidden');
  }

  // ---------------- HUD ----------------
  update(dt) {
    const g = this.game;
    const S = g.stats;
    $('clock-day').textContent = `${g.day() + 1}일차 · ${DAYS[g.day() % 7]}요일 · ${g.weather}`;
    $('online').textContent = `👥 ${g.players.list.size + 1}명 접속 중`;
    $('clock-time').textContent = fmtTime(g.minutes);
    $('money').textContent = `₩${Math.floor(S.money)}`;
    const job = g.playerJob();
    $('job-label').textContent = job ? `${job.name}` : '무직';
    for (const [k] of NEEDS) { const el = $('need-' + k); if (el) el.style.width = `${S.needs[k]}%`; }
    $('need-hp').style.width = `${(g.hp / g.maxHp) * 100}%`;
    $('hp-num').textContent = Math.round(g.hp);
    const charm = g.charm();
    $('charm').textContent = `✨ 매력 ${charm}${charm >= CLUB_CHARM ? ' 🪩' : ''}`;
    $('stars').innerHTML = g.stars ? '★'.repeat(g.stars) + '<span style="opacity:.25">' + '★'.repeat(5 - g.stars) + '</span>' : '';
    $('stars').classList.toggle('hidden', !g.stars);
    const sel = g.inv.selected();
    const d = sel ? itemDef(sel.id) : ITEMS.fist;
    const aim = !!g.player.inCar ? ['tank', 'heli'].includes(g.player.inCar.kind) : ['gun', 'launcher', 'throw'].includes(d.cat);
    $('crosshair').classList.toggle('hidden', !(aim && this.locked));
    $('weapon-name').textContent = g.player.inCar ? (g.player.inCar.kind === 'tank' ? '🪖 전차 주포' : g.player.inCar.kind === 'heli' ? '🚀 헬기 미사일' : '🚗 운전 중') : `${d.emoji} ${d.name}${sel?.gems?.length ? ' ' + sel.gems.map((x) => GEMS[x] ? '◆' : '').join('') : ''}`;
    // 위치
    $('location-label').textContent = g.mode === 'interior' ? `${g.interior.building.def.emoji} ${g.interior.building.name}` : `📍 ${g.placeText()}`;
    this.updateLabels();
    this.mapT -= dt;
    if (this.mapT <= 0) { this.mapT = 0.1; this.drawMinimap(); }
  }

  setPrompt(f) {
    const el = $('prompt');
    if (!f || (!f.label && !f.carLabel)) { el.classList.add('hidden'); return; }
    let html = '';
    if (f.label) html += `<div class="row"><span class="key">${f.key || 'E'}</span>${escapeHtml(f.label)}</div>`;
    if (f.carLabel) html += `<div class="row"><span class="key">F</span>${escapeHtml(f.carLabel)}</div>`;
    if (el.innerHTML !== html) el.innerHTML = html;
    el.classList.remove('hidden');
  }

  // 이름표 & 말풍선
  updateLabels() {
    const g = this.game;
    const cam = g.camera;
    const W = window.innerWidth, H = window.innerHeight;
    const pp = g.player.pos;
    const v = new THREE.Vector3();
    const seen = new Set();
    const place = (key, worldPos, html, cls) => {
      v.copy(worldPos).project(cam);
      if (v.z > 1 || v.x < -1.2 || v.x > 1.2 || v.y < -1.2 || v.y > 1.2) return;
      let el = this.labels.get(key);
      if (!el) { el = document.createElement('div'); $('labels').appendChild(el); this.labels.set(key, el); }
      el.className = cls;
      if (el._html !== html) { el.innerHTML = html; el._html = html; }
      el.style.left = `${(v.x * 0.5 + 0.5) * W}px`;
      el.style.top = `${(-v.y * 0.5 + 0.5) * H}px`;
      el.style.display = '';
      seen.add(key);
    };
    for (const c of g.sim.citizens) {
      if (!c.visible) continue;
      const root = c.roach.root.position;
      const d = root.distanceTo(pp);
      const top = root.clone(); top.y += c.roach.height + 0.35;
      if (d < 13 || (c.hp < c.maxHp && d < 30)) {
        const heart = c.affinity >= 65 ? ' 💗' : '';
        const hpBar = c.hp < c.maxHp ? `<div class="hpbar"><div style="width:${(c.hp / c.maxHp) * 100}%"></div></div>` : '';
        const mood = c.mood < 38 || c.mood > 78 ? ' ' + moodEmoji(c.mood) : '';
        place('t' + c.id, top, `${escapeHtml(c.name)}${heart}${mood}<small>${c.mode === 'dead' ? '💫 기절' : `${escapeHtml(c.job.name)} · ${c.age}세`}</small>${hpBar}`, 'tag');
      }
      if (c.bubble && d < 35) {
        const b = top.clone(); b.y += d < 13 ? 0.9 : 0.2;
        place('b' + c.id, b, escapeHtml(c.bubble.text), 'bubble');
      }
    }
    for (const o of g.players.list.values()) {
      if (!o.visible) continue;
      const top = o.pos.clone(); top.y += o.roach.height + 0.35;
      const d = top.distanceTo(pp);
      if (d < 40) place('p' + o.id, top, `🎮 ${escapeHtml(o.name)}${o.stars ? ' <span style="color:#ffd600">' + '★'.repeat(o.stars) + '</span>' : ''}<small>${o.dead ? '💀' : escapeHtml(o.profile.jobName || '플레이어')}</small><div class="hpbar"><div style="width:${o.hp}%"></div></div>`, 'tag player');
      if (o.bubble && d < 40) { const b = top.clone(); b.y += 0.9; place('pb' + o.id, b, escapeHtml(o.bubble.text), 'bubble player'); }
    }
    if (g.myBubble && !g.player.inCar) {
      const top = g.player.pos.clone(); top.y += g.player.roach.height + 0.6;
      place('me', top, escapeHtml(g.myBubble.text), 'bubble player');
    }
    for (const u of g.units.list.values()) {
      if (!u.visible) continue;
      const top = u.obj.position.clone(); top.y += u.kind === 'tank' ? 4 : u.kind === 'heli' ? 4 : 2.3;
      if (top.distanceTo(pp) < 70) place('u' + u.id, top, `${{ cop: '🚓 경찰', soldier: '🪖 군인', tank: '🛡️ 전차', heli: '🚁 군용 헬기' }[u.kind]}<div class="hpbar enemy"><div style="width:${u.hp}%"></div></div>`, 'tag enemy');
    }
    for (const [i, r] of g.runners.list.entries()) if (r.bubble) { const b = r.r.root.position.clone(); b.y += 2.4; place('run' + i, b, escapeHtml(r.bubble.text), 'bubble'); }
    if (g.bouncerSay && g.mode === 'city') {
      const r = g.bouncerSay.b.bouncers[0].root.position.clone(); r.y += 3.4;
      place('bouncer', r, '🕶️ ' + escapeHtml(g.bouncerSay.text), 'bubble');
    }
    if (g.mode === 'city') {
      for (const [i, car] of g.traffic.cars.entries()) {
        if (!car.bubble) continue;
        const p = car.pos.clone(); p.y = car.height + 0.6;
        if (p.distanceTo(pp) < 40) place('car' + i, p, escapeHtml(car.bubble.text), 'bubble');
      }
      if (g.waypoint) {
        const p = g.waypoint.pos.clone(); p.y = 4;
        place('wp', p, `📍 ${escapeHtml(g.waypoint.label)}<small>${Math.round(g.waypoint.pos.distanceTo(pp))}m</small>`, 'tag');
        if (g.waypoint.pos.distanceTo(pp) < 4 && !g.autoWalk) { g.waypoint = null; g.route = null; }
      }
    }
    for (const [k, el] of this.labels) if (!seen.has(k)) el.style.display = 'none';
  }

  drawMinimap() {
    const g = this.game;
    const cv = $('minimap');
    const ctx = cv.getContext('2d');
    const S = cv.width;
    const scale = 1024 / CITY; // mapImage px per unit
    const zoom = 1.6; // 화면 px per unit
    const p = g.mode === 'interior' ? g.interior.building.door : g.player.inCar ? g.player.inCar.pos : g.player.pos;
    const yaw = g.player.cam.yaw;
    ctx.save();
    ctx.fillStyle = '#9fd38a'; ctx.fillRect(0, 0, S, S);
    ctx.translate(S / 2, S / 2);
    ctx.rotate(yaw - Math.PI); // 카메라가 보는 방향이 위쪽
    ctx.scale(zoom / scale, zoom / scale);
    ctx.translate(-(p.x + HALF) * scale, -(p.z + HALF) * scale);
    ctx.drawImage(g.mapImage, 0, 0);
    // 시민 점
    const u = scale;
    for (const c of g.sim.citizens) {
      if (c.location && c.mode !== 'park') continue;
      ctx.fillStyle = c.affinity >= 65 ? '#ff4f81' : '#6b4a3a';
      ctx.beginPath(); ctx.arc((c.pos.x + HALF) * u, (c.pos.z + HALF) * u, 2.2 / zoom * u, 0, Math.PI * 2); ctx.fill();
    }
    for (const car of g.traffic.cars) {
      ctx.fillStyle = car.mode === 'player' ? '#ff6f91' : '#455a64';
      ctx.fillRect((car.pos.x + HALF) * u - 1.5 * u / zoom * 1.3, (car.pos.z + HALF) * u - 1.5 * u / zoom * 1.3, 3 * u / zoom * 1.3, 3 * u / zoom * 1.3);
    }
    for (const o of g.players.list.values()) {
      const op = o.loc >= 0 ? g.city.buildings[o.loc].door : o.pos;
      ctx.fillStyle = '#7c4dff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5 * u / zoom;
      ctx.beginPath(); ctx.arc((op.x + HALF) * u, (op.z + HALF) * u, 4 / zoom * u, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    for (const un of g.units.list.values()) {
      if (un.loc >= 0) continue;
      ctx.fillStyle = '#ff1744';
      ctx.beginPath(); ctx.arc((un.pos.x + HALF) * u, (un.pos.z + HALF) * u, 3.5 / zoom * u, 0, Math.PI * 2); ctx.fill();
    }
    if (g.route?.length) {
      ctx.strokeStyle = '#2979ff'; ctx.lineWidth = 3 * u / zoom; ctx.setLineDash([6 * u / zoom, 4 * u / zoom]);
      ctx.beginPath(); ctx.moveTo((p.x + HALF) * u, (p.z + HALF) * u);
      for (const r of g.route) ctx.lineTo((r.x + HALF) * u, (r.z + HALF) * u);
      ctx.stroke(); ctx.setLineDash([]);
    }
    const home = g.homeBuilding();
    ctx.font = `${16 * u / zoom}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(g.stats.homeId != null ? '🏡' : '🏨', (home.x + HALF) * u, (home.z + HALF) * u);
    const wb = g.workBuilding();
    if (wb) ctx.fillText('💼', (wb.x + HALF) * u, (wb.z + HALF) * u);
    if (g.waypoint) ctx.fillText('📍', (g.waypoint.pos.x + HALF) * u, (g.waypoint.pos.z + HALF) * u);
    ctx.restore();
    // 플레이어 화살표
    ctx.save();
    ctx.translate(S / 2, S / 2);
    const h = g.player.inCar ? g.player.inCar.heading : g.player.heading;
    ctx.rotate(-(h - yaw) + Math.PI);
    ctx.fillStyle = '#ff6f91'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(7, 7); ctx.lineTo(0, 3); ctx.lineTo(-7, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    // 북쪽 표시
    ctx.save(); ctx.translate(S / 2, S / 2); ctx.rotate(yaw - Math.PI);
    ctx.fillStyle = '#e53935'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('N', 0, -S / 2 + 18);
    ctx.restore();
  }

  // ---------------- 대화 ----------------
  setupChat() {
    $('chat-close').onclick = () => this.closeChat();
    $('chat-send').onclick = () => this.sendChat();
    $('chat-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); this.sendChat(); }
      if (e.key === 'Escape') this.closeChat();
      e.stopPropagation();
    });
    $('chat-gift').onchange = () => {
      const v = $('chat-gift').value;
      if (v !== '') this.giveGift(v);
      $('chat-gift').value = '';
    };
  }

  openChat(c) {
    const g = this.game;
    if (this.chatC) this.closeChat();
    this.chatC = c;
    this.chatTalked = false;
    g.releaseMouse();
    // 플레이어도 상대를 바라봄
    const src = c.roach.root.position;
    g.player.heading = Math.atan2(src.x - g.player.pos.x, src.z - g.player.pos.z);
    // 어깨 너머로 상대를 비추는 카메라
    g.player.cam.yaw = g.player.heading + Math.PI - 0.55;
    g.player.cam.pitch = 0.22;
    this.prevDist = g.player.cam.dist;
    g.player.cam.dist = 5.5;
    $('chat').classList.remove('hidden');
    $('chat-avatar').style.background = c.color;
    $('chat-avatar').textContent = '🪳';
    $('chat-name').textContent = c.name;
    $('chat-sub').textContent = `${c.age}세 · ${c.gender} · ${c.job.name} · ${c.personality.name} · 기분 ${moodEmoji(c.mood)}`;
    this.renderProfile(c);
    this.refreshAffinity();
    this.refreshGifts();
    $('chat-log').innerHTML = '';
    // 이전 대화 몇 줄
    const prev = (c.chatLog ||= []).slice(-4);
    if (prev.length) {
      this.addMsg('sys', '— 지난 대화 —');
      for (const m of prev) this.addMsg(m.role === 'user' ? 'me' : 'npc', m.content);
      this.addMsg('sys', '— 오늘 —');
    }
    if (!g.llm) this.addMsg('sys', '💤 서버에 LLM 키가 없어 기본 대사로 대화해요');
    $('chat-input').value = '';
    $('chat-input').focus();
    this.request(null, { greeting: true });
  }

  renderProfile(c) {
    const g = this.game;
    const rels = [...c.relations.entries()].slice(0, 6).map(([id, r]) => `${escapeHtml(g.sim.citizens[id].name)}(${r.label})`).join(', ');
    $('chat-profile').innerHTML = `
      <b>역할</b> ${escapeHtml(c.familyText)} · ${escapeHtml(c.socialRole)}<br>
      <b>직장</b> ${c.work ? escapeHtml(c.work.name) : '없음'} · <b>집</b> ${escapeHtml(c.home.name)}<br>
      <b>취미</b> ${escapeHtml(c.hobby)} · <b>꿈</b> ${escapeHtml(c.dream)}<br>
      <b>지금</b> ${escapeHtml(c.activityText())}<br>
      <b>아는 사이</b> ${rels || '-'}${needBars(c)}`;
  }

  refreshAffinity() {
    const c = this.chatC;
    if (!c) return;
    $('chat-affinity-bar').style.width = `${c.affinity}%`;
    $('chat-affinity').title = `친밀도 ${Math.round(c.affinity)}/100`;
  }

  refreshGifts() {
    const items = this.game.stats.items.filter((it) => { const d = itemDef(it.id); return d.gift || d.cat === 'gem' || (d.price >= 100 && d.cat !== 'vehicle'); });
    const sel = $('chat-gift');
    sel.innerHTML = '<option value="">🎁 선물</option>' + items.map((it) => { const d = itemDef(it.id); return `<option value="${it.uid}">${d.emoji} ${escapeHtml(d.name)}</option>`; }).join('');
    sel.disabled = !items.length;
  }

  addMsg(kind, text) {
    const el = document.createElement('div');
    el.className = 'msg ' + kind;
    el.textContent = text;
    $('chat-log').appendChild(el);
    $('chat-log').scrollTop = 1e9;
    return el;
  }

  // 서버로 보내고, 답은 onTalkReply로 받는다
  request(text, opts = {}) {
    const c = this.chatC;
    if (!c || this.busy) return;
    this.busy = true;
    this.typingEl = this.addMsg('npc typing', '...');
    clearTimeout(this.talkTimeout);
    this.talkTimeout = setTimeout(() => { if (this.busy) { this.typingEl?.remove(); this.busy = false; this.addMsg('sys', '⚠️ 응답이 없어요. 다시 말해보세요'); } }, 35000);
    this.game.talk(c, text, opts);
  }

  onTalkReply(m) {
    const c = this.chatC;
    if (!c || m.npc !== c.id) return;
    clearTimeout(this.talkTimeout);
    this.typingEl?.remove();
    this.busy = false;
    if (m.busy) {
      this.addMsg('sys', m.reason === 'grudge' ? `😠 ${c.name}은(는) 당신에게 화가 나서 말하기 싫대요` : m.reason ? `😱 ${c.name}은(는) 지금 대화할 상황이 아니에요` : `💬 ${c.name}은(는) 다른 플레이어와 대화 중이에요`);
      setTimeout(() => { if (this.chatC === c) this.closeChat(false); }, 1500);
      return;
    }
    const emo = EMOTE[m.emotion] || '';
    this.addMsg('npc', `${m.reply} ${m.delta > 0 ? '💗' : m.delta < 0 ? '💔' : ''}`.trim());
    c.chatLog.push({ role: 'assistant', content: m.reply });
    if (m.error) this.addMsg('sys', '⚠️ LLM 오류로 기본 대사를 사용했어요: ' + m.error.slice(0, 80));
    this.game.onTalkResult(c, m);
    if (m.mood !== undefined) c.mood = m.mood;
    if (m.insulted) this.addMsg('sys', `😠 ${c.name}의 기분이 크게 상했어요 (기분 ${moodLabel(c.mood)})`);
    else if (m.moodDelta >= 4) this.addMsg('sys', `😊 ${c.name}의 기분이 좋아졌어요`);
    if (m.reporting) this.addMsg('sys', `🚔 ${c.name}이(가) 경찰에 신고하러 가려고 해요!`);
    this.refreshAffinity();
    this.renderProfile(c);
    $('chat-sub').textContent = `${c.age}세 · ${c.gender} · ${c.job.name} · ${c.personality.name} · 기분 ${moodEmoji(c.mood)} ${emo}`;
    if (m.action === 'end') {
      this.addMsg('sys', `${c.name}이(가) 대화를 끝내고 싶어해요.`);
      setTimeout(() => { if (this.chatC === c) this.closeChat(); }, 2200);
    }
  }

  sendChat() {
    const t = $('chat-input').value.trim();
    if (!t || this.busy) return;
    $('chat-input').value = '';
    this.addMsg('me', t);
    this.chatC.chatLog.push({ role: 'user', content: t });
    this.chatTalked = true;
    this.request(t);
  }

  giveGift(u) {
    const c = this.chatC;
    const it = this.game.inv.find(u);
    if (!it || !c || this.busy) return;
    const d = itemDef(it.id);
    const item = `${d.name}(₩${d.price})`;
    this.game.inv.consume(u);
    this.refreshGifts();
    this.addMsg('sys', `🎁 ${c.name}에게 ${item}을(를) 선물했어요`);
    this.chatTalked = true;
    this.request(null, { note: `(플레이어가 ${item}을(를) 선물로 줬다. ${c.name}답게 반응해.)` });
  }

  closeChat() {
    const c = this.chatC;
    $('chat').classList.add('hidden');
    $('chat-input').blur();
    this.chatC = null;
    this.busy = false;
    this.typingEl?.remove();
    if (this.prevDist) { this.game.player.cam.dist = this.prevDist; this.prevDist = null; }
    if (c) this.game.endTalk(c);
  }

  // ---------------- 플레이어 채팅 ----------------
  focusPlayerChat() {
    $('pchat').classList.add('open');
    $('pchat-input').focus();
  }
  setupPlayerChat() {
    const inp = $('pchat-input');
    inp.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && !e.isComposing) {
        const t = inp.value.trim();
        if (t) this.game.say(t);
        inp.value = '';
        inp.blur();
      } else if (e.key === 'Escape') inp.blur();
    });
    inp.addEventListener('blur', () => $('pchat').classList.remove('open'));
  }
  addChatLine(kind, text, name) {
    const el = document.createElement('div');
    el.className = 'pline ' + kind;
    el.innerHTML = name ? `<b>${escapeHtml(name)}</b> ${escapeHtml(text)}` : escapeHtml(text);
    $('pchat-log').appendChild(el);
    while ($('pchat-log').children.length > 30) $('pchat-log').firstChild.remove();
    $('pchat-log').scrollTop = 1e9;
    el.dataset.t = Date.now();
  }

  // ---------------- 잠 ----------------
  showSleep(on) {
    $('sleep').classList.toggle('hidden', !on);
    if (on) this.updateSleep();
  }
  updateSleep() {
    const g = this.game;
    if (!g.sleeping) return;
    const { n, total } = g.sleepers;
    const h = g.hour();
    const night = h >= 20 || h < 6;
    $('sleep-text').innerHTML = total <= 1
      ? (night ? '😴 쿨쿨... 곧 아침이 와요' : '😴 낮잠 자는 중... (밤 8시 이후에 자면 아침으로 넘어가요)')
      : `😴 자는 중... <b>${n}/${total}명</b>이 잠들었어요<br><small>${night ? '모두 잠들면 아침이 와요' : '밤 8시 이후에 모두 자면 아침으로 넘어가요'}</small>`;
  }

  // 서버가 재시작(배포)되면 다시 살아날 때까지 기다렸다가 자동으로 재접속
  disconnected() {
    $('fade').classList.remove('hidden');
    $('fade').style.opacity = '1';
    $('fade-text').innerHTML = '📡 서버와 연결이 끊겼어요<br><small>서버가 돌아오면 자동으로 다시 접속해요...</small>';
    $('fade-bar').style.display = 'none';
    try { sessionStorage.setItem('roachcity.resume', '1'); } catch { /* 무시 */ }
    this.game.net.send({ t: 'stats', stats: this.game.stats });
    const poll = async () => {
      try { const r = await fetch('/healthz', { cache: 'no-store' }); if (r.ok) { location.reload(); return; } } catch { /* 아직 */ }
      setTimeout(poll, 2000);
    };
    setTimeout(poll, 1500);
  }

  // ---------------- 휴대폰 ----------------
  setupPhone() {
    $('phone-close').onclick = () => this.closePhone();
    document.querySelectorAll('#phone-tabs button[data-tab]').forEach((b) => {
      b.onclick = () => this.openPhone(b.dataset.tab);
    });
    $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') this.closeModal(); });
    $('phone').addEventListener('click', (e) => { if (e.target.id === 'phone') this.closePhone(); });
  }

  togglePhone(tab) {
    if (!$('phone').classList.contains('hidden') && (!tab || tab === this.phoneTab)) this.closePhone();
    else this.openPhone(tab || this.phoneTab);
  }
  closePhone() { $('phone').classList.add('hidden'); }

  openPhone(tab) {
    if (this.chatOpen()) this.closeChat();
    this.game.releaseMouse();
    this.phoneTab = tab;
    $('phone').classList.remove('hidden');
    document.querySelectorAll('#phone-tabs button[data-tab]').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
    const body = $('phone-body');
    const g = this.game;
    if (tab === 'citizens') {
      body.innerHTML = `<input class="search" id="cit-search" placeholder="이름, 직업, 성격으로 검색... (총 ${g.sim.citizens.length}명)" /><div class="grid" id="cit-grid"></div>`;
      const render = (q) => {
        const list = g.sim.citizens.filter((c) => !q || `${c.name}${c.job.name}${c.personality.name}${c.socialRole}${c.home.name}`.includes(q));
        list.sort((a, b) => b.affinity - a.affinity);
        $('cit-grid').innerHTML = list.map((c) => `
          <div class="cit" data-id="${c.id}">
            <div class="av" style="background:${c.color}">🪳</div>
            <div><div class="nm">${escapeHtml(c.name)} ${c.affinity >= 65 ? '💗' : ''}</div>
            <div class="sb">${c.age}세 ${c.gender} · ${escapeHtml(c.job.name)}<br>${escapeHtml(c.personality.name)} · 친밀도 ${Math.round(c.affinity)}</div></div>
          </div>`).join('');
        $('cit-grid').querySelectorAll('.cit').forEach((el) => { el.onclick = () => this.showCitizen(g.sim.citizens[+el.dataset.id]); });
      };
      render('');
      $('cit-search').oninput = (e) => render(e.target.value.trim());
      $('cit-search').addEventListener('keydown', (e) => e.stopPropagation());
    } else if (tab === 'me') {
      const S = g.stats, P = g.profile;
      const job = g.playerJob();
      const friends = [...g.sim.citizens].sort((a, b) => b.affinity - a.affinity).slice(0, 5);
      body.innerHTML = `<div class="profile-big">
        <h3>🪳 ${escapeHtml(P.name)}</h3>
        ${P.age}세 · ${escapeHtml(P.gender)} · ${escapeHtml(P.personality)}<br>
        💰 소지금 <b>₩${Math.floor(S.money)}</b><br>
        💼 직업 <b>${job ? `${escapeHtml(job.name)} @ ${escapeHtml(g.workBuilding().name)} (시급 ₩${job.wage})` : '무직 — 시청에서 일자리를 구해보세요'}</b><br>
        🏠 집 <b>${S.homeId != null ? escapeHtml(g.city.buildings[S.homeId].name) : '없음 (호텔 생활 중 · 부동산에서 구매)'}</b><br>
        🎒 가방 ${S.items.length}종 (I키로 열기) · ✨ 매력 ${g.charm()} · 🥋 무공 ${S.skills.length ? S.skills.map((k) => ({ jump2: '2단 점프', jump3: '3단 점프', dash: '대쉬' }[k])).join(', ') : '없음'}<br>
        💗 친한 이웃 ${friends.map((c) => `${escapeHtml(c.name)}(${Math.round(c.affinity)})`).join(', ')}
      </div>
      <div style="margin-top:12px">
        <button class="btn" id="go-home">🏠 집 위치 표시</button>
        ${job ? '<button class="btn" id="go-work">💼 직장 위치 표시</button><button class="btn ghost" id="quit-job">그만두기</button>' : '<button class="btn" id="go-hall">🏛️ 시청 위치 표시</button>'}
      </div>
      <div class="profile-big" style="margin-top:14px"><h3>👥 접속 중인 플레이어</h3>
        🎮 ${escapeHtml(P.name)} (나)${[...g.players.list.values()].map((o) => `<br>🎮 ${escapeHtml(o.name)} · ${escapeHtml(o.profile.jobName || '무직')} · ${o.loc >= 0 ? escapeHtml(g.city.buildings[o.loc].name) : '거리'}`).join('')}
      </div>`;
      $('go-home').onclick = () => this.setWaypoint(g.homeBuilding());
      if ($('go-work')) $('go-work').onclick = () => this.setWaypoint(g.workBuilding());
      if ($('go-hall')) $('go-hall').onclick = () => this.setWaypoint(g.city.byType.cityhall[0]);
      if ($('quit-job')) $('quit-job').onclick = () => { g.quitJob(); this.openPhone('me'); };
    } else if (tab === 'map') {
      body.innerHTML = `<canvas id="bigmap" width="1024" height="1024"></canvas><div style="text-align:center;font-size:13px;margin-top:6px;color:var(--ink-soft)">건물을 클릭하면 위치가 표시돼요 · 🏡 우리 집 · 💼 직장 · 🔴 나</div>`;
      const cv = $('bigmap');
      const ctx = cv.getContext('2d');
      ctx.drawImage(g.mapImage, 0, 0);
      const u = 1024 / CITY;
      const mark = (txt, x, z, size = 28) => { ctx.font = `${size}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, (x + HALF) * u, (z + HALF) * u); };
      const home = g.homeBuilding();
      mark('🏡', home.x, home.z, 30);
      if (g.workBuilding()) mark('💼', g.workBuilding().x, g.workBuilding().z, 30);
      const pp = g.mode === 'interior' ? g.interior.building.door : g.player.pos;
      ctx.fillStyle = '#ff1744'; ctx.beginPath(); ctx.arc((pp.x + HALF) * u, (pp.z + HALF) * u, 12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke();
      cv.onclick = (e) => {
        const r = cv.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * CITY - HALF, z = ((e.clientY - r.top) / r.height) * CITY - HALF;
        let best = null, bd = 18;
        for (const b of g.city.buildings) { const d = Math.hypot(b.x - x, b.z - z); if (d < bd) { bd = d; best = b; } }
        if (best) this.setWaypoint(best);
      };
    } else if (tab === 'settings') {
      const st = this.serverStatus || {};
      body.innerHTML = `
        <div class="set-row"><b>🤖 서버 LLM</b><span>${g.llm ? `${escapeHtml(st.model || 'gpt-4o-mini')} 사용 중 ✅ (키는 서버에만 있어요)` : '키 없음 — 기본 대사 사용 중 💤'}</span></div>
        <div class="set-row"><b>⏱️ 시간 속도</b><span>현실 1초 = 게임 ${g.timeSpeed}분 (서버 설정, 모든 플레이어 공통)</span></div>
        <div class="set-row"><label><input type="checkbox" id="set-shadow" ${settings.shadows ? 'checked' : ''}/> 그림자 (끄면 더 빨라요)</label></div>
        <button class="btn" id="set-save">저장</button>
        <button class="btn ghost" id="set-reset">🗑️ 이 브라우저의 캐릭터 연결 끊기 (새 캐릭터)</button>`;
      $('set-save').onclick = () => {
        settings.shadows = $('set-shadow').checked;
        saveSettings();
        g.applySettings();
        this.toast('⚙️ 설정을 저장했어요');
      };
      $('set-reset').onclick = () => { if (confirm('이 브라우저에 저장된 캐릭터 연결을 지우고 새로 시작할까요? (서버의 이웃 기억은 남아요)')) g.resetSave(); };
    } else if (tab === 'help') {
      body.innerHTML = `<div class="profile-big">
        <h3>🪳 바퀴시티 생활 가이드</h3>
        <b>조작</b>: WASD 이동 · Shift 달리기 · Space 점프(배우면 2·3단) · C 대쉬 · 마우스(클릭 후) 시점 · 클릭 공격/먹기 · 1~0 핫바 · E 대화/입장/줍기 · F 차 타기/빼앗기 · Q 버리기 · I 가방 · M 지도 · R 자동 이동 · Enter 채팅 · Tab 휴대폰 · Esc 닫기<br>
        <b>생활</b>: 배고픔·에너지·재미·사교·청결과 체력을 관리하세요. NPC들도 똑같은 욕구가 있어서 배고프면 밥을 먹으러 가고, 다치면 병원에 가요.<br>
        <b>직업</b>: 시청 🏛️ 일자리 게시판에서 직업을 골라 직장에서 일하세요.<br>
        <b>집</b>: 처음엔 호텔에서 지내요. 부동산 🏘️ 에서 집을 사면 그 집에서 자고 부활해요.<br>
        <b>무기 상점</b>: 관우네 병기점(삼국지), 바퀴 택티컬(밀리터리·전차·헬기), 은하 무기상(광선검·블래스터). 보석상 💎 에서 보석을 사서 무기와 방어구에 박을 수 있어요.<br>
        <b>치장</b>: 모자 가게·안경원·옷가게의 아이템을 장착하면 매력이 올라가요. 매력 ${CLUB_CHARM} 이상이면 클럽 🪩 에 들어갈 수 있어요.<br>
        <b>무릉도장</b> 🥋: 점프맵을 통과하면 2단 점프, 고급 점프맵은 3단 점프, 용암 징검다리는 대쉬를 배워요.<br>
        <b>범죄</b>: 시민을 공격하면 수배 별이 올라가요. 별 1~3개는 경찰, 4~5개는 군대와 전차·헬기가 출동해요. 죽으면 집에서 부활하고 수배가 풀려요.<br>
        <b>멀티플레이</b>: 같은 서버의 동료들과 같은 도시, 같은 시간, 같은 이웃을 공유해요. 밤에 모두 잠들면 아침이 와요.      </div>`;
    }
  }

  setWaypoint(b) {
    const g = this.game;
    g.setWaypoint(b);
    this.toast(`📍 ${b.name} 위치를 표시했어요`);
    this.closePhone();
  }

  showCitizen(c) {
    const g = this.game;
    const rels = [...c.relations.entries()].map(([id, r]) => `${escapeHtml(g.sim.citizens[id].name)}(${r.label})`).join(', ');
    const where = c.location ? c.location : null;
    $('phone-body').innerHTML = `<div class="profile-big">
      <div style="display:flex;gap:14px;align-items:center"><div class="av" style="width:70px;height:70px;border-radius:50%;background:${c.color};display:grid;place-items:center;font-size:40px">🪳</div>
      <div><h3>${escapeHtml(c.name)} ${c.affinity >= 65 ? '💗' : ''}</h3>${c.age}세 · ${c.gender} · 친밀도 ${Math.round(c.affinity)}/100</div></div>
      <b>직업</b> ${escapeHtml(c.job.name)} — ${escapeHtml(c.job.duty)} ${c.work ? `(${escapeHtml(c.work.name)})` : ''}<br>
      ${c.shift ? `<b>근무시간</b> ${fmtH(c.shift[0])} ~ ${fmtH(c.shift[1])}<br>` : ''}
      <b>성격</b> ${escapeHtml(c.personality.name)} — ${escapeHtml(c.personality.desc)}<br>
      <b>가족 내 역할</b> ${escapeHtml(c.familyText)} · <b>동네 역할</b> ${escapeHtml(c.socialRole)}<br>
      <b>집</b> ${escapeHtml(c.home.name)}<br>
      <b>취미</b> ${escapeHtml(c.hobby)} · <b>고민</b> ${escapeHtml(c.worry)} · <b>꿈</b> ${escapeHtml(c.dream)}<br>
      <b>지금</b> ${escapeHtml(c.activityText())}<br>
      <b>관계</b> ${rels || '-'}<br>${needBars(c)}
      <b>나에 대한 기억</b> ${c.memories.length ? c.memories.map(escapeHtml).join(' / ') : '아직 없음'}
      </div>
      <button class="btn" id="cit-find">📍 위치 표시</button> <button class="btn ghost" id="cit-back">← 목록</button>`;
    $('cit-back').onclick = () => this.openPhone('citizens');
    $('cit-find').onclick = () => {
      if (where) this.setWaypoint(where);
      else { g.waypoint = { pos: c.pos.clone(), label: c.name }; this.toast(`📍 ${c.name}의 현재 위치를 표시했어요`); this.closePhone(); }
    };
  }


  // ---------------- 핫바 & 가방 ----------------
  renderHotbar() {
    const g = this.game;
    if (!g.inv) return;
    const S = g.stats;
    const el = $('hotbar');
    el.innerHTML = S.hotbar.map((u, i) => {
      const it = u ? g.inv.find(u) : null;
      const d = it ? itemDef(it.id) : null;
      return `<div class="slot${i === S.sel ? ' sel' : ''}" data-i="${i}"><span class="num">${(i + 1) % 10}</span>${d ? `<span class="ic">${d.emoji}</span>${(it.n || 1) > 1 ? `<span class="cnt">${it.n}</span>` : ''}${it.gems?.length ? '<span class="gem">◆</span>' : ''}` : ''}</div>`;
    }).join('');
    el.querySelectorAll('.slot').forEach((s) => { s.onclick = () => g.inv.select(+s.dataset.i); });
    if (!$('modal').classList.contains('hidden') && this.modalKind === 'inv') this.renderInventory();
  }

  toggleInventory() {
    if (!$('modal').classList.contains('hidden') && this.modalKind === 'inv') { this.closeModal(); return; }
    this.openModal('<div id="inv-body"></div>', 'inv');
    this.renderInventory();
  }

  renderInventory() {
    const g = this.game, S = g.stats, inv = g.inv;
    const t = inv.totals();
    const statLine = (d, it) => {
      const parts = [];
      if (isWeapon(d)) { const w = weaponStats(it.id, it.gems || []); parts.push(`공격 ${Math.round(w.dmg)}${d.pellets ? `×${d.pellets}` : ''}`, `사거리 ${Math.round(w.range)}`); }
      if (d.def) parts.push(`방어 ${d.def}`);
      if (d.charm) parts.push(`매력 ${d.charm}`);
      if (d.sockets) parts.push(`보석 ${(it.gems || []).length}/${d.sockets}${(it.gems || []).length ? ' ' + it.gems.map((x) => `<span style="color:${GEMS[x].color}">◆</span>`).join('') : ''}`);
      if (d.food) parts.push(`체력 +${d.heal || 0}`);
      return parts.join(' · ');
    };
    const slotsHtml = Object.entries(SLOTS).map(([k, nm]) => {
      const it = S.equip[k] ? inv.find(S.equip[k]) : null;
      const d = it ? itemDef(it.id) : null;
      return `<div class="eq">${nm}<b>${d ? `${d.emoji} ${escapeHtml(d.name)}` : '—'}</b></div>`;
    }).join('');
    const items = S.items.map((it) => {
      const d = itemDef(it.id);
      const hb = S.hotbar.indexOf(it.uid);
      const eq = inv.isEquipped(it.uid);
      return `<div class="item">
        <div class="ic">${d.emoji}</div>
        <div class="info"><b>${escapeHtml(d.name)}${(it.n || 1) > 1 ? ` x${it.n}` : ''}${eq ? ' <span class="badge">장착</span>' : ''}${hb >= 0 ? ` <span class="badge">${(hb + 1) % 10}번</span>` : ''}</b><small>${statLine(d, it)}</small></div>
        <div class="acts">
          ${d.slot ? `<button class="btn mini" data-eq="${it.uid}">${eq ? '해제' : '장착'}</button>` : ''}
          ${isWeapon(d) || ['food', 'doll'].includes(d.cat) ? `<select class="mini" data-hb="${it.uid}"><option value="">핫바</option>${[...Array(10)].map((_, i) => `<option value="${i}" ${hb === i ? 'selected' : ''}>${(i + 1) % 10}번</option>`).join('')}</select>` : ''}
          <button class="btn mini ghost" data-drop="${it.uid}">버리기</button>
        </div></div>`;
    }).join('') || '<div style="padding:20px;text-align:center;color:var(--ink-soft)">가방이 비어 있어요. 상점에서 물건을 사보세요!</div>';
    $('inv-body').innerHTML = `<h3 class="mh">🎒 가방 <small>💰 ₩${Math.floor(S.money)} · 🛡️ 방어력 ${t.def} · ✨ 매력 ${t.charm} · ❤️ 체력 ${Math.round(g.hp)}/${g.maxHp}</small></h3>
      <div class="eqrow">${slotsHtml}</div>
      <div class="skills">🥋 무공: ${S.skills.length ? S.skills.map((k) => ({ jump2: '2단 점프', jump3: '3단 점프', dash: '대쉬(C)' }[k])).join(', ') : '없음 (무릉도장에서 수련)'}</div>
      <div class="itemlist">${items}</div>
      <div style="margin-top:10px"><button class="btn ghost" id="inv-close">닫기 (I)</button></div>`;
    $('inv-close').onclick = () => this.closeModal();
    $('inv-body').querySelectorAll('[data-eq]').forEach((b) => { b.onclick = () => { inv.equip(b.dataset.eq); this.renderInventory(); }; });
    $('inv-body').querySelectorAll('[data-hb]').forEach((s) => { s.onchange = () => { if (s.value !== '') inv.setHotbar(+s.value, s.dataset.hb); }; s.addEventListener('keydown', (e) => e.stopPropagation()); });
    $('inv-body').querySelectorAll('[data-drop]').forEach((b) => { b.onclick = async () => { await g.dropItem(b.dataset.drop); if (this.modalKind === 'inv' && !$('modal').classList.contains('hidden')) this.renderInventory(); }; });
  }

  // ---------------- 상점 ----------------
  openShop(type) {
    const g = this.game;
    const info = SHOPS[type] || { title: '상점', subtitle: '' };
    const ids = shopItems(type);
    const desc = (id) => {
      const d = ITEMS[id];
      const p = [];
      if (d.cat === 'vehicle') p.push(d.vehicle === 'tank' ? '주포 발사 · 체력 1500' : '비행 · 미사일 · 체력 700');
      if (isWeapon(d)) p.push(`공격 ${d.dmg}${d.pellets ? `×${d.pellets}` : ''}`, `속도 ${(1 / d.rate).toFixed(1)}/초`, `사거리 ${d.range}`, d.radius ? `폭발 반경 ${d.radius}` : '', d.auto ? '연사' : '');
      if (d.def) p.push(`방어 ${d.def}`);
      if (d.charm) p.push(`매력 +${d.charm}`);
      if (d.sockets) p.push(`보석칸 ${d.sockets}`);
      if (d.gem) p.push(`무기: ${GEMS[d.gem].weapon} / 방어구: ${GEMS[d.gem].armor}`);
      if (d.food) p.push(Object.entries(d.food).map(([k, v]) => `${{ hunger: '배고픔', energy: '에너지', fun: '재미' }[k]} +${v}`).join(' '), d.heal ? `체력 +${d.heal}` : '');
      if (d.stack && d.cat === 'throw') p.push('3개 묶음');
      return p.filter(Boolean).join(' · ');
    };
    const html = `<h3 class="mh">${escapeHtml(info.title)} <small>${escapeHtml(info.subtitle)}</small></h3>
      <div class="money-line">💰 소지금 <b id="shop-money">₩${Math.floor(g.stats.money)}</b></div>
      <div class="shop-grid">${ids.map((id) => {
        const d = ITEMS[id];
        return `<div class="shop-item"><div class="ic">${d.emoji}</div><b>${escapeHtml(d.name)}</b><small>${desc(id)}</small><button class="btn mini" data-buy="${id}">₩${d.price.toLocaleString()}</button></div>`;
      }).join('')}</div>
      <div style="margin-top:12px"><button class="btn ghost" id="shop-close">닫기</button></div>`;
    this.openModal(html, 'shop');
    $('shop-close').onclick = () => this.closeModal();
    $('modal-inner').querySelectorAll('[data-buy]').forEach((b) => {
      const d = ITEMS[b.dataset.buy];
      if (d.price > g.stats.money) b.classList.add('ghost');
      b.onclick = async () => { const ok = await g.buy(b.dataset.buy); if (ok && $('shop-money')) $('shop-money').textContent = `₩${Math.floor(g.stats.money)}`; };
    });
  }

  // ---------------- 인챈트 ----------------
  openEnchant() {
    const g = this.game, inv = g.inv;
    const targets = g.stats.items.filter((it) => (itemDef(it.id).sockets || 0) > (it.gems || []).length);
    const gems = g.stats.items.filter((it) => itemDef(it.id).cat === 'gem');
    let selT = targets[0]?.uid, selG = gems[0]?.uid;
    const render = () => {
      $('modal-inner').innerHTML = `<h3 class="mh">✨ 보석 인챈트 <small>비용 ₩${ENCHANT_FEE} · 한 번 박은 보석은 뺄 수 없어요</small></h3>
        <div class="ench">
          <div><b>1. 무기 / 방어구</b>${targets.map((it) => { const d = itemDef(it.id); return `<div class="pick${it.uid === selT ? ' on' : ''}" data-t="${it.uid}">${d.emoji} ${escapeHtml(d.name)} <small>${(it.gems || []).map((x) => `<span style="color:${GEMS[x].color}">◆</span>`).join('')} ${(it.gems || []).length}/${d.sockets}</small></div>`; }).join('') || '<small>보석 칸이 남은 장비가 없어요</small>'}</div>
          <div><b>2. 보석</b>${gems.map((it) => { const d = itemDef(it.id); const G2 = GEMS[d.gem]; return `<div class="pick${it.uid === selG ? ' on' : ''}" data-g="${it.uid}">${d.emoji} ${escapeHtml(d.name)} x${it.n || 1}<small>무기: ${G2.weapon}<br>방어구: ${G2.armor}</small></div>`; }).join('') || '<small>보석이 없어요. 보석을 먼저 사세요</small>'}</div>
        </div>
        <div style="margin-top:12px"><button class="btn" id="ench-go" ${selT && selG ? '' : 'disabled'}>💎 박기 (₩${ENCHANT_FEE})</button> <button class="btn ghost" id="ench-close">닫기</button></div>`;
      $('modal-inner').querySelectorAll('[data-t]').forEach((e) => { e.onclick = () => { selT = e.dataset.t; render(); }; });
      $('modal-inner').querySelectorAll('[data-g]').forEach((e) => { e.onclick = () => { selG = e.dataset.g; render(); }; });
      $('ench-close').onclick = () => this.closeModal();
      $('ench-go').onclick = () => { g.enchant(selT, selG); this.openEnchant(); };
    };
    this.openModal('', 'enchant');
    render();
    void inv;
  }

  // ---------------- 부동산 ----------------
  openHouses() {
    const g = this.game;
    const owned = new Set(Object.keys(g.homes || {}).map(Number));
    const list = g.city.buildings.filter((b) => forSale(b) && !owned.has(b.id)).sort((a, b) => housePrice(b) - housePrice(a));
    const html = `<h3 class="mh">🏘️ 틈새 부동산 <small>집을 사면 그 집에서 부활하고, 잠자고, 씻을 수 있어요</small></h3>
      <div class="money-line">💰 소지금 <b>₩${Math.floor(g.stats.money)}</b>${g.stats.homeId != null ? ` · 현재 집: ${escapeHtml(g.city.buildings[g.stats.homeId].name)}` : ' · 현재 집 없음 (호텔에서 부활)'}</div>
      <div class="itemlist">${list.map((b) => `<div class="item"><div class="ic">🏠</div><div class="info"><b>${b.floors}층 주택 · ${{ 0: '북', 1: '남' }[b.dir === 1 ? 1 : 0]}향</b><small>도심까지 ${Math.round(Math.hypot(b.x, b.z))}m · ${Math.round(b.w * b.d)}㎡</small></div>
        <div class="acts"><button class="btn mini ghost" data-see="${b.id}">위치</button><button class="btn mini" data-house="${b.id}">₩${housePrice(b).toLocaleString()} 구매</button></div></div>`).join('') || '<div style="padding:16px">지금은 매물이 없어요</div>'}</div>
      <div style="margin-top:12px"><button class="btn ghost" id="house-close">닫기</button></div>`;
    this.openModal(html, 'house');
    $('house-close').onclick = () => this.closeModal();
    $('modal-inner').querySelectorAll('[data-see]').forEach((b) => { b.onclick = () => { g.setWaypoint(g.city.buildings[+b.dataset.see]); this.toast('📍 지도에 표시했어요'); }; });
    $('modal-inner').querySelectorAll('[data-house]').forEach((b) => { b.onclick = () => { g.buyHouse(g.city.buildings[+b.dataset.house]); this.closeModal(); }; });
  }

  // ---------------- 월드맵 ----------------
  openWorldMap() {
    const g = this.game;
    this.openModal(`<h3 class="mh">🗺️ 바퀴시티 지도 <small>건물이나 길을 클릭하면 목적지가 돼요</small></h3>
      <canvas id="worldmap" width="1024" height="1024"></canvas>
      <div id="wm-info" class="money-line"></div>
      <div><button class="btn" id="wm-walk">🚶 자동으로 걸어가기 (R)</button> <button class="btn ghost" id="wm-clear">목적지 지우기</button> <button class="btn ghost" id="wm-close">닫기 (M)</button></div>`, 'map');
    $('modal-inner').classList.add('wide');
    const cv = $('worldmap');
    const draw = () => {
      const ctx = cv.getContext('2d');
      ctx.drawImage(g.mapImage, 0, 0);
      const u = 1024 / CITY;
      const X = (x) => (x + HALF) * u;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = 'bold 13px sans-serif';
      for (const b of g.city.buildings) {
        if (b.type === 'house' || b.type === 'apartment') continue;
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        const w = ctx.measureText(b.name).width + 8;
        ctx.fillRect(X(b.x) - w / 2, X(b.z) + 9, w, 16);
        ctx.fillStyle = '#4a3428'; ctx.fillText(b.name, X(b.x), X(b.z) + 17);
      }
      if (g.route?.length) {
        ctx.strokeStyle = '#2979ff'; ctx.lineWidth = 5; ctx.setLineDash([10, 6]);
        const from = g.mode === 'interior' ? g.interior.building.door : g.player.pos;
        ctx.beginPath(); ctx.moveTo(X(from.x), X(from.z));
        for (const r of g.route) ctx.lineTo(X(r.x), X(r.z));
        ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.font = '28px sans-serif';
      const home = g.homeBuilding();
      ctx.fillText(g.stats.homeId != null ? '🏡' : '🏨', X(home.x), X(home.z) - 10);
      if (g.workBuilding()) ctx.fillText('💼', X(g.workBuilding().x), X(g.workBuilding().z) - 10);
      if (g.waypoint) ctx.fillText('📍', X(g.waypoint.pos.x), X(g.waypoint.pos.z) - 14);
      for (const o of g.players.list.values()) { const op = o.loc >= 0 ? g.city.buildings[o.loc].door : o.pos; ctx.fillStyle = '#7c4dff'; ctx.beginPath(); ctx.arc(X(op.x), X(op.z), 9, 0, 7); ctx.fill(); ctx.fillStyle = '#4a3428'; ctx.font = 'bold 14px sans-serif'; ctx.fillText(o.name, X(op.x), X(op.z) - 16); ctx.font = '28px sans-serif'; }
      const pp = g.mode === 'interior' ? g.interior.building.door : g.player.pos;
      ctx.fillStyle = '#ff1744'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(X(pp.x), X(pp.z), 11, 0, 7); ctx.fill(); ctx.stroke();
      $('wm-info').innerHTML = g.waypoint ? `📍 목적지: <b>${escapeHtml(g.waypoint.label)}</b> · ${Math.round(g.waypoint.pos.distanceTo(pp))}m` : '목적지를 클릭하세요';
    };
    draw();
    cv.onclick = (e) => {
      const r = cv.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * CITY - HALF, z = ((e.clientY - r.top) / r.height) * CITY - HALF;
      let best = null, bd = 14;
      for (const b of g.city.buildings) { const d = Math.hypot(b.x - x, b.z - z); if (d < bd) { bd = d; best = b; } }
      if (best) g.setWaypoint(best); else g.setWaypoint(new THREE.Vector3(x, 0, z), '찍은 위치');
      draw();
    };
    $('wm-walk').onclick = () => { this.closeModal(); if (!g.autoWalk) g.toggleAutoWalk(); };
    $('wm-clear').onclick = () => { g.waypoint = null; g.route = null; g.autoWalk = false; draw(); };
    $('wm-close').onclick = () => this.closeModal();
  }

  // ---------------- 확인 창 ----------------
  confirm(html) {
    $('confirm-text').innerHTML = html;
    $('confirm').classList.remove('hidden');
    this.game.releaseMouse();
    return new Promise((res) => { this.confirmResolve = (v) => { $('confirm').classList.add('hidden'); this.confirmResolve = null; res(v); }; });
  }

  // ---------------- 전투 HUD ----------------
  hurtFlash(by) {
    const el = $('hurt');
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    if (by && Date.now() - (this.lastHurtMsg || 0) > 3000) { this.lastHurtMsg = Date.now(); this.addChatLine('sys', `💥 ${by}에게 공격받고 있어요!`); }
  }
  showDeath(by) {
    $('death').classList.toggle('hidden', by === null);
    if (by !== null) $('death-text').innerHTML = `💀 쓰러졌어요...${by ? `<br><small>${escapeHtml(by)}에게 당했어요</small>` : ''}<br><small>잠시 후 집에서 체력이 가득 찬 채로 부활해요</small>`;
  }
  courseHud(text) {
    $('course').classList.toggle('hidden', !text);
    if (text) $('course').textContent = '🥋 ' + text;
  }
  celebrate(title, sub) {
    const el = $('celebrate');
    el.innerHTML = `<div>${escapeHtml(title)}</div><small>${escapeHtml(sub)}</small>`;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 4000);
  }
  floatText(pos, text, color) {
    const v = pos.clone().project(this.game.camera);
    if (v.z > 1) return;
    const el = document.createElement('div');
    el.className = 'floatnum';
    el.style.color = color;
    el.textContent = text;
    el.style.left = `${(v.x * 0.5 + 0.5) * window.innerWidth}px`;
    el.style.top = `${(-v.y * 0.5 + 0.5) * window.innerHeight}px`;
    $('labels').appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  // ---------------- 모달 ----------------
  openModal(html, kind = 'misc') { this.game.releaseMouse(); this.modalKind = kind; $('modal-inner').classList.remove('wide'); $('modal-inner').innerHTML = html; $('modal').classList.remove('hidden'); }
  closeModal() { $('modal').classList.add('hidden'); }

  openJobBoard() {
    const g = this.game;
    const cur = g.playerJob();
    const groups = {};
    for (const j of JOBS) {
      if (j.max && g.sim.citizens.some((c) => c.job.id === j.id) && j.id === 'mayor') continue;
      (groups[j.building] ||= []).push(j);
    }
    const html = `<h3 style="font-family:Jua;margin:0 0 6px">📋 바퀴시티 일자리 게시판</h3>
      <div style="font-size:13px;color:var(--ink-soft)">${cur ? `현재 직업: <b>${escapeHtml(cur.name)}</b> · ` : ''}마음에 드는 일을 골라보세요! 시급은 4시간 근무 단위로 받아요.</div>
      ${Object.entries(groups).map(([t, js]) => `<div style="margin-top:12px;font-family:Jua">${BUILDING_TYPES[t].emoji} ${BUILDING_TYPES[t].name}</div>
        <div class="job-list">${js.map((j) => `<div class="job" data-id="${j.id}"><b>${escapeHtml(j.name)}</b>₩${j.wage}/시간<br><span style="color:var(--ink-soft)">${escapeHtml(j.duty)}</span></div>`).join('')}</div>`).join('')}
      <div style="margin-top:14px"><button class="btn ghost" id="job-close">닫기</button></div>`;
    this.openModal(html);
    $('job-close').onclick = () => this.closeModal();
    document.querySelectorAll('#modal .job').forEach((el) => {
      el.onclick = () => { g.takeJob(JOBS.find((j) => j.id === el.dataset.id)); this.closeModal(); };
    });
  }
}

function S_home(g) { return g.stats.homeId; }
function fmtH(h) { return `${Math.floor(h) % 24}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`; }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function needBars(c) {
  const mc = c.mood >= 62 ? '#69f0ae' : c.mood >= 42 ? '#ffd54f' : c.mood >= 25 ? '#ffab40' : '#ff5252';
  const rows = [[moodEmoji(c.mood), `기분 ${moodLabel(c.mood)}`, c.mood, mc], ['❤️', '체력', (c.hp / c.maxHp) * 100, '#ff5252'], ...NEEDS.map(([k, ic, nm, col]) => [ic, nm, c.needs[k], col])];
  return `<div class="npc-needs">${rows.map(([ic, nm, v, col]) => `<div class="need"><span>${ic}</span><span>${nm}</span><div class="bar"><div style="width:${Math.round(v)}%;background:${col}"></div></div></div>`).join('')}</div>`;
}
