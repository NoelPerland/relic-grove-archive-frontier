import "./styles.css";

type Mode = "title" | "playing" | "paused" | "won" | "lost";
type Facing = "south" | "east" | "north" | "west";
type Slot = "sword" | "pick" | "potion";
type EnemyKind = "slime" | "bat" | "crystal" | "golem";
type LootKind = "gold" | "ore" | "heart" | "relic" | "goo" | "wing" | "core";
type InventoryKey = "ore" | "potions" | "goo" | "wings" | "cores" | "relics";

type Vec = { x: number; y: number };
type Circle = Vec & { r: number };
type Enemy = Circle & {
  id: number;
  kind: EnemyKind;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  xp: number;
  gold: number;
  attackTimer: number;
  hurtTimer: number;
  alive: boolean;
};
type ResourceNode = Circle & {
  id: number;
  hp: number;
  maxHp: number;
  cooldown: number;
  sparkle: number;
};
type LootDrop = Circle & {
  id: number;
  kind: LootKind;
  amount: number;
  life: number;
};
type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
};
type FloatText = {
  text: string;
  x: number;
  y: number;
  vy: number;
  life: number;
  color: string;
};
type Upgrade = {
  id: string;
  title: string;
  desc: string;
  costGold: number;
  costShards: number;
  icon: number;
  maxed: () => boolean;
  buy: () => void;
};
type InventoryRow = {
  key: InventoryKey;
  name: string;
  count: number;
  desc: string;
  sellGold: number;
  sellable: boolean;
  icon: number;
};

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const ctx = canvas.getContext("2d")!;
const panel = document.querySelector<HTMLElement>("#panel")!;
const primaryBtn = document.querySelector<HTMLButtonElement>("#primary")!;
const pauseBtn = document.querySelector<HTMLButtonElement>("#pause")!;
const muteBtn = document.querySelector<HTMLButtonElement>("#mute")!;
const motionBtn = document.querySelector<HTMLButtonElement>("#motion")!;
const shop = document.querySelector<HTMLElement>("#shop")!;
const shopItems = document.querySelector<HTMLElement>("#shopItems")!;
const closeShopBtn = document.querySelector<HTMLButtonElement>("#closeShop")!;
const shopStats = document.querySelector<HTMLElement>("#shopStats")!;
const shopHint = document.querySelector<HTMLButtonElement>("#shopHint")!;
const inventory = document.querySelector<HTMLElement>("#inventory")!;
const inventoryBtn = document.querySelector<HTMLButtonElement>("#inventoryBtn")!;
const inventoryItems = document.querySelector<HTMLElement>("#inventoryItems")!;
const inventoryStats = document.querySelector<HTMLElement>("#inventoryStats")!;
const closeInventoryBtn = document.querySelector<HTMLButtonElement>("#closeInventory")!;

const hpFill = document.querySelector<HTMLElement>("#hpFill")!;
const xpFill = document.querySelector<HTMLElement>("#xpFill")!;
const hpText = document.querySelector<HTMLElement>("#hpText")!;
const xpText = document.querySelector<HTMLElement>("#xpText")!;
const levelText = document.querySelector<HTMLElement>("#level")!;
const goldText = document.querySelector<HTMLElement>("#gold")!;
const shardsText = document.querySelector<HTMLElement>("#shards")!;
const waveText = document.querySelector<HTMLElement>("#wave")!;
const quickButtons = Array.from(document.querySelectorAll<HTMLButtonElement>("#quickbar button[data-slot]"));

const WORLD_W = 2200;
const WORLD_H = 1600;
const DPR_MAX = 2;
const ASSET_QA = new URLSearchParams(window.location.search).has("assetQa");
const CAMP = { x: 340, y: 1130 };
const SHOP_NPC = { x: 430, y: 1060 };
const BOSS_GATE = { x: 1760, y: 265 };
const SHOP_RANGE = 150;
const GATHER_RANGE = 120;

let dpr = 1;
let mode: Mode = "title";
let camera = { x: 0, y: 0, scale: 1 };
let lastTime = performance.now();
let nextId = 1;
let elapsed = 0;
let selectedSlot: Slot = "sword";
let muted = false;
let reducedMotion = false;
let audioReady = false;
let audio: AudioContext | null = null;
const music = new Audio("/assets/adventure-medieval-fantasy.mp3");
music.loop = true;
music.volume = 0.22;
music.preload = "auto";
let shake = 0;
let bossSpawned = false;
let bossDefeated = false;
let bestLevel = Number(localStorage.getItem("relic-grove-best-level") || 1);
let bestClear = localStorage.getItem("relic-grove-boss-clear") === "true";

const heroSheet = image("/assets/hero-rpg-sheet.png");
const enemySheet = image("/assets/enemy-sheet.png");
const bossSheet = image("/assets/boss-golem-sheet.png");
const tileset = image("/assets/tileset-grove.png");
const itemIcons = image("/assets/item-icons.png");
const terrainProps = image("/assets/terrain-props.png");
const lakeProp = image("/assets/lake-prop.png");
const campShop = image("/assets/camp-shop-opaque.png");

const HERO_FRAME_RECTS: Partial<Record<number, { sx: number; sy: number; sw: number; sh: number; scale: number }>> = {
  0: { sx: 88, sy: 22, sw: 150, sh: 170, scale: 0.64 },
  1: { sx: 60, sy: 18, sw: 154, sh: 174, scale: 0.64 },
  2: { sx: 18, sy: 18, sw: 184, sh: 174, scale: 0.64 },
  4: { sx: 84, sy: 12, sw: 152, sh: 164, scale: 0.66 },
  5: { sx: 60, sy: 14, sw: 154, sh: 178, scale: 0.64 },
  6: { sx: 18, sy: 16, sw: 184, sh: 170, scale: 0.64 },
  8: { sx: 72, sy: 0, sw: 170, sh: 164, scale: 0.66 },
  9: { sx: 40, sy: 0, sw: 176, sh: 166, scale: 0.66 },
  10: { sx: 12, sy: 0, sw: 180, sh: 164, scale: 0.66 },
  11: { sx: 0, sy: 0, sw: 156, sh: 150, scale: 0.72 },
  12: { sx: 60, sy: 0, sw: 178, sh: 146, scale: 0.72 },
  13: { sx: 48, sy: 0, sw: 188, sh: 154, scale: 0.72 },
  14: { sx: 0, sy: 0, sw: 220, sh: 154, scale: 0.72 },
  15: { sx: 0, sy: 0, sw: 116, sh: 150, scale: 0.72 },
};

const ENEMY_FRAME_RECTS: Partial<Record<number, { sx: number; sy: number; sw: number; sh: number }>> = {
  4: { sx: 14, sy: 42, sw: 238, sh: 150 },
  5: { sx: 18, sy: 12, sw: 232, sh: 180 },
  6: { sx: 0, sy: 42, sw: 242, sh: 150 },
  7: { sx: 0, sy: 30, sw: 210, sh: 156 },
  8: { sx: 34, sy: 0, sw: 188, sh: 162 },
  9: { sx: 0, sy: 0, sw: 256, sh: 166 },
  10: { sx: 0, sy: 0, sw: 256, sh: 162 },
  11: { sx: 0, sy: 0, sw: 228, sh: 166 },
};

