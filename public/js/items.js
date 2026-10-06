// 아이템 데이터베이스 (서버와 브라우저 공용)
// cat: melee | gun | throw | launcher | vehicle | head | face | body | acc | food | doll | gift | gem
// slot: 장착 부위 (head/face/body/acc), vis: 캐릭터에 그려질 모습, held: 손에 드는 모습
// 무기: dmg 피해, rate 공격 간격(초), range 사거리, kind 공격 방식, sockets 보석 칸

export const ITEMS = {
  // ---------------- 맨손 ----------------
  fist: { name: '주먹', emoji: '👊', cat: 'melee', price: 0, dmg: 7, rate: 0.45, range: 1.7, kind: 'melee', held: null, sockets: 0 },

  // ---------------- 관우네 병기점 (삼국지) ----------------
  wood_sword: { name: '목검', emoji: '🪵', cat: 'melee', shop: 'armory_3k', price: 40, dmg: 12, rate: 0.5, range: 2.0, kind: 'melee', held: 'sword:#a1887f', sockets: 1 },
  iron_sword: { name: '철검', emoji: '🗡️', cat: 'melee', shop: 'armory_3k', price: 150, dmg: 20, rate: 0.5, range: 2.1, kind: 'melee', held: 'sword:#cfd8dc', sockets: 1 },
  twin_swords: { name: '쌍고검 (유비의 검)', emoji: '⚔️', cat: 'melee', shop: 'armory_3k', price: 1500, dmg: 28, rate: 0.32, range: 2.0, kind: 'melee', held: 'sword:#ffd54f', sockets: 2 },
  qinggang: { name: '청강검', emoji: '🗡️', cat: 'melee', shop: 'armory_3k', price: 900, dmg: 36, rate: 0.5, range: 2.2, kind: 'melee', held: 'sword:#90caf9', sockets: 2 },
  serpent_spear: { name: '장팔사모 (장비의 창)', emoji: '🔱', cat: 'melee', shop: 'armory_3k', price: 1800, dmg: 42, rate: 0.6, range: 3.0, kind: 'melee', held: 'spear:#b0bec5', sockets: 2 },
  halberd: { name: '방천화극 (여포의 극)', emoji: '🔱', cat: 'melee', shop: 'armory_3k', price: 3200, dmg: 52, rate: 0.62, range: 3.0, kind: 'melee', held: 'halberd:#ef5350', sockets: 3 },
  dragon_glaive: { name: '청룡언월도 (용월도)', emoji: '🐉', cat: 'melee', shop: 'armory_3k', price: 4500, dmg: 62, rate: 0.7, range: 3.1, kind: 'melee', held: 'glaive:#4caf50', sockets: 3 },
  yitian: { name: '의천검 (조조의 보검)', emoji: '✨', cat: 'melee', shop: 'armory_3k', price: 6000, dmg: 70, rate: 0.5, range: 2.4, kind: 'melee', held: 'sword:#e1bee7', sockets: 3 },
  bow: { name: '장궁', emoji: '🏹', cat: 'gun', shop: 'armory_3k', price: 700, dmg: 26, rate: 0.9, range: 60, kind: 'hitscan', held: 'bow', tracer: '#8d6e63', sockets: 1 },
  leather_helm: { name: '가죽 투구', emoji: '🪖', cat: 'head', slot: 'head', shop: 'armory_3k', price: 150, def: 5, vis: 'helm_leather', sockets: 1 },
  iron_helm: { name: '철 투구', emoji: '🪖', cat: 'head', slot: 'head', shop: 'armory_3k', price: 450, def: 10, vis: 'helm_iron', sockets: 1 },
  general_helm: { name: '장수 투구 (붉은 술)', emoji: '🪖', cat: 'head', slot: 'head', shop: 'armory_3k', price: 1400, def: 16, charm: 8, vis: 'helm_general', sockets: 2 },
  leather_armor: { name: '가죽 갑옷', emoji: '🦺', cat: 'body', slot: 'body', shop: 'armory_3k', price: 350, def: 8, vis: 'armor_leather', sockets: 1 },
  iron_armor: { name: '철갑옷', emoji: '🛡️', cat: 'body', slot: 'body', shop: 'armory_3k', price: 1000, def: 16, vis: 'armor_iron', sockets: 2 },
  legend_armor: { name: '전설의 갑옷 (황금 용린갑)', emoji: '🌟', cat: 'body', slot: 'body', shop: 'armory_3k', price: 7000, def: 32, charm: 25, vis: 'armor_legend', sockets: 3 },

  // ---------------- 바퀴 택티컬 (현대 밀리터리) ----------------
  combat_knife: { name: '군용 나이프', emoji: '🔪', cat: 'melee', shop: 'armory_mil', price: 90, dmg: 17, rate: 0.35, range: 1.8, kind: 'melee', held: 'knife', sockets: 1 },
  pistol: { name: '권총', emoji: '🔫', cat: 'gun', shop: 'armory_mil', price: 500, dmg: 18, rate: 0.35, range: 45, kind: 'hitscan', held: 'pistol', tracer: '#ffe082', sockets: 1 },
  shotgun: { name: '산탄총', emoji: '💥', cat: 'gun', shop: 'armory_mil', price: 1300, dmg: 9, pellets: 7, spread: 0.09, rate: 0.9, range: 22, kind: 'hitscan', held: 'shotgun', tracer: '#ffcc80', sockets: 2 },
  rifle: { name: '돌격소총', emoji: '🔫', cat: 'gun', shop: 'armory_mil', price: 2000, dmg: 14, rate: 0.12, range: 60, kind: 'hitscan', auto: true, held: 'rifle', tracer: '#fff59d', sockets: 2 },
  sniper: { name: '저격총', emoji: '🎯', cat: 'gun', shop: 'armory_mil', price: 3200, dmg: 75, rate: 1.3, range: 140, kind: 'hitscan', held: 'sniper', tracer: '#ffffff', sockets: 3 },
  minigun: { name: '미니건', emoji: '🌀', cat: 'gun', shop: 'armory_mil', price: 5500, dmg: 9, rate: 0.05, range: 50, kind: 'hitscan', auto: true, held: 'minigun', tracer: '#ffab40', sockets: 2 },
  grenade: { name: '수류탄', emoji: '💣', cat: 'throw', shop: 'armory_mil', price: 120, stack: true, dmg: 70, radius: 6, rate: 0.8, range: 30, kind: 'grenade', held: 'grenade', sockets: 0 },
  rpg: { name: '로켓포 (RPG)', emoji: '🚀', cat: 'launcher', shop: 'armory_mil', price: 4200, dmg: 90, radius: 6, rate: 2.2, range: 90, kind: 'rocket', held: 'rpg', sockets: 2 },
  kevlar_helmet: { name: '방탄모', emoji: '🪖', cat: 'head', slot: 'head', shop: 'armory_mil', price: 600, def: 14, vis: 'kevlar_helmet', sockets: 1 },
  goggles: { name: '전술 고글', emoji: '🥽', cat: 'face', slot: 'face', shop: 'armory_mil', price: 300, def: 3, charm: 4, vis: 'goggles', sockets: 1 },
  kevlar_vest: { name: '방탄조끼', emoji: '🦺', cat: 'body', slot: 'body', shop: 'armory_mil', price: 1500, def: 22, vis: 'vest_kevlar', sockets: 2 },
  tank: { name: '전차 (탱크)', emoji: '🪖', cat: 'vehicle', shop: 'armory_mil', price: 9000, vehicle: 'tank' },
  heli: { name: '공격 헬기', emoji: '🚁', cat: 'vehicle', shop: 'armory_mil', price: 14000, vehicle: 'heli' },

  // ---------------- 은하 무기상 (미래형) ----------------
  saber_blue: { name: '광선검 (푸른빛)', emoji: '🔵', cat: 'melee', shop: 'armory_sf', price: 4000, dmg: 58, rate: 0.38, range: 2.4, kind: 'melee', held: 'saber:#40c4ff', sockets: 2, charm: 10 },
  saber_red: { name: '광선검 (붉은빛)', emoji: '🔴', cat: 'melee', shop: 'armory_sf', price: 4400, dmg: 64, rate: 0.4, range: 2.4, kind: 'melee', held: 'saber:#ff1744', sockets: 2, charm: 10 },
  saber_green: { name: '광선검 (초록빛)', emoji: '🟢', cat: 'melee', shop: 'armory_sf', price: 4200, dmg: 60, rate: 0.38, range: 2.4, kind: 'melee', held: 'saber:#76ff03', sockets: 3, charm: 10 },
  blaster: { name: '블래스터 권총', emoji: '🔫', cat: 'gun', shop: 'armory_sf', price: 1500, dmg: 24, rate: 0.3, range: 55, kind: 'hitscan', held: 'blaster', tracer: '#ff5252', sockets: 2 },
  blaster_rifle: { name: '블래스터 소총', emoji: '🔫', cat: 'gun', shop: 'armory_sf', price: 3400, dmg: 17, rate: 0.11, range: 65, kind: 'hitscan', auto: true, held: 'blaster_rifle', tracer: '#ff1744', sockets: 2 },
  ion_cannon: { name: '이온 캐논', emoji: '⚡', cat: 'launcher', shop: 'armory_sf', price: 7500, dmg: 110, radius: 7, rate: 2.5, range: 100, kind: 'rocket', held: 'ion', tracer: '#18ffff', sockets: 3 },
  thermal: { name: '열 폭탄', emoji: '🟠', cat: 'throw', shop: 'armory_sf', price: 400, stack: true, dmg: 95, radius: 7, rate: 0.8, range: 30, kind: 'grenade', held: 'thermal', sockets: 0 },
  storm_helmet: { name: '스톰 헬멧', emoji: '⚪', cat: 'head', slot: 'head', shop: 'armory_sf', price: 2000, def: 18, charm: 6, vis: 'storm_helmet', sockets: 2 },
  jedi_robe: { name: '제다이 로브', emoji: '🧥', cat: 'body', slot: 'body', shop: 'armory_sf', price: 2500, def: 12, charm: 15, vis: 'jedi_robe', sockets: 2 },
  mando_armor: { name: '베스카 강철 갑옷', emoji: '🛡️', cat: 'body', slot: 'body', shop: 'armory_sf', price: 9500, def: 38, charm: 20, vis: 'mando_armor', sockets: 3 },

  // ---------------- 모자 가게 ----------------
  baseball_cap: { name: '야구모자', emoji: '🧢', cat: 'head', slot: 'head', shop: 'hatshop', price: 40, charm: 3, vis: 'cap:#42a5f5' },
  beanie: { name: '비니', emoji: '🧶', cat: 'head', slot: 'head', shop: 'hatshop', price: 70, charm: 5, vis: 'beanie:#ef5350' },
  beret_hat: { name: '베레모', emoji: '🎨', cat: 'head', slot: 'head', shop: 'hatshop', price: 140, charm: 8, vis: 'beret:#7e57c2' },
  catears: { name: '고양이 귀 머리띠', emoji: '🐱', cat: 'head', slot: 'head', shop: 'hatshop', price: 450, charm: 16, vis: 'catears' },
  cowboy: { name: '카우보이 모자', emoji: '🤠', cat: 'head', slot: 'head', shop: 'hatshop', price: 350, charm: 13, vis: 'cowboy' },
  flowercrown: { name: '꽃 화관', emoji: '🌸', cat: 'head', slot: 'head', shop: 'hatshop', price: 600, charm: 19, vis: 'flowercrown' },
  pirate: { name: '해적 선장 모자', emoji: '🏴‍☠️', cat: 'head', slot: 'head', shop: 'hatshop', price: 900, charm: 22, vis: 'pirate' },
  silk_hat: { name: '실크햇', emoji: '🎩', cat: 'head', slot: 'head', shop: 'hatshop', price: 1300, charm: 27, vis: 'top' },
  wizard: { name: '마법사 모자', emoji: '🧙', cat: 'head', slot: 'head', shop: 'hatshop', price: 1700, charm: 30, vis: 'wizard' },
  crown: { name: '황금 왕관', emoji: '👑', cat: 'head', slot: 'head', shop: 'hatshop', price: 9000, charm: 65, vis: 'crown' },

  // ---------------- 안경 가게 ----------------
  round_glasses: { name: '동그란 안경', emoji: '👓', cat: 'face', slot: 'face', shop: 'eyewear', price: 50, charm: 3, vis: 'glasses' },
  sunglasses: { name: '선글라스', emoji: '🕶️', cat: 'face', slot: 'face', shop: 'eyewear', price: 160, charm: 9, vis: 'sunglasses' },
  heart_glasses: { name: '하트 선글라스', emoji: '💖', cat: 'face', slot: 'face', shop: 'eyewear', price: 420, charm: 15, vis: 'heartglasses' },
  star_glasses: { name: '별 선글라스', emoji: '⭐', cat: 'face', slot: 'face', shop: 'eyewear', price: 650, charm: 19, vis: 'starglasses' },
  monocle: { name: '외알 안경', emoji: '🧐', cat: 'face', slot: 'face', shop: 'eyewear', price: 1500, charm: 26, vis: 'monocle' },
  vr_goggles: { name: 'VR 고글', emoji: '🥽', cat: 'face', slot: 'face', shop: 'eyewear', price: 2400, charm: 30, vis: 'vr' },
  gold_shades: { name: '금테 선글라스', emoji: '😎', cat: 'face', slot: 'face', shop: 'eyewear', price: 3500, charm: 38, vis: 'goldshades' },

  // ---------------- 옷가게 ----------------
  hoodie: { name: '후드티', emoji: '👕', cat: 'body', slot: 'body', shop: 'clothing', price: 120, charm: 6, vis: 'hoodie:#90caf9' },
  leather_jacket: { name: '가죽 재킷', emoji: '🧥', cat: 'body', slot: 'body', shop: 'clothing', price: 650, charm: 16, vis: 'leather' },
  hanbok: { name: '한복', emoji: '👘', cat: 'body', slot: 'body', shop: 'clothing', price: 900, charm: 23, vis: 'hanbok' },
  tuxedo: { name: '턱시도', emoji: '🤵', cat: 'body', slot: 'body', shop: 'clothing', price: 1600, charm: 31, vis: 'tuxedo' },
  dress: { name: '파티 드레스', emoji: '👗', cat: 'body', slot: 'body', shop: 'clothing', price: 1600, charm: 31, vis: 'dress:#f06292' },
  princess: { name: '공주 드레스', emoji: '👸', cat: 'body', slot: 'body', shop: 'clothing', price: 4200, charm: 46, vis: 'princess' },
  idol: { name: '아이돌 무대의상', emoji: '🎤', cat: 'body', slot: 'body', shop: 'clothing', price: 5200, charm: 52, vis: 'idol' },
  gold_suit: { name: '황금 정장', emoji: '💰', cat: 'body', slot: 'body', shop: 'clothing', price: 20000, charm: 90, vis: 'goldsuit' },
  bowtie_item: { name: '나비넥타이', emoji: '🎀', cat: 'acc', slot: 'acc', shop: 'clothing', price: 100, charm: 5, vis: 'bowtie' },
  scarf_item: { name: '울 스카프', emoji: '🧣', cat: 'acc', slot: 'acc', shop: 'clothing', price: 220, charm: 8, vis: 'scarf:#ffb74d' },
  pearls: { name: '진주 목걸이', emoji: '📿', cat: 'acc', slot: 'acc', shop: 'clothing', price: 1300, charm: 24, vis: 'pearls' },
  wings: { name: '나비 날개', emoji: '🦋', cat: 'acc', slot: 'acc', shop: 'clothing', price: 2200, charm: 32, vis: 'wings' },

  // ---------------- 음식 & 선물 & 인형 ----------------
  kimbap: { name: '삼각김밥', emoji: '🍙', cat: 'food', shop: 'convenience', price: 3, stack: true, food: { hunger: 22 }, heal: 5 },
  snack: { name: '과자', emoji: '🍬', cat: 'food', shop: 'convenience', price: 3, stack: true, food: { hunger: 8, fun: 6 }, heal: 2, gift: true },
  energy_drink: { name: '에너지 드링크', emoji: '🥫', cat: 'food', shop: 'convenience', price: 4, stack: true, food: { energy: 25 }, heal: 0 },
  bread: { name: '빵', emoji: '🥐', cat: 'food', shop: 'bakery', price: 5, stack: true, food: { hunger: 30 }, heal: 8, gift: true },
  coffee: { name: '커피', emoji: '☕', cat: 'food', shop: 'cafe', price: 6, stack: true, food: { energy: 20 }, heal: 2, gift: true },
  medkit: { name: '구급상자', emoji: '🩹', cat: 'food', shop: 'pharmacy', price: 40, stack: true, food: {}, heal: 50 },
  flowers: { name: '꽃다발', emoji: '💐', cat: 'gift', shop: 'flowershop', price: 8, stack: true, gift: true },
  book: { name: '책', emoji: '📖', cat: 'gift', shop: 'bookstore', price: 10, stack: true, gift: true },
  doll_roach: { name: '바퀴 인형', emoji: '🪳', cat: 'doll', shop: 'convenience', price: 30, gift: true, held: 'doll:#8a5634', charm: 2 },
  doll_bear: { name: '곰 인형', emoji: '🧸', cat: 'doll', shop: 'flowershop', price: 60, gift: true, held: 'doll:#d7a86e', charm: 3 },
  doll_dino: { name: '공룡 인형', emoji: '🦖', cat: 'doll', shop: 'bookstore', price: 80, gift: true, held: 'doll:#81c784', charm: 3 },

  cash: { name: '현금', emoji: '💵', cat: 'cash', price: 1, stack: true },

  // ---------------- 보석 ----------------
  ruby: { name: '루비', emoji: '🔴', cat: 'gem', shop: 'jeweler', price: 600, stack: true, gem: 'ruby' },
  sapphire: { name: '사파이어', emoji: '🔵', cat: 'gem', shop: 'jeweler', price: 600, stack: true, gem: 'sapphire' },
  emerald: { name: '에메랄드', emoji: '🟢', cat: 'gem', shop: 'jeweler', price: 800, stack: true, gem: 'emerald' },
  topaz: { name: '토파즈', emoji: '🟡', cat: 'gem', shop: 'jeweler', price: 700, stack: true, gem: 'topaz' },
  amethyst: { name: '자수정', emoji: '🟣', cat: 'gem', shop: 'jeweler', price: 700, stack: true, gem: 'amethyst' },
  diamond: { name: '다이아몬드', emoji: '💎', cat: 'gem', shop: 'jeweler', price: 1500, stack: true, gem: 'diamond' },
  obsidian: { name: '흑요석', emoji: '⚫', cat: 'gem', shop: 'jeweler', price: 500, stack: true, gem: 'obsidian' },
  opal: { name: '오팔', emoji: '⚪', cat: 'gem', shop: 'jeweler', price: 900, stack: true, gem: 'opal' },
};

