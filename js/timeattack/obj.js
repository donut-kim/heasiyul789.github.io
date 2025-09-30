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

// 게임 모드에 따른 적 크기 계산
export function getEnemySizeForMode(baseSize, enemyType = 'default') {
  if (state.gameMode === 'timeattack') {
    switch (enemyType) {
      case 'pink':
        return baseSize * 1.6;
      case 'big':
        return baseSize * 0.7;
      case 'darkblue':
        return baseSize * 0.85;
      case 'blackDust':
        return baseSize * 0.75;
      case 'orange':
        return baseSize * 0.85;
      default:
        return baseSize * 0.85;
    }
  }
  return baseSize;
}

// 스테이지별 속도 배율
export function getStageSpeedMultiplier() {
  if (state.stage >= 3) return 0.1;
  return 1;
}

// 분홍 세균 생성
export function spawnEnemy(sprites) {
  const angle = randRange(0, Math.PI * 2);
  const minRadius = state.gameMode === 'timeattack'
    ? Math.max(constants.SPAWN_RADIUS_MIN, 500)
    : constants.SPAWN_RADIUS_MIN;
  const maxRadius = state.gameMode === 'timeattack'
    ? Math.max(minRadius + 200, constants.SPAWN_RADIUS_MAX)
    : constants.SPAWN_RADIUS_MAX;
  const radius = randRange(minRadius, maxRadius);
  const pos = vector(
    state.playerPos.x + Math.cos(angle) * radius,
    state.playerPos.y + Math.sin(angle) * radius,
  );
  const baseSpeed = constants.ENEMY_BASE_SPEED + state.elapsed * constants.ENEMY_SPEED_SCALE * constants.ENEMY_BASE_SPEED;
  const speedFactor = state.gameMode === 'timeattack'
    ? timeAttackConstants.TIME_ATTACK_ENEMY_SPEED_FACTOR
    : 1;
  const size = getEnemySizeForMode(constants.ENEMY_SIZE, 'pink');
  state.enemies.push({
    id: enemyIdCounter++,
    pos,
    speed: baseSpeed * getStageSpeedMultiplier() * speedFactor,
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
  const minRadius = state.gameMode === 'timeattack'
    ? Math.max(constants.SPAWN_RADIUS_MIN, 500)
    : constants.SPAWN_RADIUS_MIN;
  const maxRadius = state.gameMode === 'timeattack'
    ? Math.max(minRadius + 200, constants.SPAWN_RADIUS_MAX)
    : constants.SPAWN_RADIUS_MAX;
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
  const speedFactor = state.gameMode === 'timeattack'
    ? timeAttackConstants.TIME_ATTACK_ENEMY_SPEED_FACTOR
    : 1;
  state.enemies.push({
    id: enemyIdCounter++,
    pos,
    speed: baseSpeed * getStageSpeedMultiplier() * speedFactor,
    health: constants.DARK_BLUE_ENEMY_HEALTH,
    size: enemySize,
    sprite: sprites.darkBlueEnemy,
    fireTimer: state.gameMode === 'timeattack' ? null : randRange(0, constants.DARK_BLUE_ENEMY_FIRE_INTERVAL),
    canShoot: state.gameMode !== 'timeattack',
    type: 'darkBlue',
    xpReward: constants.XP_REWARD_DARK_BLUE,
    scoreReward: 20
  });
}

// 검은 먼지 그룹 생성
export function spawnBlackDustGroup(sprites, options = {}) {
  if (state.gameMode === 'timeattack' && !options.storm) {
    return;
  }
  const count = options.overrideCount ?? randInt(constants.BLACK_DUST_MIN_COUNT, constants.BLACK_DUST_MAX_COUNT + 1);
  const baseAngle = randRange(0, Math.PI * 2);
  const enemySize = getEnemySizeForMode(constants.BLACK_DUST_SIZE, 'blackDust');
  const minRadius = state.gameMode === 'timeattack'
    ? Math.max(constants.SPAWN_RADIUS_MIN, 500)
    : constants.SPAWN_RADIUS_MIN;
  const maxRadius = state.gameMode === 'timeattack'
    ? Math.max(minRadius + 200, constants.SPAWN_RADIUS_MAX)
    : constants.SPAWN_RADIUS_MAX;

  for (let i = 0; i < count; i++) {
    const angle = baseAngle + randRange(-Math.PI / 4, Math.PI / 4);
    const radius = randRange(minRadius, maxRadius);
    const pos = vector(
      state.playerPos.x + Math.cos(angle) * radius,
      state.playerPos.y + Math.sin(angle) * radius,
    );

    const baseSpeed = constants.BLACK_DUST_SPEED + state.elapsed * constants.ENEMY_SPEED_SCALE * constants.BLACK_DUST_SPEED;
    const speedFactor = state.gameMode === 'timeattack'
      ? timeAttackConstants.TIME_ATTACK_ENEMY_SPEED_FACTOR
      : 1;
    state.enemies.push({
      id: enemyIdCounter++,
      pos,
      speed: baseSpeed * getStageSpeedMultiplier() * speedFactor,
      health: options.overrideHealth ?? constants.BLACK_DUST_HEALTH,
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
  const baseMin = state.gameMode === 'timeattack'
    ? Math.max(constants.SPAWN_RADIUS_MIN * 1.2, 500)
    : constants.SPAWN_RADIUS_MIN * 1.5;
  const baseMax = state.gameMode === 'timeattack'
    ? Math.max(baseMin + 220, constants.SPAWN_RADIUS_MAX * 1.2)
    : constants.SPAWN_RADIUS_MAX * 1.2;
  const radius = randRange(baseMin, baseMax);
  const pos = vector(
    state.playerPos.x + Math.cos(angle) * radius,
    state.playerPos.y + Math.sin(angle) * radius,
  );

  const baseSpeed = constants.ORANGE_LADYBUG_SPEED + state.elapsed * constants.ENEMY_SPEED_SCALE * constants.ORANGE_LADYBUG_SPEED;
  const speedFactor = state.gameMode === 'timeattack'
    ? timeAttackConstants.TIME_ATTACK_ENEMY_SPEED_FACTOR
    : 1;
  const enemySize = getEnemySizeForMode(constants.ORANGE_LADYBUG_SIZE, 'orange');

  state.enemies.push({
    id: enemyIdCounter++,
    pos,
    speed: baseSpeed * getStageSpeedMultiplier() * speedFactor,
    health: constants.ORANGE_LADYBUG_HEALTH,
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
  const minRadius = state.gameMode === 'timeattack'
    ? Math.max(constants.SPAWN_RADIUS_MIN, 500)
    : constants.SPAWN_RADIUS_MIN;
  const maxRadius = state.gameMode === 'timeattack'
    ? Math.max(minRadius + 200, constants.SPAWN_RADIUS_MAX)
    : constants.SPAWN_RADIUS_MAX;
  const radius = randRange(minRadius, maxRadius);
  const pos = vector(
    state.playerPos.x + Math.cos(angle) * radius,
    state.playerPos.y + Math.sin(angle) * radius,
  );
  const baseSpeed = constants.BIG_ENEMY_SPEED + state.elapsed * constants.ENEMY_SPEED_SCALE * constants.BIG_ENEMY_SPEED;
  const speedFactor = state.gameMode === 'timeattack'
    ? timeAttackConstants.TIME_ATTACK_ENEMY_SPEED_FACTOR
    : 1;
  const enemySize = getEnemySizeForMode(constants.BIG_ENEMY_SIZE, 'big');
  state.enemies.push({
    id: enemyIdCounter++,
    pos,
    speed: baseSpeed * getStageSpeedMultiplier() * speedFactor,
    health: constants.BIG_ENEMY_HEALTH,
    size: enemySize,
    sprite: sprites.bigEnemy,
    xpReward: constants.XP_REWARD_PURPLE,
    scoreReward: 15,
    type: 'purple'
  });
}

// 노말 모드 보스 생성
export function spawnBoss() {
  const angle = randRange(0, Math.PI * 2);
  const distance = 600;
  const bossPos = vector(
    state.playerPos.x + Math.cos(angle) * distance,
    state.playerPos.y + Math.sin(angle) * distance,
  );
  state.boss = {
    pos: bossPos,
    health: constants.BOSS_HEALTH,
    maxHealth: constants.BOSS_HEALTH,
    state: 'idle',
    direction: vector(0, 0),
    attackTarget: vector(bossPos.x, bossPos.y),
    attackTimer: constants.BOSS_ATTACK_INTERVAL,
    windupTimer: 0,
    facingAngle: 0,
    xpReward: constants.XP_REWARD_BOSS,
    scoreReward: 100,
    bossType: 'cat',
  };
  state.bossWarningTimer = constants.BOSS_WARNING_DURATION;
  state.enemies.length = 0;
}

// 타임어택 모드 보스 생성
export function spawnTimeAttackBoss(vectorCopy) {
  const bossType = 'ladybug';

  const angle = randRange(0, Math.PI * 2);
  const distance = 600;
  const bossPos = vector(
    state.playerPos.x + Math.cos(angle) * distance,
    state.playerPos.y + Math.sin(angle) * distance,
  );

  // HP는 보스 순서에 따라 100씩 증가
  const bossHP = 100 * (state.timeAttackBossIndex + 1);

  state.boss = {
    pos: bossPos,
    health: bossHP,
    maxHealth: bossHP,
    state: 'idle',
    direction: vector(0, 0),
    attackTarget: vectorCopy(bossPos),
    attackTimer: constants.BOSS_ATTACK_INTERVAL,
    windupTimer: 0,
    facingAngle: 0,
    xpReward: constants.XP_REWARD_BOSS,
    scoreReward: 100 * (state.timeAttackBossIndex + 1),
    bossType: bossType,
  };

  state.timeAttackBossIndex++;
  state.bossWarningTimer = constants.BOSS_WARNING_DURATION;
}

// 치약 아이템 생성
export function spawnToothpasteItem(getCurrentWorldBounds, collidesWithObstacles) {
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
