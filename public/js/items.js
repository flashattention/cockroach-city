// 아이템 데이터베이스 (서버와 브라우저 공용)
import { BASIC_ITEMS } from './look.js';
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
  bow: { name: '장궁', emoji: '🏹', cat: 'gun', shop: 'armory_3k', price: 700, dmg: 26, rate: 0.9, range: 60, kind: 'arrow', ammo: 'arrow', held: 'bow', sockets: 1 },
  composite_bow: { name: '각궁 (황충의 활)', emoji: '🏹', cat: 'gun', shop: 'armory_3k', price: 1600, dmg: 38, rate: 0.75, range: 75, kind: 'arrow', ammo: 'arrow', held: 'bow', sockets: 2 },
  zhuge_crossbow: { name: '제갈연노 (연발 쇠뇌)', emoji: '🎯', cat: 'gun', shop: 'armory_3k', price: 2600, dmg: 16, rate: 0.22, range: 55, kind: 'arrow', ammo: 'arrow', auto: true, held: 'crossbow', sockets: 2 },
  arrow: { name: '화살 ×20', emoji: '➶', cat: 'ammo', shop: 'armory_3k', price: 40, stack: true, pack: 20 },
  leather_helm: { name: '가죽 투구', emoji: '🪖', cat: 'head', slot: 'head', shop: 'armory_3k', price: 150, def: 5, vis: 'helm_leather', sockets: 1 },
  iron_helm: { name: '철 투구', emoji: '🪖', cat: 'head', slot: 'head', shop: 'armory_3k', price: 450, def: 10, vis: 'helm_iron', sockets: 1 },
  general_helm: { name: '장수 투구 (붉은 술)', emoji: '🪖', cat: 'head', slot: 'head', shop: 'armory_3k', price: 1400, def: 16, charm: 8, vis: 'helm_general', sockets: 2 },
  leather_armor: { name: '가죽 갑옷', emoji: '🦺', cat: 'body', slot: 'body', shop: 'armory_3k', price: 350, def: 8, vis: 'armor_leather', sockets: 1 },
  iron_armor: { name: '철갑옷', emoji: '🛡️', cat: 'body', slot: 'body', shop: 'armory_3k', price: 1000, def: 16, vis: 'armor_iron', sockets: 2 },
  legend_armor: { name: '전설의 갑옷 (황금 용린갑)', emoji: '🌟', cat: 'body', slot: 'body', shop: 'armory_3k', price: 7000, def: 32, charm: 25, vis: 'armor_legend', sockets: 3 },

  // ---------------- 바퀴 택티컬 (현대 밀리터리) ----------------
  combat_knife: { name: '군용 나이프', emoji: '🔪', cat: 'melee', shop: 'armory_mil', price: 90, dmg: 17, rate: 0.35, range: 1.8, kind: 'melee', held: 'knife', sockets: 1 },
  pistol: { name: '권총', emoji: '🔫', cat: 'gun', shop: 'armory_mil', price: 500, dmg: 18, rate: 0.35, range: 45, ammo: 'ammo_9mm', kind: 'hitscan', held: 'pistol', tracer: '#ffe082', sockets: 1 },
  shotgun: { name: '산탄총', emoji: '💥', cat: 'gun', shop: 'armory_mil', price: 1300, dmg: 9, pellets: 7, spread: 0.09, rate: 0.9, range: 22, ammo: 'ammo_shell', kind: 'hitscan', held: 'shotgun', tracer: '#ffcc80', sockets: 2 },
  rifle: { name: '돌격소총', emoji: '🔫', cat: 'gun', shop: 'armory_mil', price: 2000, dmg: 14, rate: 0.12, range: 60, ammo: 'ammo_556', kind: 'hitscan', auto: true, held: 'rifle', tracer: '#fff59d', sockets: 2 },
  sniper: { name: '저격총', emoji: '🎯', cat: 'gun', shop: 'armory_mil', price: 3200, dmg: 75, rate: 1.3, range: 140, ammo: 'ammo_762', kind: 'hitscan', held: 'sniper', tracer: '#ffffff', sockets: 3 },
  minigun: { name: '미니건', emoji: '🌀', cat: 'gun', shop: 'armory_mil', price: 5500, dmg: 9, rate: 0.05, range: 50, ammo: 'ammo_belt', kind: 'hitscan', auto: true, held: 'minigun', tracer: '#ffab40', sockets: 2 },
  grenade: { name: '수류탄', emoji: '💣', cat: 'throw', shop: 'armory_mil', price: 120, stack: true, dmg: 70, radius: 6, rate: 0.8, range: 30, kind: 'grenade', held: 'grenade', sockets: 0 },
  rpg: { name: '로켓포 (RPG)', emoji: '🚀', cat: 'launcher', shop: 'armory_mil', price: 4200, dmg: 90, radius: 6, rate: 2.2, range: 90, ammo: 'ammo_rocket', kind: 'rocket', held: 'rpg', sockets: 2 },
  kevlar_helmet: { name: '방탄모', emoji: '🪖', cat: 'head', slot: 'head', shop: 'armory_mil', price: 600, def: 14, vis: 'kevlar_helmet', sockets: 1 },
  goggles: { name: '전술 고글', emoji: '🥽', cat: 'face', slot: 'face', shop: 'armory_mil', price: 300, def: 3, charm: 4, vis: 'goggles', sockets: 1 },
  kevlar_vest: { name: '방탄조끼', emoji: '🦺', cat: 'body', slot: 'body', shop: 'armory_mil', price: 1500, def: 22, vis: 'vest_kevlar', sockets: 2 },
  ammo_9mm: { name: '권총탄 (9mm) ×30', emoji: '🟡', cat: 'ammo', shop: 'armory_mil', price: 40, stack: true, pack: 30 },
  ammo_shell: { name: '산탄 (12게이지) ×12', emoji: '🔴', cat: 'ammo', shop: 'armory_mil', price: 60, stack: true, pack: 12 },
  ammo_556: { name: '소총탄 (5.56mm) ×60', emoji: '🟠', cat: 'ammo', shop: 'armory_mil', price: 90, stack: true, pack: 60 },
  ammo_762: { name: '저격탄 (7.62mm) ×10', emoji: '🟤', cat: 'ammo', shop: 'armory_mil', price: 120, stack: true, pack: 10 },
  ammo_belt: { name: '미니건 탄띠 ×200', emoji: '⛓️', cat: 'ammo', shop: 'armory_mil', price: 250, stack: true, pack: 200 },
  ammo_rocket: { name: '로켓탄 ×2', emoji: '🧨', cat: 'ammo', shop: 'armory_mil', price: 300, stack: true, pack: 2 },
  tank: { name: '전차 (탱크)', emoji: '🪖', cat: 'vehicle', shop: 'armory_mil', price: 9000, vehicle: 'tank' },
  heli: { name: '공격 헬기', emoji: '🚁', cat: 'vehicle', shop: 'armory_mil', price: 14000, vehicle: 'heli' },

  // ---------------- 은하 무기상 (미래형) ----------------
  saber_blue: { name: '광선검 (푸른빛)', emoji: '🔵', cat: 'melee', shop: 'armory_sf', price: 4000, dmg: 58, rate: 0.38, range: 2.4, kind: 'melee', held: 'saber:#40c4ff', sockets: 2, charm: 10 },
  saber_red: { name: '광선검 (붉은빛)', emoji: '🔴', cat: 'melee', shop: 'armory_sf', price: 4400, dmg: 64, rate: 0.4, range: 2.4, kind: 'melee', held: 'saber:#ff1744', sockets: 2, charm: 10 },
  saber_green: { name: '광선검 (초록빛)', emoji: '🟢', cat: 'melee', shop: 'armory_sf', price: 4200, dmg: 60, rate: 0.38, range: 2.4, kind: 'melee', held: 'saber:#76ff03', sockets: 3, charm: 10 },
  blaster: { name: '블래스터 권총', emoji: '🔫', cat: 'gun', shop: 'armory_sf', price: 1500, dmg: 24, rate: 0.3, range: 55, ammo: 'ammo_cell', kind: 'hitscan', held: 'blaster', tracer: '#ff5252', sockets: 2 },
  blaster_rifle: { name: '블래스터 소총', emoji: '🔫', cat: 'gun', shop: 'armory_sf', price: 3400, dmg: 17, rate: 0.11, range: 65, ammo: 'ammo_cell', kind: 'hitscan', auto: true, held: 'blaster_rifle', tracer: '#ff1744', sockets: 2 },
  ion_cannon: { name: '이온 캐논', emoji: '⚡', cat: 'launcher', shop: 'armory_sf', price: 7500, dmg: 110, radius: 7, rate: 2.5, range: 100, ammo: 'ammo_ion', kind: 'rocket', held: 'ion', tracer: '#18ffff', sockets: 3 },
  ammo_cell: { name: '블래스터 에너지 셀 ×40', emoji: '🔋', cat: 'ammo', shop: 'armory_sf', price: 120, stack: true, pack: 40 },
  ammo_ion: { name: '이온 코어 ×2', emoji: '💠', cat: 'ammo', shop: 'armory_sf', price: 500, stack: true, pack: 2 },
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
  // eat: [먹는 동작, 소품 모양:색], pack: 포장 시 모양
  kimbap: { name: '삼각김밥', emoji: '🍙', cat: 'food', shop: 'convenience', price: 3, stack: true, food: { hunger: 22 }, heal: 5, eat: ['bite', 'tri:#fafafa'] },
  snack: { name: '과자', emoji: '🍬', cat: 'food', shop: 'convenience', shops: ['supermarket'], price: 3, stack: true, food: { hunger: 8, fun: 6 }, heal: 2, gift: true, eat: ['bite', 'box:#ff7043'] },
  energy_drink: { name: '에너지 드링크', emoji: '🥫', cat: 'food', shop: 'convenience', shops: ['supermarket'], price: 4, stack: true, food: { energy: 25 }, heal: 0, eat: ['drink', 'can:#43a047'] },
  cup_ramen: { name: '컵라면', emoji: '🍜', cat: 'food', shop: 'convenience', shops: ['supermarket'], price: 4, stack: true, food: { hunger: 28, fun: 4 }, heal: 4, eat: ['slurp', 'bowl:#ffb74d'] },
  sandwich: { name: '샌드위치', emoji: '🥪', cat: 'food', shop: 'convenience', shops: ['supermarket'], price: 5, stack: true, food: { hunger: 25 }, heal: 5, eat: ['bite', 'bun:#ffeb3b'] },
  banana_milk: { name: '바나나우유', emoji: '🍌', cat: 'food', shop: 'convenience', shops: ['supermarket'], price: 3, stack: true, food: { hunger: 6, fun: 8 }, heal: 2, gift: true, eat: ['drink', 'cup:#fff176'] },
  dosirak: { name: '편의점 도시락', emoji: '🍱', cat: 'food', shop: 'convenience', shops: ['supermarket'], price: 7, stack: true, food: { hunger: 45 }, heal: 10, eat: ['spoon', 'bowl:#a1887f'] },
  bread: { name: '빵', emoji: '🥐', cat: 'food', shop: 'bakery', price: 5, stack: true, food: { hunger: 30 }, heal: 8, gift: true, eat: ['bite', 'bread:#e0a050'] },
  coffee: { name: '아메리카노', emoji: '☕', cat: 'food', shop: 'cafe', price: 6, stack: true, food: { energy: 20 }, heal: 2, gift: true, eat: ['drink', 'cup:#6d4c41'] },
  latte: { name: '부스러기 라떼', emoji: '🥛', cat: 'food', shop: 'cafe', price: 7, stack: true, food: { energy: 18, fun: 5 }, heal: 2, gift: true, eat: ['drink', 'cup:#d7ccc8'] },
  cake: { name: '딸기 케이크', emoji: '🍰', cat: 'food', shop: 'cafe', shops: ['bakery'], price: 8, stack: true, food: { hunger: 20, fun: 12 }, heal: 4, gift: true, eat: ['bite', 'bread:#f8bbd0'] },
  croissant: { name: '크루아상', emoji: '🥐', cat: 'food', shop: 'bakery', price: 6, stack: true, food: { hunger: 28, fun: 6 }, heal: 6, gift: true, eat: ['bite', 'bread:#e0a050'] },
  cream_bread: { name: '소보로빵', emoji: '🍞', cat: 'food', shop: 'bakery', price: 4, stack: true, food: { hunger: 25 }, heal: 5, eat: ['bite', 'bread:#c68642'] },
  // 피자집
  pizza_pepperoni: { name: '페퍼로니 피자', emoji: '🍕', cat: 'food', shop: 'pizza', price: 18, stack: true, food: { hunger: 55, fun: 10 }, heal: 12, eat: ['slice', 'slice:#d32f2f'], pack: 'pizzabox' },
  pizza_cheese: { name: '치즈 피자', emoji: '🧀', cat: 'food', shop: 'pizza', price: 15, stack: true, food: { hunger: 50, fun: 8 }, heal: 10, eat: ['slice', 'slice:#fff176'], pack: 'pizzabox' },
  pizza_potato: { name: '포테이토 피자', emoji: '🥔', cat: 'food', shop: 'pizza', price: 19, stack: true, food: { hunger: 58, fun: 10 }, heal: 12, eat: ['slice', 'slice:#d7a86e'], pack: 'pizzabox' },
  pizza_bulgogi: { name: '불고기 피자', emoji: '🍕', cat: 'food', shop: 'pizza', price: 20, stack: true, food: { hunger: 60, fun: 12 }, heal: 14, eat: ['slice', 'slice:#6d4c41'], pack: 'pizzabox' },
  cola: { name: '콜라', emoji: '🥤', cat: 'food', shop: 'pizza', shops: ['pizza', 'chicken', 'burger'], price: 3, stack: true, food: { energy: 8, fun: 5 }, heal: 1, eat: ['drink', 'cup:#5d4037'] },
  // 치킨집
  fried_chicken: { name: '후라이드 치킨', emoji: '🍗', cat: 'food', shop: 'chicken', price: 17, stack: true, food: { hunger: 55, fun: 12 }, heal: 12, eat: ['drumstick', 'drumstick:#e0a050'], pack: 'chickenbox' },
  yangnyeom: { name: '양념 치킨', emoji: '🌶️', cat: 'food', shop: 'chicken', price: 18, stack: true, food: { hunger: 55, fun: 14 }, heal: 12, eat: ['drumstick', 'drumstick:#c62828'], pack: 'chickenbox' },
  half_half: { name: '반반 치킨', emoji: '🍗', cat: 'food', shop: 'chicken', price: 18, stack: true, food: { hunger: 58, fun: 15 }, heal: 13, eat: ['drumstick', 'drumstick:#d84315'], pack: 'chickenbox' },
  soy_chicken: { name: '간장 치킨', emoji: '🍗', cat: 'food', shop: 'chicken', price: 18, stack: true, food: { hunger: 55, fun: 12 }, heal: 12, eat: ['drumstick', 'drumstick:#5d4037'], pack: 'chickenbox' },
  chicken_mu: { name: '치킨무', emoji: '🥢', cat: 'food', shop: 'chicken', price: 1, stack: true, food: { hunger: 3, fun: 2 }, heal: 0, eat: ['bite', 'box:#fafafa'] },
  // 중국집
  jjajang: { name: '짜장면', emoji: '🍝', cat: 'food', shop: 'chinese', price: 7, stack: true, food: { hunger: 50 }, heal: 8, eat: ['slurp', 'bowl:#3e2723'] },
  jjamppong: { name: '짬뽕', emoji: '🌶️', cat: 'food', shop: 'chinese', price: 8, stack: true, food: { hunger: 52, energy: 5 }, heal: 9, eat: ['slurp', 'bowl:#d84315'] },
  tangsuyuk: { name: '탕수육', emoji: '🥘', cat: 'food', shop: 'chinese', price: 16, stack: true, food: { hunger: 50, fun: 12 }, heal: 12, eat: ['slurp', 'bowl:#ffb74d'] },
  fried_rice: { name: '볶음밥', emoji: '🍛', cat: 'food', shop: 'chinese', price: 7, stack: true, food: { hunger: 48 }, heal: 8, eat: ['spoon', 'bowl:#ffcc80'] },
  mandu: { name: '군만두', emoji: '🥟', cat: 'food', shop: 'chinese', price: 5, stack: true, food: { hunger: 22, fun: 4 }, heal: 4, eat: ['bite', 'box:#ffe0b2'] },
  // 국밥집
  dwaeji_gukbap: { name: '돼지국밥', emoji: '🍲', cat: 'food', shop: 'gukbap', price: 8, stack: true, food: { hunger: 60, energy: 8 }, heal: 15, eat: ['spoon', 'bowl:#efebe9'] },
  sundae_gukbap: { name: '순대국밥', emoji: '🍲', cat: 'food', shop: 'gukbap', price: 8, stack: true, food: { hunger: 60, energy: 8 }, heal: 15, eat: ['spoon', 'bowl:#d7ccc8'] },
  haejangguk: { name: '해장국', emoji: '🥣', cat: 'food', shop: 'gukbap', price: 8, stack: true, food: { hunger: 55, energy: 15 }, heal: 15, eat: ['spoon', 'bowl:#bf360c'] },
  kongnamul: { name: '콩나물국밥', emoji: '🥣', cat: 'food', shop: 'gukbap', price: 6, stack: true, food: { hunger: 45, energy: 12 }, heal: 12, eat: ['spoon', 'bowl:#fff9c4'] },
  sikhye: { name: '식혜', emoji: '🍶', cat: 'food', shop: 'gukbap', price: 2, stack: true, food: { energy: 5, fun: 6 }, heal: 2, eat: ['drink', 'cup:#fff8e1'] },
  // 햄버거
  burger: { name: '바퀴 버거', emoji: '🍔', cat: 'food', shop: 'burger', price: 7, stack: true, food: { hunger: 40, fun: 8 }, heal: 8, eat: ['bite', 'bun:#ffca28'] },
  cheeseburger: { name: '더블 치즈버거', emoji: '🍔', cat: 'food', shop: 'burger', price: 9, stack: true, food: { hunger: 50, fun: 10 }, heal: 10, eat: ['bite', 'bun:#ffb300'] },
  fries: { name: '감자튀김', emoji: '🍟', cat: 'food', shop: 'burger', price: 4, stack: true, food: { hunger: 18, fun: 8 }, heal: 3, eat: ['bite', 'box:#e53935'] },
  milkshake: { name: '딸기 쉐이크', emoji: '🥤', cat: 'food', shop: 'burger', price: 5, stack: true, food: { hunger: 8, fun: 12 }, heal: 2, gift: true, eat: ['drink', 'cup:#f8bbd0'] },
  // 분식
  tteokbokki: { name: '떡볶이', emoji: '🌶️', cat: 'food', shop: 'bunsik', price: 5, stack: true, food: { hunger: 35, fun: 10 }, heal: 6, eat: ['spoon', 'bowl:#e53935'] },
  ramyeon: { name: '라면', emoji: '🍜', cat: 'food', shop: 'bunsik', price: 5, stack: true, food: { hunger: 40, fun: 5 }, heal: 6, eat: ['slurp', 'bowl:#ff7043'] },
  gimbap_roll: { name: '김밥 한 줄', emoji: '🍙', cat: 'food', shop: 'bunsik', price: 4, stack: true, food: { hunger: 35 }, heal: 6, eat: ['bite', 'skewer:#263238'] },
  eomuk: { name: '어묵 꼬치', emoji: '🍢', cat: 'food', shop: 'bunsik', price: 2, stack: true, food: { hunger: 12, energy: 4 }, heal: 3, eat: ['bite', 'skewer:#ffcc80'] },
  twigim: { name: '모둠 튀김', emoji: '🍤', cat: 'food', shop: 'bunsik', price: 4, stack: true, food: { hunger: 22, fun: 6 }, heal: 4, eat: ['bite', 'box:#ffb74d'] },
  // 한식당
  bibimbap: { name: '비빔밥', emoji: '🍚', cat: 'food', shop: 'restaurant', price: 9, stack: true, food: { hunger: 55 }, heal: 12, eat: ['spoon', 'bowl:#ff7043'] },
  bulgogi_set: { name: '불고기 정식', emoji: '🥩', cat: 'food', shop: 'restaurant', price: 12, stack: true, food: { hunger: 65, fun: 8 }, heal: 15, eat: ['spoon', 'bowl:#6d4c41'] },
  kimchi_jjigae: { name: '김치찌개', emoji: '🍲', cat: 'food', shop: 'restaurant', price: 8, stack: true, food: { hunger: 55, energy: 5 }, heal: 12, eat: ['spoon', 'bowl:#d84315'] },
  medkit: { name: '구급상자', emoji: '🩹', cat: 'food', shop: 'pharmacy', price: 40, stack: true, food: {}, heal: 50 },
  flowers: { name: '꽃다발', emoji: '💐', cat: 'gift', shop: 'flowershop', price: 8, stack: true, gift: true },
  book: { name: '책', emoji: '📖', cat: 'gift', shop: 'bookstore', price: 10, stack: true, gift: true },
  doll_roach: { name: '바퀴 인형', emoji: '🧸', cat: 'doll', shop: 'convenience', price: 30, gift: true, held: 'doll:#8a5634', charm: 2 },
  doll_bear: { name: '곰 인형', emoji: '🧸', cat: 'doll', shop: 'flowershop', price: 60, gift: true, held: 'doll:#d7a86e', charm: 3 },
  doll_dino: { name: '공룡 인형', emoji: '🦖', cat: 'doll', shop: 'bookstore', price: 80, gift: true, held: 'doll:#81c784', charm: 3 },

  // ---------------- 마법봉 공방 (속성 지팡이) ----------------
  // element: 마법 속성, mana: 마나 소모. 같은 속성이면 스킬이 같다
  wand_fire: { name: '화염 지팡이', emoji: '🔥', cat: 'wand', shop: 'magicshop', price: 1800, dmg: 40, radius: 3.5, rate: 0.9, range: 60, kind: 'magic', element: 'fire', mana: 18, held: 'wand:#ff5722', sockets: 2, skill: '화염구 — 맞은 곳이 폭발해요' },
  wand_ice: { name: '얼음 지팡이', emoji: '❄️', cat: 'wand', shop: 'magicshop', price: 1600, dmg: 30, rate: 0.7, range: 55, kind: 'magic', element: 'ice', mana: 14, held: 'wand:#4fc3f7', sockets: 2, skill: '얼음 화살 — 맞으면 2초간 느려져요' },
  wand_thunder: { name: '번개 지팡이', emoji: '⚡', cat: 'wand', shop: 'magicshop', price: 2600, dmg: 34, rate: 1.0, range: 50, kind: 'magic', element: 'thunder', mana: 22, held: 'wand:#ffeb3b', sockets: 2, skill: '연쇄 번개 — 즉시 맞고 주변 2명에게 튀어요' },
  wand_wind: { name: '바람 지팡이', emoji: '🌪️', cat: 'wand', shop: 'magicshop', price: 1400, dmg: 18, rate: 0.8, range: 9, kind: 'magic', element: 'wind', mana: 12, held: 'wand:#a5d6a7', sockets: 2, skill: '돌풍 — 앞의 적들을 날려버려요' },
  wand_poison: { name: '독 지팡이', emoji: '☠️', cat: 'wand', shop: 'magicshop', price: 2000, dmg: 12, poisonDmg: 8, rate: 0.9, range: 45, kind: 'magic', element: 'poison', mana: 16, held: 'wand:#9ccc65', sockets: 2, skill: '독구름 — 4초간 계속 피해' },
  wand_holy: { name: '빛의 지팡이', emoji: '✨', cat: 'wand', shop: 'magicshop', price: 3000, dmg: 0, heal: 30, rate: 2.0, range: 8, kind: 'magic', element: 'holy', mana: 30, held: 'wand:#fff59d', sockets: 2, skill: '치유의 빛 — 나와 주변 플레이어 체력 회복' },
  wand_dark: { name: '어둠 지팡이', emoji: '🌑', cat: 'wand', shop: 'magicshop', price: 4200, dmg: 65, radius: 2.5, rate: 1.4, range: 70, kind: 'magic', element: 'dark', mana: 28, held: 'wand:#7e57c2', sockets: 3, skill: '암흑구 — 느리지만 강력한 유도 구체' },
  mana_potion: { name: '마나 물약', emoji: '🧪', cat: 'food', shop: 'magicshop', price: 25, stack: true, food: {}, heal: 0, mana: 60, eat: ['drink', 'cup:#5c6bc0'] },

  cash: { name: '현금', emoji: '💵', cat: 'cash', price: 1, stack: true },
  car_key: { name: '차 키', emoji: '🔑', cat: 'carkey', price: 0 },
  house_key: { name: '집 열쇠', emoji: '🔑', cat: 'key', price: 0 },

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