const BOSS_FRAME_RECTS: Record<number, { sx: number; sy: number; sw: number; sh: number }> = {
  0: { sx: 0, sy: 132, sw: 522, sh: 592 },
  1: { sx: 34, sy: 148, sw: 506, sh: 456 },
  2: { sx: 0, sy: 170, sw: 500, sh: 462 },
  3: { sx: 20, sy: 150, sw: 500, sh: 574 },
};

const keys = new Set<string>();
const pointer = { x: 0, y: 0, down: false };
const moveTarget: Vec = { x: CAMP.x, y: CAMP.y };
let hasMoveTarget = false;
let targetEnemyId: number | null = null;
let targetNodeId: number | null = null;

const player = {
  x: CAMP.x,
  y: CAMP.y,
  r: 28,
  vx: 0,
  vy: 0,
  facing: "south" as Facing,
  anim: 0,
  attackTimer: 0,
  gatherTimer: 0,
  hurtTimer: 0,
  potionTimer: 0,
  hp: 34,
  maxHp: 34,
  level: 1,
  xp: 0,
  xpToNext: 100,
  attack: 7,
  defense: 1,
  gold: 0,
  shards: 0,
  potions: 2,
  weaponTier: 0,
  armorTier: 0,
  pickTier: 0,
  wave: 1,
  waveKills: 0,
  waveGoal: 5,
};

const inventoryState = {
  ore: 0,
  potions: 2,
  goo: 0,
  wings: 0,
  cores: 0,
  relics: 0,
};

const enemies: Enemy[] = [];
const nodes: ResourceNode[] = [];
const loots: LootDrop[] = [];
const particles: Particle[] = [];
const floatTexts: FloatText[] = [];
const obstacles: Circle[] = [];

