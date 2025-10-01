// 게임 화면 설정
export const WIDTH = 960;
export const HEIGHT = 540;
export const HALF_WIDTH = WIDTH / 2;
export const HALF_HEIGHT = HEIGHT / 2;

// 세계 설정
export const WORLD_BOUNDS = 2200;
export const STAGE_THREE_WORLD_BOUNDS = 880; // 기존 4배 크기
export const CHUNK_SIZE = 400;
export const CAMERA_VIEWPORT_MARGIN = 120;

// 플레이어 설정
export const PLAYER_SIZE = 40;
export const PLAYER_SPEED = 300;
export const PLAYER_MAX_HEALTH = 5;
export const PLAYER_FIRE_INTERVAL = 0.42;
export const PLAYER_INVULN_TIME = 1.0;

// 총알 설정
export const BULLET_SIZE = 12;
export const BULLET_SPEED = 520;
export const BULLET_LIFETIME = 1.8;

// 스프링클 스킬 설정 (불속성)
export const SPRINKLE_INTERVAL = 0.5;
export const SPRINKLE_BASE_COUNT = 2;
export const SPRINKLE_SPEED = 440;
export const SPRINKLE_LIFETIME = 2.8;
export const SPRINKLE_TURN_RATE = Math.PI * 6;
export const SPRINKLE_TRIGGER_RADIUS = 100;

// 화상 효과 설정
export const BURN_DURATION = 3.0;
export const BURN_DAMAGE_PER_SECOND = 0.5;
export const BURN_TICK_INTERVAL = 1.0;

// 경험치 보상
export const XP_REWARD_PINK = 50;
export const XP_REWARD_PURPLE = 100;
export const XP_REWARD_DARK_BLUE = 400;
export const XP_REWARD_BLACK_DUST = 100;
export const XP_REWARD_ORANGE_LADYBUG = 1000;
export const XP_REWARD_BOSS = 5000;

// 특별 스테이지 설정
export const STAGE_THREE_SURVIVAL_TIME = 60 * 15; // 15분

// 타임어택 모드 설정
export const TIME_ATTACK_DURATION = 60 * 15; // 15분
export const TIME_ATTACK_OBJECT_SCALE = 0.5; // 오브젝트 50% 크기
export const TIME_ATTACK_ENEMY_SIZE_MULTIPLIER = 2.0; // 타임어택 적 크기 배율
export const TIME_ATTACK_ENEMY_SPAWN_MULTIPLIER = 1.5; // 타임어택 적 스폰 수 배율
// 타임어택 모드 설정은 timeAttackConstants.js에서 관리

// 적 설정 (플레이어 크기 40px 기준)
export const ENEMY_SIZE = 20;
export const ENEMY_BASE_SPEED = 48;
export const ENEMY_SPEED_SCALE = 0.02;

// 핑크세균 (기본 적)
export const SPAWN_INTERVAL = 2.0;
export const SPAWN_INTERVAL_FLOOR = 0.7;
export const SPAWN_RADIUS_MIN = 420;
export const SPAWN_RADIUS_MAX = 680;

// 보라세균 (큰 적)
export const BIG_ENEMY_SIZE = ENEMY_SIZE;
export const BIG_ENEMY_HEALTH = 3;
export const BIG_ENEMY_SPEED = ENEMY_BASE_SPEED * 0.3;
export const BIG_ENEMY_SPAWN_TIME = 90;
export const BIG_ENEMY_SPAWN_CHANCE = 0.35;

// 남색세균 (스테이지 2+, 원거리 공격)
export const DARK_BLUE_ENEMY_SIZE = BIG_ENEMY_SIZE ;
export const DARK_BLUE_ENEMY_HEALTH = 8;
export const DARK_BLUE_ENEMY_SPEED = ENEMY_BASE_SPEED * 0.3;
export const DARK_BLUE_ENEMY_FIRE_INTERVAL = 3.25;
export const DARK_BLUE_PROJECTILE_SIZE = 10;
export const DARK_BLUE_PROJECTILE_SPEED = 140;

// 검은 먼지 적 설정 (느리고 작음)
export const BLACK_DUST_SIZE = BIG_ENEMY_SIZE;
export const BLACK_DUST_HEALTH = 2;
export const BLACK_DUST_SPEED = ENEMY_BASE_SPEED * 0.3;
export const BLACK_DUST_SPAWN_CHANCE = 0.3;
export const BLACK_DUST_SPAWN_INTERVAL = 5.0;
export const BLACK_DUST_MIN_COUNT = 3;
export const BLACK_DUST_MAX_COUNT = 5;