// 보석 효과: 무기에 박으면 weapon, 방어구에 박으면 armor 효과
export const GEMS = {
  ruby: { name: '루비', color: '#ff1744', weapon: '공격력 +20%', armor: '방어력 +6' },
  sapphire: { name: '사파이어', color: '#2979ff', weapon: '공격속도 +15%', armor: '이동속도 +5%' },
  emerald: { name: '에메랄드', color: '#00e676', weapon: '흡혈 10%', armor: '체력 재생 +1/초' },
  topaz: { name: '토파즈', color: '#ffd600', weapon: '치명타 확률 20% (피해 2배)', armor: '방어력 +6' },
  amethyst: { name: '자수정', color: '#d500f9', weapon: '독: 4초간 초당 4 피해', armor: '방어력 +6' },
  diamond: { name: '다이아몬드', color: '#e0f7fa', weapon: '방어 관통 30%', armor: '방어력 +12' },
  obsidian: { name: '흑요석', color: '#424242', weapon: '사거리 +25%', armor: '방어력 +6' },
  opal: { name: '오팔', color: '#f8bbd0', weapon: '넉백 강화', armor: '매력 +10' },
};

export const ENCHANT_FEE = 100;

export const SHOPS = {
  armory_3k: { title: '관우네 병기점', subtitle: '삼국지 영웅들의 무기와 갑옷' },
  armory_mil: { title: '바퀴 택티컬', subtitle: '현대 밀리터리 장비 · 전차 · 헬기' },
  armory_sf: { title: '은하 무기상', subtitle: '먼 미래, 아주 먼 은하의 무기' },
  jeweler: { title: '반짝 보석상', subtitle: '보석 판매 · 무기와 방어구 인챈트' },
  hatshop: { title: '더듬이 캡', subtitle: '모든 머리 크기의 모자' },
  eyewear: { title: '눈부심 안경원', subtitle: '선글라스와 안경' },
  clothing: { title: '여섯다리 패션', subtitle: '옷과 액세서리' },
  convenience: { title: '편의점', subtitle: '간식과 인형' },
  bakery: { title: '빵집', subtitle: '갓 구운 빵' },
  cafe: { title: '카페', subtitle: '테이크아웃' },
  pharmacy: { title: '약국', subtitle: '구급상자' },
  flowershop: { title: '꽃집', subtitle: '꽃과 인형' },
  bookstore: { title: '서점', subtitle: '책과 인형' },
};

