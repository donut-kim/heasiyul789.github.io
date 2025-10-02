// 오브젝트 생성 및 관리 함수들
import * as constants from './constants.js';
import * as timeAttackConstants from './timeAttackConstants.js';
import { state } from './gameState.js';
import {
  vector,
  randRange,
  randInt,
  angleTowards
} from './utils.js';

let enemyIdCounter = 0;

// 타임어택 모드: 모든 적의 크기를 분홍세균 크기로 통일
export function getEnemySizeForMode(baseSize, enemyType = 'default') {
  // 분홍세균 크기로 통일 (보스 제외)
  return constants.ENEMY_SIZE * 1.6;
}

// 스테이지별 속도 배율
export function getStageSpeedMultiplier() {
  if (state.stage >= 3) return 0.1;
  return 1;
}

// 분홍 세균 생성
export function spawnEnemy(sprites, angleOverride = null) {
  // 각도를 지정하지 않으면 랜덤, 지정하면 해당 각도 사용 (골고루 분산)
  const angle = angleOverride !== null ? angleOverride : randRange(0, Math.PI * 2);
  const minRadius = Math.max(constants.SPAWN_RADIUS_MIN, 500);
  const maxRadius = Math.max(minRadius + 200, constants.SPAWN_RADIUS_MAX);
  const radius = randRange(minRadius, maxRadius);
  const pos = vector(
    state.playerPos.x + Math.cos(angle) * radius,
    state.playerPos.y + Math.sin(angle) * radius,
  );
  // 분홍세균은 시간에 따라 속도 증가 없이 고정 속도 유지
  const baseSpeed = constants.ENEMY_BASE_SPEED;
  const size = getEnemySizeForMode(constants.ENEMY_SIZE, 'pink');
  state.enemies.push({
    id: enemyIdCounter++,
    pos,
    speed: baseSpeed * getStageSpeedMultiplier() * timeAttackConstants.TIME_ATTACK_ENEMY_SPEED_FACTOR,
    health: 1,
    size,
    sprite: sprites.enemy,
    xpReward: constants.XP_REWARD_PINK,
    scoreReward: 10,
    type: 'pink'
  });
}

// 남색 세균 생성
export function spawnDarkBlueEnemy(sprites, collidesWithObstacles) {
  const enemySize = getEnemySizeForMode(constants.DARK_BLUE_ENEMY_SIZE, 'darkblue');
  const minRadius = Math.max(constants.SPAWN_RADIUS_MIN, 500);
  const maxRadius = Math.max(minRadius + 200, constants.SPAWN_RADIUS_MAX);
  let pos;
  let attempts = 0;
  const maxAttempts = 20;

  // 장애물이 없는 위치를 찾을 때까지 반복
  do {
    const angle = randRange(0, Math.PI * 2);
    const radius = randRange(minRadius, maxRadius);
    pos = vector(
      state.playerPos.x + Math.cos(angle) * radius,
      state.playerPos.y + Math.sin(angle) * radius,
    );
    attempts++;
  } while (collidesWithObstacles(pos.x, pos.y, enemySize) && attempts < maxAttempts);

  // 최대 시도 횟수를 초과하면 기본 위치 사용
  if (attempts >= maxAttempts) {
    const angle = randRange(0, Math.PI * 2);
    const radius = maxRadius;
    pos = vector(
      state.playerPos.x + Math.cos(angle) * radius,
      state.playerPos.y + Math.sin(angle) * radius,
    );
  }

  const baseSpeed = constants.DARK_BLUE_ENEMY_SPEED + state.elapsed * constants.ENEMY_SPEED_SCALE * constants.DARK_BLUE_ENEMY_SPEED;
  state.enemies.push({
    id: enemyIdCounter++,
    pos,
    speed: baseSpeed * getStageSpeedMultiplier() * timeAttackConstants.TIME_ATTACK_ENEMY_SPEED_FACTOR,
    health: constants.DARK_BLUE_ENEMY_HEALTH * 2,
    size: enemySize,
    sprite: sprites.darkBlueEnemy,
    fireTimer: null, // 타임어택에서는 발사하지 않음
    canShoot: false,
    type: 'darkBlue',
    xpReward: constants.XP_REWARD_DARK_BLUE,
    scoreReward: 20
  });
}

