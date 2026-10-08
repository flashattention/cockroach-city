// 소리: 귀엽고 통통 튀는 배경음악 + 총 맞은 사람 비명 (파일 없이 Web Audio로 합성)
import { settings, saveSettings } from './settings.js';

let ctx = null, musicBus = null, sfxBus = null, noiseBuf = null;
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  const comp = ctx.createDynamicsCompressor();
  comp.connect(ctx.destination);
  musicBus = ctx.createGain(); musicBus.connect(comp);
  sfxBus = ctx.createGain(); sfxBus.connect(comp);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  applyVolumes();
  // 탭을 떠나면 멈췄다가 돌아오면 이어서
  document.addEventListener('visibilitychange', () => { if (document.hidden) ctx.suspend(); else ctx.resume(); });
  return ctx;
}

export function applyVolumes() {
  if (!ctx) return;
  musicBus.gain.value = settings.music ? 0.9 * settings.musicVol : 0;
  sfxBus.gain.value = settings.sfx ? settings.sfxVol : 0;
  if (settings.music) startMusic();
}

// 브라우저는 사용자가 한 번 누르거나 키를 쳐야 소리를 낼 수 있게 해 준다
export function unlockAudio() {
  if (!ensure()) return;
  if (ctx.state !== 'running') ctx.resume();
  if (settings.music) startMusic();
}

export function setMusic(on) { settings.music = !!on; saveSettings(); ensure(); applyVolumes(); }

// ---------------- 배경음악: C장조 132bpm, I–V–vi–IV, 8분음표 스타카토 ----------------
const BPM = 132, STEP = 60 / BPM / 2; // 8분음표
const _ = null;
const MELODY = [
  [76, 79, 84, 79, 76, _, 74, 76], [74, 79, 83, 79, 74, _, 71, 74],
  [72, 76, 81, 76, 72, _, 71, 72], [69, 72, 77, 81, 79, _, _, _],
  [79, 79, 81, 79, 76, _, 72, _], [74, 74, 76, 74, 71, _, 67, _],
  [69, 72, 77, 72, 74, 77, 83, 79], [84, _, 79, _, 72, _, _, _],
].flat();
// 마디별 화음 [근음, 단조?] (7마디는 반 마디씩 F → G)
const CHORDS = [[48], [43], [45, 1], [41], [48], [43], [41], [48]];
let playing = false, step = 0, nextT = 0, timer = null;

function startMusic() {
  if (playing || !ctx) return;
  playing = true; step = 0; nextT = ctx.currentTime + 0.1;
  timer = setInterval(schedule, 25);
}
function schedule() {
  if (!settings.music) { clearInterval(timer); playing = false; return; }
  if (nextT < ctx.currentTime - 0.2) nextT = ctx.currentTime + 0.05; // 멈췄다 돌아오면 박자를 다시 맞춘다
  while (nextT < ctx.currentTime + 0.15) { playStep(step, nextT); step = (step + 1) % MELODY.length; nextT += STEP; }
}
function playStep(i, t) {
  const bar = (i / 8) | 0, s = i % 8;
  let [root, minor] = CHORDS[bar];
  if (bar === 6 && s >= 4) { root = 43; minor = 0; }
  // 베이스: 근음 ↔ 옥타브 위를 오가며 통통
  tone(midi(root - 12 + (s % 2 ? 12 : 0)), t, STEP * 0.7, 'triangle', 0.32);
  // 화음: 엇박에 짧게 '짠'
  if (s % 2) for (const k of [0, minor ? 3 : 4, 7]) tone(midi(root + 12 + k), t, STEP * 0.35, 'square', 0.025);
  // 멜로디: 살짝 아래에서 미끄러져 올라가는 '뿅' + 한 옥타브 위 반짝이
  const n = MELODY[i];
  if (n) { tone(midi(n), t, STEP * 0.55, 'square', 0.06, 0.94); tone(midi(n + 12), t, STEP * 0.4, 'triangle', 0.025); }
  // 드럼: 킥(정박) · 스네어(2·4박) · 하이햇(엇박)
  if (s === 0 || s === 4) kick(t);
  if (s === 2 || s === 6) noise(t, 0.09, 'bandpass', 1800, 0.12);
  if (s % 2) noise(t, 0.03, 'highpass', 7000, 0.05);
}
function tone(f, t, dur, type, vol, slide = 1) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f * slide, t);
  if (slide !== 1) o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g).connect(musicBus);
  o.start(t); o.stop(t + dur + 0.02);
}
function kick(t) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  o.connect(g).connect(musicBus); o.start(t); o.stop(t + 0.16);
}
function noise(t, dur, ftype, freq, vol) {
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuf; f.type = ftype; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(musicBus); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.01);
}

// ---------------- 비명: 톱니파 성대음 → '아' 모음 공명(포먼트) 필터 ----------------
// seed(0~1)로 목소리 높이·길이가 달라진다. vol 0~1, pan -1(왼쪽)~1(오른쪽)
export function scream(vol = 1, pan = 0, seed = Math.random()) {
  if (!ctx || ctx.state !== 'running' || vol <= 0.01 || !settings.sfx) return;
  const t = ctx.currentTime, dur = 0.75 + seed * 0.5, base = 260 + seed * 260;
  const out = ctx.createGain();
  const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
  if (p) { p.pan.value = Math.max(-1, Math.min(1, pan)); out.connect(p).connect(sfxBus); } else out.connect(sfxBus);
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(0.9 * vol, t + 0.04);
  out.gain.setValueAtTime(0.9 * vol, t + dur * 0.6);
  out.gain.exponentialRampToValueAtTime(0.001, t + dur);
  // 성대: 음이 확 치솟았다가 떨어지며 떨린다
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(base, t);
  o.frequency.exponentialRampToValueAtTime(base * 1.7, t + 0.12);
  o.frequency.exponentialRampToValueAtTime(base * 1.45, t + dur * 0.6);
  o.frequency.exponentialRampToValueAtTime(base * 0.8, t + dur);
  const lfo = ctx.createOscillator(), lg = ctx.createGain();
  lfo.frequency.value = 7 + seed * 3; lg.gain.value = base * 0.05;
  lfo.connect(lg).connect(o.frequency);
  // 거친 목소리 (살짝 찌그러뜨림)
  const ws = ctx.createWaveShaper();
  const curve = new Float32Array(256);
  for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 2.5); }
  ws.curve = curve;
  o.connect(ws);
  // 숨소리
  const n = ctx.createBufferSource(), ng = ctx.createGain();
  n.buffer = noiseBuf; ng.gain.value = 0.12;
  n.connect(ng);
  // '아' 포먼트 (목소리가 높을수록 조금 위로)
  const shift = 1 + seed * 0.15;
  for (const [f, q, gain] of [[850, 5, 1], [1250, 7, 0.55], [2800, 9, 0.25]]) {
    const bp = ctx.createBiquadFilter(), bg = ctx.createGain();
    bp.type = 'bandpass'; bp.frequency.value = f * shift; bp.Q.value = q; bg.gain.value = gain;
    ws.connect(bp); ng.connect(bp); bp.connect(bg).connect(out);
  }
  for (const s of [o, lfo, n]) { s.start(t); s.stop(t + dur + 0.05); }
}
