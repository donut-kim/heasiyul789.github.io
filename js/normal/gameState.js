import * as constants from './constants.js';
import { vector, distance } from './utils.js';

// 벡터 유틸리티 함수들은 utils.js에서 import

// distance 함수는 utils.js에서 import하여 사용

// 경험치 계산
export function xpRequired(level) {
  return Math.floor(constants.BASE_XP_TO_LEVEL * Math.pow(constants.XP_LEVEL_SCALE, level - 1));
}

// 게임 상태 객체
export const state = {
  playerPos: vector(0, 0),
  playerHealth: constants.PLAYER_MAX_HEALTH,
  playerInvuln: 0,
  score: 0,
  elapsed: 0,
  stage: 1,
  fireTimer: 0,
  spawnTimer: constants.SPAWN_INTERVAL,
  autoAimAngle: 0,
  bullets: [],
  enemyProjectiles: [],
  enemies: [],
  boss: null,
  bossWarningTimer: 0,
  mine: { pos: vector(0, 0), active: true },
  mineFlashTimer: 0,
  level: 1,
  xp: 0,
  xpToNext: xpRequired(1),
  upgradeLevels: Object.fromEntries(Object.keys(constants.UPGRADE_DEFINITIONS).map((k) => [k, 0])),
  selectingUpgrade: false,
  upgradeChoices: [],
  victory: false,
  gameOver: false,
  paused: true,
  started: false,
  nickname: '',
  selectedCharacter: 'signature_knotted',
  lastEnemyTargetId: null,
  bladeAngle: 0,
  blades: [],
  bladeCooldowns: new Map(),
  tornadoes: [],
  lastBladeAngle: 0,
  emFieldCount: 0,
  emTargetsPerField: 1,
  emCooldown: constants.EM_FIELD_BASE_INTERVAL,
  emEffects: [],
  sprinkles: [],
  sprinkleTimer: constants.SPRINKLE_INTERVAL,
  stageThreeActive: false,
  stageTheme: 'factory',
  hasDeulgireumRapid: false,
  pendingRapidDirections: null,
  rapidFireDoubleShotLevel: 0,
  rapidFireTimer: 0,
  scoreBenchmark: 900,
  levelBlastTimer: 0,
  toothpasteItems: [],
  toothpasteTimer: constants.TOOTHPASTE_DROP_INTERVAL,
  toothpasteFlashTimer: 0,
  pendingLevelBlast: 0,
  toothpasteGlowPhase: 0,
  hasGanjangGim: false,
  hpBarTimer: 0,
  blackDustSpawnTimer: constants.BLACK_DUST_SPAWN_INTERVAL,
  orangeLadybugSpawnTimer: constants.ORANGE_LADYBUG_SPAWN_INTERVAL_MAX,
  lastPlayerHealth: constants.PLAYER_MAX_HEALTH,
  joystickCenter: null,
  joystickActive: false,
  gameStartTime: null,
};

export const keys = new Set();
export let processingLevelChain = false;

export function setProcessingLevelChain(value) {
  processingLevelChain = value;
}

// 게임 상태 초기화 함수
export function resetGameplayState() {
  state.playerPos = vector(0, 0);
  state.playerHealth = constants.PLAYER_MAX_HEALTH;
  state.playerInvuln = 0;
  state.score = 0;
  state.elapsed = 0;
  state.fireTimer = 0;
  state.spawnTimer = constants.SPAWN_INTERVAL;
  state.autoAimAngle = 0;
  state.bullets = [];
  state.enemyProjectiles = [];
  state.enemies = [];
  state.stage = 1;
  state.boss = null;
  state.bossWarningTimer = 0;
  state.mine = { pos: vector(0, 0), active: true };
  state.mineFlashTimer = 0;
  state.level = 1;
  state.xp = 0;
  state.xpToNext = xpRequired(1);
  Object.keys(state.upgradeLevels).forEach((key) => {
    state.upgradeLevels[key] = 0;
  });
  state.selectingUpgrade = false;
  state.upgradeChoices = [];
  state.lastEnemyTargetId = null;
  state.victory = false;
  state.gameOver = false;
  state.paused = false;
  state.bladeAngle = 0;
  state.blades = [];
  state.bladeCooldowns.clear();
  state.tornadoes = [];
  state.lastBladeAngle = 0;
  state.emFieldCount = 0;
  state.emTargetsPerField = 1;
  state.emCooldown = constants.EM_FIELD_BASE_INTERVAL;
  state.emEffects = [];
  state.sprinkles = [];
  state.sprinkleTimer = constants.SPRINKLE_INTERVAL;
  state.stageThreeActive = false;
  state.stageTheme = 'factory';
  state.hasDeulgireumRapid = false;
  state.pendingRapidDirections = null;
  state.rapidFireDoubleShotLevel = 0;
  state.rapidFireTimer = 0;
  state.scoreBenchmark = 700 + Math.floor(Math.random() * 400);
  state.levelBlastTimer = 0;
  state.toothpasteItems = [];
  state.toothpasteTimer = constants.TOOTHPASTE_DROP_INTERVAL;
  state.toothpasteFlashTimer = 0;
  state.pendingLevelBlast = 0;
  state.toothpasteGlowPhase = 0;
  state.hasGanjangGim = false;
  state.hasKimBugak = false;
  state.hpBarTimer = 0;
  state.blackDustSpawnTimer = constants.BLACK_DUST_SPAWN_INTERVAL;
  state.orangeLadybugSpawnTimer = constants.ORANGE_LADYBUG_SPAWN_INTERVAL_MAX;
  state.lastPlayerHealth = constants.PLAYER_MAX_HEALTH;
  state.joystickCenter = null;
  state.joystickActive = false;
  state.gameStartTime = null;
  keys.clear();
}

// 점수 계산
export function calculateTotalScore() {
  let total = state.score;
  if (state.elapsed > constants.MAX_SURVIVAL_TIME) {
    total += Math.floor(state.elapsed - constants.MAX_SURVIVAL_TIME);
  }
  return total;
}

export function computeFinalScoreDetails() {
  const totalScore = calculateTotalScore();
  const baseScore = state.score;
  const timeBonus = state.elapsed > 180 ? Math.floor(state.elapsed - 180) : 0;

  return {
    totalScore,
    baseScore,
    timeBonus,
    time: state.elapsed,
    stage: state.stage,
    level: state.level,
    total: totalScore,
  };
}