// 검은 먼지 그룹 생성
export function spawnBlackDustGroup(sprites, options = {}) {
  // storm이 false면 스폰하지 않음 (타임어택에서는 1분마다 storm으로만 스폰)
  if (!options.storm) {
    return;
  }
  const count = options.overrideCount ?? randInt(constants.BLACK_DUST_MIN_COUNT, constants.BLACK_DUST_MAX_COUNT + 1);
  const enemySize = getEnemySizeForMode(constants.BLACK_DUST_SIZE, 'blackDust');
  const minRadius = Math.max(constants.SPAWN_RADIUS_MIN, 500);
  const maxRadius = Math.max(minRadius + 200, constants.SPAWN_RADIUS_MAX);

  // 360도를 균등하게 나눠서 골고루 분산
  const angleStep = (Math.PI * 2) / count;
  const startAngle = Math.random() * Math.PI * 2;

  for (let i = 0; i < count; i++) {
    // 기본 각도에 약간의 랜덤 추가 (너무 규칙적이지 않게)
    const angle = startAngle + (angleStep * i) + randRange(-0.1, 0.1);
    const radius = randRange(minRadius, maxRadius);
    const pos = vector(
      state.playerPos.x + Math.cos(angle) * radius,
      state.playerPos.y + Math.sin(angle) * radius,
    );

    const baseSpeed = constants.BLACK_DUST_SPEED + state.elapsed * constants.ENEMY_SPEED_SCALE * constants.BLACK_DUST_SPEED;
    const health = options.overrideHealth ?? 3; // 타임어택 기본 체력 3

    state.enemies.push({
      id: enemyIdCounter++,
      pos,
      speed: baseSpeed * getStageSpeedMultiplier() * timeAttackConstants.TIME_ATTACK_ENEMY_SPEED_FACTOR,
      health: health,
      size: enemySize,
      sprite: sprites.blackDust,
      type: 'blackDust',
      xpReward: constants.XP_REWARD_BLACK_DUST,
      scoreReward: 15
    });
  }
}

// 주황 무당벌레 생성
export function spawnOrangeLadybug(sprites) {
  const angle = randRange(0, Math.PI * 2);
  const baseMin = Math.max(constants.SPAWN_RADIUS_MIN * 1.2, 500);
  const baseMax = Math.max(baseMin + 220, constants.SPAWN_RADIUS_MAX * 1.2);
  const radius = randRange(baseMin, baseMax);
  const pos = vector(
    state.playerPos.x + Math.cos(angle) * radius,
    state.playerPos.y + Math.sin(angle) * radius,
  );

  const baseSpeed = constants.ORANGE_LADYBUG_SPEED + state.elapsed * constants.ENEMY_SPEED_SCALE * constants.ORANGE_LADYBUG_SPEED;
  const enemySize = getEnemySizeForMode(constants.ORANGE_LADYBUG_SIZE, 'orange');

  state.enemies.push({
    id: enemyIdCounter++,
    pos,
    speed: baseSpeed * getStageSpeedMultiplier() * timeAttackConstants.TIME_ATTACK_ENEMY_SPEED_FACTOR,
    health: constants.ORANGE_LADYBUG_HEALTH * 2,
    size: enemySize,
    sprite: sprites.orangeLadybug,
    type: 'orangeLadybug',
    xpReward: constants.XP_REWARD_ORANGE_LADYBUG,
    scoreReward: 100,
    zigzagTime: 0,
    zigzagPhase: Math.random() * Math.PI * 2,
    baseDirection: angleTowards(pos, state.playerPos),
    canPassObstacles: true
  });
}

// 보라색 큰 적 생성
export function spawnBigEnemy(sprites) {
  const angle = randRange(0, Math.PI * 2);
  const minRadius = Math.max(constants.SPAWN_RADIUS_MIN, 500);
  const maxRadius = Math.max(minRadius + 200, constants.SPAWN_RADIUS_MAX);
  const radius = randRange(minRadius, maxRadius);
  const pos = vector(
    state.playerPos.x + Math.cos(angle) * radius,
    state.playerPos.y + Math.sin(angle) * radius,
  );
  const baseSpeed = constants.BIG_ENEMY_SPEED + state.elapsed * constants.ENEMY_SPEED_SCALE * constants.BIG_ENEMY_SPEED;
  const enemySize = getEnemySizeForMode(constants.BIG_ENEMY_SIZE, 'big');
  state.enemies.push({
    id: enemyIdCounter++,
    pos,
    speed: baseSpeed * getStageSpeedMultiplier() * timeAttackConstants.TIME_ATTACK_ENEMY_SPEED_FACTOR,
    health: 4, // 타임어택 체력 4
    size: enemySize,
    sprite: sprites.bigEnemy,
    xpReward: constants.XP_REWARD_PURPLE,
    scoreReward: 15,
    type: 'purple'
  });
}

