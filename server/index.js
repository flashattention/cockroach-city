// 바퀴시티 멀티플레이 서버
//   - public/ 정적 파일 서빙
//   - /ws  WebSocket: 공유 세계 동기화
//   - 환경변수: PORT, GAME_PASSWORD, OPENAI_API_KEY, OPENAI_MODEL, OPENAI_BASE_URL, TIME_SPEED, DATA_DIR
import './env.js';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { World } from './world.js';
import { llmEnabled, MODEL } from './llm.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const PORT = Number(process.env.PORT) || 8000;
const PASSWORD = process.env.GAME_PASSWORD || '';
const TICK = 1 / 20;
const SNAP_EVERY = 2; // 10Hz

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

const world = new World({ dataDir: process.env.DATA_DIR || path.join(ROOT, 'data') });

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ llm: llmEnabled, model: MODEL, password: !!PASSWORD, players: world.players.size, multiplayer: true }));
    return;
  }
  if (url.pathname === '/healthz') { res.writeHead(200); res.end('ok'); return; }
  let file = path.normalize(path.join(PUBLIC, decodeURIComponent(url.pathname)));
  if (!file.startsWith(PUBLIC)) { res.writeHead(403); res.end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 });
wss.on('connection', (ws) => {
  let player = null;
  ws.on('message', (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (!player) {
      if (msg.t !== 'hello') return;
      if (PASSWORD && msg.password !== PASSWORD) {
        ws.send(JSON.stringify({ t: 'error', code: 'password', message: '비밀번호가 틀렸어요' }));
        ws.close();
        return;
      }
      player = world.join(ws, msg);
      return;
    }
    try { world.handle(player, msg); } catch (e) { console.error('메시지 처리 오류:', e); }
  });
  ws.on('close', () => { if (player) world.leave(player); });
  ws.on('error', () => {});
});

// 시뮬레이션 루프
let n = 0, last = performance.now(), acc = 0;
setInterval(() => {
  const now = performance.now();
  acc += Math.min(0.5, (now - last) / 1000);
  last = now;
  while (acc >= TICK) {
    acc -= TICK;
    try { world.tick(TICK); } catch (e) { console.error('틱 오류:', e); }
    if (++n % SNAP_EVERY === 0 && world.players.size) {
      const s = JSON.stringify(world.snapshot());
      for (const p of world.players.values()) if (p.ws.readyState === 1) p.ws.send(s);
    }
  }
}, 25);

// 주기적 저장
setInterval(() => { if (world.dirty) { world.save(); world.dirty = false; } }, 30000);
// 배포로 서버가 재시작될 때: 접속자에게 알리고 세계를 저장한 뒤 종료 (브라우저는 자동 재접속)
let stopping = false;
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    if (stopping) return;
    stopping = true;
    world.broadcast({ t: 'sys', text: '🔧 서버가 업데이트돼요! 잠시 후 자동으로 다시 접속해요' });
    try { world.save(); console.log('💾 세계를 저장했어요'); } catch (e) { console.error('저장 실패', e); }
    setTimeout(() => process.exit(0), 500);
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🪳 바퀴시티 서버: http://localhost:${PORT}`);
  console.log(`   LLM: ${llmEnabled ? `${MODEL} 사용` : '키 없음 (기본 대사)'} · 비밀번호: ${PASSWORD ? '설정됨' : '없음'}`);
});