// 주황색 무당벌레 설정 (3스테이지 전용, 빠르고 작음)
export const ORANGE_LADYBUG_SIZE = ENEMY_SIZE;
export const ORANGE_LADYBUG_HEALTH = 10;
export const ORANGE_LADYBUG_SPEED = ENEMY_BASE_SPEED * 1;
export const ORANGE_LADYBUG_SPAWN_INTERVAL_MIN = 5.0;
export const ORANGE_LADYBUG_SPAWN_INTERVAL_MAX = 10.0;
export const ORANGE_LADYBUG_ZIGZAG_AMPLITUDE = 80;
export const ORANGE_LADYBUG_ZIGZAG_FREQUENCY = 2.0;

// 보스 설정 (테스트용 10초)
export const BOSS_SPAWN_TIME = 10.0;
export const BOSS_HEALTH = 200;
export const BOSS_SPEED = 130;
export const BOSS_CHARGE_SPEED = 480;
export const BOSS_CHARGE_PREP = 1.0;
export const BOSS_CHARGE_COOLDOWN = 6.0;
export const BOSS_RADIUS = 52; // 살짝 축소
export const BOSS_ATTACK_INTERVAL = 10;
export const BOSS_ATTACK_CHANCE = 0.5;
export const BOSS_WINDUP_TIME = 2.0;
export const BOSS_IDLE_SPEED = 200;
export const BOSS_HIT_SCORE = 5;
export const BOSS_HIT_RADIUS = 18;

// 블레이드 설정
export const BLADE_RADIUS = 60;
export const BLADE_SIZE = 56;
export const BLADE_ROTATION_SPEED = 2.4;
export const BLADE_HIT_COOLDOWN = 0.5;

// 전기장 설정
export const EM_FIELD_BASE_INTERVAL = 4.0;
export const EM_FIELD_MIN_INTERVAL = 1.5;
export const EM_EFFECT_LIFETIME = 0.22;

// 지뢰 설정
export const MINE_SIZE = 48;
export const MINE_TRIGGER_RADIUS = 60;
export const MINE_FLASH_DURATION = 0.6;

// 레벨 및 생존 설정
export const MAX_SURVIVAL_TIME = 180;
export const LEVEL_BLAST_RADIUS = 140;
export const LEVEL_BLAST_DURATION = 0.4;

// 치약 설정
export const TOOTHPASTE_DROP_INTERVAL = 10;
export const TOOTHPASTE_DROP_CHANCE = 0.5;
export const TOOTHPASTE_DROP_MIN_DISTANCE = 50;
export const TOOTHPASTE_DROP_DISTANCE = 200;
export const TOOTHPASTE_PICKUP_RADIUS = 90;
export const TOOTHPASTE_EFFECT_KILL_COUNT = 50;
export const TOOTHPASTE_FLASH_DURATION = 0.6;

// 색상 설정
export const BACKGROUND_COLOR = '#101218';
export const GRID_COLOR = '#c6ccd4';

// 경험치 설정
export const XP_PER_KILL = 20;
export const BASE_XP_TO_LEVEL = 150;    // 200 → 150 (시작 경험치 감소)
export const XP_LEVEL_SCALE = 1.5;      // 2.0 → 1.5 (증가율 완화)

// 폰트 설정
export const FONT_STACK = "500 16px 'Apple SD Gothic Neo','NanumGothic','Malgun Gothic','Noto Sans KR',sans-serif";

// 업그레이드 정의
export const UPGRADE_DEFINITIONS = {
  speed: { title: '이속 증가', max: 5 },
  attack_speed: { title: '공속 증가', max: 5 },
  multi_shot: { title: '김 추가', max: 5 },
  magnet: { title: '잼 자석', max: 5 },
  double_shot: { title: '더블 발사', max: 3 },
  sprinkle: { title: '스프링클', max: 3 },
  deulgireum_rapid: { title: '들기름', max: 1 },
  blade: { title: '킴스클럽', max: 5 },
  em_field: { title: '슈크림', max: 3 },
  ganjang_gim: { title: '간장김', max: 1 },
  kim_bugak: { title: '김부각', max: 1 },
  hp_increase: { title: '최대 HP 증가', max: 5 },
  electrocution: { title: '감전', max: 1 },
};

export const upgradeDisplayOrder = ['speed', 'attack_speed', 'multi_shot', 'magnet', 'double_shot', 'sprinkle', 'blade', 'em_field', 'ganjang_gim', 'kim_bugak', 'deulgireum_rapid', 'hp_increase', 'electrocution'];

// Gim variants
export const GIM_VARIANTS = ['독도김','성경김', '광천김', '성광김', '재래김'];

// Donut types
export const DONUT_TYPES = ['boston_creme', 'cocoa_frosted', 'bavarian_filled', 'glazed_ring', 'signature_knotted'];