Object.assign(ITEMS, BASIC_ITEMS);
// 바퀴 모터스 쇼룸 자동차 (사면 차 키를 받아 언제든 호출)
export const DEALER_CARS = [
  ['sport_b', '🏎️', 90000], ['sport_l', '🐂', 45000], ['sport_f', '🐎', 40000], ['sport_m', '🏁', 38000], ['sport_p', '🏎️', 28000],
  ['limo', '🚘', 25000], ['convertible', '🚙', 16000], ['ev', '⚡', 15000], ['jeep', '🛻', 12000], ['truck', '🚚', 10000],
  ['suv', '🚙', 9000], ['van', '🚐', 8500], ['pickup', '🛻', 8000], ['icecream', '🍦', 7000], ['wagon', '🚗', 6500], ['sedan', '🚗', 6000], ['hatch', '🚗', 5000], ['mini', '🚗', 3500],
];
// 조준(우클릭) 배율
const ZOOM = { pistol: 1.5, blaster: 1.6, shotgun: 1.3, rifle: 2.4, blaster_rifle: 2.4, minigun: 1.5, sniper: 6, rpg: 1.8, ion_cannon: 2, bow: 2.2, composite_bow: 2.6, zhuge_crossbow: 2 };
for (const [id, z] of Object.entries(ZOOM)) if (ITEMS[id]) ITEMS[id].zoom = z;
for (const d of Object.values(ITEMS)) if (d.cat === 'wand') d.zoom = 1.4;
// 포장 음식은 손에 포장 봉투/박스를 든다
for (const d of Object.values(ITEMS)) if (d.cat === 'food' && d.eat) d.held = `food:${d.pack || d.eat[1].split(':')[0]}:${d.eat[1].split(':')[1]}`;

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
  magicshop: { title: '마법봉 공방', subtitle: '속성 지팡이 · 마나 물약' },
  dealer: { title: '바퀴 모터스 쇼룸', subtitle: '새 차 구매 · 차 키로 언제든 호출' },
  armory_3k: { title: '관우네 병기점', subtitle: '삼국지 영웅들의 무기와 갑옷' },
  armory_mil: { title: '바퀴 택티컬', subtitle: '현대 밀리터리 장비 · 전차 · 헬기' },
  armory_sf: { title: '은하 무기상', subtitle: '먼 미래, 아주 먼 은하의 무기' },
  jeweler: { title: '반짝 보석상', subtitle: '보석 판매 · 무기와 방어구 인챈트' },
  hatshop: { title: '더듬이 캡', subtitle: '모든 머리 크기의 모자' },
  eyewear: { title: '눈부심 안경원', subtitle: '선글라스와 안경' },
  clothing: { title: '여섯다리 패션', subtitle: '옷과 액세서리' },
  convenience: { title: '편의점', subtitle: '간식 · 도시락 · 인형' },
  pizza: { title: '피자집', subtitle: '갓 구운 피자 (포장 가능)' },
  chicken: { title: '치킨집', subtitle: '바삭바삭 치킨 (포장 가능)' },
  chinese: { title: '중국집', subtitle: '짜장 · 짬뽕 · 탕수육' },
  gukbap: { title: '국밥집', subtitle: '뜨끈한 국밥 한 그릇' },
  burger: { title: '버거집', subtitle: '버거 · 감튀 · 쉐이크' },
  bunsik: { title: '분식집', subtitle: '떡볶이 · 라면 · 김밥' },
  restaurant: { title: '한식당', subtitle: '든든한 한 끼' },
  bakery: { title: '빵집', subtitle: '갓 구운 빵' },
  cafe: { title: '카페', subtitle: '테이크아웃' },
  pharmacy: { title: '약국', subtitle: '구급상자' },
  flowershop: { title: '꽃집', subtitle: '꽃과 인형' },
  bookstore: { title: '서점', subtitle: '책과 인형' },
};