function image(src: string) {
  const img = new Image();
  img.src = src;
  return img;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function hash2(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

function distance(a: Vec, b: Vec) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function resize() {
  dpr = Math.min(DPR_MAX, window.devicePixelRatio || 1);
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
}

function worldFromScreen(clientX: number, clientY: number): Vec {
  const rect = canvas.getBoundingClientRect();
  return {
    x: camera.x + (clientX - rect.left) / camera.scale,
    y: camera.y + (clientY - rect.top) / camera.scale,
  };
}

function resetGame() {
  mode = "playing";
  panel.hidden = true;
  shop.hidden = true;
  inventory.hidden = true;
  elapsed = 0;
  nextId = 1;
  bossSpawned = false;
  bossDefeated = false;
  selectedSlot = "sword";
  shake = 0;
  hasMoveTarget = false;
  targetEnemyId = null;
  targetNodeId = null;
  enemies.length = 0;
  nodes.length = 0;
  loots.length = 0;
  particles.length = 0;
  floatTexts.length = 0;
  obstacles.length = 0;

  Object.assign(player, {
    x: CAMP.x,
    y: CAMP.y,
    vx: 0,
    vy: 0,
    facing: "south",
    anim: 0,
    attackTimer: 0,
    gatherTimer: 0,
    hurtTimer: 0,
    potionTimer: 0,
    hp: 34,
    maxHp: 34,
    level: 1,
    xp: 0,
    xpToNext: 100,
    attack: 7,
    defense: 1,
    gold: 20,
    shards: 0,
    potions: 2,
    weaponTier: 0,
    armorTier: 0,
    pickTier: 0,
    wave: 1,
    waveKills: 0,
    waveGoal: 5,
  });
  Object.assign(inventoryState, { ore: 0, potions: 2, goo: 0, wings: 0, cores: 0, relics: 0 });
  if (ASSET_QA) {
    player.attack = 999;
    player.x = CAMP.x + 330;
    player.y = CAMP.y - 250;
    Object.assign(moveTarget, { x: player.x, y: player.y });
  }

  buildWorld();
  spawnNodes();
  spawnWave();
  if (ASSET_QA) {
    nodes.push({ id: nextId++, x: player.x + 130, y: player.y + 10, r: 34, hp: 3, maxHp: 3, cooldown: 0, sparkle: 0 });
    spawnEnemy("crystal", player.x + 190, player.y - 10);
    bossSpawned = true;
    spawnEnemy("golem", player.x + 120, player.y + 15);
  }
  float("Bounty wave 1", player.x, player.y - 54, "#ffdc63");
  syncMusic();
  tone(392, 0.08, "triangle", 0.07);
}

function buildWorld() {
  for (let i = 0; i < 34; i += 1) {
    addObstacle(rand(80, WORLD_W - 80), rand(80, WORLD_H - 80), rand(28, 52));
  }
  [
    [195, 1110, 58],
    [210, 1240, 44],
    [610, 350, 70],
    [710, 390, 46],
    [1190, 1190, 62],
    [1320, 1280, 42],
    [1780, 355, 78],
    [1860, 365, 58],
    [1610, 880, 54],
    [1690, 950, 38],
  ].forEach(([x, y, r]) => addObstacle(x, y, r));
}

function addObstacle(x: number, y: number, r: number) {
  if (distance({ x, y }, CAMP) < 260 || distance({ x, y }, BOSS_GATE) < 210) return;
  obstacles.push({ x, y, r });
}

function spawnNodes() {
  [
    [1430, 970],
    [1530, 1090],
    [1680, 980],
    [1760, 1115],
    [1320, 1230],
  ].forEach(([x, y]) => {
    nodes.push({ id: nextId++, x, y, r: 34, hp: 3, maxHp: 3, cooldown: 0, sparkle: rand(0, 10) });
  });
}

function spawnWave() {
  const kindPool: EnemyKind[] =
    player.wave === 1 ? ["slime", "slime", "bat"] : player.wave === 2 ? ["slime", "bat", "crystal"] : ["bat", "crystal"];
  const count = player.waveGoal - player.waveKills;
  for (let i = 0; i < count; i += 1) spawnEnemy(kindPool[Math.floor(rand(0, kindPool.length))], 880 + rand(-180, 250), 620 + rand(-260, 240));
}

function spawnEnemy(kind: EnemyKind, x: number, y: number) {
  const waveBoost = player.wave * 3;
  const base =
    kind === "slime"
      ? { hp: 18, speed: 78, damage: 4, xp: 22, gold: 8, r: 26 }
      : kind === "bat"
        ? { hp: 16, speed: 118, damage: 5, xp: 27, gold: 10, r: 25 }
        : kind === "crystal"
          ? { hp: 24, speed: 72, damage: 7, xp: 38, gold: 14, r: 28 }
          : { hp: 170, speed: 62, damage: 12, xp: 160, gold: 90, r: 54 };
  enemies.push({
    id: nextId++,
    kind,
    x,
    y,
    r: base.r,
    hp: base.hp + waveBoost * (kind === "golem" ? 8 : 1),
    maxHp: base.hp + waveBoost * (kind === "golem" ? 8 : 1),
    speed: base.speed,
    damage: base.damage + Math.floor(player.wave * 0.8),
    xp: base.xp,
    gold: base.gold,
    attackTimer: rand(0, 0.6),
    hurtTimer: 0,
    alive: true,
  });
}

function update(dtRaw: number) {
  const dt = Math.min(0.033, dtRaw);
  if (mode !== "playing") {
    updateFx(dt);
    return;
  }

  elapsed += dt;
  player.attackTimer = Math.max(0, player.attackTimer - dt);
  player.gatherTimer = Math.max(0, player.gatherTimer - dt);
  player.hurtTimer = Math.max(0, player.hurtTimer - dt);
  player.potionTimer = Math.max(0, player.potionTimer - dt);
  shake *= Math.pow(0.01, dt);

  updatePlayer(dt);
  updateEnemies(dt);
  updateNodes(dt);
  updateLoot(dt);
  updateFx(dt);
  updateProgression();
}

function updatePlayer(dt: number) {
  let dx = 0;
  let dy = 0;
  if (keys.has("arrowleft") || keys.has("a")) dx -= 1;
  if (keys.has("arrowright") || keys.has("d")) dx += 1;
  if (keys.has("arrowup") || keys.has("w")) dy -= 1;
  if (keys.has("arrowdown") || keys.has("s")) dy += 1;

  if (dx !== 0 || dy !== 0) {
    hasMoveTarget = false;
    const len = Math.hypot(dx, dy) || 1;
    movePlayer((dx / len) * 220 * dt, (dy / len) * 220 * dt);
  } else if (hasMoveTarget) {
    const tx = moveTarget.x - player.x;
    const ty = moveTarget.y - player.y;
    const len = Math.hypot(tx, ty);
    if (len < 8) hasMoveTarget = false;
    else movePlayer((tx / len) * 205 * dt, (ty / len) * 205 * dt);
  }

  if (targetEnemyId != null) {
    const enemy = enemies.find((item) => item.id === targetEnemyId && item.alive);
    if (!enemy) targetEnemyId = null;
    else if (distance(player, enemy) <= attackRange()) attack(enemy);
    else {
      moveTarget.x = enemy.x;
      moveTarget.y = enemy.y;
      hasMoveTarget = true;
    }
  }

  if (targetNodeId != null) {
    const node = nodes.find((item) => item.id === targetNodeId);
    if (!node || node.cooldown > 0) targetNodeId = null;
    else if (distance(player, node) <= GATHER_RANGE) gather(node);
    else {
      moveTarget.x = node.x;
      moveTarget.y = node.y;
      hasMoveTarget = true;
    }
  }
}

function movePlayer(dx: number, dy: number) {
  const oldX = player.x;
  const oldY = player.y;
  player.x = clamp(player.x + dx, 58, WORLD_W - 58);
  player.y = clamp(player.y + dy, 58, WORLD_H - 58);
  for (const obstacle of obstacles) pushOut(player, obstacle);
  if (Math.abs(player.x - oldX) + Math.abs(player.y - oldY) > 0.01) {
    player.anim += 0.075;
    if (Math.abs(dx) > Math.abs(dy) * 1.25) player.facing = dx < 0 ? "west" : "east";
    else if (Math.abs(dy) > Math.abs(dx) * 1.25) player.facing = dy < 0 ? "north" : "south";
  }
}

function updateEnemies(dt: number) {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
    enemy.hurtTimer = Math.max(0, enemy.hurtTimer - dt);
    const d = distance(enemy, player);
    if (d < (enemy.kind === "golem" ? 620 : 430)) {
      const speed = enemy.speed * (enemy.hurtTimer > 0 ? 0.45 : 1);
      if (d > enemyAttackRange(enemy)) {
        const vx = ((player.x - enemy.x) / d) * speed * dt;
        const vy = ((player.y - enemy.y) / d) * speed * dt;
        enemy.x += vx;
        enemy.y += vy;
        for (const obstacle of obstacles) pushOut(enemy, obstacle);
      } else if (enemy.attackTimer <= 0) {
        damagePlayer(Math.max(1, enemy.damage - player.defense), enemy);
        enemy.attackTimer = enemy.kind === "golem" ? 1.2 : 0.9;
      }
    }
  }
}

function updateNodes(dt: number) {
  for (const node of nodes) {
    node.cooldown = Math.max(0, node.cooldown - dt);
    node.sparkle += dt;
    if (node.cooldown <= 0 && node.hp <= 0) node.hp = node.maxHp;
  }
}

function updateLoot(dt: number) {
  for (let i = loots.length - 1; i >= 0; i -= 1) {
    const loot = loots[i];
    loot.life -= dt;
    if (distance(player, loot) < player.r + loot.r + 20) {
      collectLoot(loot);
      loots.splice(i, 1);
    } else if (loot.life <= 0) {
      loots.splice(i, 1);
    }
  }
}

function updateProgression() {
  const aliveRegular = enemies.some((enemy) => enemy.alive && enemy.kind !== "golem");
  if (!aliveRegular && player.waveKills < player.waveGoal && !bossSpawned) spawnWave();
  if (player.waveKills >= player.waveGoal && player.wave < 3) {
    player.wave += 1;
    player.waveKills = 0;
    player.waveGoal = 5 + player.wave * 2;
    player.gold += 25;
    player.potions = Math.min(3, player.potions + 1);
    inventoryState.potions = player.potions;
    float(`Wave ${player.wave}`, player.x, player.y - 54, "#ffdc63");
    spawnWave();
  }
  if (player.wave >= 3 && player.waveKills >= player.waveGoal && !bossSpawned) {
    bossSpawned = true;
    spawnEnemy("golem", BOSS_GATE.x, BOSS_GATE.y + 90);
    float("Boss gate opens", BOSS_GATE.x, BOSS_GATE.y + 130, "#ff5b68");
    tone(130, 0.22, "sawtooth", 0.07);
  }
}

function attack(enemy?: Enemy) {
  if (player.attackTimer > 0) return;
  const target = enemy ?? nearestEnemy();
  if (!target || distance(player, target) > attackRange()) return;
  player.attackTimer = 0.48;
  player.facing = Math.abs(target.x - player.x) > Math.abs(target.y - player.y) ? (target.x < player.x ? "west" : "east") : target.y < player.y ? "north" : "south";
  const weaponBonus = [0, 5, 12][player.weaponTier];
  const damage = Math.floor(player.attack + weaponBonus + rand(0, 4));
  target.hp -= damage;
  target.hurtTimer = 0.25;
  burst(target.x, target.y, 14, "#ffdc63");
  float(`-${damage}`, target.x, target.y - 34, "#ffdc63");
  tone(230 + damage * 9, 0.045, "square", 0.04);
  if (target.hp <= 0) killEnemy(target);
}

function nearestEnemy() {
  return enemies
    .filter((enemy) => enemy.alive)
    .sort((a, b) => distance(player, a) - distance(player, b))[0];
}

function attackRange() {
  return 148 + player.weaponTier * 16;
}

function enemyAttackRange(enemy: Enemy) {
  return enemy.kind === "golem" ? 88 : 54;
}

function killEnemy(enemy: Enemy) {
  enemy.alive = false;
  enemy.hp = 0;
  player.waveKills += enemy.kind === "golem" ? 0 : 1;
  gainXp(enemy.xp);
  dropLoot(enemy.x, enemy.y, "gold", enemy.gold + Math.floor(rand(0, 7)));
  if (enemy.kind === "slime") dropLoot(enemy.x + 18, enemy.y - 4, "goo", 1);
  if (enemy.kind === "bat") dropLoot(enemy.x + 18, enemy.y - 4, "wing", 1);
  if (enemy.kind === "crystal") dropLoot(enemy.x + 18, enemy.y - 4, "core", 1);
  if (Math.random() < 0.55 || enemy.kind === "crystal") dropLoot(enemy.x + 18, enemy.y - 4, "ore", enemy.kind === "crystal" ? 2 : 1);
  if (Math.random() < 0.18) dropLoot(enemy.x - 16, enemy.y + 8, "heart", 1);
  burst(enemy.x, enemy.y, enemy.kind === "golem" ? 60 : 28, enemy.kind === "golem" ? "#7be7ff" : "#50f1c7");
  if (enemy.kind === "golem") {
    bossDefeated = true;
    bestClear = true;
    localStorage.setItem("relic-grove-boss-clear", "true");
    dropLoot(enemy.x, enemy.y, "relic", 1);
    player.gold += 100;
    player.shards += 12;
    float("Boss defeated", enemy.x, enemy.y - 82, "#ffdc63");
  }
}

function gather(node?: ResourceNode) {
  if (player.gatherTimer > 0) return;
  const target = node ?? nearestNode();
  if (!target || target.cooldown > 0 || distance(player, target) > GATHER_RANGE) return;
  player.gatherTimer = 0.75;
  target.hp -= 1 + player.pickTier;
  burst(target.x, target.y, 12, "#7be7ff");
  tone(520, 0.05, "triangle", 0.04);
  if (target.hp <= 0) {
    const amount = 2 + player.pickTier;
    gainXp(18 + player.pickTier * 8);
    dropLoot(target.x, target.y, "ore", amount);
    target.cooldown = 8;
    targetNodeId = null;
  }
}

function nearestNode() {
  return nodes
    .filter((node) => node.cooldown <= 0)
    .sort((a, b) => distance(player, a) - distance(player, b))[0];
}

function damagePlayer(amount: number, source: Vec) {
  if (player.hurtTimer > 0) return;
  player.hp -= amount;
  player.hurtTimer = 0.65;
  const d = Math.max(1, distance(player, source));
  player.x += ((player.x - source.x) / d) * 18;
  player.y += ((player.y - source.y) / d) * 18;
  burst(player.x, player.y, 18, "#ff5b68");
  float(`-${amount}`, player.x, player.y - 38, "#ff5b68");
  shake = reducedMotion ? 0 : 7;
  tone(100, 0.12, "sawtooth", 0.06);
  if (player.hp <= 0) endGame(false);
}

function usePotion() {
  if (inventoryState.potions <= 0 || player.potionTimer > 0 || player.hp >= player.maxHp) return;
  player.potions -= 1;
  inventoryState.potions -= 1;
  player.hp = Math.min(player.maxHp, player.hp + 22);
  player.potionTimer = 1;
  burst(player.x, player.y, 24, "#ff5b68");
  float("+HP", player.x, player.y - 42, "#ff5b68");
  tone(680, 0.08, "sine", 0.05);
}

function gainXp(amount: number) {
  player.xp += amount;
  while (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    player.level += 1;
    player.xpToNext = Math.floor(player.xpToNext * 1.35);
    player.attack += 2;
    player.maxHp += 6;
    player.hp = player.maxHp;
    bestLevel = Math.max(bestLevel, player.level);
    localStorage.setItem("relic-grove-best-level", String(bestLevel));
    float(`LEVEL ${player.level}`, player.x, player.y - 64, "#ffdc63");
    burst(player.x, player.y, 45, "#ffdc63");
  }
}

function dropLoot(x: number, y: number, kind: LootKind, amount: number) {
  loots.push({ id: nextId++, x: x + rand(-16, 16), y: y + rand(-16, 16), r: 16, kind, amount, life: 18 });
}

function collectLoot(loot: LootDrop) {
  if (loot.kind === "gold") player.gold += loot.amount;
  if (loot.kind === "ore") {
    player.shards += loot.amount;
    inventoryState.ore += loot.amount;
  }
  if (loot.kind === "heart") player.hp = Math.min(player.maxHp, player.hp + 12);
  if (loot.kind === "relic") {
    player.gold += 150;
    inventoryState.relics += loot.amount;
  }
  if (loot.kind === "goo") inventoryState.goo += loot.amount;
  if (loot.kind === "wing") inventoryState.wings += loot.amount;
  if (loot.kind === "core") inventoryState.cores += loot.amount;
  float(loot.kind === "gold" ? `+${loot.amount}g` : loot.kind === "ore" ? `+${loot.amount} ore` : loot.kind === "heart" ? "+HP" : `+${loot.kind}`, loot.x, loot.y - 16, loot.kind === "heart" ? "#ff5b68" : "#ffdc63");
  tone(760, 0.04, "sine", 0.035);
}

function openShop() {
  if (distance(player, SHOP_NPC) > SHOP_RANGE || mode !== "playing") return;
  shop.hidden = false;
  renderShop();
}

function renderShop() {
  shopStats.textContent = `Gold ${player.gold} | Shards ${player.shards} | Best level ${bestLevel}${bestClear ? " | boss cleared" : ""}`;
  shopItems.innerHTML = "";
  for (const upgrade of upgrades()) {
    const btn = document.createElement("button");
    const maxed = upgrade.maxed();
    const affordable = player.gold >= upgrade.costGold && player.shards >= upgrade.costShards;
    btn.disabled = maxed || !affordable;
    btn.innerHTML = `${itemIcon(upgrade.icon)}<span><strong>${upgrade.title}</strong><small>${maxed ? "Maxed" : `${upgrade.desc} | ${upgrade.costGold} gold, ${upgrade.costShards} shards`}</small></span>`;
    btn.addEventListener("click", () => {
      if (upgrade.maxed() || player.gold < upgrade.costGold || player.shards < upgrade.costShards) return;
      player.gold -= upgrade.costGold;
      player.shards -= upgrade.costShards;
      inventoryState.ore = Math.max(0, inventoryState.ore - upgrade.costShards);
      upgrade.buy();
      renderShop();
      tone(880, 0.08, "triangle", 0.05);
    });
    shopItems.appendChild(btn);
  }
  const title = document.createElement("div");
  title.className = "shop-section-title";
  title.textContent = "Sell Inventory";
  shopItems.appendChild(title);
  const sellRows = inventoryRows().filter((row) => row.sellable);
  if (!sellRows.length) {
    const empty = document.createElement("div");
    empty.className = "empty-bag";
    empty.textContent = "Bag empty";
    shopItems.appendChild(empty);
  }
  for (const row of sellRows) {
    const btn = document.createElement("button");
    btn.className = "sell-item";
    btn.innerHTML = `${itemIcon(row.icon)}<span><strong>${row.count} x ${row.name}</strong><small>Sell 1 for ${row.sellGold} gold</small></span>`;
    btn.addEventListener("click", () => sellInventoryItem(row.key));
    shopItems.appendChild(btn);
  }
}

function openInventory() {
  inventory.hidden = false;
  renderInventory();
}

function renderInventory() {
  inventoryStats.textContent = `Level ${player.level} | Best ${bestLevel}${bestClear ? " | boss cleared" : ""}`;
  const rows = inventoryRows().filter((row) => row.count > 0);
  inventoryItems.innerHTML = rows.length
    ? rows.map((row) => `<div>${itemIcon(row.icon)}<span><strong>${row.count} x ${row.name}</strong><small>${row.desc}</small></span></div>`).join("")
    : `<div class="empty-bag">Bag empty</div>`;
}

function inventoryRows(): InventoryRow[] {
  return [
    { key: "ore", name: "Crystal Ore", count: inventoryState.ore, desc: "Mined from blue crystals. Used as shards for upgrades.", sellGold: 2, sellable: inventoryState.ore > 0 && player.shards > 0, icon: 8 },
    { key: "potions", name: "Potions", count: inventoryState.potions, desc: "Drink with 3 for emergency healing.", sellGold: 5, sellable: inventoryState.potions > 0, icon: 9 },
    { key: "goo", name: "Slime Goo", count: inventoryState.goo, desc: "Monster loot from slimes.", sellGold: 3, sellable: inventoryState.goo > 0, icon: 10 },
    { key: "wings", name: "Bat Wings", count: inventoryState.wings, desc: "Monster loot from bats.", sellGold: 4, sellable: inventoryState.wings > 0, icon: 11 },
    { key: "cores", name: "Crystal Cores", count: inventoryState.cores, desc: "Monster loot from crystal sprites.", sellGold: 10, sellable: inventoryState.cores > 0, icon: 8 },
    { key: "relics", name: "Relics", count: inventoryState.relics, desc: "Boss and rare treasure loot.", sellGold: 45, sellable: inventoryState.relics > 0, icon: 10 },
  ];
}

function itemIcon(frame: number) {
  const col = frame % 4;
  const row = Math.floor(frame / 4);
  return `<i class="item-icon" style="background-position:${-col * 42}px ${-row * 42}px"></i>`;
}

function sellInventoryItem(key: InventoryKey) {
  const row = inventoryRows().find((item) => item.key === key);
  if (!row?.sellable) return;
  inventoryState[key] -= 1;
  if (key === "potions") player.potions = Math.max(0, player.potions - 1);
  if (key === "ore") player.shards = Math.max(0, player.shards - 1);
  player.gold += row.sellGold;
  renderShop();
  tone(620, 0.06, "triangle", 0.04);
}

function upgrades(): Upgrade[] {
  return [
    {
      id: "weapon",
      title: ["Iron Blade", "Crystal Blade", "Weapon Maxed"][player.weaponTier],
      desc: "More attack damage",
      costGold: player.weaponTier === 0 ? 70 : 160,
      costShards: player.weaponTier === 0 ? 4 : 12,
      icon: player.weaponTier === 0 ? 1 : 2,
      maxed: () => player.weaponTier >= 2,
      buy: () => {
        player.weaponTier += 1;
      },
    },
    {
      id: "armor",
      title: ["Hide Vest", "Stone Vest", "Armor Maxed"][player.armorTier],
      desc: "More defense and HP",
      costGold: player.armorTier === 0 ? 55 : 135,
      costShards: player.armorTier === 0 ? 3 : 10,
      icon: player.armorTier === 0 ? 3 : 4,
      maxed: () => player.armorTier >= 2,
      buy: () => {
        player.armorTier += 1;
        player.defense += 2;
        player.maxHp += 10;
        player.hp = player.maxHp;
      },
    },
    {
      id: "pick",
      title: ["Copper Pick", "Crystal Pick", "Pick Maxed"][player.pickTier],
      desc: "Mine faster and gain more shards",
      costGold: player.pickTier === 0 ? 20 : 120,
      costShards: player.pickTier === 0 ? 0 : 9,
      icon: player.pickTier === 0 ? 5 : 6,
      maxed: () => player.pickTier >= 2,
      buy: () => {
        player.pickTier += 1;
      },
    },
    {
      id: "potion",
      title: "Potion Pack",
      desc: "Refill to 3 potions",
      costGold: 25,
      costShards: 0,
      icon: 9,
      maxed: () => player.potions >= 3,
      buy: () => {
        player.potions = 3;
        inventoryState.potions = 3;
      },
    },
  ];
}

function endGame(won: boolean) {
  mode = won ? "won" : "lost";
  panel.querySelector("h1")!.textContent = won ? "Golem Defeated" : "Adventure Over";
  panel.querySelector("p")!.textContent = won
    ? "Relic Grove is safe. Grind faster, upgrade cleaner, and beat your route."
    : "You fell in the grove. Keep gear upgrades and routes sharper next run.";
  primaryBtn.textContent = "Restart";
  panel.hidden = false;
}

function render() {
  updateCamera();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  drawBackdrop();
  const sx = reducedMotion ? 0 : rand(-shake, shake);
  const sy = reducedMotion ? 0 : rand(-shake, shake);
  ctx.save();
  ctx.scale(camera.scale, camera.scale);
  ctx.translate(-camera.x + sx, -camera.y + sy);
  drawWorld();
  ctx.restore();
}

function updateCamera() {
  const targetScale = window.innerWidth < 700 ? 0.82 : Math.min(window.innerWidth / 1280, window.innerHeight / 720) * 1.08;
  camera.scale += (clamp(targetScale, 0.58, 1.25) - camera.scale) * 0.08;
  const viewW = window.innerWidth / camera.scale;
  const viewH = window.innerHeight / camera.scale;
  camera.x += (clamp(player.x - viewW * 0.5, 0, WORLD_W - viewW) - camera.x) * 0.12;
  camera.y += (clamp(player.y - viewH * 0.52, 0, WORLD_H - viewH) - camera.y) * 0.12;
}

function drawBackdrop() {
  const g = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
  g.addColorStop(0, "#07100d");
  g.addColorStop(1, "#120817");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

function drawWorld() {
  drawTerrain();
  drawLoot();
  drawSortedActors();
  drawFx();
  drawLabels();
}

function drawTerrain() {
  ctx.fillStyle = "#274f2f";
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  for (let y = 0; y < WORLD_H; y += 120) {
    for (let x = 0; x < WORLD_W; x += 120) {
      const tone = hash2(x, y);
      const px = x + 18 + hash2(y, x) * 84;
      const py = y + 18 + hash2(x + 5, y - 3) * 84;
      const radius = 42 + tone * 34;
      const grassGlow = ctx.createRadialGradient(px, py, 0, px, py, radius);
      grassGlow.addColorStop(0, tone > 0.5 ? "rgba(57,112,62,0.28)" : "rgba(18,55,32,0.22)");
      grassGlow.addColorStop(1, "rgba(39,79,47,0)");
      ctx.fillStyle = grassGlow;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
      if (tone > 0.74) {
        const frame = tone > 0.9 ? 1 : 0;
        drawProp(frame, px - 29, py - 23, 58, 46);
      }
    }
  }
  drawPath(CAMP.x, CAMP.y, 840, 660, 96);
  drawPath(840, 660, 1520, 1080, 86);
  drawPath(1520, 1080, BOSS_GATE.x, BOSS_GATE.y + 130, 84);
  drawWater(55, 70, 390, 310);
}

function drawPath(x1: number, y1: number, x2: number, y2: number, width: number) {
  ctx.strokeStyle = "#b58a4b";
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.lineWidth = 3;
  ctx.stroke();
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  for (let d = 0; d < len; d += 118) {
    const px = x1 + (dx / len) * d;
    const py = y1 + (dy / len) * d;
    drawProp(3, px - 42, py - 34, 84, 68);
  }
}

function drawWater(x: number, y: number, w: number, h: number) {
  if (lakeProp.complete && lakeProp.naturalWidth > 0) {
    ctx.drawImage(lakeProp, x, y, w, h);
  }
}

function drawSortedActors() {
  const actors: { y: number; draw: () => void }[] = [
    { y: BOSS_GATE.y + 150, draw: drawGate },
    { y: SHOP_NPC.y + 42, draw: drawCamp },
    { y: player.y + 24, draw: drawPlayer },
  ];
  for (const obstacle of obstacles) {
    actors.push({ y: obstacle.y + obstacle.r * 0.42, draw: () => drawObstacle(obstacle) });
  }
  for (const node of nodes) actors.push({ y: node.y + 26, draw: () => drawNode(node) });
  for (const enemy of enemies.filter((item) => item.alive)) actors.push({ y: enemy.y + enemy.r * 0.45, draw: () => drawEnemy(enemy) });
  actors.sort((a, b) => a.y - b.y).forEach((actor) => actor.draw());
}

function drawGate() {
  drawTileset(1020, 575, 500, 285, BOSS_GATE.x - 250, BOSS_GATE.y - 120, 500, 285);
}

function drawObstacle(obstacle: Circle) {
  if (obstacle.r > 58) drawProp(4, obstacle.x - obstacle.r * 1.15, obstacle.y - obstacle.r * 1.95, obstacle.r * 2.3, obstacle.r * 2.45);
  else if (obstacle.r > 48) drawProp(5, obstacle.x - obstacle.r, obstacle.y - obstacle.r * 2.05, obstacle.r * 2, obstacle.r * 2.55);
  else drawProp(obstacle.r > 36 ? 7 : 6, obstacle.x - obstacle.r * 1.3, obstacle.y - obstacle.r * 1.5, obstacle.r * 2.6, obstacle.r * 2.15);
}

function drawCamp() {
  if (campShop.complete && campShop.naturalWidth > 0) {
    ctx.drawImage(campShop, SHOP_NPC.x - 178, SHOP_NPC.y - 172, 356, 251);
    return;
  }
  drawTileset(630, 600, 355, 250, SHOP_NPC.x - 178, SHOP_NPC.y - 172, 356, 251);
}

function drawTileset(sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number) {
  if (tileset.complete && tileset.naturalWidth > 0) {
    ctx.drawImage(tileset, sx, sy, sw, sh, dx, dy, dw, dh);
  }
}

function drawNode(node: ResourceNode) {
  ctx.save();
  ctx.globalAlpha = node.cooldown > 0 ? 0.35 : 1;
  ctx.fillStyle = "rgba(80,241,199,0.2)";
  ctx.beginPath();
  ctx.arc(node.x, node.y, node.r + Math.sin(node.sparkle * 4) * 3, 0, Math.PI * 2);
  ctx.fill();
  drawProp(8, node.x - 66, node.y - 98, 132, 132);
  if (node.cooldown > 0) {
    ctx.fillStyle = "#aebbd2";
    ctx.font = "800 15px Inter, system-ui, sans-serif";
    ctx.fillText(Math.ceil(node.cooldown).toString(), node.x - 6, node.y + 4);
  }
  ctx.restore();
}

function drawProp(frame: number, x: number, y: number, w: number, h: number) {
  drawSheet(terrainProps, 4, 3, frame, x, y, w, h);
}

function drawTree(x: number, y: number, r: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#5b3722";
  roundRect(-10, -18, 20, 44, 7);
  ctx.fill();
  ctx.fillStyle = "#214d2b";
  ctx.beginPath();
  ctx.arc(0, -58, r * 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2f7a3e";
  ctx.beginPath();
  ctx.arc(-24, -48, r * 0.64, 0, Math.PI * 2);
  ctx.arc(24, -48, r * 0.62, 0, Math.PI * 2);
  ctx.arc(0, -78, r * 0.62, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, -58, r * 0.96, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawRock(x: number, y: number, r: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#7c7a6d";
  ctx.beginPath();
  ctx.moveTo(-r, r * 0.35);
  ctx.lineTo(-r * 0.62, -r * 0.45);
  ctx.lineTo(0, -r * 0.72);
  ctx.lineTo(r * 0.7, -r * 0.28);
  ctx.lineTo(r, r * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, -r * 0.25);
  ctx.lineTo(0, -r * 0.5);
  ctx.lineTo(r * 0.38, -r * 0.2);
  ctx.lineTo(-r * 0.1, -r * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCrystalNode(x: number, y: number, r: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "#4e535a";
  ctx.beginPath();
  ctx.ellipse(0, 20, r * 1.15, 16, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 4; i += 1) {
    const px = (i - 1.5) * 16;
    const h = 42 + i * 8;
    ctx.fillStyle = i % 2 ? "#7be7ff" : "#39cbe8";
    ctx.beginPath();
    ctx.moveTo(px, -h);
    ctx.lineTo(px + 13, -4);
    ctx.lineTo(px, 20);
    ctx.lineTo(px - 13, -4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.32)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }
  ctx.restore();
}

function drawLoot() {
  for (const loot of loots) {
    const bob = Math.sin(elapsed * 6 + loot.id) * 4;
    const icon = loot.kind === "gold" ? 7 : loot.kind === "ore" || loot.kind === "core" ? 8 : loot.kind === "heart" ? 9 : 10;
    drawIcon(icon, loot.x - 18, loot.y - 22 + bob, 36, 36);
  }
}

function drawEnemies() {
  for (const enemy of [...enemies].filter((item) => item.alive).sort((a, b) => a.y - b.y)) {
    drawEnemy(enemy);
  }
}

function drawEnemy(enemy: Enemy) {
  const frame = enemy.hurtTimer > 0 ? 3 : distance(enemy, player) < 80 ? 2 : Math.floor(elapsed * 4) % 2;
  const row = enemy.kind === "slime" ? 0 : enemy.kind === "bat" ? 1 : enemy.kind === "crystal" ? 2 : 3;
  const size = enemy.kind === "golem" ? 150 : 82;
  if (distance(player, enemy) < attackRange() + 80) {
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "#ff5b68";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(enemy.x, enemy.y, enemyAttackRange(enemy), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (enemy.kind === "golem") drawBossFrame(frame, enemy.x, enemy.y);
  else drawEnemyFrame(row * 4 + frame, enemy.x, enemy.y, size);
  drawHealth(enemy.x - 36, enemy.y - enemy.r - 34, 72, enemy.hp / enemy.maxHp, "#ff5b68");
}

function drawEnemyFrame(frame: number, x: number, y: number, size: number) {
  const rect = ENEMY_FRAME_RECTS[frame];
  if (!rect || !enemySheet.complete || enemySheet.naturalWidth <= 0) {
    drawSheet(enemySheet, 4, 4, frame, x - size / 2, y - size * 0.72, size, size);
    return;
  }
  const cellW = enemySheet.naturalWidth / 4;
  const cellH = enemySheet.naturalHeight / 4;
  const sx = (frame % 4) * cellW + rect.sx;
  const sy = Math.floor(frame / 4) * cellH + rect.sy;
  const dw = (rect.sw / cellW) * size;
  const dh = (rect.sh / cellH) * size;
  ctx.drawImage(enemySheet, sx, sy, rect.sw, rect.sh, x - dw / 2, y - dh * 0.62, dw, dh);
}

function drawBossFrame(frame: number, x: number, y: number) {
  const bossFrame = frame === 3 ? 3 : frame === 2 ? 2 : Math.floor(elapsed * 3) % 2;
  const rect = BOSS_FRAME_RECTS[bossFrame];
  if (!bossSheet.complete || bossSheet.naturalWidth <= 0) {
    drawSheet(bossSheet, 4, 1, bossFrame, x - 82, y - 128, 164, 164);
    return;
  }
  const cellW = bossSheet.naturalWidth / 4;
  const sourceX = bossFrame * cellW + rect.sx;
  const targetH = bossFrame === 2 ? 170 : 164;
  const scale = targetH / rect.sh;
  const dw = rect.sw * scale;
  const footY = y + 48;
  ctx.drawImage(bossSheet, sourceX, rect.sy, rect.sw, rect.sh, x - dw / 2, footY - targetH, dw, targetH);
}

function drawPlayer() {
  const moving = hasMoveTarget || keys.has("w") || keys.has("a") || keys.has("s") || keys.has("d") || keys.has("arrowup") || keys.has("arrowdown") || keys.has("arrowleft") || keys.has("arrowright");
  let frame = 0;
  if (player.attackTimer > 0.28) frame = player.facing === "east" || player.facing === "west" ? 7 : 3;
  else if (player.gatherTimer > 0.34) frame = 11;
  else if (player.hurtTimer > 0) frame = 12;
  else if (mode === "won") frame = 13;
  else if (moving) {
    const step = Math.floor(player.anim) % 2;
    frame = player.facing === "east" || player.facing === "west" ? 5 + step : player.facing === "north" ? 9 + step : 1 + step;
  } else frame = player.facing === "east" || player.facing === "west" ? 4 : player.facing === "north" ? 8 : 0;

  ctx.save();
  if (selectedSlot === "sword" && mode === "playing") {
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = "#50f1c7";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(player.x, player.y, attackRange(), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (player.hurtTimer > 0 && Math.sin(elapsed * 28) > 0) ctx.globalAlpha = 0.55;
  drawHeroFrame(frame, player.facing === "west");
  ctx.restore();
}

function drawHeroFrame(frame: number, mirror = false) {
  const rect = HERO_FRAME_RECTS[frame];
  if (!rect || !heroSheet.complete || heroSheet.naturalWidth <= 0) {
    if (mirror) {
      ctx.save();
      ctx.translate(player.x, 0);
      ctx.scale(-1, 1);
      drawSheet(heroSheet, 4, 4, frame, -54, player.y - 86, 108, 108);
      ctx.restore();
    } else drawSheet(heroSheet, 4, 4, frame, player.x - 54, player.y - 86, 108, 108);
    return;
  }
  const cellW = heroSheet.naturalWidth / 4;
  const cellH = heroSheet.naturalHeight / 4;
  const sourceX = (frame % 4) * cellW + rect.sx;
  const sourceY = Math.floor(frame / 4) * cellH + rect.sy;
  const dw = rect.sw * rect.scale;
  const dh = rect.sh * rect.scale;
  const footY = player.y + 24;
  if (mirror) {
    ctx.save();
    ctx.translate(player.x, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(heroSheet, sourceX, sourceY, rect.sw, rect.sh, -dw / 2, footY - dh, dw, dh);
    ctx.restore();
  } else {
    ctx.drawImage(heroSheet, sourceX, sourceY, rect.sw, rect.sh, player.x - dw / 2, footY - dh, dw, dh);
  }
}

function drawSheet(img: HTMLImageElement, cols: number, rows: number, frame: number, x: number, y: number, w: number, h: number) {
  if (!img.complete || img.naturalWidth <= 0) {
    ctx.fillStyle = "#50f1c7";
    ctx.fillRect(x, y, w, h);
    return;
  }
  const fw = img.naturalWidth / cols;
  const fh = img.naturalHeight / rows;
  const col = frame % cols;
  const row = Math.floor(frame / cols);
  ctx.drawImage(img, col * fw, row * fh, fw, fh, x, y, w, h);
}

function drawIcon(frame: number, x: number, y: number, w: number, h: number) {
  drawSheet(itemIcons, 4, 3, frame, x, y, w, h);
}

function drawHealth(x: number, y: number, w: number, pct: number, color: string) {
  ctx.fillStyle = "rgba(0,0,0,0.45)";
  roundRect(x, y, w, 8, 5);
  ctx.fill();
  ctx.fillStyle = color;
  roundRect(x, y, w * clamp(pct, 0, 1), 8, 5);
  ctx.fill();
}

function drawFx() {
  for (const p of particles) {
    const a = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (0.7 + a), 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.font = "900 22px Inter, system-ui, sans-serif";
  ctx.textAlign = "center";
  for (const t of floatTexts) {
    ctx.globalAlpha = clamp(t.life / 0.8, 0, 1);
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, t.x, t.y);
    ctx.globalAlpha = 1;
  }
  ctx.textAlign = "left";
}

function drawLabels() {
  ctx.font = "900 18px Inter, system-ui, sans-serif";
  ctx.fillStyle = "#50f1c7";
  ctx.fillText("Camp", SHOP_NPC.x - 86, SHOP_NPC.y - 190);
  ctx.fillStyle = "#ffdc63";
  ctx.fillText("Mine", 1430, 880);
  ctx.fillStyle = bossSpawned ? "#ff5b68" : "#aebbd2";
  ctx.fillText(bossSpawned ? "Boss" : "Gate", BOSS_GATE.x - 24, BOSS_GATE.y + 30);
}

function updateFx(dt: number) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const p = particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(0.97, dt * 60);
    p.vy += 110 * dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = floatTexts.length - 1; i >= 0; i -= 1) {
    const t = floatTexts[i];
    t.life -= dt;
    t.y += t.vy * dt;
    if (t.life <= 0) floatTexts.splice(i, 1);
  }
}

function burst(x: number, y: number, count: number, color: string) {
  const amount = reducedMotion ? Math.ceil(count * 0.35) : count;
  for (let i = 0; i < amount; i += 1) {
    const a = rand(0, Math.PI * 2);
    const s = rand(40, 220);
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(0.25, 0.72), maxLife: 0.72, size: rand(2, 5), color });
  }
}

function float(text: string, x: number, y: number, color: string) {
  floatTexts.push({ text, x, y, vy: -42, life: 0.9, color });
}

function pushOut(entity: Circle, obstacle: Circle) {
  const dx = entity.x - obstacle.x;
  const dy = entity.y - obstacle.y;
  const d = Math.hypot(dx, dy) || 1;
  const min = entity.r + obstacle.r * 0.65;
  if (d < min) {
    entity.x = obstacle.x + (dx / d) * min;
    entity.y = obstacle.y + (dy / d) * min;
  }
}

function roundRect(x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
}

function updateHud() {
  hpFill.style.width = `${clamp(player.hp / player.maxHp, 0, 1) * 100}%`;
  xpFill.style.width = `${clamp(player.xp / player.xpToNext, 0, 1) * 100}%`;
  hpText.textContent = `${Math.max(0, Math.ceil(player.hp))}/${player.maxHp}`;
  xpText.textContent = `${player.xp}/${player.xpToNext}`;
  levelText.textContent = String(player.level);
  goldText.textContent = String(player.gold);
  shardsText.textContent = String(player.shards);
  waveText.textContent = bossDefeated ? "clear" : bossSpawned ? "boss" : `${player.wave}/3`;
  pauseBtn.textContent = mode === "paused" ? "Resume" : "Pause";
  pauseBtn.disabled = mode !== "playing" && mode !== "paused";
  muteBtn.textContent = muted ? "Muted" : "Audio";
  motionBtn.textContent = reducedMotion ? "Reduced" : "Motion";
  shopHint.classList.toggle("ready", distance(player, SHOP_NPC) < SHOP_RANGE && mode === "playing");
  quickButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.slot === selectedSlot));
}

function handleWorldClick(world: Vec) {
  if (mode !== "playing") return;
  const enemy = [...enemies].filter((item) => item.alive).sort((a, b) => distance(world, a) - distance(world, b))[0];
  if (enemy && distance(world, enemy) < enemy.r + 38) {
    selectedSlot = "sword";
    targetEnemyId = enemy.id;
    targetNodeId = null;
    hasMoveTarget = true;
    moveTarget.x = enemy.x;
    moveTarget.y = enemy.y;
    return;
  }
  const node = nodes.filter((item) => item.cooldown <= 0).sort((a, b) => distance(world, a) - distance(world, b))[0];
  if (node && distance(world, node) < node.r + 44) {
    selectedSlot = "pick";
    targetNodeId = node.id;
    targetEnemyId = null;
    hasMoveTarget = true;
    moveTarget.x = node.x;
    moveTarget.y = node.y;
    return;
  }
  targetEnemyId = null;
  targetNodeId = null;
  hasMoveTarget = true;
  moveTarget.x = clamp(world.x, 50, WORLD_W - 50);
  moveTarget.y = clamp(world.y, 50, WORLD_H - 50);
}

function interact() {
  if (distance(player, SHOP_NPC) < SHOP_RANGE) {
    openShop();
    return;
  }
  const node = nearestNode();
  if (node && distance(player, node) < GATHER_RANGE) gather(node);
}

function togglePause() {
  if (mode === "playing") {
    mode = "paused";
    panel.querySelector("h1")!.textContent = "Paused";
    panel.querySelector("p")!.textContent = "Adventure frozen. Resume when ready.";
    primaryBtn.textContent = "Resume";
    panel.hidden = false;
    syncMusic();
  } else if (mode === "paused") {
    mode = "playing";
    panel.hidden = true;
    syncMusic();
  }
}

function stopPlayerIntent() {
  keys.clear();
  hasMoveTarget = false;
  targetEnemyId = null;
  targetNodeId = null;
  pointer.down = false;
  player.vx = 0;
  player.vy = 0;
}

function handleEscape() {
  stopPlayerIntent();
  if (!shop.hidden) shop.hidden = true;
  if (!inventory.hidden) inventory.hidden = true;
  if (mode === "paused") {
    mode = "playing";
    panel.hidden = true;
    syncMusic();
  }
}

function ensureAudio() {
  if (audioReady || muted) return;
  audio = new AudioContext();
  audioReady = true;
  syncMusic();
}

function syncMusic() {
  music.muted = muted;
  if (muted || mode === "paused") {
    music.pause();
    return;
  }
  if (mode === "playing" || mode === "won" || mode === "lost") {
    void music.play().catch(() => {});
  }
}

function tone(freq: number, dur: number, wave: OscillatorType, gainValue: number) {
  if (muted) return;
  ensureAudio();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = wave;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(gainValue, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
  osc.connect(gain).connect(audio.destination);
  osc.start();
  osc.stop(audio.currentTime + dur);
}

function loop(now: number) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;
  update(dt);
  render();
  updateHud();
  requestAnimationFrame(loop);
}

window.addEventListener("resize", resize);
window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key === "escape") {
    event.preventDefault();
    handleEscape();
    return;
  }
  keys.add(key);
  if (key === "1") selectedSlot = "sword";
  if (key === "2") selectedSlot = "pick";
  if (key === "3") {
    selectedSlot = "potion";
    usePotion();
  }
  if (key === " " || key === "spacebar") {
    event.preventDefault();
    attack();
  }
  if (key === "e") interact();
  if (key === "i" || key === "b") openInventory();
  if (key === "r") resetGame();
  if (key === "p") togglePause();
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));

canvas.addEventListener("pointermove", (event) => {
  const world = worldFromScreen(event.clientX, event.clientY);
  pointer.x = world.x;
  pointer.y = world.y;
});
canvas.addEventListener("pointerdown", (event) => {
  ensureAudio();
  if (mode === "title" || mode === "won" || mode === "lost") {
    resetGame();
    return;
  }
  if (mode !== "playing") return;
  const world = worldFromScreen(event.clientX, event.clientY);
  pointer.down = true;
  pointer.x = world.x;
  pointer.y = world.y;
  handleWorldClick(world);
});
canvas.addEventListener("pointerup", () => {
  pointer.down = false;
});

primaryBtn.addEventListener("click", () => {
  if (mode === "paused") togglePause();
  else resetGame();
});
pauseBtn.addEventListener("click", () => togglePause());
muteBtn.addEventListener("click", () => {
  muted = !muted;
  if (!muted) ensureAudio();
  syncMusic();
});
motionBtn.addEventListener("click", () => {
  reducedMotion = !reducedMotion;
  shake = 0;
});
closeShopBtn.addEventListener("click", () => {
  shop.hidden = true;
});
closeInventoryBtn.addEventListener("click", () => {
  inventory.hidden = true;
});
inventoryBtn.addEventListener("click", () => openInventory());
shopHint.addEventListener("click", () => openShop());
quickButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    selectedSlot = btn.dataset.slot as Slot;
    if (selectedSlot === "potion") usePotion();
  });
});

resize();
panel.querySelector("h1")!.textContent = "Relic Grove";
panel.querySelector("p")!.textContent = "Move through the grove, fight monsters, mine crystals, buy gear, and defeat the archive golem.";
primaryBtn.textContent = "Start Adventure";
requestAnimationFrame(loop);
