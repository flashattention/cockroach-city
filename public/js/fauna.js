// 야생동물 데이터 (서버·브라우저 공용)
// region: 사는 곳, hostile: 플레이어를 보면 덤빈다, flee: 플레이어를 보면 도망, livestock: 목장 가축 (사냥 불가)
export const ANIMALS = {
  bear: { name: '곰', emoji: '🐻', hp: 260, speed: 3, run: 8.5, dmg: 24, aggro: 16, hostile: true, region: ['forest', 'mountain'], loot: [['bear_hide', 1, 1], ['bear_meat', 2, 1]], n: 12, xp: 70, r: 1.3, h: 1.8 },
  deer: { name: '사슴', emoji: '🦌', hp: 70, speed: 2.5, run: 11, flee: 22, region: ['forest', 'meadow', 'valley'], loot: [['deer_meat', 2, 1], ['deer_trophy', 1, 0.6]], n: 22, xp: 25, r: 0.9, h: 1.8 },
  wolf: { name: '늑대', emoji: '🐺', hp: 110, speed: 3.5, run: 10, dmg: 12, aggro: 20, hostile: true, region: ['forest', 'mountain'], loot: [['wolf_pelt', 1, 1]], n: 10, xp: 40, r: 0.8, h: 1.1 },
  boar: { name: '멧돼지', emoji: '🐗', hp: 130, speed: 2.5, run: 9, dmg: 15, aggro: 8, hostile: true, region: ['forest', 'jungle', 'meadow'], loot: [['boar_meat', 2, 1]], n: 12, xp: 30, r: 0.9, h: 1.0 },
  rabbit: { name: '토끼', emoji: '🐇', hp: 20, speed: 2, run: 12, flee: 14, region: ['meadow', 'forest', 'island'], loot: [['rabbit_fur', 1, 1]], n: 18, xp: 8, r: 0.4, h: 0.6 },
  croc: { name: '악어', emoji: '🐊', hp: 240, speed: 1.6, run: 7.5, dmg: 28, aggro: 11, hostile: true, swim: true, region: ['swamp', 'amazon'], loot: [['croc_skin', 1, 1], ['croc_meat', 1, 1]], n: 16, xp: 65, r: 1.2, h: 0.8 },
  tiger: { name: '호랑이', emoji: '🐯', hp: 300, speed: 3.2, run: 12, dmg: 30, aggro: 24, hostile: true, region: ['jungle'], loot: [['tiger_pelt', 1, 1], ['tiger_meat', 1, 0.6]], n: 9, xp: 100, r: 1.2, h: 1.5 },
  anaconda: { name: '아나콘다', emoji: '🐍', hp: 280, speed: 1.8, run: 6, dmg: 26, aggro: 12, hostile: true, swim: true, region: ['amazon'], loot: [['snake_skin', 1, 1]], n: 9, xp: 90, r: 1.1, h: 0.6 },
  jaguar: { name: '재규어', emoji: '🐆', hp: 220, speed: 3.5, run: 13, dmg: 24, aggro: 22, hostile: true, region: ['amazon'], loot: [['jaguar_pelt', 1, 1]], n: 9, xp: 90, r: 1.0, h: 1.3 },
  cow: { name: '젖소', emoji: '🐄', hp: 150, speed: 1.2, livestock: true, pen: [882, -358, 978, -62], n: 10, r: 1.2, h: 1.6 },
  sheep: { name: '양', emoji: '🐑', hp: 80, speed: 1.3, livestock: true, pen: [1022, -358, 1118, -102], n: 12, r: 0.8, h: 1.1 },
  horse: { name: '말', emoji: '🐎', hp: 160, speed: 2.2, livestock: true, pen: [882, -358, 978, -62], n: 6, r: 1.1, h: 2.0 },
};
export const ANIMAL_KINDS = Object.keys(ANIMALS);