export function shopItems(type) {
  return Object.entries(ITEMS).filter(([, d]) => d.shop === type || d.shops?.includes(type)).map(([id]) => id);
}

export const itemDef = (id) => ITEMS[id] || ITEMS.fist;
export const isWeapon = (d) => ['melee', 'gun', 'throw', 'launcher', 'wand'].includes(d.cat);
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

export const CLUB_CHARM = 0; // 매력과 상관없이 누구나 클럽 입장

// ---------------- 희귀도 (맵에 떨어지는 무기) ----------------
export const RARITY = {
  common: { name: '일반', color: '#cfd8dc', weight: 50 },
  rare: { name: '고급', color: '#40c4ff', weight: 30 },
  epic: { name: '희귀', color: '#d500f9', weight: 15 },
  legendary: { name: '전설', color: '#ffab00', weight: 5 },
};
const RARITY_OF = {
  common: ['wood_sword', 'iron_sword', 'combat_knife', 'pistol', 'bow'],
  rare: ['qinggang', 'twin_swords', 'shotgun', 'blaster', 'composite_bow', 'grenade'],
  epic: ['serpent_spear', 'rifle', 'sniper', 'blaster_rifle', 'rpg', 'zhuge_crossbow', 'thermal'],
  legendary: ['halberd', 'dragon_glaive', 'yitian', 'minigun', 'saber_blue', 'saber_red', 'saber_green', 'ion_cannon'],
};
export const rarityOf = (id) => Object.keys(RARITY_OF).find((r) => RARITY_OF[r].includes(id)) || 'common';
export const DROP_POOL = RARITY_OF;
export const TEMP_MINUTES = 30;

// 무기에 맞는 탄약 이름
export const ammoName = (ammoId) => (ITEMS[ammoId]?.name || '').replace(/ ×\d+$/, '');
