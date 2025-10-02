import * as constants from './constants.js';
import * as timeAttackConstants from './timeAttackConstants.js';
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
  // 경량화: toothpasteGlowPhase 제거 (애니메이션 불필요)
  hasGanjangGim: false,
  hasKimBugak: false,
  hpBarTimer: 0,
  blackDustSpawnTimer: constants.BLACK_DUST_SPAWN_INTERVAL,
  orangeLadybugSpawnTimer: constants.ORANGE_LADYBUG_SPAWN_INTERVAL_MAX,
  lastPlayerHealth: constants.PLAYER_MAX_HEALTH,
  joystickCenter: null,
  joystickActive: false,
  gameStartTime: null,
  gameMode: 'normal', // 'normal' 또는 'timeattack'
  timeAttackRemaining: 60 * 15, // 타임어택 모드 남은 시간 (15분)
  timeAttackBossTimer: 0, // 타임어택 보스 타이머
  timeAttackBossIndex: 0, // 현재 보스 인덱스 (0: 무당벌레, 1: 달팽이, 2: 개미, 3: 나비, 4: 고양이)
  moveDirection: vector(1, 0), // 캐릭터 이동 방향 (기본: 오른쪽)
  lastMoveDirection: vector(1, 0), // 마지막 이동 방향 (정지 시에도 유지)
  specialBurstQueue: [],
  specialBurstTimer: 0,
  specialBurstPending: false,
  specialBurstProgress: 0,
  specialBurstEnabled: false,
  specialBurstEffectTimer: 0,
  specialBurstInterval: 0,
  xpCrumbs: [],
  magnetLevel: 0,
  magnetRadius: 0,
  stormTimer: 0,
  stormActive: false,
  stormCountdown: 0,
  stormSpawnedCount: 0,
  stormWarningTimer: 0,
  sirenPhase: 0,
  nextBlackDustSpawn: 60, // 다음 검은먼지 스폰까지 남은 시간 (초)
  blackDustWarningActive: false, // 검은먼지 경고 활성화 여부
  blackDustWarningTimer: 0, // 검은먼지 경고 표시 타이머
  gameStartMessageTimer: 0, // 게임 시작 메시지 표시 타이머
  blackDustSpawnCount: 0, // 검은먼지 스폰 횟수 (1분=1회, 2분=2회...)
  // 자석 아이템 관련
  magnetItems: [], // 맵에 드랍된 자석 아이템들
  magnetSpawnTimer: 10, // 자석 아이템 스폰 타이머 (10초 테스트용)
  magnetFlashTimer: 0, // 자석 아이템 획득 시 화면 효과
};

export const keys = new Set();
export let processingLevelChain = false;

export function setProcessingLevelChain(value) {
  processingLevelChain = value;
}

// 게임 상태 초기화 함수
export function resetGameplayState() {
  // 타임어택 모드에서는 지정된 시작 위치 사용
  if (state.gameMode === 'timeattack') {
    state.playerPos = vector(timeAttackConstants.TIME_ATTACK_PLAYER_START_X, timeAttackConstants.TIME_ATTACK_PLAYER_START_Y);
  } else {
    state.playerPos = vector(0, 0);
  }
  state.playerHealth = state.gameMode === 'timeattack'
    ? timeAttackConstants.TIME_ATTACK_PLAYER_MAX_HEALTH
    : constants.PLAYER_MAX_HEALTH;
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
  // 경량화: toothpasteGlowPhase 제거
  state.hasGanjangGim = false;
  state.hasKimBugak = false;
  state.hpBarTimer = 0;
  state.blackDustSpawnTimer = constants.BLACK_DUST_SPAWN_INTERVAL;
  state.orangeLadybugSpawnTimer = constants.ORANGE_LADYBUG_SPAWN_INTERVAL_MAX;
  state.lastPlayerHealth = state.playerHealth;
  state.joystickCenter = null;
  state.joystickActive = false;
  state.gameStartTime = null;
  state.specialBurstQueue = [];
  state.specialBurstTimer = 0;
  state.specialBurstPending = false;
  state.specialBurstProgress = 0;
  state.specialBurstEnabled = false;
  state.specialBurstEffectTimer = 0;
  state.specialBurstInterval = 0;
  state.xpCrumbs = [];
  state.magnetLevel = 0;
  state.magnetRadius = 0;
  state.stormTimer = 0;
  state.stormActive = false;
  state.stormCountdown = 0;
  state.stormSpawnedCount = 0;
  state.stormWarningTimer = 0;
  state.sirenPhase = 0;
  state.nextBlackDustSpawn = 60; // 1분마다 검은먼지 스폰
  state.blackDustWarningActive = false;
  state.blackDustWarningTimer = 0;
  state.gameStartMessageTimer = 5; // 5초 동안 시작 메시지 표시
  state.blackDustSpawnCount = 0;

  // 자석 아이템 리셋
  state.magnetItems = [];
  state.magnetSpawnTimer = 10; // 10초 후 첫 스폰 (테스트용)
  state.magnetFlashTimer = 0;

  // 타임어택 모드 리셋 (게임모드는 유지)
  if (state.gameMode === 'timeattack') {
    state.timeAttackRemaining = 60 * 15; // 15분 초기화
    state.timeAttackBossTimer = 0;
    state.timeAttackBossIndex = 0;
  }

  state.moveDirection = vector(1, 0);
  state.lastMoveDirection = vector(1, 0);

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
