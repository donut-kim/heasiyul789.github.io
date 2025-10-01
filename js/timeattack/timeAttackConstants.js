// 타임어택 모드 전용 상수들

// 화면 설정
export const TIME_ATTACK_WIDTH = 600;
export const TIME_ATTACK_HEIGHT = 1000;
export const TIME_ATTACK_WORLD_BOUNDS = 600;

// 공격 관련 설정
export const TIME_ATTACK_BULLET_RANGE = 200; // 김공격 기본 사정거리
export const TIME_ATTACK_ATTACK_RADIUS = 10; // 기타 공격 사거리
export const TIME_ATTACK_BASE_BULLET_SCALE = 1.35; // 기본 김 크기 배율 (살짝 증가)
export const TIME_ATTACK_PLAYER_MAX_HEALTH = 10;
export const TIME_ATTACK_BURST_INTERVAL_LV4 = 0.08; // 4레벨 반원 간격
export const TIME_ATTACK_BURST_INTERVAL_LV5 = 0.055; // 5레벨 반원 간격
export const TIME_ATTACK_ENEMY_SPEED_FACTOR = 0.4; // 적 이동속도 60% 감소
export const TIME_ATTACK_BLADE_SIZE_SCALE = 1.25;
export const TIME_ATTACK_BLADE_ROTATION_FACTOR = 1.3;
export const TIME_ATTACK_BLADE_EXTRA_RADIUS = 10;
export const TIME_ATTACK_BLADE_DAMAGE = 2;
export const TIME_ATTACK_BLADE_KNOCKBACK = 60;
export const TIME_ATTACK_SPRINKLE_RANGE = 200;
export const TIME_ATTACK_BLACK_DUST_STORM_INTERVAL = 60;
export const TIME_ATTACK_BLACK_DUST_STORM_DURATION = 10;
export const TIME_ATTACK_BLACK_DUST_STORM_COUNT = 50;

// 블레이드 설정
export const TIME_ATTACK_BLADE_RADIUS_MULTIPLIER = 2.0; // 노말모드 대비 2배 거리

// 공격속도 관련
export const TIME_ATTACK_ATTACK_SPEED_GLOBAL_MULTIPLIER = 1.0; // 모든 스킬 시전속도 배율

// 격자 설정
export const TIME_ATTACK_GRID_SIZE = 50;
export const TIME_ATTACK_GRID_COLOR = 'rgba(0, 0, 0, 0.3)';

// 캐릭터 초기 위치
export const TIME_ATTACK_PLAYER_START_X = 0;
export const TIME_ATTACK_PLAYER_START_Y = 0;

export const TIME_ATTACK_BLACK_DUST_WARNING_TEXT = '검은 먼지가 몰려옵니다!';
export const TIME_ATTACK_BLACK_DUST_WARNING_DURATION = 3;
export const TIME_ATTACK_BLACK_DUST_WARNING_FLASH_INTERVAL = 0.3;
export const TIME_ATTACK_BLACK_DUST_WARNING_COLOR = '#ff4b4b';