export function shopItems(type) {
  return Object.entries(ITEMS).filter(([, d]) => d.shop === type).map(([id]) => id);
}

export const itemDef = (id) => ITEMS[id] || ITEMS.fist;
export const isWeapon = (d) => ['melee', 'gun', 'throw', 'launcher'].includes(d.cat);
export const isWearable = (d) => !!d.slot;

// 무기 최종 능력치 (보석 반영)
export function weaponStats(id, gems = []) {
  const d = itemDef(id);
  const n = (g) => gems.filter((x) => x === g).length;
  return {
    ...d,
    dmg: (d.dmg || 0) * (1 + 0.2 * n('ruby')),
    rate: (d.rate || 0.5) * Math.pow(0.85, n('sapphire')),
    range: (d.range || 2) * (1 + 0.25 * n('obsidian')),
    lifesteal: 0.1 * n('emerald'),
    crit: Math.min(0.8, 0.2 * n('topaz')),
    poison: 4 * n('amethyst'),
    pierce: Math.min(0.9, 0.3 * n('diamond')),
    knock: 1 + n('opal'),
  };
}

// 장착 아이템 목록 → 방어력 / 매력 / 속도
export function equipTotals(items) {
  let def = 0, charm = 0, speed = 0, regen = 0;
  for (const it of items) {
    if (!it) continue;
    const d = itemDef(it.id);
    def += d.def || 0;
    charm += d.charm || 0;
    for (const g of it.gems || []) {
      if (g === 'diamond') def += 12;
      else if (g === 'sapphire') speed += 0.05;
      else if (g === 'emerald') regen += 1;
      else if (g === 'opal') charm += 10;
      else def += 6;
    }
  }
  return { def, charm, speed, regen };
}

// 방어력 → 받는 피해 배율
export const damageTaken = (dmg, def, pierce = 0) => dmg * (60 / (60 + def * (1 - pierce)));

export const CLUB_CHARM = 40;
