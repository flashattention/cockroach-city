// 서버와 브라우저가 똑같은 도시와 시민을 만들기 위한 공통 초기화
import { planCity } from './city.js';
import { Sim } from './citizens.js';

export const PLAYER_HOMES = 8; // 플레이어용으로 비워두는 주택 수

export function setupWorld(seed) {
  const buildings = planCity(seed);
  const houses = buildings.filter((b) => b.type === 'house');
  houses.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z) || a.id - b.id);
  const reserved = houses.slice(0, PLAYER_HOMES);
  for (const h of reserved) { h.name = '빈 집 (입주 대기)'; h.isPlayerHome = true; }
  const city = { buildings, byType: {} };
  for (const b of buildings) (city.byType[b.type] ||= []).push(b);
  const sim = new Sim(city, seed);
  sim.generate(reserved);
  return { buildings, city, sim, reserved };
}

// 집값: 도시 중심에 가까울수록 비싸다
export function housePrice(b) {
  const d = Math.hypot(b.x, b.z);
  return Math.max(1200, Math.round((3600 - d * 9) / 50) * 50);
}
export const forSale = (b) => b.type === 'house' && b.residents.length === 0;