// 보스 생성 헬퍼 함수 (중복 제거)
function createBossAtPosition(bossPos, health, bossType, scoreMultiplier = 1) {
  return {
    pos: bossPos,
    health,
    maxHealth: health,
    state: 'idle',
    direction: vector(0, 0),
    attackTarget: vector(bossPos.x, bossPos.y),
    attackTimer: constants.BOSS_ATTACK_INTERVAL,
    windupTimer: 0,
    facingAngle: 0,
    xpReward: constants.XP_REWARD_BOSS,
    scoreReward: 100 * scoreMultiplier,
    bossType,
  };
}

// 노말 모드 보스 생성 (타임어택에서는 사용 안 함)
export function spawnBoss() {
  const angle = randRange(0, Math.PI * 2);
  const distance = 600;
  const bossPos = vector(
    state.playerPos.x + Math.cos(angle) * distance,
    state.playerPos.y + Math.sin(angle) * distance,
  );
  state.boss = createBossAtPosition(bossPos, constants.BOSS_HEALTH, 'cat', 1);
  state.bossWarningTimer = constants.BOSS_WARNING_DURATION;
  state.enemies.length = 0;
}

// 타임어택 모드 보스 생성
export function spawnTimeAttackBoss(vectorCopy) {
  const bossTypes = ['ladybug', 'ant', 'butterfly', 'cat', 'dog'];
  const bossType = bossTypes[state.timeAttackBossIndex % bossTypes.length];

  const angle = randRange(0, Math.PI * 2);
  const distance = 600;
  const bossPos = vector(
    state.playerPos.x + Math.cos(angle) * distance,
    state.playerPos.y + Math.sin(angle) * distance,
  );

  // 보스 HP: 테스트용 200 (원래: 3분(100), 6분(200), 9분(300), 12분(400), 15분(500))
  const bossHP = 200; // 레이어 테스트용

  state.boss = createBossAtPosition(bossPos, bossHP, bossType, state.timeAttackBossIndex + 1);
  state.timeAttackBossIndex++;
  // bossWarningTimer는 돌진 스킬용이므로 보스 스폰 시 설정하지 않음
}

// 치약 아이템 생성
export function spawnToothpasteItem(getCurrentWorldBounds, collidesWithObstacles) {
  // 경량화: 최대 5개로 제한 (오래된 것부터 제거)
  const MAX_TOOTHPASTE = 5;
  if (state.toothpasteItems.length >= MAX_TOOTHPASTE) {
    state.toothpasteItems.shift(); // 가장 오래된 아이템 제거
  }

  const attempts = 24;
  const margin = 40;
  const toothpasteSize = 44;
  const clearanceRadius = toothpasteSize + 20;
  for (let i = 0; i < attempts; i++) {
    const bounds = getCurrentWorldBounds();
    const x = randRange(-bounds + margin, bounds - margin);
    const y = randRange(-bounds + margin, bounds - margin);
    if (!collidesWithObstacles(x, y, clearanceRadius)) {
      state.toothpasteItems.push({ pos: vector(x, y) });
      return true;
    }
  }
  return false;
}

// 자석 아이템 생성
export function spawnMagnetItem(getCurrentWorldBounds, collidesWithObstacles) {
  // 최대 3개로 제한 (오래된 것부터 제거)
  const MAX_MAGNETS = 3;
  if (state.magnetItems.length >= MAX_MAGNETS) {
    state.magnetItems.shift(); // 가장 오래된 아이템 제거
  }

  const attempts = 24;
  const margin = 40;
  const magnetSize = 44;
  const clearanceRadius = magnetSize + 20;
  for (let i = 0; i < attempts; i++) {
    const bounds = getCurrentWorldBounds();
    const x = randRange(-bounds + margin, bounds - margin);
    const y = randRange(-bounds + margin, bounds - margin);
    if (!collidesWithObstacles(x, y, clearanceRadius)) {
      state.magnetItems.push({ pos: vector(x, y) });
      return true;
    }
  }
  return false;
}
