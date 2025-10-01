// 모듈 imports
import * as constants from './constants.js';
import * as timeAttackConstants from './timeAttackConstants.js';
import {
  createLadybugBossSprite,
  createAntBossSprite,
  createButterflyBossSprite,
  createCatBossSprite,
  createDogBossSprite
} from './bossSprites.js';
import {
  state,
  resetGameplayState,
  calculateTotalScore,
  computeFinalScoreDetails,
  xpRequired,
  keys,
  processingLevelChain,
  setProcessingLevelChain
} from './gameState.js';
import {
  showModal,
  hideModal,
  showRankingModal,
  closeRankingAndGoToStart,
  buildResultHtml,
  initializeUIElements,
  isNicknameValid,
  updateStartButtonState,
  modalOverlay,
  startOverlay,
  nicknameInput,
  startButton
} from './ui.js';
import { checkAndSaveRanking } from './ranking.js';
import { initializeDB } from './db.js';
import {
  vector,
  vectorAdd,
  vectorSub,
  vectorScale,
  vectorLength,
  vectorLengthSq,
  vectorNormalize,
  vectorCopy,
  vectorClampLength,
  clamp,
  randRange,
  randInt,
  lerp,
  circleIntersects,
  formatTime,
  makeRng,
  angleTowards,
  angleDifference,
  distance,
  getElementCenter,
  roundRect
} from './utils.js';
import {
  spawnEnemy,
  spawnDarkBlueEnemy,
  spawnBlackDustGroup,
  spawnOrangeLadybug,
  spawnBigEnemy,
  spawnBoss,
  spawnTimeAttackBoss,
  spawnToothpasteItem,
  getEnemySizeForMode,
  getStageSpeedMultiplier
} from './obj.js';
import {
  findTimeAttackTarget,
  findNormalModeTarget,
  calculateAttackDirections,
  updateLastTargetId,
  drawAttackIndicator
} from './attack.js';
import {
  spawnXpCrumbs,
  updateXpCrumbs,
  drawXpCrumbs
} from './xp.js';
import {
  drawTimeAttackBossWarning,
  drawBlackDustWarning,
  drawGameStartMessage,
  drawTimeAttackBossHP
} from './banner.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// ===== Canvas resize & DPR handling =====
const mediaPortrait = window.matchMedia('(max-width: 820px), (orientation: portrait)');
const BASE_LANDSCAPE = { w: 960, h: 540 };
const BASE_PORTRAIT  = { w: 360, h: 640 };
const BASE_TIME_ATTACK = { w: 600, h: 1000 };
const SPECIAL_BURST_EFFECT_DURATION = 0.5; // seconds

// Toggle to force multi-shot upgrade to appear every roll during Time Attack testing
const FORCE_TIMEATTACK_MULTI_SHOT = true;

const TIME_ATTACK_SPRINKLE_COLORS = ['#ff8da1', '#ffd35c', '#8ad4ff', '#f5f5f5'];

function hexToRgba(hex, alpha) {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getPlayerMaxHealth() {
  const baseHealth = timeAttackConstants.TIME_ATTACK_PLAYER_MAX_HEALTH;

  // 최대 HP 증가 스킬 효과 (+2 per level)
  const maxHealthBonus = (state.upgradeLevels.hp_increase || 0) * 2;

  return baseHealth + maxHealthBonus;
}

function sizeCanvasToCss() {
  const rootStyle = document.documentElement?.style;

  // 모바일인지 확인
  const isMobile = window.innerWidth <= 768;

  if (isMobile) {
    // 모바일에서는 노말모드와 동일한 캔버스 크기 처리
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
      const displayW = Math.max(1, Math.round(rect.width  * dpr));
      const displayH = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== displayW || canvas.height !== displayH) {
        canvas.width  = displayW;
        canvas.height = displayH;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 게임 월드는 타임어택 크기(600x1000) 유지, 화면 표시만 조정
      const worldW = BASE_TIME_ATTACK.w;
      const worldH = BASE_TIME_ATTACK.h;
      const sx = rect.width  / worldW;
      const sy = rect.height / worldH;
      const s = Math.min(sx, sy);
      let offsetX = (rect.width  - worldW * s) * 0.5;
      let offsetY = (rect.height - worldH * s) * 0.5;

      if (rect.width > 0 && rect.height > 0) {
        rootStyle?.setProperty('--timeattack-width', `${rect.width}px`);
        rootStyle?.setProperty('--timeattack-height', `${rect.height}px`);
      }

      // 모바일 HUD(상단)와 XP 바(하단)가 가리는 영역을 고려해 플레이어가 중앙에 오도록 보정
      const hudRect = mobileHud?.offsetParent ? mobileHud.getBoundingClientRect() : null;
      const xpRect = xpBarWrapper?.getBoundingClientRect() || null;
      if (hudRect && xpRect && rect.width > 0 && rect.height > 0) {
        const canvasRect = rect;
        const topOverlap = Math.max(0, hudRect.bottom - canvasRect.top);
        const bottomOverlap = Math.max(0, canvasRect.bottom - xpRect.top);
        const visibleStart = topOverlap;
        const visibleEnd = canvasRect.height - bottomOverlap;
        if (visibleEnd > visibleStart) {
          const desiredCenter = (visibleStart + visibleEnd) * 0.5;
          const currentCenter = offsetY + (worldH * s) * 0.5;
          offsetY += desiredCenter - currentCenter;
        }
      }

      window.__renderScale = { s, worldW, worldH, offsetX, offsetY };
    } else {
      // PC에서는 화면에 맞게 조정하되, 월드맵 크기는 600x1000 유지
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const displayW = Math.max(1, Math.round(rect.width  * dpr));
      const displayH = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== displayW || canvas.height !== displayH) {
        canvas.width  = displayW;
        canvas.height = displayH;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // 게임 월드는 타임어택 크기(600x1000) 유지, 화면 표시만 조정
      const worldW = BASE_TIME_ATTACK.w;
      const worldH = BASE_TIME_ATTACK.h;
      const sx = rect.width  / worldW;
      const sy = rect.height / worldH;
      const s = Math.min(sx, sy);
      const offsetX = (rect.width  - worldW * s) * 0.5;
      const offsetY = (rect.height - worldH * s) * 0.5;

      if (rect.width > 0 && rect.height > 0) {
        rootStyle?.setProperty('--timeattack-width', `${rect.width}px`);
        rootStyle?.setProperty('--timeattack-height', `${rect.height}px`);
      }

      window.__renderScale = { s, worldW, worldH, offsetX, offsetY };
    }
}

window.addEventListener('load', sizeCanvasToCss);
window.addEventListener('resize', sizeCanvasToCss);
mediaPortrait.addEventListener?.('change', sizeCanvasToCss);

const sidePanel = document.getElementById('side-panel');
const statTime = document.getElementById('stat-time');
const statScore = document.getElementById('stat-score');
const statHP = document.getElementById('stat-hp');
const statLevel = document.getElementById('stat-level');
const statNickname = document.getElementById('stat-nickname');
const statBoss = document.getElementById('stat-boss');
const statBossHP = document.getElementById('stat-boss-hp');
const xpBarFill = document.getElementById('xp-bar-fill');
const xpLevelText = document.getElementById('xp-level-text');
const xpProgressText = document.getElementById('xp-progress-text');
const upgradeOverlay = document.getElementById('upgrade-overlay');
const upgradeCardsWrapper = document.getElementById('upgrade-cards');

// ===== Mobile detection & HUD / Joystick elements =====
const isMobile = ('ontouchstart' in window) || window.matchMedia('(pointer: coarse)').matches;

// Mobile HUD elements (shown on portrait/mobile)
const mobileHud = document.getElementById('top-hud');
const xpBarWrapper = document.getElementById('xp-bar-wrapper');
const mobileHP = document.getElementById('mobile-hp');
const mobileScore = document.getElementById('mobile-score');
const mobileTime = document.getElementById('mobile-time');

// Joystick elements
const joystick = document.getElementById('joystick');
const joystickStick = document.getElementById('joystick-stick');

// Joystick state
const touchInput = {
  active: false,
  dir: vector(0, 0),
  origin: { x: 0, y: 0 },
};



// 모든 게임 상수들은 constants.js에서 import
function createBacteriaSpritePurple(size) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ict = off.getContext('2d');
  const center = size / 2;
  const spikes = 12;
  const baseRadius = size / 2.2;
  ict.translate(center, center);
  ict.fillStyle = '#a178ff';   // body fill (purple)
  ict.strokeStyle = '#6b3fb3'; // outline (darker purple)
  ict.lineWidth = 3;
  ict.beginPath();
  for (let i = 0; i <= spikes; i++) {
    const angle = (Math.PI * 2 * i) / spikes;
    const radius = baseRadius + Math.sin(angle * 3) * (size * 0.08);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) {
      ict.moveTo(x, y);
    } else {
      ict.lineTo(x, y);
    }
  }
  ict.closePath();
  ict.fill();
  ict.stroke();

  // eyes/highlights
  ict.fillStyle = '#efe5ff';
  ict.beginPath();
  ict.arc(-size * 0.15, -size * 0.1, size * 0.18, 0, Math.PI * 2);
  ict.fill();
  ict.beginPath();
  ict.arc(size * 0.18, -size * 0.05, size * 0.14, 0, Math.PI * 2);
  ict.fill();

  ict.fillStyle = '#3a1d6e';
  ict.beginPath();
  ict.arc(-size * 0.15, -size * 0.1, size * 0.07, 0, Math.PI * 2);
  ict.fill();
  ict.beginPath();
  ict.arc(size * 0.18, -size * 0.05, size * 0.06, 0, Math.PI * 2);
  ict.fill();

  ict.strokeStyle = '#7b46c9';
  ict.lineWidth = 2;
  ict.beginPath();
  ict.arc(0, size * 0.15, size * 0.2, 0, Math.PI);
  ict.stroke();

  return off;
}
// constants.UPGRADE_DEFINITIONS와 upgradeDisplayOrder는 constants.js에서 import

// utils.js에서 import한 함수들을 사용
const rng = makeRng(1337);

// computeFinalScoreDetails 함수는 gameState.js에서 import


// vector 관련 함수들은 utils.js에서 import


function rectCollide(a, b) {
  return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
}

function circleRectCollide(cx, cy, radius, rect) {
  const testX = clamp(cx, rect.x, rect.x + rect.w);
  const testY = clamp(cy, rect.y, rect.y + rect.h);
  const distX = cx - testX;
  const distY = cy - testY;
  return distX * distX + distY * distY <= radius * radius;
}

function createRoundedSprite(size, fill, border) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ict = off.getContext('2d');
  const radiusOuter = 10;
  ict.fillStyle = border;
  roundRect(ict, 0, 0, size, size, radiusOuter);
  ict.fill();
  const inset = 4;
  ict.fillStyle = fill;
  roundRect(ict, inset, inset, size - inset * 2, size - inset * 2, radiusOuter - 2);
  ict.fill();
  return off;
}

function createDonutSprite(size) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ict = off.getContext('2d');
  const center = size / 2;
  const outer = size / 2 - 1;

  // 원래 도넛 베이스 (꽉 찬 원형)
  const gradient = ict.createRadialGradient(center, center, outer * 0.3, center, center, outer);
  gradient.addColorStop(0, '#7b3f11');
  gradient.addColorStop(0.6, '#582b08');
  gradient.addColorStop(1, '#2f1404');
  ict.fillStyle = gradient;
  ict.beginPath();
  ict.arc(center, center, outer, 0, Math.PI * 2);
  ict.fill();

  // 원래 하이라이트
  ict.fillStyle = 'rgba(255,245,200,0.18)';
  ict.beginPath();
  ict.ellipse(center - outer * 0.28, center - outer * 0.32, outer * 0.45, outer * 0.28, -0.55, 0, Math.PI * 2);
  ict.fill();

  // 원래 스프링클
  const sprinkleColors = ['#ffe3a3', '#ff92c2', '#88d8ff', '#f2f2f2'];
  const sprinkleCount = 14;
  for (let i = 0; i < sprinkleCount; i++) {
    const angle = (Math.PI * 2 * i) / sprinkleCount + Math.random() * 0.2;
    const radius = outer * 0.7 + Math.random() * 4;
    const x = center + Math.cos(angle) * radius;
    const y = center + Math.sin(angle) * radius;
    ict.save();
    ict.translate(x, y);
    ict.rotate(angle);
    ict.fillStyle = sprinkleColors[i % sprinkleColors.length];
    ict.fillRect(-1.2, -4, 2.4, 8);
    ict.restore();
  }

  return off;
}

function createGlazedDonutSprite(size) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ict = off.getContext('2d');
  const center = size / 2;
  const outer = size / 2 - 1;

  // 외곽 테두리 (더 명확한 윤곽)
  ict.strokeStyle = '#8b6914';
  ict.lineWidth = 2;
  ict.beginPath();
  ict.arc(center, center, outer, 0, Math.PI * 2);
  ict.stroke();

  // 도넛 베이스 (더 진한 색상으로 대비 증가)
  const doughGradient = ict.createRadialGradient(center, center, outer * 0.2, center, center, outer);
  doughGradient.addColorStop(0, '#f4d79a');
  doughGradient.addColorStop(0.6, '#d4a853');
  doughGradient.addColorStop(1, '#a67c00');
  ict.fillStyle = doughGradient;
  ict.beginPath();
  ict.arc(center, center, outer, 0, Math.PI * 2);
  ict.fill();

  // 흰색 글레이즈 (더 밝고 대비가 강한 글레이즈)
  const glazeGradient = ict.createRadialGradient(center, center, 0, center, center, outer * 0.8);
  glazeGradient.addColorStop(0, '#ffffff');
  glazeGradient.addColorStop(0.7, '#f0f0f0');
  glazeGradient.addColorStop(1, '#d0d0d0');
  ict.fillStyle = glazeGradient;
  ict.beginPath();
  ict.arc(center, center, outer * 0.8, 0, Math.PI * 2);
  ict.fill();

  // 글레이즈 테두리
  ict.strokeStyle = '#c0c0c0';
  ict.lineWidth = 1;
  ict.beginPath();
  ict.arc(center, center, outer * 0.8, 0, Math.PI * 2);
  ict.stroke();

  // 글레이즈 하이라이트 (더 뚜렷한 반짝임)
  ict.fillStyle = 'rgba(255,255,255,0.9)';
  ict.beginPath();
  ict.ellipse(center - outer * 0.2, center - outer * 0.2, outer * 0.3, outer * 0.18, -0.5, 0, Math.PI * 2);
  ict.fill();

  // 작은 하이라이트 (더 밝게)
  ict.fillStyle = 'rgba(255,255,255,0.7)';
  ict.beginPath();
  ict.ellipse(center + outer * 0.25, center + outer * 0.1, outer * 0.12, outer * 0.08, 0.8, 0, Math.PI * 2);
  ict.fill();

  return off;
}

function createSeaweedSprite(size) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size * 1.6;
  const ict = off.getContext('2d');
  const width = size * 0.9;
  const height = off.height;
  ict.translate(off.width / 2, off.height / 2);
  ict.rotate(-Math.PI / 18);
  ict.fillStyle = '#152814';
  ict.fillRect(-width / 2, -height / 2, width, height);
  const gradient = ict.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
  gradient.addColorStop(0, '#234222');
  gradient.addColorStop(0.5, '#1b361a');
  gradient.addColorStop(1, '#152814');
  ict.fillStyle = gradient;
  ict.fillRect(-width / 2 + 1, -height / 2 + 1, width - 2, height - 2);
  ict.strokeStyle = 'rgba(255,255,255,0.2)';
  ict.lineWidth = 2;
  ict.beginPath();
  ict.moveTo(-width / 3, -height / 2 + 6);
  ict.lineTo(width / 3, height / 2 - 6);
  ict.stroke();
  return off;
}

function createKimBugakSprite(size) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size * 1.6;
  const ict = off.getContext('2d');
  const width = size * 0.9;
  const height = off.height;
  ict.translate(off.width / 2, off.height / 2);
  ict.rotate(-Math.PI / 18);

  // 김부각 베이스 색깔 (더 진한 갈색/검정)
  ict.fillStyle = '#2a1f0a';
  ict.fillRect(-width / 2, -height / 2, width, height);

  const gradient = ict.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
  gradient.addColorStop(0, '#3d2e15');
  gradient.addColorStop(0.5, '#2a1f0a');
  gradient.addColorStop(1, '#1a1204');
  ict.fillStyle = gradient;
  ict.fillRect(-width / 2 + 1, -height / 2 + 1, width - 2, height - 2);

  // 튀김가루 효과 (흰색 점들과 가루)
  // 큰 튀김가루 덩어리들
  ict.fillStyle = 'rgba(255,255,255,0.9)';
  for (let i = 0; i < 18; i++) {
    const x = (-width / 2) + Math.random() * width;
    const y = (-height / 2) + Math.random() * height;
    const dotSize = 1.2 + Math.random() * 1.8;
    ict.beginPath();
    ict.arc(x, y, dotSize, 0, Math.PI * 2);
    ict.fill();
  }

  // 중간 크기 튀김가루
  ict.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 25; i++) {
    const x = (-width / 2) + Math.random() * width;
    const y = (-height / 2) + Math.random() * height;
    const dotSize = 0.6 + Math.random() * 1.0;
    ict.beginPath();
    ict.arc(x, y, dotSize, 0, Math.PI * 2);
    ict.fill();
  }

  // 작은 가루 효과
  ict.fillStyle = 'rgba(255,255,255,0.5)';
  for (let i = 0; i < 35; i++) {
    const x = (-width / 2) + Math.random() * width;
    const y = (-height / 2) + Math.random() * height;
    const dotSize = 0.3 + Math.random() * 0.6;
    ict.beginPath();
    ict.arc(x, y, dotSize, 0, Math.PI * 2);
    ict.fill();
  }

  // 불규칙한 가루 덩어리들
  ict.fillStyle = 'rgba(255,255,255,0.6)';
  for (let i = 0; i < 8; i++) {
    const x = (-width / 2) + Math.random() * width;
    const y = (-height / 2) + Math.random() * height;
    const w = 2 + Math.random() * 3;
    const h = 1 + Math.random() * 2;
    ict.fillRect(x - w/2, y - h/2, w, h);
  }

  // 외곽선
  ict.strokeStyle = 'rgba(255,255,255,0.3)';
  ict.lineWidth = 2;
  ict.beginPath();
  ict.moveTo(-width / 3, -height / 2 + 6);
  ict.lineTo(width / 3, height / 2 - 6);
  ict.stroke();

  return off;
}

function createSprinkleProjectileSprite(size) {
  const off = document.createElement('canvas');
  const width = size * 0.6;
  const height = size * 1.6;
  off.width = Math.ceil(width + 6);
  off.height = Math.ceil(height + 6);
  const ict = off.getContext('2d');
  const x = (off.width - width) / 2;
  const y = (off.height - height) / 2;

  const gradient = ict.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, '#ff92c2');
  gradient.addColorStop(0.5, '#ffe979');
  gradient.addColorStop(1, '#8ad9ff');

  ict.fillStyle = gradient;
  ict.beginPath();
  roundRect(ict, x, y, width, height, width * 0.45);
  ict.fill();

  ict.strokeStyle = 'rgba(255,255,255,0.6)';
  ict.lineWidth = 1.4;
  ict.beginPath();
  roundRect(ict, x + 1, y + 1, width - 2, height - 2, width * 0.4);
  ict.stroke();

  return off;
}

function createMineSprite(size) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ict = off.getContext('2d');
  const center = size / 2;
  ict.fillStyle = '#f0783c';
  ict.beginPath();
  ict.arc(center, center, center - 2, 0, Math.PI * 2);
  ict.fill();
  ict.strokeStyle = '#321408';
  ict.lineWidth = 4;
  ict.beginPath();
  ict.arc(center, center, center - 6, 0, Math.PI * 2);
  ict.stroke();
  ict.strokeStyle = '#ffe288';
  ict.lineWidth = 3;
  ict.beginPath();
  ict.moveTo(center, 6);
  ict.lineTo(center, size - 6);
  ict.moveTo(6, center);
  ict.lineTo(size - 6, center);
  ict.stroke();
  return off;
}

function createToothpasteSprite(size) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ict = off.getContext('2d');
  const baseSize = 42;
  const scale = size / baseSize;
  ict.scale(scale, scale);
  ict.translate(baseSize / 2, baseSize / 2);
  ict.rotate(Math.PI / 16);
  const tubeWidth = 22;
  const tubeHeight = 30;
  const capHeight = 7;

  const bodyGradient = ict.createLinearGradient(-tubeWidth / 2, -tubeHeight / 2, tubeWidth / 2, tubeHeight / 2);
  bodyGradient.addColorStop(0, '#ffffff');
  bodyGradient.addColorStop(0.3, '#f2f8ff');
  bodyGradient.addColorStop(1, '#ffffff');
  roundRect(ict, -tubeWidth / 2, -tubeHeight / 2, tubeWidth, tubeHeight, 5);
  ict.fillStyle = bodyGradient;
  ict.fill();
  ict.lineWidth = 2;
  ict.strokeStyle = '#bfcfe6';
  roundRect(ict, -tubeWidth / 2, -tubeHeight / 2, tubeWidth, tubeHeight, 5);
  ict.stroke();

  const swooshGradient = ict.createLinearGradient(-tubeWidth / 2, -tubeHeight / 3, tubeWidth / 2, tubeHeight / 2);
  swooshGradient.addColorStop(0, '#0c6be7');
  swooshGradient.addColorStop(1, '#35c7ff');
  ict.fillStyle = swooshGradient;
  ict.beginPath();
  ict.moveTo(-tubeWidth * 0.45, -tubeHeight * 0.2);
  ict.quadraticCurveTo(tubeWidth * 0.1, -tubeHeight * 0.3, tubeWidth * 0.48, -tubeHeight * 0.05);
  ict.quadraticCurveTo(tubeWidth * 0.15, tubeHeight * 0.12, -tubeWidth * 0.4, tubeHeight * 0.08);
  ict.closePath();
  ict.fill();

  const redGradient = ict.createLinearGradient(-tubeWidth * 0.3, -tubeHeight * 0.08, tubeWidth * 0.25, tubeHeight * 0.2);
  redGradient.addColorStop(0, '#f03d44');
  redGradient.addColorStop(1, '#ff8880');
  ict.fillStyle = redGradient;
  ict.beginPath();
  ict.moveTo(-tubeWidth * 0.35, -tubeHeight * 0.03);
  ict.quadraticCurveTo(-tubeWidth * 0.05, tubeHeight * 0.05, tubeWidth * 0.4, 0);
  ict.quadraticCurveTo(tubeWidth * 0.05, -tubeHeight * 0.12, -tubeWidth * 0.35, -tubeHeight * 0.03);
  ict.closePath();
  ict.fill();

  ict.fillStyle = 'rgba(255,255,255,0.95)';
  roundRect(ict, -tubeWidth * 0.3, -tubeHeight * 0.1, tubeWidth * 0.6, tubeHeight * 0.22, 4);
  ict.fill();
  ict.fillStyle = '#0c5adb';
  ict.font = 'bold 8px sans-serif';
  ict.textAlign = 'center';
  ict.textBaseline = 'middle';
  ict.fillText('2090', 0, -tubeHeight * 0.01);
  ict.fillStyle = '#eb3450';
  ict.font = '600 6px sans-serif';
  ict.fillText('POWER FRESH', 0, tubeHeight * 0.08);

  const capGradient = ict.createLinearGradient(-tubeWidth * 0.36, tubeHeight / 2 - capHeight, tubeWidth * 0.36, tubeHeight / 2);
  capGradient.addColorStop(0, '#e2e9f1');
  capGradient.addColorStop(1, '#bcc8d6');
  roundRect(ict, -tubeWidth * 0.36, tubeHeight / 2 - capHeight, tubeWidth * 0.72, capHeight, 3);
  ict.fillStyle = capGradient;
  ict.fill();
  ict.strokeStyle = '#98a5b6';
  roundRect(ict, -tubeWidth * 0.36, tubeHeight / 2 - capHeight, tubeWidth * 0.72, capHeight, 3);
  ict.stroke();
  ict.strokeStyle = 'rgba(120,130,140,0.65)';
  ict.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const y = tubeHeight / 2 - capHeight + (i + 1) * (capHeight / 4);
    ict.beginPath();
    ict.moveTo(-tubeWidth * 0.32, y);
    ict.lineTo(tubeWidth * 0.32, y);
    ict.stroke();
  }

  ict.fillStyle = '#ffffff';
  ict.beginPath();
  ict.moveTo(0, tubeHeight / 2);
  ict.lineTo(tubeWidth * 0.13, tubeHeight / 2 + 10);
  ict.lineTo(-tubeWidth * 0.13, tubeHeight / 2 + 10);
  ict.closePath();
  ict.fill();
  ict.strokeStyle = '#ccd3df';
  ict.stroke();
  return off;
}

function createGimSprite(size, label) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ict = off.getContext('2d');
  const width = size * 0.8;
  const height = size * 0.55;
  ict.translate(size / 2, size / 2);

  const bodyGradient = ict.createLinearGradient(-width / 2, -height / 2, width / 2, height / 2);
  bodyGradient.addColorStop(0, '#0d1a10');
  bodyGradient.addColorStop(0.4, '#1f2f1d');
  bodyGradient.addColorStop(1, '#0a140b');
  roundRect(ict, -width / 2, -height / 2, width, height, height * 0.18);
  ict.fillStyle = bodyGradient;
  ict.fill();

  ict.strokeStyle = 'rgba(255,255,255,0.12)';
  ict.lineWidth = size * 0.03;
  ict.stroke();

  ict.strokeStyle = 'rgba(0,0,0,0.35)';
  ict.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    ict.beginPath();
    ict.moveTo(-width / 2, (height / 5) * i);
    ict.lineTo(width / 2, (height / 5) * i + (i % 2) * 2);
    ict.stroke();
  }

  ict.fillStyle = 'rgba(255,255,255,0.1)';
  ict.beginPath();
  ict.ellipse(-width * 0.15, -height * 0.18, width * 0.18, height * 0.22, -0.3, 0, Math.PI * 2);
  ict.fill();

  ict.fillStyle = '#ffeeb8';
  ict.font = `600 ${Math.max(6, size * 0.22)}px 'NanumSquare', sans-serif`;
  ict.textAlign = 'center';
  ict.textBaseline = 'middle';
  ict.fillText(label, 0, -height * 0.05);

  ict.fillStyle = '#e8ffcf';
  ict.font = `500 ${Math.max(5, size * 0.14)}px 'NanumSquare', sans-serif`;
  ict.fillText('김', 0, height * 0.22);

  return off;
}


function createBacteriaSprite(size) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ict = off.getContext('2d');
  const center = size / 2;
  const spikes = 12;
  const baseRadius = size / 2.2;
  ict.translate(center, center);
  ict.fillStyle = '#ff8ed1';
  ict.strokeStyle = '#cc5ea3';
  ict.lineWidth = 3;
  ict.beginPath();
  for (let i = 0; i <= spikes; i++) {
    const angle = (Math.PI * 2 * i) / spikes;
    const radius = baseRadius + Math.sin(angle * 3) * (size * 0.08);
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) {
      ict.moveTo(x, y);
    } else {
      ict.lineTo(x, y);
    }
  }
  ict.closePath();
  ict.fill();
  ict.stroke();

  ict.fillStyle = '#ffe9f7';
  ict.beginPath();
  ict.arc(-size * 0.15, -size * 0.1, size * 0.18, 0, Math.PI * 2);
  ict.fill();
  ict.beginPath();
  ict.arc(size * 0.18, -size * 0.05, size * 0.14, 0, Math.PI * 2);
  ict.fill();

  ict.fillStyle = '#662054';
  ict.beginPath();
  ict.arc(-size * 0.15, -size * 0.1, size * 0.07, 0, Math.PI * 2);
  ict.fill();
  ict.beginPath();
  ict.arc(size * 0.18, -size * 0.05, size * 0.06, 0, Math.PI * 2);
  ict.fill();

  ict.strokeStyle = '#cc5ea3';
  ict.lineWidth = 2;
  ict.beginPath();
  ict.arc(0, size * 0.15, size * 0.2, 0, Math.PI);
  ict.stroke();

  return off;
}

function createClampBossSprite(size) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ict = off.getContext('2d');
  const half = size / 2;
  ict.translate(half, half);

  ict.lineCap = 'round';
  ict.lineJoin = 'round';

  // 가위 손잡이 부분 (더 크고 위협적으로)
  const handleLength = size * 0.3;
  const handleWidth = size * 0.1;
  const bladeLength = size * 0.45;

  // 가위의 금속질감 그라디언트
  const metalGradient = ict.createLinearGradient(-handleLength, -handleLength, handleLength, handleLength);
  metalGradient.addColorStop(0, '#9ca3af');
  metalGradient.addColorStop(0.5, '#d1d5db');
  metalGradient.addColorStop(1, '#6b7280');

  // 위쪽 가위날 (손잡이 포함) - 더 위협적인 각도
  ict.save();
  ict.rotate(-Math.PI / 4.5);

  // 손잡이
  ict.fillStyle = '#4b5563';
  ict.strokeStyle = '#374151';
  ict.lineWidth = size * 0.015;
  ict.fillRect(-handleLength, -handleWidth / 2, handleLength * 0.8, handleWidth);
  ict.strokeRect(-handleLength, -handleWidth / 2, handleLength * 0.8, handleWidth);

  // 날 부분 - 더 날카롭고 위험하게
  ict.fillStyle = metalGradient;
  ict.strokeStyle = '#4b5563';
  ict.lineWidth = size * 0.025;
  ict.beginPath();
  ict.moveTo(-handleLength * 0.2, 0);
  ict.lineTo(bladeLength, -handleWidth * 0.5);
  ict.lineTo(bladeLength + size * 0.12, 0);
  ict.lineTo(bladeLength, handleWidth * 0.5);
  ict.closePath();
  ict.fill();
  ict.stroke();

  // 가위날에 톱니 추가 (더 가위스럽게)
  ict.strokeStyle = '#374151';
  ict.lineWidth = size * 0.01;
  for (let i = 0; i < 5; i++) {
    const x = (bladeLength * 0.3) + (i * bladeLength * 0.15);
    const y1 = -handleWidth * 0.2;
    const y2 = handleWidth * 0.2;
    ict.beginPath();
    ict.moveTo(x, y1);
    ict.lineTo(x + size * 0.02, y1 - size * 0.015);
    ict.moveTo(x, y2);
    ict.lineTo(x + size * 0.02, y2 + size * 0.015);
    ict.stroke();
  }

  // 날 끝의 눈
  const eyeX = bladeLength + size * 0.04;
  ict.fillStyle = '#ffffff';
  ict.beginPath();
  ict.arc(eyeX, 0, size * 0.05, 0, Math.PI * 2);
  ict.fill();
  ict.strokeStyle = '#1f2937';
  ict.lineWidth = size * 0.01;
  ict.stroke();

  // 빨간 눈동자
  ict.fillStyle = '#dc2626';
  ict.beginPath();
  ict.arc(eyeX, 0, size * 0.025, 0, Math.PI * 2);
  ict.fill();

  // 눈동자 반짝이
  ict.fillStyle = '#ffffff';
  ict.beginPath();
  ict.arc(eyeX + size * 0.01, -size * 0.01, size * 0.01, 0, Math.PI * 2);
  ict.fill();

  ict.restore();

  // 아래쪽 가위날 (손잡이 포함) - 더 위협적인 각도
  ict.save();
  ict.rotate(Math.PI / 4.5);

  // 손잡이
  ict.fillStyle = '#4b5563';
  ict.strokeStyle = '#374151';
  ict.lineWidth = size * 0.015;
  ict.fillRect(-handleLength, -handleWidth / 2, handleLength * 0.8, handleWidth);
  ict.strokeRect(-handleLength, -handleWidth / 2, handleLength * 0.8, handleWidth);

  // 날 부분 - 더 날카롭고 위험하게
  ict.fillStyle = metalGradient;
  ict.strokeStyle = '#4b5563';
  ict.lineWidth = size * 0.025;
  ict.beginPath();
  ict.moveTo(-handleLength * 0.2, 0);
  ict.lineTo(bladeLength, -handleWidth * 0.5);
  ict.lineTo(bladeLength + size * 0.12, 0);
  ict.lineTo(bladeLength, handleWidth * 0.5);
  ict.closePath();
  ict.fill();
  ict.stroke();

  // 가위날에 톱니 추가 (더 가위스럽게)
  ict.strokeStyle = '#374151';
  ict.lineWidth = size * 0.01;
  for (let i = 0; i < 5; i++) {
    const x = (bladeLength * 0.3) + (i * bladeLength * 0.15);
    const y1 = -handleWidth * 0.2;
    const y2 = handleWidth * 0.2;
    ict.beginPath();
    ict.moveTo(x, y1);
    ict.lineTo(x + size * 0.02, y1 - size * 0.015);
    ict.moveTo(x, y2);
    ict.lineTo(x + size * 0.02, y2 + size * 0.015);
    ict.stroke();
  }

  // 날 끝의 눈
  ict.fillStyle = '#ffffff';
  ict.beginPath();
  ict.arc(eyeX, 0, size * 0.05, 0, Math.PI * 2);
  ict.fill();
  ict.strokeStyle = '#1f2937';
  ict.lineWidth = size * 0.01;
  ict.stroke();

  // 빨간 눈동자
  ict.fillStyle = '#dc2626';
  ict.beginPath();
  ict.arc(eyeX, 0, size * 0.025, 0, Math.PI * 2);
  ict.fill();

  // 눈동자 반짝이
  ict.fillStyle = '#ffffff';
  ict.beginPath();
  ict.arc(eyeX + size * 0.01, -size * 0.01, size * 0.01, 0, Math.PI * 2);
  ict.fill();

  ict.restore();

  // 중심 연결부 (나사/리벳) - 더 크고 견고하게
  const centerRadius = size * 0.08;
  const centerGradient = ict.createRadialGradient(0, 0, 0, 0, 0, centerRadius);
  centerGradient.addColorStop(0, '#f3f4f6');
  centerGradient.addColorStop(0.7, '#d1d5db');
  centerGradient.addColorStop(1, '#9ca3af');

  ict.fillStyle = centerGradient;
  ict.beginPath();
  ict.arc(0, 0, centerRadius, 0, Math.PI * 2);
  ict.fill();

  ict.strokeStyle = '#6b7280';
  ict.lineWidth = size * 0.01;
  ict.stroke();

  // 나사 십자 표시
  ict.strokeStyle = '#4b5563';
  ict.lineWidth = size * 0.008;
  ict.beginPath();
  ict.moveTo(-centerRadius * 0.5, 0);
  ict.lineTo(centerRadius * 0.5, 0);
  ict.moveTo(0, -centerRadius * 0.5);
  ict.lineTo(0, centerRadius * 0.5);
  ict.stroke();

  return off;
}


function createBacteriaSpriteDarkBlue(size) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ict = off.getContext('2d');
  const center = size / 2;
  const radius = center - 2;

  // 남색 그라디언트
  const bodyGradient = ict.createRadialGradient(center, center, radius * 0.2, center, center, radius);
  bodyGradient.addColorStop(0, '#4c6ce6');
  bodyGradient.addColorStop(0.6, '#2d4ac7');
  bodyGradient.addColorStop(1, '#1d2f8a');

  ict.fillStyle = bodyGradient;
  ict.beginPath();
  ict.arc(center, center, radius, 0, Math.PI * 2);
  ict.fill();

  // 테두리
  ict.strokeStyle = '#1a237e';
  ict.lineWidth = 3;
  ict.stroke();

  // 위협적인 가시들
  ict.fillStyle = '#303f9f';
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const spikeLength = 8 + Math.sin(i) * 3;
    const x1 = center + Math.cos(angle) * radius;
    const y1 = center + Math.sin(angle) * radius;
    const x2 = center + Math.cos(angle) * (radius + spikeLength);
    const y2 = center + Math.sin(angle) * (radius + spikeLength);

    ict.beginPath();
    ict.moveTo(center + Math.cos(angle) * (radius - 3), center + Math.sin(angle) * (radius - 3));
    ict.lineTo(x2, y2);
    ict.lineTo(x1, y1);
    ict.closePath();
    ict.fill();
  }

  // 내부 패턴 (더 위협적으로)
  ict.fillStyle = '#1a237e';
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2;
    const dist = radius * 0.5;
    const x = center + Math.cos(angle) * dist;
    const y = center + Math.sin(angle) * dist;
    ict.beginPath();
    ict.arc(x, y, 4, 0, Math.PI * 2);
    ict.fill();
  }

  // 중앙 핵심 부분
  ict.fillStyle = '#0d1757';
  ict.beginPath();
  ict.arc(center, center, radius * 0.3, 0, Math.PI * 2);
  ict.fill();

  return off;
}

function createBlackDustSprite(size) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ict = off.getContext('2d');
  const center = size / 2;
  const radius = center - 2;

  const baseRadius = radius * 0.75;

  // 몸체를 더 둥글고 부드럽게
  const bodyGradient = ict.createRadialGradient(center - baseRadius * 0.3, center - baseRadius * 0.3, 0, center, center, baseRadius);
  bodyGradient.addColorStop(0, '#3a3a3a');
  bodyGradient.addColorStop(0.7, '#1a1a1a');
  bodyGradient.addColorStop(1, '#0a0a0a');

  ict.fillStyle = bodyGradient;
  ict.beginPath();
  ict.arc(center, center, baseRadius, 0, Math.PI * 2);
  ict.fill();

  // 더 짧고 귀여운 다리들 (6개로 줄임)
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + Math.PI / 6;
    const legLength = baseRadius * 0.4;
    const legWidth = 1.5;

    const startX = center + Math.cos(angle) * baseRadius * 0.7;
    const startY = center + Math.sin(angle) * baseRadius * 0.7;
    const endX = center + Math.cos(angle) * (baseRadius + legLength);
    const endY = center + Math.sin(angle) * (baseRadius + legLength);

    ict.strokeStyle = '#2a2a2a';
    ict.lineWidth = legWidth;
    ict.lineCap = 'round';
    ict.beginPath();
    ict.moveTo(startX, startY);
    ict.lineTo(endX, endY);
    ict.stroke();
  }

  // 더 부드러운 내부 원
  const innerGradient = ict.createRadialGradient(center, center, 0, center, center, baseRadius * 0.8);
  innerGradient.addColorStop(0, '#2a2a2a');
  innerGradient.addColorStop(1, '#000000');

  ict.fillStyle = innerGradient;
  ict.beginPath();
  ict.arc(center, center, baseRadius * 0.8, 0, Math.PI * 2);
  ict.fill();

  // 귀여운 반짝이 점들
  ict.fillStyle = '#555555';
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const dist = baseRadius * 0.3 + Math.random() * baseRadius * 0.2;
    const x = center + Math.cos(angle) * dist;
    const y = center + Math.sin(angle) * dist;
    const dotSize = 0.5 + Math.random() * 1;

    ict.beginPath();
    ict.arc(x, y, dotSize, 0, Math.PI * 2);
    ict.fill();
  }

  // 더 크고 귀여운 눈 (센과치히로 스타일)
  ict.fillStyle = '#ffffff';
  const eyeOffset = baseRadius * 0.4;
  const eyeSize = baseRadius * 0.4;

  // 왼쪽 눈
  ict.beginPath();
  ict.arc(center - eyeOffset, center - eyeOffset * 0.3, eyeSize, 0, Math.PI * 2);
  ict.fill();

  // 오른쪽 눈
  ict.beginPath();
  ict.arc(center + eyeOffset, center - eyeOffset * 0.3, eyeSize, 0, Math.PI * 2);
  ict.fill();

  // 작은 검은 눈동자 (센과치히로 스타일)
  ict.fillStyle = '#000000';
  const pupilSize = eyeSize * 0.25;

  ict.beginPath();
  ict.arc(center - eyeOffset, center - eyeOffset * 0.3, pupilSize, 0, Math.PI * 2);
  ict.fill();

  ict.beginPath();
  ict.arc(center + eyeOffset, center - eyeOffset * 0.3, pupilSize, 0, Math.PI * 2);
  ict.fill();

  // 귀여운 작은 입 추가
  ict.fillStyle = '#ffffff';
  ict.beginPath();
  ict.arc(center, center + eyeOffset * 0.8, 1, 0, Math.PI * 2);
  ict.fill();

  return off;
}

function createOrangeLadybugSprite(size) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ict = off.getContext('2d');
  const center = size / 2;
  const radius = center - 2;

  // 주황색 몸체 그라디언트
  const bodyGradient = ict.createRadialGradient(center - radius * 0.3, center - radius * 0.3, radius * 0.1, center, center, radius);
  bodyGradient.addColorStop(0, '#ff8c42');
  bodyGradient.addColorStop(0.6, '#ff6b1a');
  bodyGradient.addColorStop(1, '#e55100');

  ict.fillStyle = bodyGradient;
  ict.beginPath();
  ict.arc(center, center, radius, 0, Math.PI * 2);
  ict.fill();

  // 무당벌레 테두리
  ict.strokeStyle = '#bf360c';
  ict.lineWidth = 2;
  ict.stroke();

  // 무당벌레 중앙 선
  ict.strokeStyle = '#d84315';
  ict.lineWidth = 2;
  ict.beginPath();
  ict.moveTo(center, center - radius);
  ict.lineTo(center, center + radius);
  ict.stroke();

  // 검은 점들 (무당벌레 특징)
  ict.fillStyle = '#263238';
  const spots = [
    { x: -0.4, y: -0.3, size: 0.15 },
    { x: 0.4, y: -0.3, size: 0.15 },
    { x: -0.3, y: 0.2, size: 0.12 },
    { x: 0.3, y: 0.2, size: 0.12 },
    { x: 0, y: 0.4, size: 0.1 }
  ];

  spots.forEach(spot => {
    ict.beginPath();
    ict.arc(
      center + spot.x * radius,
      center + spot.y * radius,
      spot.size * radius,
      0, Math.PI * 2
    );
    ict.fill();
  });

  // 무당벌레 머리 부분
  ict.fillStyle = '#d84315';
  ict.beginPath();
  ict.arc(center, center - radius * 0.7, radius * 0.3, 0, Math.PI * 2);
  ict.fill();

  // 작은 눈
  ict.fillStyle = '#000000';
  ict.beginPath();
  ict.arc(center - radius * 0.15, center - radius * 0.7, radius * 0.08, 0, Math.PI * 2);
  ict.fill();

  ict.beginPath();
  ict.arc(center + radius * 0.15, center - radius * 0.7, radius * 0.08, 0, Math.PI * 2);
  ict.fill();

  // 더듬이
  ict.strokeStyle = '#263238';
  ict.lineWidth = 1.5;
  ict.lineCap = 'round';

  ict.beginPath();
  ict.moveTo(center - radius * 0.1, center - radius * 0.9);
  ict.lineTo(center - radius * 0.2, center - radius * 1.1);
  ict.stroke();

  ict.beginPath();
  ict.moveTo(center + radius * 0.1, center - radius * 0.9);
  ict.lineTo(center + radius * 0.2, center - radius * 1.1);
  ict.stroke();

  return off;
}

function createEnemyProjectileSprite(size) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ict = off.getContext('2d');
  const center = size / 2;
  const radius = center - 1;

  // 빨간색 그라디언트
  const gradient = ict.createRadialGradient(center, center, 0, center, center, radius);
  gradient.addColorStop(0, '#ff6b6b');
  gradient.addColorStop(0.7, '#e74c3c');
  gradient.addColorStop(1, '#c0392b');

  ict.fillStyle = gradient;
  ict.beginPath();
  ict.arc(center, center, radius, 0, Math.PI * 2);
  ict.fill();

  // 테두리
  ict.strokeStyle = '#a93226';
  ict.lineWidth = 2;
  ict.stroke();

  // 중심 하이라이트
  ict.fillStyle = '#ff8a80';
  ict.beginPath();
  ict.arc(center - 2, center - 2, radius * 0.4, 0, Math.PI * 2);
  ict.fill();

  return off;
}

function createTornadoSprite(size) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ict = off.getContext('2d');
  const center = size / 2;

  // 흰색 배경
  ict.fillStyle = '#ffffff';
  ict.beginPath();
  ict.arc(center, center, size * 0.48, 0, Math.PI * 2);
  ict.fill();

  // 검은색 테두리
  ict.strokeStyle = '#000000';
  ict.lineWidth = 2;
  ict.beginPath();
  ict.arc(center, center, size * 0.48, 0, Math.PI * 2);
  ict.stroke();

  // 나선형 토네이도 (검은색 선)
  const spiralTurns = 3;
  const spiralSteps = 60;

  // 여러 레이어로 나선형 그리기
  for (let layer = 0; layer < 4; layer++) {
    const opacity = 0.9 - layer * 0.2;
    const offset = layer * size * 0.04;

    ict.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
    ict.lineWidth = size * (0.05 - layer * 0.008);
    ict.lineCap = 'round';

    ict.beginPath();
    for (let step = 0; step <= spiralSteps; step++) {
      const t = step / spiralSteps;
      const angle = t * Math.PI * 2 * spiralTurns + layer * 0.3;

      // 나선형 반지름 (중심에서 바깥으로 점진적 증가)
      const maxRadius = size * 0.35 - offset;
      const radius = maxRadius * Math.pow(t, 0.6); // 곡선적으로 증가

      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius;

      if (step === 0) {
        ict.moveTo(x, y);
      } else {
        ict.lineTo(x, y);
      }
    }
    ict.stroke();
  }

  // 중심점 (검은색)
  ict.fillStyle = '#000000';
  ict.beginPath();
  ict.arc(center, center, size * 0.04, 0, Math.PI * 2);
  ict.fill();

  return off;
}


const sprites = {
  player: createDonutSprite(constants.PLAYER_SIZE),
  glazedDonut: createGlazedDonutSprite(constants.PLAYER_SIZE),
  enemy: createBacteriaSprite(constants.ENEMY_SIZE),
  bigEnemy: createBacteriaSpritePurple(constants.BIG_ENEMY_SIZE),
  darkBlueEnemy: createBacteriaSpriteDarkBlue(constants.DARK_BLUE_ENEMY_SIZE),
  blackDust: createBlackDustSprite(constants.BLACK_DUST_SIZE),
  orangeLadybug: createOrangeLadybugSprite(constants.ORANGE_LADYBUG_SIZE),
  boss: createClampBossSprite(constants.BOSS_RADIUS * 3.2),
  bossSprites: {
    ladybug: createLadybugBossSprite(constants.BOSS_RADIUS * 3.2),
    ant: createAntBossSprite(constants.BOSS_RADIUS * 3.2),
    butterfly: createButterflyBossSprite(constants.BOSS_RADIUS * 3.2),
    cat: createCatBossSprite(constants.BOSS_RADIUS * 3.2),
    dog: createDogBossSprite(constants.BOSS_RADIUS * 3.2),
  },
  blades: constants.GIM_VARIANTS.map((label) => createGimSprite(constants.BLADE_SIZE, label)),
  bullet: createSeaweedSprite(constants.BULLET_SIZE),
  kimBugakBullet: createKimBugakSprite(Math.round(constants.BULLET_SIZE * 2)),
  sprinkle: createSprinkleProjectileSprite(constants.BULLET_SIZE * 1.2),
  enemyProjectile: createEnemyProjectileSprite(constants.DARK_BLUE_PROJECTILE_SIZE),
  mine: createMineSprite(constants.MINE_SIZE),
  toothpaste: createToothpasteSprite(48),
  tornado: createTornadoSprite(48),
};


const DONUT_STYLES = {
  boston_creme: {
    doughInner: '#f3c98c',
    doughOuter: '#bb8743',
    icingColor: '#3c2212',
    icingRadius: 0.9,
    icingHighlight: 'rgba(255,255,255,0.22)',
    holeRadius: 0,
    fillingColor: '#f7e48c',
    sprinkleColors: ['#fff4d2', '#fbd67b'],
  },
  cocoa_frosted: {
    doughInner: '#d0a372',
    doughOuter: '#a3733d',
    icingColor: '#4b2a17',
    icingHighlight: 'rgba(255,255,255,0.18)',
    icingRadius: 0.92,
    holeRadius: 0.35,
    holeColor: '#241306',
    sprinkleColors: ['#ffe1a6', '#ff8daa', '#8ad4ff'],
  },
  bavarian_filled: {
    doughInner: '#f7d9ab',
    doughOuter: '#c99553',
    icingColor: '#fff4dd',
    icingHighlight: 'rgba(255,255,255,0.35)',
    icingRadius: 0.95,
    powderColor: 'rgba(255,255,255,0.55)',
    holeRadius: 0,
    sprinkleColors: [],
  },
  glazed_ring: {
    doughInner: '#f0c995',
    doughOuter: '#c58a4b',
    icingColor: '#fbe7c6',
    icingHighlight: 'rgba(255,255,255,0.28)',
    icingRadius: 0.96,
    holeRadius: 0.38,
    holeColor: '#f6e1b7',
    glazeSheen: 'rgba(255,255,255,0.45)',
    sprinkleColors: ['#ffd7a6', '#ffe9d2'],
  },
  signature_knotted: {
    doughInner: '#f3c198',
    doughOuter: '#b87a47',
    icingColor: '#ff94c5',
    icingHighlight: 'rgba(255,255,255,0.3)',
    icingRadius: 0.88,
    holeRadius: 0.32,
    holeColor: '#f6d0df',
    drizzleColor: '#fff5f9',
    sprinkleColors: ['#ffffff', '#9ad9ff', '#ffe08c'],
  },
};

const baseObstacleTemplates = [
  { x: -380, y: -220, w: 220, h: 70 },
  { x: 160, y: -260, w: 190, h: 60 },
  { x: -560, y: 120, w: 160, h: 200 },
  { x: -60, y: 320, w: 280, h: 60 },
  { x: 420, y: 180, w: 160, h: 200 },
  { x: -220, y: -20, w: 140, h: 140 },
  { x: 260, y: -20, w: 140, h: 140 },
  { x: 0, y: -360, w: 240, h: 50 },
];
const generatedChunks = new Set();
const obstacles = [];
let enemyIdCounter = 1;

// 타임어택 모드 배경 오브젝트 (한 번만 생성)
let timeAttackBackgroundItems = null;
let timeAttackBackgroundBounds = null;

function chunkKey(cx, cy) {
  return `${cx}:${cy}`;
}

function createDonutObstacle(base, forcedType) {
  const type = forcedType || constants.DONUT_TYPES[Math.floor(Math.random() * constants.DONUT_TYPES.length)];
  const style = DONUT_STYLES[type] || DONUT_STYLES.boston_creme;
  const center = vector(base.x + base.w / 2, base.y + base.h / 2);
  const radius = Math.max(base.w, base.h) / 2;
  const sprinkleCount = (style.sprinkleColors?.length ?? 0) > 0 ? 14 + Math.floor(Math.random() * 10) : 0;
  const sprinkles = [];
  for (let i = 0; i < sprinkleCount; i++) {
    const sprinkle = {
      angle: Math.random() * Math.PI * 2,
      radius: 0.3 + Math.random() * 0.55,
      length: 0.05 + Math.random() * 0.08,
      width: 0.014 + Math.random() * 0.02,
      tilt: (Math.random() - 0.5) * 0.9,
      colorIndex: Math.floor(Math.random() * style.sprinkleColors.length),
    };
    if (style?.holeRadius) {
      const minRadius = style.holeRadius + 0.1;
      sprinkle.radius = Math.max(minRadius, sprinkle.radius);
    }
    sprinkle.radius = Math.min(0.95, sprinkle.radius);
    sprinkles.push(sprinkle);
  }
  const powder = [];
  if (style.powderColor) {
    const count = 3;
    for (let i = 0; i < count; i++) {
      powder.push({
        x: (-0.5 + Math.random()) * 0.8,
        y: (-0.5 + Math.random()) * 0.6,
        width: 0.5 + Math.random() * 0.1,
       height: 0.18 + Math.random() * 0.08,
        rotation: Math.random() * Math.PI,
      });
    }
  }
  return {
    center,
    radius,
    type,
    sprinkles,
    powder,
  };
}

function ensureChunk(cx, cy) {
  const key = chunkKey(cx, cy);
  if (generatedChunks.has(key)) return;
  generatedChunks.add(key);

  if (state.stage >= 3) {
    return;
  }

  // 타임어택 모드에서는 장애물 생성 안함
  return;
}

function ensureChunksAroundPlayer() {
  const cx = Math.floor(state.playerPos.x / constants.CHUNK_SIZE);
  const cy = Math.floor(state.playerPos.y / constants.CHUNK_SIZE);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      ensureChunk(cx + dx, cy + dy);
    }
  }
}

// state, keys, processingLevelChain은 gameState.js에서 import

function handleVictory() {
  if (state.victory) return;

  // 스테이지 진행
  state.stage += 1;
  state.elapsed = 0; // 시간을 다시 흐르게 함
  state.boss = null;
  state.bossWarningTimer = 0;

  // 모든 적과 발사체 제거
  state.enemies = [];
  state.enemyProjectiles = [];

  // 성공 메시지 표시
  showModal('스테이지 클리어!', `스테이지 ${state.stage - 1} 완료! 스테이지 ${state.stage}가 시작됩니다.`, {
    showRestart: false,
  });

  // 2초 후 모달 닫기 및 다음 스테이지 시작
  setTimeout(() => {
    hideModal();
    state.paused = false;
  }, 2000);
}

function enterStageThree() {
  if (state.stageThreeActive) return;
  state.stage = 3;
  state.stageThreeActive = true;
  state.stageTheme = 'grassland';
  state.elapsed = 0;
  state.spawnTimer = constants.SPAWN_INTERVAL;
  state.boss = null;
  state.bossWarningTimer = 0;

  // 기존 맵 완전히 제거 - 모든 장애물과 청크 삭제
  obstacles.length = 0;
  generatedChunks.clear();

  // 모든 기존 적들 제거 (새로운 작은 맵에서 새로 스폰됨)
  state.enemies = [];
  state.enemyProjectiles = [];

  // 스킬들이 이미 획득되어 있다면 타이머를 리셋하여 즉시 사용 가능하게 함
  if (state.upgradeLevels.sprinkle > 0) {
    state.sprinkleTimer = 0;
  }
  if (state.emFieldCount > 0) {
    state.emCooldown = 0;
  }

  // 플레이어 위치는 유지하되, 새로운 작은 맵 경계 내로 클램프
  clampWorldPosition(state.playerPos);
}

function handleStageThreeVictory() {
  if (state.victory) return;
  state.victory = true;
  state.gameOver = true;
  state.paused = true;

  const details = computeFinalScoreDetails();
  checkAndSaveRanking(state, computeFinalScoreDetails);

  showModal('우주 생존 성공!', '15분 동안 생존에 성공했습니다!', {
    showRestart: true,
    showRanking: true,
    extraHTML: buildResultHtml(details),
  });
}

function handleTimeAttackVictory() {
  if (state.victory) return;
  state.victory = true;
  state.gameOver = true;
  state.paused = true;

  const details = computeFinalScoreDetails();
  checkAndSaveRanking(state, computeFinalScoreDetails);

  showModal('타임어택 성공!', '15분 동안 생존에 성공했습니다!', {
    showRestart: true,
    showRanking: true,
    extraHTML: buildResultHtml(details),
  });
}

// 랭킹 시스템

// checkAndSaveRanking 함수는 ranking.js에서 import

// formatSurvivalTime, getCharacterDisplayName 함수들은 ranking.js에서 import

function handleGameOver() {
  if (state.gameOver) return;
  state.gameOver = true;
  state.paused = true;
  const details = computeFinalScoreDetails();

  // 랭킹 등록 조건 확인 및 저장
  checkAndSaveRanking(state, computeFinalScoreDetails);

  showModal('GAME OVER', '', {
    showRestart: true,
    showRanking: true,
    extraHTML: buildResultHtml(details),
  });
}


function restartGame() {
  hideModal();
  startOverlay.classList.remove('active');
  startGame();
}


function startGame() {
  resetGameplayState();
  recomputePlayerStats(); // 탄환 갯수 포함 플레이어 스탯 초기화

  // 타임어택 모드 CSS 클래스 추가
  document.body.classList.add('timeattack-mode');

  // 캔버스 크기 다시 계산
  sizeCanvasToCss();

  obstacles.length = 0;
  generatedChunks.clear();
  timeAttackBackgroundItems = null; // 타임어택 배경 아이템 초기화
  timeAttackBackgroundBounds = null;
  ensureChunksAroundPlayer();
  updateHud(); // reset HUD to reflect fresh state (score, time, skills)
  state.started = true;
  state.paused = false;
  state.gameStartTime = performance.now();

  // 게임 시작 시 즉시 렌더링
  render();
}

function attemptStart() {
  const trimmed = nicknameInput.value.trim();
  if (!isNicknameValid(trimmed)) {
    showModal('닉네임 오류', '닉네임은 2글자 이상이어야 합니다.', { showRestart: false });
    return;
  }
  state.nickname = trimmed;

  // 선택된 게임 모드 저장 (sessionStorage에서 읽기)
  const gameMode = sessionStorage.getItem('gameMode') || 'normal';
  state.gameMode = gameMode;

  startOverlay.classList.remove('active');
  nicknameInput.blur();
  startGame();
}


const RAPID_BURST_DELAY = 0.12;

const skillData = {
  speed: {
    name: '이속 증가',
    title: '속도 향상',
    option: (next) => `이동속도 +${next * 12}%`,
    description: '세균이 무서워 빨리도망가자!!'
  },
  attack_speed: {
    name: '공속 증가',
    title: '공격 속도',
    option: (next) => `공격속도 +${next * 10}%`,
    description: '조금 더 빠르게 때려볼까 !?'
  },
  multi_shot: {
    name: '김 추가',
    title: '공격 추가',
    option: (next) => {
      if (next <= 3) return '김 + 1';
      return next === 4 ? '반원 공격 준비!' : '반원 공격 강화!';
    },
    description: '김이 점점 늘어나고, 4레벨부터는 반원으로 퍼지는 귀여운 특공을 준비해요.'
  },
  magnet: {
    name:'No잼 자석',
    title: '자동 흡수',
    option: (next) => `흡수 범위 ${next * 100}px`,
    description: '주변의 빵가루 경험치를 자동으로 빨아들여요.'
  },
  double_shot: {
    name: '더블 발사',
    title: '양방향공격',
    option: '다방향 동시 발사',
    description: '김이 여러개지요 ~'
  },
  sprinkle: {
    name: '스프링클',
    title: '유도탄',
    option: '유도스프링클 + 2',
    description: '이거 아마 방부제가 들어갔을걸...?'
  },
  deulgireum_rapid: {
    name: '들기름',
    title: '연사',
    option: '기본공격 연사 + 1',
    description: '이제 들기름을 곁드린.. 더 고소한 맛 !'
  },
  blade: {
    name: '킴스클럽',
    title: '블레이드',
    option: '회전 블레이드 김 + 1',
    description: '브랜드 김! 이제 방부제를 곁드린....'
  },
  em_field: {
    name: '슈크림',
    title: '레이저',
    option: '슈크림 연쇄공격 + 3',
    description: '슈크림은 잘 터져서 큰일이야 ㅠㅠ'
  },
  ganjang_gim: {
    name: '간장김',
    title: '관통',
    option: '관통 + 1',
    description: '간장공장공장장'
  },
  kim_bugak: {
    name: '김부각',
    title: '기본공격 업그레이드',
    option: '장애물 무시',
    description: '쌀가루로 튀긴 김부각이다 ! 더 바삭하다고!!'
  },
  hp_increase: {
    name: '최대 HP 증가',
    title: '탄수화물',
    option: (next) => `최대 HP +2 (총 +${next * 2})`,
    description: '탄수화물 먹으면 쌀찜ㅠ'
  },
  electrocution: {
    name: '감전',
    title: '특수 스킬',
    option: '2초간 감전 상태이상',
    description: '슈크림이 미친듯이 달아졌어 으악 !'
  }
};

function rollUpgradeCards() {
  const rareKeys = new Set(['ganjang_gim', 'kim_bugak', 'deulgireum_rapid', 'electrocution']);
  const available = Object.entries(constants.UPGRADE_DEFINITIONS)
    .filter(([key, def]) => !rareKeys.has(key) && state.upgradeLevels[key] < def.max)
    .map(([key]) => key);

  if (available.length === 0) return [];

  const shuffled = [...available].sort(() => Math.random() - 0.5);
  const count = Math.min(3, shuffled.length);
  const cards = shuffled.slice(0, count).map((key) => ({ key }));

  // 특수 스킬 조건: 슈크림 만렙(3) + 자석 보유 시 10% 확률로 감전 스킬 추가
  const hasMaxEmField = state.upgradeLevels.em_field >= 3;
  const hasMagnet = state.upgradeLevels.magnet > 0;
  const hasElectrocution = state.upgradeLevels.electrocution > 0;

  if (hasMaxEmField && hasMagnet && !hasElectrocution && Math.random() < 0.1 && cards.length < 3) {
    cards.push({ key: 'electrocution' });
  }

  return cards;
}

function openUpgradeSelection() {
  state.upgradeChoices = rollUpgradeCards();
  if (state.upgradeChoices.length === 0) return;
  state.selectingUpgrade = true;
  renderUpgradeOverlay();
}

function renderUpgradeOverlay() {
  // 레벨 1일 때는 "레벨업!" 텍스트 숨기기
  const levelUpTitle = document.querySelector('#upgrade-overlay h1');
  if (levelUpTitle) {
    levelUpTitle.style.display = state.level === 1 ? 'none' : 'block';
  }

  upgradeCardsWrapper.innerHTML = '';
  state.upgradeChoices.forEach(({ key }, index) => {
    const def = constants.UPGRADE_DEFINITIONS[key];
    const current = state.upgradeLevels[key];
    const next = current + 1;
    const card = document.createElement('div');
    const isSpecialSkill = key === 'deulgireum_rapid' || key === 'ganjang_gim' || key === 'kim_bugak' || key === 'electrocution';
    card.className = isSpecialSkill ? 'upgrade-card special-skill-card' : 'upgrade-card';
    card.dataset.index = String(index);
    const skill = skillData[key];
    if (!skill) return;

    const skillName = skill.name;
    const skillTitle = skill.title;
    const skillOption = typeof skill.option === 'function' ? skill.option(next) : skill.option;
    const skillDescription = skill.description;
    const skillLevel = `Lv.${next} / ${def.max}`;

    const titleStyle = isSpecialSkill ? 'color: #4ade80;' : 'color: #f0f6ff;';

    card.innerHTML = `
      <div class="card-skill-name" style="font-size: 12px; color: #888; text-align: center; margin-bottom: 4px;">스킬</div>
      <div class="card-title" style="${titleStyle} font-size: 18px; font-weight: 700; text-align: center; margin-bottom: 6px;">${skillName}</div>
      <div class="card-skill-title" style="font-size: 14px; color: #fbbf24; text-align: center; margin-bottom: 4px;">${skillTitle}</div>
      <div class="card-skill-option" style="font-size: 13px; color: #60a5fa; text-align: center; margin-bottom: 6px;">${skillOption}</div>
      <div class="card-skill-desc" style="font-size: 12px; color: #d1d5db; text-align: left; margin-bottom: 6px;">${skillDescription}</div>
      <div class="card-level" style="font-size: 12px; color: #9ca3af; text-align: center;">${skillLevel}</div>
      <div class="card-hint" style="font-size: 11px; color: #6b7280; text-align: center; margin-top: 4px;">선택키: ${index + 1}</div>
    `;
    card.addEventListener('click', () => applyUpgrade(index));
    upgradeCardsWrapper.appendChild(card);
  });
  upgradeOverlay.classList.add('active');
}

function closeUpgradeOverlay() {
  upgradeOverlay.classList.remove('active');
}

function applyUpgrade(index) {
  const choice = state.upgradeChoices[index];
  if (!choice) return;
  const key = choice.key;
  const current = state.upgradeLevels[key];
  const max = constants.UPGRADE_DEFINITIONS[key].max;
  if (current >= max) return;

  state.upgradeLevels[key] = current + 1;
  switch (key) {
    case 'ganjang_gim':
      state.hasGanjangGim = true; // 1회용 - 얻으면 다시 나오지 않음
      break;
    case 'kim_bugak':
      state.hasKimBugak = true; // 1회용 - 얻으면 다시 나오지 않음
      break;
    case 'full_heal':
      state.playerHealth = getPlayerMaxHealth();
      break;
    case 'em_field':
      if (state.emFieldCount === 0) {
        state.emFieldCount = 1;
        state.emTargetsPerField = 3; // 처음 획득 시 3연쇄
      } else {
        state.emFieldCount += 1; // 추가 획득 시 발사 횟수 증가
      }
      state.emCooldown = 0;
      break;
    case 'blade':
      state.bladeCooldowns.clear();
      break;
    case 'sprinkle':
      state.sprinkleTimer = 0;
      break;
    case 'deulgireum_rapid':
      state.hasDeulgireumRapid = true;
      break;
    case 'magnet':
      state.magnetLevel = state.upgradeLevels.magnet;
      state.magnetRadius = state.magnetLevel > 0 ? 100 + (state.magnetLevel - 1) * 50 : 0;
      break;
    case 'hp_increase':
      // 최대 HP +2 증가 (현재 체력도 +2)
      state.playerHealth += 2;
      break;
    case 'electrocution':
      // 감전 스킬 획득 - em_field에 감전 효과 추가
      break;
    default:
      break;
  }

  recomputePlayerStats();
  state.fireTimer = 0;
  state.selectingUpgrade = false;
  closeUpgradeOverlay();
  resolvePendingLevelBlast();
}

let currentPlayerSpeed = constants.PLAYER_SPEED;
let currentFireInterval = constants.PLAYER_FIRE_INTERVAL;
let bulletCount = 1;
let currentBladeRotationSpeed = constants.BLADE_ROTATION_SPEED;
let currentEmInterval = constants.EM_FIELD_BASE_INTERVAL;
let currentSprinkleInterval = constants.SPRINKLE_INTERVAL;

function recomputePlayerStats() {
  currentPlayerSpeed = constants.PLAYER_SPEED * (1 + 0.12 * state.upgradeLevels.speed);
  currentFireInterval = Math.max(0.08, constants.PLAYER_FIRE_INTERVAL * Math.pow(0.9, state.upgradeLevels.attack_speed));

  const multiShotLevel = state.upgradeLevels.multi_shot;
  const burstEligible = multiShotLevel > 3;

  if (!burstEligible) {
    bulletCount = 1 + multiShotLevel;
    state.specialBurstEnabled = false;
    state.specialBurstPending = false;
    state.specialBurstProgress = 0;
    state.specialBurstQueue = [];
    state.specialBurstInterval = 0;
  } else {
    bulletCount = 4; // 3레벨 까지의 최대치 유지
    state.specialBurstEnabled = true;
    state.specialBurstInterval = multiShotLevel >= 5
      ? timeAttackConstants.TIME_ATTACK_BURST_INTERVAL_LV5
      : timeAttackConstants.TIME_ATTACK_BURST_INTERVAL_LV4;
  }

  // 공속 업그레이드가 블레이드 회전속도에도 영향
  let baseRotationSpeed = constants.BLADE_ROTATION_SPEED;
  baseRotationSpeed *= timeAttackConstants.TIME_ATTACK_BLADE_ROTATION_FACTOR;
  currentBladeRotationSpeed = baseRotationSpeed * (1 + 0.3 * state.upgradeLevels.attack_speed);

  // 공속 업그레이드가 슈크림 발사 간격에도 영향
  currentEmInterval = Math.max(
    constants.EM_FIELD_MIN_INTERVAL,
    constants.EM_FIELD_BASE_INTERVAL * Math.pow(0.85, state.upgradeLevels.attack_speed)
  );

  // 공속 업그레이드가 스프링클 간격에도 영향
  currentSprinkleInterval = Math.max(0.2, constants.SPRINKLE_INTERVAL * Math.pow(0.9, state.upgradeLevels.attack_speed));

  state.magnetLevel = state.upgradeLevels.magnet || 0;
  state.magnetRadius = state.magnetLevel > 0 ? 100 + (state.magnetLevel - 1) * 50 : 0;
}

function addKillRewardsRaw(scoreDelta = 0, xpDelta = 0) {
  if (scoreDelta > 0) {
    state.score += scoreDelta;
  }
  const maxLevel = 40;
  if (xpDelta > 0 && state.level < maxLevel) {
    state.xp += xpDelta;
  }
}

function calculateEnemyReward(enemy) {
  if (!enemy) {
    return { score: 0, xp: 0 };
  }
  return {
    score: enemy.scoreReward ?? 10,
    xp: enemy.xpReward ?? constants.XP_REWARD_PINK,
  };
}

function grantRewards(scoreDelta, xpDelta, position = null) {
  if (scoreDelta > 0) {
    state.score += scoreDelta;
  }

  if (xpDelta > 0) {
    if (position) {
      spawnXpCrumbs(position, xpDelta);
    } else {
      addKillRewardsRaw(0, xpDelta);
      processLevelUps();
      resolvePendingLevelBlast();
    }
  }
}

function grantRewardForEnemy(enemy) {
  const { score, xp } = calculateEnemyReward(enemy);
  grantRewards(score, xp, enemy.pos);
}

function triggerLevelBlast() {
  const blastRadius = timeAttackConstants.TIME_ATTACK_ATTACK_RADIUS;
  const radiusSq = blastRadius * blastRadius;
  const removedEnemies = [];
  const survivors = [];
  for (const enemy of state.enemies) {
    const distSq = vectorLengthSq(vectorSub(enemy.pos, state.playerPos));
    if (distSq <= radiusSq) {
      removedEnemies.push(enemy);
      onEnemyRemoved(enemy);
    } else {
      survivors.push(enemy);
    }
  }
  state.enemies = survivors;
  state.levelBlastTimer = constants.LEVEL_BLAST_DURATION;
  if (removedEnemies.length > 0) {
    for (const enemy of removedEnemies) {
      grantRewardForEnemy(enemy);
    }
  }
  return removedEnemies.length;
}

function tryDropToothpaste() {
  if (Math.random() >= constants.TOOTHPASTE_DROP_CHANCE) {
    state.toothpasteTimer = constants.TOOTHPASTE_DROP_INTERVAL;
    return;
  }
  spawnToothpasteItem(getCurrentWorldBounds, collidesWithObstacles);
  state.toothpasteTimer = constants.TOOTHPASTE_DROP_INTERVAL;
}

function triggerToothpastePickup(index) {
  if (index < 0 || index >= state.toothpasteItems.length) return;
  state.toothpasteItems.splice(index, 1);
  state.toothpasteFlashTimer = constants.TOOTHPASTE_FLASH_DURATION;
  if (state.enemies.length === 0) return;
  const sorted = [...state.enemies].sort((a, b) => {
    const da = vectorLengthSq(vectorSub(a.pos, state.playerPos));
    const db = vectorLengthSq(vectorSub(b.pos, state.playerPos));
    return da - db;
  });
  const removeCount = Math.min(constants.TOOTHPASTE_EFFECT_KILL_COUNT, sorted.length);
  const idsToRemove = new Set();
  for (let i = 0; i < removeCount; i++) {
    idsToRemove.add(sorted[i].id);
  }
  if (idsToRemove.size === 0) return;
  const survivors = [];
  const removedEnemies = [];
  for (const enemy of state.enemies) {
    if (idsToRemove.has(enemy.id)) {
      onEnemyRemoved(enemy);
      removedEnemies.push(enemy);
    } else {
      survivors.push(enemy);
    }
  }
  state.enemies = survivors;
  if (removedEnemies.length > 0) {
    for (const enemy of removedEnemies) {
      grantRewardForEnemy(enemy);
    }
  }
  state.lastEnemyTargetId = null;
}

function resolvePendingLevelBlast() {
  if (state.selectingUpgrade || state.pendingLevelBlast <= 0 || processingLevelChain) return;
  const blasts = state.pendingLevelBlast;
  state.pendingLevelBlast = 0;
  for (let i = 0; i < blasts; i++) {
    triggerLevelBlast();
  }
  if (!processingLevelChain) {
    processLevelUps();
  }
}

function processLevelUps() {
  if (processingLevelChain) return;
  setProcessingLevelChain(true);
  const maxLevel = 40;
  while (state.xp >= state.xpToNext && !state.selectingUpgrade && state.level < maxLevel) {
    state.xp -= state.xpToNext;
    state.level += 1;
    state.xpToNext = xpRequired(state.level);
    state.playerHealth = getPlayerMaxHealth();
    state.hpBarTimer = 1.5;
    state.pendingLevelBlast = (state.pendingLevelBlast || 0) + 1;
    openUpgradeSelection();
    if (state.selectingUpgrade) break;
  }
  setProcessingLevelChain(false);
  if (!state.selectingUpgrade) {
    resolvePendingLevelBlast();
  }
}

function onEnemyRemoved(enemy) {
  if (enemy && state.lastEnemyTargetId === enemy.id) {
    state.lastEnemyTargetId = null;
  }
}

function detonateMine() {
  if (!state.mine.active) return;
  const defeatedEnemies = [...state.enemies];
  state.mine.active = false;
  state.mineFlashTimer = constants.MINE_FLASH_DURATION;
  if (defeatedEnemies.length) {
    for (const enemy of defeatedEnemies) {
      grantRewardForEnemy(enemy);
    }
  }
  state.enemies.length = 0;
  state.lastEnemyTargetId = null;
  if (state.boss) {
    const defeatedBoss = state.boss;
    defeatedBoss.health = 0;
    state.boss = null;
    state.bossWarningTimer = 0;
    grantRewards(
      defeatedBoss?.scoreReward ?? 100,
      defeatedBoss?.xpReward ?? constants.XP_REWARD_BOSS,
      defeatedBoss?.pos ?? state.playerPos
    );
    handleVictory();
  }
}


function getCurrentWorldBounds() {
  return state.stage >= 3 ? constants.STAGE_THREE_WORLD_BOUNDS : constants.WORLD_BOUNDS;
}

function updateBoss(dt) {
  const boss = state.boss;
  if (!boss) return;

  // 감전 상태 업데이트
  if (boss.electrocuted) {
    boss.electrocutionTimer -= dt;
    boss.electrocutionFlash -= dt;
    if (boss.electrocutionTimer <= 0) {
      boss.electrocuted = false;
      boss.electrocutionTimer = 0;
      boss.electrocutionFlash = 0;
    }
    // 감전 중에는 모든 행동 정지
    return;
  }

  // 화상 상태 업데이트
  if (boss.burning) {
    boss.burnDuration -= dt;
    boss.burnTickTimer -= dt;
    if (boss.burnFlash > 0) {
      boss.burnFlash -= dt;
    }

    // 1초마다 화상 피해 적용
    if (boss.burnTickTimer <= 0) {
      boss.health -= constants.BURN_DAMAGE_PER_SECOND;
      boss.burnTickTimer = constants.BURN_TICK_INTERVAL;
      boss.burnFlash = 0.15; // 피해 시 플래시 효과

      // 화상으로 보스가 죽으면 처리
      if (boss.health <= 0) {
        const bossDefeated = state.boss;
        state.boss = null;
        state.bossWarningTimer = 0;
        grantRewards(
          bossDefeated?.scoreReward ?? 100,
          bossDefeated?.xpReward ?? constants.XP_REWARD_BOSS,
          bossDefeated?.pos ?? state.playerPos
        );
        handleVictory();
        return;
      }
    }

    // 화상 지속시간 종료
    if (boss.burnDuration <= 0) {
      boss.burning = false;
      boss.burnDuration = 0;
      boss.burnTickTimer = 0;
      boss.burnFlash = 0;
    }
  }

  switch (boss.state) {
    case 'windup': {
      boss.windupTimer -= dt;
      if (boss.windupTimer <= 0) {
        boss.state = 'charging';
        const direction = vectorNormalize(vectorSub(boss.attackTarget, boss.pos));
        boss.direction = direction;
        boss.facingAngle = Math.atan2(direction.y, direction.x);
      }
      return;
    }
    case 'charging': {
      if (vectorLengthSq(boss.direction) === 0) {
        boss.state = 'idle';
        boss.attackTimer = constants.BOSS_ATTACK_INTERVAL;
        return;
      }
      const remaining = vectorSub(boss.attackTarget, boss.pos);
      const step = vectorScale(boss.direction, constants.BOSS_CHARGE_SPEED * dt);
      if (vectorLengthSq(step) >= vectorLengthSq(remaining)) {
        boss.pos = vectorCopy(boss.attackTarget);
        boss.state = 'idle';
        boss.attackTimer = constants.BOSS_ATTACK_INTERVAL;
        state.bossWarningTimer = 0;
      } else {
        boss.pos = vectorAdd(boss.pos, step);
      }
      clampWorldPosition(boss.pos);
      return;
    }
    default:
      break;
  }

  // Idle / chasing behaviour
  boss.attackTimer -= dt;
  const toPlayer = vectorSub(state.playerPos, boss.pos);
  const targetDir = vectorLengthSq(toPlayer) > 0 ? vectorNormalize(toPlayer) : vector(0, 0);
  boss.direction = targetDir;
  boss.facingAngle = Math.atan2(targetDir.y, targetDir.x);
  if (vectorLengthSq(targetDir) > 0) {
    boss.pos = vectorAdd(boss.pos, vectorScale(targetDir, constants.BOSS_IDLE_SPEED * dt));
    clampWorldPosition(boss.pos);
  }

  if (boss.attackTimer <= 0) {
    boss.attackTimer = constants.BOSS_ATTACK_INTERVAL;
    if (Math.random() < constants.BOSS_ATTACK_CHANCE) {
      boss.state = 'windup';
      boss.windupTimer = constants.BOSS_WINDUP_TIME;
      boss.attackTarget = vectorCopy(state.playerPos);
      boss.direction = vector(0, 0);
      boss.facingAngle = Math.atan2(state.playerPos.y - boss.pos.y, state.playerPos.x - boss.pos.x);
      state.bossWarningTimer = constants.BOSS_WINDUP_TIME;
    }
  }
}

function clampWorldPosition(pos) {
  const bounds = getCurrentWorldBounds();
  pos.x = clamp(pos.x, -bounds, bounds);
  pos.y = clamp(pos.y, -bounds, bounds);
}

function moveWithCollision(position, movement, colliderSize) {
  // 이동하려는 목표 위치
  const targetPos = vectorAdd(position, movement);

  // 충돌이 없으면 그대로 이동
  if (!collidesWithObstacles(targetPos.x, targetPos.y, colliderSize)) {
    return targetPos;
  }

  // 부드러운 미끄러짐을 위한 다단계 시도
  let currentPos = vectorCopy(position);
  let remainingMovement = vectorCopy(movement);
  const radius = colliderSize / 2;
  const maxIterations = 3;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    if (vectorLengthSq(remainingMovement) < 0.001) break;

    // 이동할 위치 계산
    const testPos = vectorAdd(currentPos, remainingMovement);

    // 충돌 검사
    if (!collidesWithObstacles(testPos.x, testPos.y, colliderSize)) {
      currentPos = testPos;
      break;
    }

    // 충돌하는 장애물 찾기
    let blockingObstacle = null;
    let minPenetration = Infinity;

    for (const obs of obstacles) {
      const distToObstacle = distance(testPos, obs.center);
      const requiredDistance = radius + obs.radius;
      const penetration = requiredDistance - distToObstacle;

      if (penetration > 0 && penetration < minPenetration) {
        minPenetration = penetration;
        blockingObstacle = obs;
      }
    }

    if (!blockingObstacle) break;

    // 충돌 표면의 법선 벡터 계산
    const toPlayer = vectorSub(currentPos, blockingObstacle.center);
    const normal = vectorNormalize(toPlayer);

    // 움직임을 표면에 투영 (벽을 뚫고 들어가는 성분 제거)
    const dotProduct = remainingMovement.x * normal.x + remainingMovement.y * normal.y;

    if (dotProduct < 0) {
      // 벽으로 향하는 성분을 제거하고 표면 평행 성분만 유지
      const slidingMovement = vector(
        remainingMovement.x - normal.x * dotProduct,
        remainingMovement.y - normal.y * dotProduct
      );

      // 미끄러짐 움직임의 강도를 약간 줄여서 더 부드럽게
      const slidingFactor = 0.95;
      remainingMovement = vectorScale(slidingMovement, slidingFactor);

      // 미끄러짐 이동 시도
      const slideTarget = vectorAdd(currentPos, remainingMovement);
      if (!collidesWithObstacles(slideTarget.x, slideTarget.y, colliderSize)) {
        currentPos = slideTarget;
        break;
      }

      // 미끄러짐도 안되면 작은 단위로 시도
      const steps = 8;
      const stepMovement = vectorScale(remainingMovement, 1 / steps);

      for (let step = 0; step < steps; step++) {
        const nextPos = vectorAdd(currentPos, stepMovement);
        if (!collidesWithObstacles(nextPos.x, nextPos.y, colliderSize)) {
          currentPos = nextPos;
        } else {
          break;
        }
      }

      // 남은 움직임 감소
      remainingMovement = vectorScale(remainingMovement, 0.5);
    } else {
      // 벽에서 멀어지는 방향이면 그대로 시도
      break;
    }
  }

  // 플레이어가 장애물에 끼어있는지 확인하고 밀어내기
  for (const obs of obstacles) {
    const distToObstacle = distance(currentPos, obs.center);
    const requiredDistance = radius + obs.radius + 0.5; // 0.5픽셀 여유

    if (distToObstacle < requiredDistance) {
      const pushDirection = vectorNormalize(vectorSub(currentPos, obs.center));
      const pushDistance = requiredDistance - distToObstacle;
      currentPos = vectorAdd(currentPos, vectorScale(pushDirection, pushDistance));
    }
  }

  return currentPos;
}


function collidesWithObstacleCircle(pos, radius) {
  return obstacles.some((obs) => circleIntersects(pos, radius, obs.center, obs.radius));
}

function collidesWithObstacles(x, y, size) {
  return collidesWithObstacleCircle(vector(x, y), size / 2);
}


let lastTimestamp = performance.now();

// ===== Dynamic Joystick events (mobile only) =====
if (isMobile && canvas) {
  const maxRadius = 56; // px movement for stick inside base

  const setStick = (clientX, clientY) => {
    if (!state.joystickCenter) return;

    const dx = clientX - state.joystickCenter.x;
    const dy = clientY - state.joystickCenter.y;
    const v = vectorClampLength(vector(dx, dy), maxRadius);

    // Update joystick visual position
    joystick.style.left = `${state.joystickCenter.x}px`;
    joystick.style.top = `${state.joystickCenter.y}px`;
    joystick.style.transform = 'translate(-50%, -50%)';
    joystickStick.style.transform = `translate(${v.x}px, ${v.y}px)`;

    // normalized dir
    touchInput.dir = vectorNormalize(v);
  };

  const start = (x, y) => {
    touchInput.active = true;
    state.joystickActive = true;
    state.joystickCenter = { x, y };
    joystick.style.display = 'block';
    setStick(x, y);
  };

  const move = (x, y) => {
    if (!touchInput.active) return;
    setStick(x, y);
  };

  const end = () => {
    touchInput.active = false;
    state.joystickActive = false;
    state.joystickCenter = null;
    touchInput.dir = vector(0, 0);
    joystick.style.display = 'none';
    joystickStick.style.transform = 'translate(0px, 0px)';
  };

  // Add touch events to canvas instead of joystick element
  canvas.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    start(t.clientX, t.clientY);
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (touchInput.active) {
      const t = e.touches[0];
      move(t.clientX, t.clientY);
      e.preventDefault();
    }
  }, { passive: false });

  canvas.addEventListener('touchend', (e) => {
    if (touchInput.active) {
      end();
      e.preventDefault();
    }
  });

  canvas.addEventListener('touchcancel', (e) => {
    if (touchInput.active) {
      end();
      e.preventDefault();
    }
  });

  // Optional mouse support for desktop testing
  joystick.addEventListener('mousedown', (e) => {
    start(e.clientX, e.clientY);
    const onMove = (me) => move(me.clientX, me.clientY);
    const onUp = () => {
      end();
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });
}

function update(dt) {
  if (state.paused) return;
  const activePlay = !state.selectingUpgrade && !state.victory && !state.gameOver;
  if (activePlay && !state.boss) {
    state.elapsed += dt;
  }

  // 타임어택 모드 시간 관리
  if (activePlay) {
    state.timeAttackRemaining = Math.max(0, state.timeAttackRemaining - dt);
    if (state.timeAttackRemaining <= 0) {
      // 타임어택 시간 종료 - 승리 처리
      handleTimeAttackVictory();
      return;
    }
  }

  // 타임어택 모드 보스 타이머
  if (activePlay && !state.boss) {
    state.timeAttackBossTimer += dt;
    // 3분(180초)마다 보스 등장
    if (state.timeAttackBossTimer >= 180) {
      spawnTimeAttackBoss(vectorCopy);
      state.timeAttackBossTimer = 0;
      // 보스 스폰 시 검은먼지 타이머도 리셋 (충돌 방지)
      state.nextBlackDustSpawn = 60;
      state.blackDustWarningActive = false;
    }
  }

  // 타임어택 모드 1분마다 검은먼지 스폰
  if (activePlay) {
    // 경고 중일 때 타이머 감소
    if (state.blackDustWarningActive) {
      state.blackDustWarningTimer -= dt;
      if (state.blackDustWarningTimer <= 0) {
        // 경고 종료, 검은먼지 스폰
        state.blackDustWarningActive = false;
        state.blackDustSpawnCount++; // 스폰 횟수 증가
        const spawnCount = state.blackDustSpawnCount * 100; // 1분=100, 2분=200, 3분=300...
        spawnBlackDustGroup(sprites, { overrideCount: spawnCount, overrideHealth: 1, storm: true });
        state.nextBlackDustSpawn = 60; // 다음 스폰까지 60초
      }
    } else {
      // 다음 스폰까지 카운트다운
      state.nextBlackDustSpawn -= dt;

      // 보스 스폰 시간(180초의 배수)과 겹치는지 체크
      const nextBossSpawnIn = 180 - state.timeAttackBossTimer;
      const isBossSpawnSoon = nextBossSpawnIn <= 10; // 보스 스폰 10초 전

      if (state.nextBlackDustSpawn <= 3 && state.nextBlackDustSpawn > 0 && !isBossSpawnSoon) {
        // 3초 전부터 경고 표시 (보스 스폰이 임박하지 않은 경우만)
        if (!state.blackDustWarningActive) {
          state.blackDustWarningActive = true;
          state.blackDustWarningTimer = timeAttackConstants.TIME_ATTACK_BLACK_DUST_WARNING_DURATION;
        }
      }
      if (state.nextBlackDustSpawn <= 0) {
        // 보스 스폰 시간과 겹치면 검은먼지 스폰 스킵
        if (isBossSpawnSoon) {
          state.nextBlackDustSpawn = 60; // 다음 사이클로 연기
        } else {
          // 시간이 다 되었는데 경고가 활성화되지 않았다면 즉시 스폰 (예외 처리)
          state.blackDustSpawnCount++;
          const spawnCount = state.blackDustSpawnCount * 100;
          spawnBlackDustGroup(sprites, { overrideCount: spawnCount, overrideHealth: 1, storm: true });
          state.nextBlackDustSpawn = 60;
        }
      }
    }
  }

  if (state.stage === 2 && !state.stageThreeActive && !state.boss && !state.victory && state.elapsed >= constants.BOSS_SPAWN_TIME) {
    enterStageThree();
  }

  if (state.stageThreeActive && !state.victory && state.elapsed >= constants.STAGE_THREE_SURVIVAL_TIME) {
    handleStageThreeVictory();
    return;
  }

  state.playerInvuln = Math.max(0, state.playerInvuln - dt);
  state.mineFlashTimer = Math.max(0, state.mineFlashTimer - dt);
  state.levelBlastTimer = Math.max(0, state.levelBlastTimer - dt);
  state.toothpasteFlashTimer = Math.max(0, state.toothpasteFlashTimer - dt);

  // 게임 시작 메시지 타이머 감소 및 스킬 선택 시작
  const prevStartMessageTimer = state.gameStartMessageTimer;
  state.gameStartMessageTimer = Math.max(0, state.gameStartMessageTimer - dt);

  // 타임어택 모드에서 게임 시작 메시지가 끝나면 첫 스킬 선택
  if (prevStartMessageTimer > 0 && state.gameStartMessageTimer === 0 && state.level === 1 && !state.selectingUpgrade) {
    openUpgradeSelection();
  }

  state.toothpasteGlowPhase = (state.toothpasteGlowPhase + dt * 4) % (Math.PI * 2);
  state.hpBarTimer = Math.max(1, state.hpBarTimer);
  state.specialBurstEffectTimer = Math.max(0, state.specialBurstEffectTimer - dt);
  if (state.bossWarningTimer > 0) {
    state.bossWarningTimer = Math.max(0, state.bossWarningTimer - dt);
  }

  if (state.hasDeulgireumRapid && state.rapidFireTimer > 0) {
    state.rapidFireTimer = Math.max(0, state.rapidFireTimer - dt);
  }

  state.bladeCooldowns.forEach((value, key) => {
    const next = value - dt;
    if (next <= 0) {
      state.bladeCooldowns.delete(key);
    } else {
      state.bladeCooldowns.set(key, next);
    }
  });

  state.emEffects = state.emEffects
    .map((ef) => ({ ...ef, timer: ef.timer - dt }))
    .filter((ef) => ef.timer > 0);

  if (!state.boss && !state.victory && state.stage < 3 && state.elapsed >= constants.BOSS_SPAWN_TIME) {
    spawnBoss();
  }

  if (!activePlay) return;

  state.fireTimer -= dt;

  // 검은먼지 경고 중에는 일반 적 스폰 멈춤
  if (state.blackDustWarningActive) {
    // 스폰 타이머를 감소시키지 않음
  } else {
    state.spawnTimer -= dt;
  }
  // 블랙 더스트 스톰 관리 (기본 스폰은 비활성)
  state.stormWarningTimer = Math.max(0, state.stormWarningTimer - dt);
  state.sirenPhase = (state.sirenPhase || 0) + dt;

  const stormInterval = timeAttackConstants.TIME_ATTACK_BLACK_DUST_STORM_INTERVAL;
  const spawnInterval = timeAttackConstants.TIME_ATTACK_BLACK_DUST_STORM_DURATION / timeAttackConstants.TIME_ATTACK_BLACK_DUST_STORM_COUNT;

  if (!state.stormActive) {
    state.stormTimer += dt;
    if (state.stormTimer >= stormInterval) {
      state.stormActive = true;
      state.stormTimer = 0;
      state.stormCountdown = timeAttackConstants.TIME_ATTACK_BLACK_DUST_STORM_DURATION;
      state.stormSpawnedCount = 0;
      state.stormWarningTimer = timeAttackConstants.TIME_ATTACK_BLACK_DUST_WARNING_DURATION;
      state.blackDustSpawnTimer = 0;
    }
  }

  if (state.stormActive) {
    state.stormCountdown -= dt;
    state.blackDustSpawnTimer -= dt;
    if (state.blackDustSpawnTimer <= 0 && state.stormSpawnedCount < timeAttackConstants.TIME_ATTACK_BLACK_DUST_STORM_COUNT) {
      spawnBlackDustGroup(sprites, { overrideCount: 1, overrideHealth: 5, storm: true });
      state.stormSpawnedCount += 1;
      state.blackDustSpawnTimer += spawnInterval;
    }

    if (state.stormSpawnedCount >= timeAttackConstants.TIME_ATTACK_BLACK_DUST_STORM_COUNT && state.stormCountdown <= 0) {
      state.stormActive = false;
      state.blackDustSpawnTimer = stormInterval;
      state.stormTimer = 0;
    }
  }

  if (state.stageThreeActive) {
    state.orangeLadybugSpawnTimer -= dt;
  }
  if (state.emFieldCount > 0) {
    state.emCooldown -= dt;
  }
  state.toothpasteTimer -= dt;
  if (state.toothpasteTimer <= 0) {
    tryDropToothpaste();
  }

  if (state.stageThreeActive && state.orangeLadybugSpawnTimer <= 0) {
    if (!state.boss) {
      spawnOrangeLadybug(sprites);
    }
    state.orangeLadybugSpawnTimer = randRange(constants.ORANGE_LADYBUG_SPAWN_INTERVAL_MIN, constants.ORANGE_LADYBUG_SPAWN_INTERVAL_MAX);
  }

  handleMovement(dt);
  handleShooting(dt);
  processSpecialBurst(dt);
  handleBullets(dt);
  handleTornadoes(dt);
  handleSprinkles(dt);
  handleEnemies(dt);
  handleEnemyProjectiles(dt);
  if (state.boss) {
    updateBoss(dt);
  }

  const magnetRadius = state.magnetRadius > 0 ? state.magnetRadius : 28;
  const xpCollected = updateXpCrumbs(dt, state.playerPos, magnetRadius);
  if (xpCollected > 0) {
    addKillRewardsRaw(0, xpCollected);
    processLevelUps();
    resolvePendingLevelBlast();
  }
}

function handleMovement(dt) {
  let move = vector(0, 0);
  if (isMobile && touchInput.active) {
    // use joystick direction
    if (vectorLengthSq(touchInput.dir) > 0) {
      move = vectorScale(touchInput.dir, currentPlayerSpeed * dt);
    }
  } else {
    if (keys.has('KeyW') || keys.has('ArrowUp')) move.y -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) move.y += 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) move.x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) move.x += 1;
    if (vectorLengthSq(move) > 0) {
      move = vectorScale(vectorNormalize(move), currentPlayerSpeed * dt);
    }
  }

  // 이동 방향 업데이트
  if (vectorLengthSq(move) > 0) {
    const normalizedMove = vectorNormalize(move);
    state.moveDirection = normalizedMove;
    state.lastMoveDirection = vectorCopy(normalizedMove);
  }

  state.playerPos = moveWithCollision(state.playerPos, move, constants.PLAYER_SIZE);
  clampWorldPosition(state.playerPos);
  ensureChunksAroundPlayer();

  if (state.mine.active) {
    const distSq = vectorLengthSq(vectorSub(state.playerPos, state.mine.pos));
    const mineRadius = timeAttackConstants.TIME_ATTACK_ATTACK_RADIUS;
    if (distSq <= mineRadius * mineRadius) detonateMine();
  }
  // Toothpaste pickup: sprite-overlap (circle vs circle) using actual sprite radii
  if (state.toothpasteItems.length > 0) {
    const playerRadius = constants.PLAYER_SIZE / 2;   // 20px
    const itemRadius = 48 / 2;              // 24px (createToothpasteSprite(48))
    for (let i = 0; i < state.toothpasteItems.length; i++) {
      const item = state.toothpasteItems[i];
      if (circleIntersects(state.playerPos, playerRadius, item.pos, itemRadius)) {
        triggerToothpastePickup(i);
        break;
      }
    }
  }

  const currentSpawn = Math.max(
    constants.SPAWN_INTERVAL_FLOOR,
    constants.SPAWN_INTERVAL - state.elapsed * 0.02,
  );

  // 검은먼지 경고 중에는 일반 적 스폰하지 않음
  const canSpawnNormalEnemies = !state.blackDustWarningActive;

  if (state.spawnTimer <= 0 && canSpawnNormalEnemies) {
    if (!state.boss) {
      let batch = 1 + Math.floor(state.elapsed / 30);
      batch = Math.max(1, Math.round(batch * constants.TIME_ATTACK_ENEMY_SPAWN_MULTIPLIER));
      for (let i = 0; i < batch; i++) {
        // 테스트용: 남색 세균을 시작부터 등장 (30% 확률)
        if(state.stage >= 2 && Math.random() < 0.3) {
          spawnDarkBlueEnemy(sprites, collidesWithObstacles);
        } else if (state.elapsed >= constants.BIG_ENEMY_SPAWN_TIME && Math.random() < constants.BIG_ENEMY_SPAWN_CHANCE) {
          spawnBigEnemy(sprites);
        } else {
          spawnEnemy(sprites);
        }
      }
    }
    state.spawnTimer = currentSpawn;
  }

  recomputeBlades(dt);
}

function recomputeBlades(dt) {
  state.blades.length = 0;
  const bladeCount = state.upgradeLevels.blade;
  if (bladeCount > 0) {
    const tau = Math.PI * 2;
    const previousAngle = state.bladeAngle;
    state.bladeAngle = (state.bladeAngle + dt * currentBladeRotationSpeed) % tau;

    // 블레이드가 한 바퀴 완주했는지 확인 (0 지점을 지났는지)
    if (previousAngle > state.bladeAngle) {
      // 토네이도 발사
      spawnTornado();

      // 회전수 증가
      if (!state.bladeRotationCount) state.bladeRotationCount = 0;
      state.bladeRotationCount++;
    }

    // 회전수 초기화
    if (!state.bladeRotationCount) state.bladeRotationCount = 0;

    const step = tau / bladeCount;
    for (let i = 0; i < bladeCount; i++) {
      const angle = state.bladeAngle + i * step;
      const bladeRadius = constants.BLADE_RADIUS * timeAttackConstants.TIME_ATTACK_BLADE_RADIUS_MULTIPLIER + timeAttackConstants.TIME_ATTACK_BLADE_EXTRA_RADIUS;
      const offset = vector(Math.cos(angle) * bladeRadius, Math.sin(angle) * bladeRadius);
      state.blades.push({
        pos: vectorAdd(state.playerPos, offset),
        spriteIndex: Math.min(i, sprites.blades.length - 1),
        bladeId: i, // 블레이드 고유 ID
        rotationCount: state.bladeRotationCount, // 현재 회전수
      });
    }
  }
}

function spawnTornado() {
  return;
  const bladeCount = state.upgradeLevels.blade;
  if (bladeCount === 0 || state.enemies.length === 0) return; // 블레이드가 없거나 적이 없으면 발사하지 않음

  // 적들을 거리 순으로 정렬
  const sortedEnemies = [...state.enemies].sort((a, b) => {
    const distanceA = vectorLengthSq(vectorSub(a.pos, state.playerPos));
    const distanceB = vectorLengthSq(vectorSub(b.pos, state.playerPos));
    return distanceA - distanceB;
  });

  const tornadoSpeed = 180; // 토네이도 이동 속도
  const tornadoLifetime = 3.0; // 3초 동안 지속

  // 블레이드 개수만큼 토네이도 발사
  for (let i = 0; i < bladeCount; i++) {
    let direction;

    if (i < sortedEnemies.length) {
      // 가까운 적 순서대로 타겟팅
      direction = vectorNormalize(vectorSub(sortedEnemies[i].pos, state.playerPos));
    } else {
      // 적이 부족하면 각도를 분산해서 발사
      const angle = (i / bladeCount) * Math.PI * 2;
      direction = vector(Math.cos(angle), Math.sin(angle));
    }

    state.tornadoes.push({
      pos: vectorCopy(state.playerPos),
      dir: direction,
      speed: tornadoSpeed,
      lifetime: tornadoLifetime,
      damage: 0.5,
      knockbackDistance: 10,
      size: 48,
      rotation: 0
    });
  }
}

// 사용하지 않는 함수 제거됨

function spawnProjectile(direction, options = {}) {
  const norm = vectorNormalize(direction);
  if (vectorLengthSq(norm) === 0) return;
  let bulletSize;
  if (state.hasKimBugak) {
    bulletSize = Math.round(constants.BULLET_SIZE * 2);
  } else {
    bulletSize = Math.round(constants.BULLET_SIZE * timeAttackConstants.TIME_ATTACK_BASE_BULLET_SCALE);
  }
  const bulletSprite = state.hasKimBugak ? sprites.kimBugakBullet : sprites.bullet;

  const rangeMultiplier = options.rangeMultiplier ?? 1;

  // 타임어택 모드에서 김공격 사정거리 조정
  const bulletLifetime = (timeAttackConstants.TIME_ATTACK_BULLET_RANGE * rangeMultiplier) / constants.BULLET_SPEED;

  state.bullets.push({
    pos: vectorCopy(state.playerPos),
    dir: norm,
    lifetime: bulletLifetime,
    pierce: state.hasGanjangGim ? 1 : 0,
    penetratesObstacles: state.hasKimBugak,
    size: bulletSize,
    sprite: bulletSprite
  });
}

function fireDirections(directions, doubleShotLevel, options = {}) {
  for (const dir of directions) {
    const baseAngle = Math.atan2(dir.y, dir.x);

    if (doubleShotLevel <= 0) {
      spawnProjectile(dir, options);
      continue;
    }

    const count = doubleShotLevel + 1;
    const step = (count === 2) ? Math.PI : (Math.PI * 2) / count;

    for (let i = 0; i < count; i++) {
      const angle = baseAngle + i * step;
      const vx = Math.cos(angle);
      const vy = Math.sin(angle);
      spawnProjectile(vector(vx, vy), options);
    }
  }
}

function triggerSemiCircleBurst(targetDir, multiShotLevel) {
  const arcCount = multiShotLevel >= 5 ? 7 : 4;
  if (arcCount <= 0) return;

  let dir = targetDir;
  if (!dir || (dir.x === 0 && dir.y === 0)) {
    dir = state.lastMoveDirection || vector(1, 0);
  }

  const baseAngle = Math.atan2(dir.y, dir.x);
  const span = Math.PI; // 180도 반원
  const startAngle = baseAngle + span / 2;
  const step = arcCount === 1 ? 0 : span / (arcCount - 1);
  const doubleShot = state.upgradeLevels.double_shot;

  const queue = [];
  for (let i = 0; i < arcCount; i++) {
    const angle = startAngle - step * i; // 왼쪽(+)에서 오른쪽(-)으로 순서대로
    queue.push({
      dir: vector(Math.cos(angle), Math.sin(angle)),
      doubleShotLevel: doubleShot,
      rangeMultiplier: 1.5,
    });
  }

  state.specialBurstQueue = queue;
  state.specialBurstTimer = 0;
  state.specialBurstEffectTimer = SPECIAL_BURST_EFFECT_DURATION;
  state.specialBurstProgress = 0;
  processSpecialBurst(0);
}

function processSpecialBurst(dt) {
  if (state.specialBurstQueue.length === 0) return;

  state.specialBurstTimer -= dt;
  if (state.specialBurstTimer > 0) return;

  const next = state.specialBurstQueue.shift();
  if (next) {
    const level = Number.isFinite(next.doubleShotLevel) ? next.doubleShotLevel : state.upgradeLevels.double_shot;
    const rangeMultiplier = Number.isFinite(next.rangeMultiplier) ? next.rangeMultiplier : 1;
    fireDirections([next.dir], level, { rangeMultiplier });
  }

  if (state.specialBurstQueue.length > 0) {
    const interval = state.specialBurstInterval > 0 ? state.specialBurstInterval : 0.07;
    state.specialBurstTimer = interval;
  } else {
    state.specialBurstTimer = 0;
  }
}

function handleShooting(dt) {
  if (state.hasDeulgireumRapid && state.pendingRapidDirections && state.rapidFireTimer <= 0) {
    fireDirections(state.pendingRapidDirections, state.rapidFireDoubleShotLevel);
    state.pendingRapidDirections = null;
  }

  if (state.enemies.length === 0) {
    state.lastEnemyTargetId = null;
  }

  // 게임 모드에 따라 타겟 찾기
  const targetInfo = findTimeAttackTarget();

  const targetDir = targetInfo.direction;
  if (!targetDir) return;

  if (state.specialBurstQueue.length > 0) {
    return;
  }

  const multiShotLevel = state.upgradeLevels.multi_shot;
  const doubleShotLevel = state.upgradeLevels.double_shot;

  if (state.fireTimer <= 0) {
    if (state.specialBurstEnabled && state.specialBurstPending) {
      triggerSemiCircleBurst(targetDir, multiShotLevel);
      state.specialBurstPending = false;
      state.fireTimer = currentFireInterval;
      updateLastTargetId(targetInfo);
      return;
    }

    const baseDirections = calculateAttackDirections(targetDir, bulletCount);
    fireDirections(baseDirections, doubleShotLevel);

    if (state.hasDeulgireumRapid) {
      state.pendingRapidDirections = baseDirections.map((dir) => vectorCopy(dir));
      state.rapidFireDoubleShotLevel = doubleShotLevel;
      state.rapidFireTimer = RAPID_BURST_DELAY;
    }

    if (state.specialBurstEnabled) {
      state.specialBurstProgress += 1;
      if (state.specialBurstProgress >= 3) {
        state.specialBurstProgress = 0;
        state.specialBurstPending = true;
      }
    }

    state.fireTimer = currentFireInterval;
    updateLastTargetId(targetInfo);
  }
}

function handleBullets(dt) {
  const nextBullets = [];
  for (const bullet of state.bullets) {
    bullet.lifetime -= dt;
    if (bullet.lifetime <= 0) continue;

    const movement = vectorScale(bullet.dir, constants.BULLET_SPEED * dt);
    const bulletRadius = (bullet.size || constants.BULLET_SIZE) / 2;

    // 김부각 탄환은 장애물을 통과
    if (bullet.penetratesObstacles) {
      bullet.pos = vectorAdd(bullet.pos, movement);
    } else {
      // 일반 탄환은 이동 전에 충돌 체크
      const newPos = vectorAdd(bullet.pos, movement);
      if (collidesWithObstacleCircle(newPos, bulletRadius)) {
        continue; // 탄환이 장애물과 충돌하면 제거 (nextBullets에 추가하지 않음)
      }
      bullet.pos = newPos;
    }

    clampWorldPosition(bullet.pos);

    let consumed = false;
    for (let i = 0; i < state.enemies.length; i++) {
      const enemy = state.enemies[i];
      if (circleIntersects(bullet.pos, bulletRadius, enemy.pos, (enemy.size || constants.ENEMY_SIZE) / 2)) {
        // 1 데미지 (보라색 큰 적은 health:4로 시작)
        enemy.health = (enemy.health || 1) - 1;

        if (enemy.health <= 0) {
          const defeated = state.enemies.splice(i, 1)[0];
          onEnemyRemoved(defeated);
          grantRewardForEnemy(defeated);
          i -= 1; // 배열 보정
        }

        // 관통 처리 (간장김 보유 시 1회)
        if (bullet.pierce && bullet.pierce > 0) {
          bullet.pierce -= 1;  // 관통 소모 후 계속 진행
          continue;            // 같은 프레임에 다음 적도 맞출 수 있게
        } else {
          consumed = true;     // 관통 없으면 탄환 소멸
          break;
        }
      }
    }
    if (!consumed && state.boss) {
      if (circleIntersects(bullet.pos, bulletRadius, state.boss.pos, constants.BOSS_RADIUS)) {
        state.boss.health -= 1;
        state.score += constants.BOSS_HIT_SCORE;
        if (state.boss.health <= 0) {
          const defeatedBoss = state.boss;
          state.boss = null;
          state.bossWarningTimer = 0;
          grantRewards(
            defeatedBoss?.scoreReward ?? 100,
            defeatedBoss?.xpReward ?? constants.XP_REWARD_BOSS,
            defeatedBoss?.pos ?? state.playerPos
          );
          handleVictory();
        }
        if (bullet.pierce && bullet.pierce > 0) {
          bullet.pierce -= 1;   // 관통 소모 후 계속 진행
        } else {
          consumed = true;      // 관통 없으면 탄환 소멸
          break;
        }
      }
    }
    if (!consumed) nextBullets.push(bullet);
  }
  state.bullets = nextBullets;

  if (
    state.emFieldCount > 0 &&
    state.emCooldown <= 0 &&
    (state.enemies.length > 0 || (state.boss && state.boss.health > 0))
  ) {
    triggerEmField();
  }
}

function fireSprinkleVolley() {
  if (state.upgradeLevels.sprinkle <= 0) {
    state.sprinkleTimer = currentSprinkleInterval;
    return;
  }

  const targets = [];

  const maxRangeSq = timeAttackConstants.TIME_ATTACK_SPRINKLE_RANGE * timeAttackConstants.TIME_ATTACK_SPRINKLE_RANGE;

  for (const enemy of state.enemies) {
    const dist = vectorLengthSq(vectorSub(enemy.pos, state.playerPos));
    if (dist <= maxRangeSq) {
      targets.push({ type: 'enemy', ref: enemy, dist });
    }
  }
  if (state.boss && state.boss.health > 0) {
    const dist = vectorLengthSq(vectorSub(state.boss.pos, state.playerPos));
    if (dist <= maxRangeSq) {
      targets.push({ type: 'boss', ref: state.boss, dist });
    }
  }

  if (targets.length === 0) {
    state.sprinkleTimer = currentSprinkleInterval;
    return;
  }

  targets.sort((a, b) => a.dist - b.dist);

  const level = state.upgradeLevels.sprinkle;
  const sprinkleCount = constants.SPRINKLE_BASE_COUNT + (level - 1) * 2;

  for (let i = 0; i < sprinkleCount; i++) {
    const target = targets[i % targets.length];
    const pos = vectorCopy(state.playerPos);
    const targetPos = vectorCopy(target.ref.pos);
    const dir = vectorNormalize(vectorSub(targetPos, pos));
    const fallbackDir = vectorLengthSq(dir) > 0 ? dir : vector(1, 0);
    const color = TIME_ATTACK_SPRINKLE_COLORS[(i + state.sprinkles.length) % TIME_ATTACK_SPRINKLE_COLORS.length];

    state.sprinkles.push({
      pos,
      dir: fallbackDir,
      speed: constants.SPRINKLE_SPEED * 0.45,
      lifetime: constants.SPRINKLE_LIFETIME,
      targetType: target.type,
      targetId: target.type === 'enemy' ? target.ref.id : null,
      size: constants.BULLET_SIZE * 1.2,
      hitRadius: (constants.BULLET_SIZE * 0.75),
      phase: 'lift',
      liftTimer: 0.18,
      trail: [],
      rocketBoost: 0,
      color,
    });
  }

  state.sprinkleTimer = currentSprinkleInterval;
}

function resolveSprinkleTarget(sprinkle) {
  const rangeSq = timeAttackConstants.TIME_ATTACK_SPRINKLE_RANGE * timeAttackConstants.TIME_ATTACK_SPRINKLE_RANGE;
  if (sprinkle.targetType === 'enemy') {
    const enemy = state.enemies.find((e) => e.id === sprinkle.targetId);
    if (enemy) {
      const dist = vectorLengthSq(vectorSub(enemy.pos, sprinkle.pos));
      if (dist <= rangeSq) {
        return { type: 'enemy', ref: enemy };
      }
    }
  } else if (sprinkle.targetType === 'boss') {
    if (state.boss && state.boss.health > 0) {
      const dist = vectorLengthSq(vectorSub(state.boss.pos, sprinkle.pos));
      if (dist <= rangeSq) {
        return { type: 'boss', ref: state.boss };
      }
    }
  }

  let closest = null;
  let closestDist = Infinity;
  for (const enemy of state.enemies) {
    const dist = vectorLengthSq(vectorSub(enemy.pos, sprinkle.pos));
    if (dist < closestDist && dist <= rangeSq) {
      closest = { type: 'enemy', ref: enemy };
      closestDist = dist;
    }
  }
  if (state.boss && state.boss.health > 0) {
    const bossDist = vectorLengthSq(vectorSub(state.boss.pos, sprinkle.pos));
    if (bossDist < closestDist && bossDist <= rangeSq) {
      closest = { type: 'boss', ref: state.boss };
      closestDist = bossDist;
    }
  }

  if (closest) {
    sprinkle.targetType = closest.type;
    sprinkle.targetId = closest.type === 'enemy' ? closest.ref.id : null;
    return closest;
  }

  sprinkle.targetType = null;
  sprinkle.targetId = null;
  return null;
}

function handleSprinkles(dt) {
  if (state.upgradeLevels.sprinkle <= 0) {
    state.sprinkles.length = 0;
    state.sprinkleTimer = currentSprinkleInterval;
    return;
  }

  state.sprinkleTimer -= dt;
  if (state.sprinkleTimer <= 0) {
    fireSprinkleVolley();
  }

  const nextSprinkles = [];
  for (const sprinkle of state.sprinkles) {
    sprinkle.lifetime -= dt;
    if (sprinkle.lifetime <= 0) continue;

    if (sprinkle.phase === 'lift') {
      sprinkle.liftTimer -= dt;
      sprinkle.pos = vectorAdd(sprinkle.pos, vector(0, -35 * dt));
      if (sprinkle.liftTimer <= 0) {
        sprinkle.phase = 'rocket';
        sprinkle.rocketBoost = 0;
        sprinkle.speed = constants.SPRINKLE_SPEED * 1.1;
      }
    } else {
      sprinkle.rocketBoost = Math.min(1, (sprinkle.rocketBoost || 0) + dt * 1.5);
      const boostSpeed = constants.SPRINKLE_SPEED * (1.2 + (sprinkle.rocketBoost || 0));
      sprinkle.speed = Math.min(constants.SPRINKLE_SPEED * 2.6, boostSpeed);
      sprinkle.trail = sprinkle.trail || [];
      sprinkle.trail.push({ pos: vectorCopy(sprinkle.pos), life: 0.18 });
      if (sprinkle.trail.length > 12) {
        sprinkle.trail.shift();
      }
      for (const trail of sprinkle.trail) {
        trail.life -= dt;
      }
      sprinkle.trail = sprinkle.trail.filter((trail) => trail.life > 0);
    }

    const resolved = resolveSprinkleTarget(sprinkle);
    if (resolved) {
      const desiredDir = vectorNormalize(vectorSub(resolved.ref.pos, sprinkle.pos));
      if (vectorLengthSq(desiredDir) > 1e-6) {
        const desiredAngle = Math.atan2(desiredDir.y, desiredDir.x);
        const currentAngle = Math.atan2(sprinkle.dir.y, sprinkle.dir.x);
        const angleDiff = angleDifference(currentAngle, desiredAngle);
        const maxTurn = constants.SPRINKLE_TURN_RATE * dt;
        const clampedTurn = clamp(angleDiff, -maxTurn, maxTurn);
        const newAngle = currentAngle + clampedTurn;
        sprinkle.dir = vector(Math.cos(newAngle), Math.sin(newAngle));
      }
    }

    const movement = (sprinkle.phase === 'lift')
      ? vector(0, 0)
      : vectorScale(sprinkle.dir, sprinkle.speed * dt);
    sprinkle.pos = vectorAdd(sprinkle.pos, movement);
    clampWorldPosition(sprinkle.pos);

    let consumed = false;

    for (let i = 0; i < state.enemies.length; i++) {
      const enemy = state.enemies[i];
      if (circleIntersects(sprinkle.pos, sprinkle.hitRadius, enemy.pos, (enemy.size || constants.ENEMY_SIZE) / 2)) {
        enemy.health = (enemy.health || 1) - 1;

        if (enemy.health <= 0) {
          const defeated = state.enemies.splice(i, 1)[0];
          onEnemyRemoved(defeated);
          grantRewardForEnemy(defeated);
          i -= 1;
        }
        consumed = true;
        break;
      }
    }

    if (!consumed && state.boss) {
      if (circleIntersects(sprinkle.pos, sprinkle.hitRadius, state.boss.pos, constants.BOSS_RADIUS)) {
        state.boss.health -= 1;
        state.score += constants.BOSS_HIT_SCORE;

        if (state.boss.health <= 0) {
          const bossDefeated = state.boss;
          state.boss = null;
          state.bossWarningTimer = 0;
          grantRewards(
            bossDefeated?.scoreReward ?? 100,
            bossDefeated?.xpReward ?? constants.XP_REWARD_BOSS,
            bossDefeated?.pos ?? state.playerPos
          );
          handleVictory();
        }
        consumed = true;
      }
    }

    if (!consumed) {
      nextSprinkles.push(sprinkle);
    }
  }

  state.sprinkles = nextSprinkles;
}

function triggerEmField() {
  const emInterval = Math.max(
    constants.EM_FIELD_MIN_INTERVAL,
    currentEmInterval - 0.4 * (state.emFieldCount - 1),
  );
  state.emCooldown = emInterval;
  const targetsPool = state.enemies.map((enemy) => ({ type: 'enemy', ref: enemy }));
  if (state.boss && state.boss.health > 0) {
    targetsPool.push({ type: 'boss', ref: state.boss });
  }

  for (let i = 0; i < state.emFieldCount; i++) {
    if (targetsPool.length === 0) break;
    let last = vectorCopy(state.playerPos);
    const hits = Math.min(state.emTargetsPerField, targetsPool.length);

    // 가장 가까운 적들을 거리 순으로 정렬
    targetsPool.sort((a, b) => {
      const posA = a.type === 'enemy' ? a.ref.pos : a.ref.pos;
      const posB = b.type === 'enemy' ? b.ref.pos : b.ref.pos;
      const distA = vectorLengthSq(vectorSub(state.playerPos, posA));
      const distB = vectorLengthSq(vectorSub(state.playerPos, posB));
      return distA - distB;
    });

    for (let h = 0; h < hits; h++) {
      if (targetsPool.length === 0) break;
      const target = targetsPool.splice(0, 1)[0]; // 가장 가까운 적부터 선택
      let targetPos;
      if (target.type === 'enemy') {
        const enemy = target.ref;
        const idx = state.enemies.indexOf(enemy);
        if (idx !== -1) {
          enemy.health = (enemy.health || 1) - 1;
          // 감전 스킬 보유 시 감전 효과 적용
          if (state.upgradeLevels.electrocution > 0) {
            enemy.electrocuted = true;
            enemy.electrocutionTimer = 2.0; // 2초 감전
            enemy.electrocutionFlash = 0.5;
          }
          if (enemy.health <= 0) {
            const defeated = state.enemies.splice(idx, 1)[0];
            onEnemyRemoved(defeated);
            grantRewardForEnemy(defeated);
          }
        }
        targetPos = vectorCopy(enemy.pos);
      } else {
        const boss = state.boss;
        if (boss) {
          boss.health -= 1;
          state.score += constants.BOSS_HIT_SCORE;
          // 감전 스킬 보유 시 감전 효과 적용
          if (state.upgradeLevels.electrocution > 0) {
            boss.electrocuted = true;
            boss.electrocutionTimer = 2.0; // 2초 감전
            boss.electrocutionFlash = 0.5;
          }
          if (boss.health <= 0) {
            const defeatedBoss = state.boss;
            state.boss = null;
            state.bossWarningTimer = 0;
            grantRewards(
              defeatedBoss?.scoreReward ?? 100,
              defeatedBoss?.xpReward ?? constants.XP_REWARD_BOSS,
              defeatedBoss?.pos ?? state.playerPos
            );
            handleVictory();
            targetsPool.splice(
              targetsPool.findIndex((t) => t.type === 'boss'),
              1,
            );
          }
          targetPos = vectorCopy(boss.pos);
        } else {
          targetPos = vectorCopy(state.playerPos);
        }
      }
      state.emEffects.push({ start: vectorCopy(last), end: vectorCopy(targetPos), timer: constants.EM_EFFECT_LIFETIME });
      last = targetPos;
      if (state.victory && !state.boss) {
        targetsPool.length = 0;
        break;
      }
    }
    if (state.victory && !state.boss) break;
  }
}

function handleTornadoes(dt) {
  const nextTornadoes = [];
  for (const tornado of state.tornadoes) {
    tornado.lifetime -= dt;
    if (tornado.lifetime <= 0) continue;

    // 토네이도 이동
    const movement = vectorScale(tornado.dir, tornado.speed * dt);
    tornado.pos = vectorAdd(tornado.pos, movement);
    tornado.rotation += dt * 360; // 회전 효과

    // 월드 경계 체크
    if (Math.abs(tornado.pos.x) > constants.WORLD_BOUNDS - tornado.size/2 ||
        Math.abs(tornado.pos.y) > constants.WORLD_BOUNDS - tornado.size/2) {
      continue; // 경계를 벗어나면 제거
    }

    // 적들과의 충돌 체크
    for (const enemy of state.enemies) {
      const distance = vectorLength(vectorSub(enemy.pos, tornado.pos));
      const hitRadius = (enemy.size || constants.ENEMY_SIZE) / 2 + tornado.size / 2;

      if (distance <= hitRadius) {
        // 데미지 적용
        enemy.health = (enemy.health || 1) - tornado.damage;

        // 넉백 적용
        const knockbackDir = vectorNormalize(vectorSub(enemy.pos, tornado.pos));
        if (vectorLengthSq(knockbackDir) > 0) {
          const knockbackForce = vectorScale(knockbackDir, tornado.knockbackDistance);
          enemy.pos = vectorAdd(enemy.pos, knockbackForce);

          // 월드 경계 내로 제한
          enemy.pos.x = Math.max(-constants.WORLD_BOUNDS + (enemy.size || constants.ENEMY_SIZE)/2,
                               Math.min(constants.WORLD_BOUNDS - (enemy.size || constants.ENEMY_SIZE)/2, enemy.pos.x));
          enemy.pos.y = Math.max(-constants.WORLD_BOUNDS + (enemy.size || constants.ENEMY_SIZE)/2,
                               Math.min(constants.WORLD_BOUNDS - (enemy.size || constants.ENEMY_SIZE)/2, enemy.pos.y));
        }
      }
    }

    nextTornadoes.push(tornado);
  }
  state.tornadoes = nextTornadoes;
}

function handleEnemies(dt) {
  const nextEnemies = [];
  for (const enemy of state.enemies) {
    // 감전 상태 업데이트
    if (enemy.electrocuted) {
      enemy.electrocutionTimer -= dt;
      enemy.electrocutionFlash -= dt;
      if (enemy.electrocutionTimer <= 0) {
        enemy.electrocuted = false;
        enemy.electrocutionTimer = 0;
        enemy.electrocutionFlash = 0;
      }
    }

    // 화상 상태 업데이트
    if (enemy.burning) {
      enemy.burnDuration -= dt;
      enemy.burnTickTimer -= dt;
      if (enemy.burnFlash > 0) {
        enemy.burnFlash -= dt;
      }

      // 1초마다 화상 피해 적용
      if (enemy.burnTickTimer <= 0) {
        enemy.health = (enemy.health || 1) - constants.BURN_DAMAGE_PER_SECOND;
        enemy.burnTickTimer = constants.BURN_TICK_INTERVAL;
        enemy.burnFlash = 0.15; // 피해 시 플래시 효과

        // 화상으로 적이 죽으면 처리
        if (enemy.health <= 0) {
          const defeated = state.enemies.splice(state.enemies.indexOf(enemy), 1)[0];
          if (defeated) {
            onEnemyRemoved(defeated);
            grantRewardForEnemy(defeated);
          }
          continue;
        }
      }

      // 화상 지속시간 종료
      if (enemy.burnDuration <= 0) {
        enemy.burning = false;
        enemy.burnDuration = 0;
        enemy.burnTickTimer = 0;
        enemy.burnFlash = 0;
      }
    }

    // 감전되지 않은 상태일 때만 이동
    if (!enemy.electrocuted) {
      if (enemy.type === 'orangeLadybug') {
        // 주황색 무당벌레의 지그재그 이동
        enemy.zigzagTime += dt;

        // 플레이어 방향으로의 기본 방향 업데이트
        enemy.baseDirection = angleTowards(enemy.pos, state.playerPos);

        // 지그재그 오프셋 계산
        const zigzagOffset = Math.sin(enemy.zigzagTime * constants.ORANGE_LADYBUG_ZIGZAG_FREQUENCY + enemy.zigzagPhase) * constants.ORANGE_LADYBUG_ZIGZAG_AMPLITUDE;

        // 수직 방향 계산 (기본 방향에 수직)
        const perpDirection = enemy.baseDirection + Math.PI / 2;

        // 최종 이동 방향
        const baseDir = vector(Math.cos(enemy.baseDirection), Math.sin(enemy.baseDirection));
        const perpDir = vector(Math.cos(perpDirection) * zigzagOffset * 0.01, Math.sin(perpDirection) * zigzagOffset * 0.01);
        const finalDirection = vectorAdd(baseDir, perpDir);

        // 장애물을 무시하고 이동 (canPassObstacles가 true)
        enemy.pos = vectorAdd(enemy.pos, vectorScale(finalDirection, enemy.speed * dt));
        clampWorldPosition(enemy.pos);
      } else {
        // 일반 적들의 이동
        const direction = vectorNormalize(vectorSub(state.playerPos, enemy.pos));
        enemy.pos = moveWithCollision(enemy.pos, vectorScale(direction, enemy.speed * dt), enemy.size || constants.ENEMY_SIZE);
        clampWorldPosition(enemy.pos);
      }
    }

    // 남색 세균의 발사 로직
    if (enemy.type === 'darkBlue' && enemy.canShoot !== false) {
      enemy.fireTimer -= dt;
      if (enemy.fireTimer <= 0) {
        // 플레이어 현재 위치로 발사
        const fireDirection = vectorNormalize(vectorSub(state.playerPos, enemy.pos));
        state.enemyProjectiles.push({
          pos: vectorCopy(enemy.pos),
          dir: fireDirection,
          speed: constants.DARK_BLUE_PROJECTILE_SPEED,
          size: constants.DARK_BLUE_PROJECTILE_SIZE
        });
        enemy.fireTimer = constants.DARK_BLUE_ENEMY_FIRE_INTERVAL;
      }
    }

    if (state.playerInvuln <= 0 && circleIntersects(enemy.pos, (enemy.size || constants.ENEMY_SIZE) / 2, state.playerPos, constants.PLAYER_SIZE / 2)) {
      state.playerHealth -= 1;
      state.playerInvuln = constants.PLAYER_INVULN_TIME;
      state.hpBarTimer = 1.0;
      if (state.playerHealth <= 0) {
        handleGameOver();
      }
      continue;
    }

    let killed = false;
    if (state.blades.length > 0) {
      const bladeSizeForHit = constants.BLADE_SIZE * timeAttackConstants.TIME_ATTACK_BLADE_SIZE_SCALE;
      for (const blade of state.blades) {
        if (circleIntersects(enemy.pos, (enemy.size || constants.ENEMY_SIZE) / 2, blade.pos, bladeSizeForHit / 2)) {
          // 이 블레이드의 이번 회전에 이미 맞았는지 확인
          if (!enemy.hitByBlades) enemy.hitByBlades = new Set();

          const hitKey = `${blade.bladeId}_${blade.rotationCount}`;
          if (enemy.hitByBlades.has(hitKey)) {
            continue; // 이미 이 블레이드의 이번 회전에 맞았으면 스킵
          }

          // 블레이드 ID + 회전수 기록
          enemy.hitByBlades.add(hitKey);

          enemy.health = (enemy.health || 1) - timeAttackConstants.TIME_ATTACK_BLADE_DAMAGE;

          // 적을 10px 밀쳐내기 (넉백)
          if (enemy.health > 0) {
            const knockbackDistance = 10;
            const direction = vectorNormalize(vectorSub(enemy.pos, blade.pos));
            const knockbackVector = vectorScale(direction, knockbackDistance);
            enemy.pos = vectorAdd(enemy.pos, knockbackVector);
          }

          if (enemy.health <= 0) {
            grantRewardForEnemy(enemy);
            onEnemyRemoved(enemy);
            killed = true;
          }
          break; // 한 프레임에 여러 번 깎이지 않도록
        }
      }
    }
    if (!killed) nextEnemies.push(enemy);
  }
  state.enemies = nextEnemies;
}

function handleEnemyProjectiles(dt) {
  const nextProjectiles = [];
  for (const projectile of state.enemyProjectiles) {
    projectile.pos = vectorAdd(projectile.pos, vectorScale(projectile.dir, projectile.speed * dt));

    // 화면 밖으로 나가면 제거
    const bounds = getCurrentWorldBounds();
    if (Math.abs(projectile.pos.x) > bounds || Math.abs(projectile.pos.y) > bounds) {
      continue;
    }

    // 플레이어와 충돌 검사
    if (state.playerInvuln <= 0 && circleIntersects(
      projectile.pos, projectile.size / 2,
      state.playerPos, constants.PLAYER_SIZE / 2
    )) {
      state.playerHealth -= 1;
      state.playerInvuln = constants.PLAYER_INVULN_TIME;
      state.hpBarTimer = 1.0;
      if (state.playerHealth <= 0) {
        handleGameOver();
      }
      continue; // 발사체 제거
    }

    nextProjectiles.push(projectile);
  }
  state.enemyProjectiles = nextProjectiles;

  if (state.boss) {
    if (state.playerInvuln <= 0 && circleIntersects(state.boss.pos, constants.BOSS_RADIUS, state.playerPos, constants.PLAYER_SIZE / 2)) {
      state.playerHealth -= 2;
      state.playerInvuln = constants.PLAYER_INVULN_TIME;
      state.hpBarTimer = 1.0;

      // 보스를 플레이어로부터 뒤로 팅겨내기
      const knockbackDistance = 120;
      const direction = vectorNormalize(vectorSub(state.boss.pos, state.playerPos));
      const knockbackVector = vectorScale(direction, knockbackDistance);
      state.boss.pos = vectorAdd(state.boss.pos, knockbackVector);

      if (state.playerHealth <= 0) {
        handleGameOver();
      }
    }

    if (!state.gameOver && state.blades.length > 0) {
      const bladeSizeForBoss = constants.BLADE_SIZE * timeAttackConstants.TIME_ATTACK_BLADE_SIZE_SCALE;

      for (const blade of state.blades) {
        if (circleIntersects(state.boss.pos, constants.BOSS_RADIUS, blade.pos, bladeSizeForBoss / 2)) {
          // 이 블레이드의 이번 회전에 이미 맞았는지 확인
          if (!state.boss.hitByBlades) state.boss.hitByBlades = new Set();

          const hitKey = `${blade.bladeId}_${blade.rotationCount}`;
          if (state.boss.hitByBlades.has(hitKey)) {
            continue; // 이미 이 블레이드의 이번 회전에 맞았으면 스킵
          }

          // 블레이드 ID + 회전수 기록
          state.boss.hitByBlades.add(hitKey);

          const bladeDamage = timeAttackConstants.TIME_ATTACK_BLADE_DAMAGE;
          state.boss.health -= bladeDamage;
          state.score += constants.BOSS_HIT_SCORE;

          if (state.boss.health <= 0) {
            const defeatedBoss = state.boss;
            state.boss = null;
            state.bossWarningTimer = 0;
            grantRewards(
              defeatedBoss?.scoreReward ?? 100,
              defeatedBoss?.xpReward ?? constants.XP_REWARD_BOSS,
              defeatedBoss?.pos ?? state.playerPos
            );
            handleVictory();
          }
          break;
        }
      }
    }
  }
}

function getWorldDims() {
  const worldW = timeAttackConstants.TIME_ATTACK_WIDTH;
  const worldH = timeAttackConstants.TIME_ATTACK_HEIGHT;
  return { worldW, worldH, halfW: worldW / 2, halfH: worldH / 2 };
}

function worldToScreen(pos) {
  const { halfW, halfH } = getWorldDims();
  return {
    x: Math.round(pos.x - state.playerPos.x + halfW),
    y: Math.round(pos.y - state.playerPos.y + halfH),
  };
}


function render() {
  // DPR을 고려한 캔버스 상태 초기화
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // Clear the full canvas (DPR-aware) - 더 확실하게 지우기
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = constants.BACKGROUND_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  //균등 스케일 + 중앙 정렬 적용
  if (window.__renderScale) {
    const { s, offsetX, offsetY } = window.__renderScale;
    ctx.translate(offsetX, offsetY);
    ctx.scale(s, s);
  }


  drawBackground();
  drawObstacles();
  drawWorldBounds();

  // 게임 오브젝트(적, 아이템, XP 등)에만 클리핑 적용 (배경 영역만)
  ctx.save();
  const { worldW, worldH } = getWorldDims();

  // 배경은 화면 좌표 (0,0) ~ (worldW, worldH)에 그려지므로 클리핑도 동일하게
  ctx.beginPath();
  ctx.rect(0, 0, worldW, worldH);
  ctx.clip();

  // XP 크럼 (김가루) - 클리핑 영역 안에서 그리기
  drawXpCrumbs(ctx, worldToScreen);

  if (state.mine.active) {
    let mineSize = constants.MINE_SIZE;

    // 타임어택 모드에서는 지뢰 크기 50% 축소
    mineSize *= constants.TIME_ATTACK_OBJECT_SCALE;

    drawSprite(sprites.mine, state.mine.pos, mineSize);
  }
  if (state.toothpasteItems.length > 0) {
    for (const item of state.toothpasteItems) {
      drawToothpasteItem(item);
    }
  }

  for (const enemy of state.enemies) {
    const spr = enemy.sprite || sprites.enemy;
    let sz = enemy.size || constants.ENEMY_SIZE;

    drawSprite(spr, enemy.pos, sz);

    // 감전 효과 그리기
    if (enemy.electrocuted && enemy.electrocutionFlash > 0) {
      drawElectrocutionEffect(enemy.pos, sz);
    }

    // 화상 효과 그리기
    if (enemy.burning) {
      drawBurnEffect(enemy.pos, sz, enemy.burnFlash || 0);
    }
  }

  if (state.boss) {
    drawBossEntity(state.boss);
  }

  for (const effect of state.emEffects) {
    drawEmEffect(effect);
  }

  for (const sprinkle of state.sprinkles) {
    drawSprinkleProjectile(sprinkle);
  }

  for (const bullet of state.bullets) {
    drawBulletSprite(bullet);
  }

  // 적 발사체 그리기
  for (const projectile of state.enemyProjectiles) {
    let projectileSize = projectile.size;

    // 타임어택 모드에서는 적 발사체 크기 50% 축소
    projectileSize *= constants.TIME_ATTACK_OBJECT_SCALE;

    drawSprite(sprites.enemyProjectile, projectile.pos, projectileSize);
  }

  if (state.blades.length > 0) {
    for (const blade of state.blades) {
      const sprite = sprites.blades[blade.spriteIndex] || sprites.blades[sprites.blades.length - 1];
      let bladeSize = constants.BLADE_SIZE;

      bladeSize *= timeAttackConstants.TIME_ATTACK_BLADE_SIZE_SCALE;

      drawSprite(sprite, blade.pos, bladeSize);
    }
  }

  // 토네이도 렌더링 (타임어택 모드에서는 표시 안함)

  // 게임 오브젝트 클리핑 해제
  ctx.restore();

  drawPlayer();

  if (state.boss && state.bossWarningTimer > 0) {
    drawBossWarning();
  }

  // 타임어택 모드 보스 HP바 표시
  if (state.boss) {
    drawTimeAttackBossHP(ctx, state, getWorldDims);
  }

  // 타임어택 모드 검은먼지 경고 표시
  if (state.blackDustWarningActive) {
    drawBlackDustWarning(ctx, state, getWorldDims, timeAttackConstants);
  }

  // 게임 시작 메시지 표시
  if (state.gameStartMessageTimer > 0) {
    drawGameStartMessage(ctx, state, getWorldDims);
  }

  if (state.mineFlashTimer > 0) {
    drawMineFlash();
  }
  if (state.toothpasteFlashTimer > 0) {
    drawToothpasteFlash();
  }
  if (state.levelBlastTimer > 0) {
    drawLevelBlast();
  }

  // 타임어택 모드에서 화면 밖 치약 방향 표시
  drawOffScreenToothpasteIndicators();

  drawPlayerHPBar();

  ctx.restore();

  updateHud();
}

function drawBackground() {
  if (state.stageTheme === 'space') {
    drawSpaceBackground();
    return;
  }
  if (state.stageTheme === 'grassland') {
    drawGrasslandBackground();
    return;
  }
  const { worldW, worldH, halfW, halfH } = getWorldDims();

  // ===== 나무쟁반 배경 =====
  const centerX = halfW;
  const centerY = halfH;

  // 떡갈나무 베이스 그라디언트 (진한 갈색과 황갈색)
  const oakGrad = ctx.createRadialGradient(centerX, centerY, Math.min(halfW, halfH) * 0.15, centerX, centerY, Math.max(worldW, worldH) * 0.9);
  oakGrad.addColorStop(0.0, '#d4a574');  // 떡갈나무 밝은 중심 (황갈색)
  oakGrad.addColorStop(0.25, '#c7956a');  // 중간 황갈색
  oakGrad.addColorStop(0.5, '#b5835d');   // 진한 황갈색
  oakGrad.addColorStop(0.75, '#a0714f');  // 갈색으로 전환
  oakGrad.addColorStop(1.0, '#8b5e3c');   // 가장자리 진한 갈색
  ctx.fillStyle = oakGrad;
  ctx.fillRect(0, 0, worldW, worldH);

  // 타임어택 모드에서만 격자무늬와 아이템들 그리기
  drawGridPattern();
  drawTrayItems();

}

function drawNormalModeGrid() {
  const { worldW, worldH } = getWorldDims();
  const gridSize = 100; // 노말모드는 더 큰 격자

  // 월드 좌표계에서 화면에 보이는 범위 계산
  const startWorldX = state.playerPos.x - worldW / 2;
  const endWorldX = state.playerPos.x + worldW / 2;
  const startWorldY = state.playerPos.y - worldH / 2;
  const endWorldY = state.playerPos.y + worldH / 2;

  // 첫 번째 격자선의 월드 좌표 계산
  const firstLineX = Math.floor(startWorldX / gridSize) * gridSize;
  const firstLineY = Math.floor(startWorldY / gridSize) * gridSize;

  ctx.strokeStyle = constants.GRID_COLOR;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.15;

  // 세로 격자선
  for (let worldX = firstLineX; worldX <= endWorldX + gridSize; worldX += gridSize) {
    const screenX = worldToScreen(vector(worldX, 0)).x;
    ctx.beginPath();
    ctx.moveTo(screenX, 0);
    ctx.lineTo(screenX, worldH);
    ctx.stroke();
  }

  // 가로 격자선
  for (let worldY = firstLineY; worldY <= endWorldY + gridSize; worldY += gridSize) {
    const screenY = worldToScreen(vector(0, worldY)).y;
    ctx.beginPath();
    ctx.moveTo(0, screenY);
    ctx.lineTo(worldW, screenY);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}

function drawGridPattern() {
  const { worldW, worldH } = getWorldDims();
  const gridSize = 50;

  // 월드 좌표계에서 화면에 보이는 범위 계산
  const startWorldX = state.playerPos.x - worldW / 2;
  const endWorldX = state.playerPos.x + worldW / 2;
  const startWorldY = state.playerPos.y - worldH / 2;
  const endWorldY = state.playerPos.y + worldH / 2;

  // 첫 번째 격자선의 월드 좌표 계산
  const firstLineX = Math.floor(startWorldX / gridSize) * gridSize;
  const firstLineY = Math.floor(startWorldY / gridSize) * gridSize;

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = 1;

  // 세로 격자선
  for (let worldX = firstLineX; worldX <= endWorldX + gridSize; worldX += gridSize) {
    const screenX = worldToScreen(vector(worldX, 0)).x;
    ctx.beginPath();
    ctx.moveTo(screenX, 0);
    ctx.lineTo(screenX, worldH);
    ctx.stroke();
  }

  // 가로 격자선
  for (let worldY = firstLineY; worldY <= endWorldY + gridSize; worldY += gridSize) {
    const screenY = worldToScreen(vector(0, worldY)).y;
    ctx.beginPath();
    ctx.moveTo(0, screenY);
    ctx.lineTo(worldW, screenY);
    ctx.stroke();
  }
}

function drawTrayItems() {
  const { worldW, worldH } = getWorldDims();
  const bounds = getCurrentWorldBounds();
  const gridSpacing = 180;
  const jitterRange = gridSpacing * 0.35;
  const placementChance = 0.35;

  // 배경 아이템을 한 번만 생성 (경계가 바뀌면 다시 생성)
  if (!timeAttackBackgroundItems || timeAttackBackgroundBounds !== bounds) {
    // 시드 기반 랜덤 함수 (일관된 배치를 위해)
    function seededRandom(seed) {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    }

    let seedCounter = 1000;
    const cakeTypes = ['croissant', 'cupcake', 'bread', 'muffin', 'tiramisu', 'cheesecake'];
    timeAttackBackgroundItems = [];

    const limitX = timeAttackConstants.TIME_ATTACK_WORLD_BOUNDS;
    const limitY = timeAttackConstants.TIME_ATTACK_WORLD_BOUNDS;
    const minX = -limitX;
    const maxX = limitX;
    const minY = -limitY;
    const maxY = limitY;

    // 흰색 경계선 전체에 gridSpacing 간격으로 빵/케이크 배치
    for (let x = minX; x <= maxX; x += gridSpacing) {
      for (let y = minY; y <= maxY; y += gridSpacing) {
        const placementRoll = seededRandom(seedCounter++);
        if (placementRoll > placementChance) {
          continue;
        }
        const randomX = clamp(
          x + (seededRandom(seedCounter++) - 0.5) * 2 * jitterRange,
          minX,
          maxX
        );
        const randomY = clamp(
          y + (seededRandom(seedCounter++) - 0.5) * 2 * jitterRange,
          minY,
          maxY
        );
        const typeIndex = Math.floor(seededRandom(seedCounter++) * cakeTypes.length);
        const scale = 0.8 + seededRandom(seedCounter++) * 0.4; // 0.8~1.2 크기

        timeAttackBackgroundItems.push({
          worldX: randomX,
          worldY: randomY,
          type: cakeTypes[typeIndex],
          scale
        });
      }
    }

    timeAttackBackgroundBounds = bounds;
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, worldW, worldH);
  ctx.clip();

  // 모든 배경 아이템 그리기 (나무배경 영역 밖은 잘라냄)
  timeAttackBackgroundItems.forEach(item => {
    const screenPos = worldToScreen(vector(item.worldX, item.worldY));

    // 화면 범위 내에 있는 아이템만 그리기
    if (screenPos.x > -100 && screenPos.x < worldW + 100 &&
        screenPos.y > -100 && screenPos.y < worldH + 100) {

      ctx.save();
      ctx.globalAlpha = 0.3; // 배경처럼 보이게 반투명
      ctx.translate(screenPos.x, screenPos.y);
      ctx.scale(item.scale, item.scale);

      switch (item.type) {
        case 'croissant':
          drawCroissant(0, 0);
          break;
        case 'cupcake':
          drawCupcake(0, 0);
          break;
        case 'bread':
          drawBread(0, 0);
          break;
        case 'muffin':
          drawMuffin(0, 0);
          break;
        case 'tiramisu':
          drawTiramisu(0, 0);
          break;
        case 'cheesecake':
          drawCheesecake(0, 0);
          break;
      }

      ctx.restore();
    }
  });

  ctx.restore();
}

// 크루아상
function drawCroissant(x, y) {
  ctx.fillStyle = '#d4a574';
  ctx.beginPath();
  ctx.ellipse(x, y, 30, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  // 겉면 레이어 표현
  ctx.strokeStyle = '#b8925e';
  ctx.lineWidth = 1.5;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.arc(x + i * 6, y, 8, 0, Math.PI);
    ctx.stroke();
  }
}

// 컵케이크
function drawCupcake(x, y) {
  // 컵 부분
  ctx.fillStyle = '#ff9999';
  ctx.beginPath();
  ctx.moveTo(x - 15, y + 10);
  ctx.lineTo(x - 12, y - 5);
  ctx.lineTo(x + 12, y - 5);
  ctx.lineTo(x + 15, y + 10);
  ctx.closePath();
  ctx.fill();

  // 크림 부분
  ctx.fillStyle = '#ffe4e1';
  ctx.beginPath();
  ctx.ellipse(x, y - 10, 18, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // 체리
  ctx.fillStyle = '#ff0000';
  ctx.beginPath();
  ctx.arc(x, y - 18, 4, 0, Math.PI * 2);
  ctx.fill();
}

// 식빵
function drawBread(x, y) {
  ctx.fillStyle = '#f5deb3';
  ctx.fillRect(x - 20, y - 12, 40, 24);

  // 윗면 (갈색)
  ctx.fillStyle = '#d2b48c';
  ctx.beginPath();
  ctx.ellipse(x, y - 12, 20, 8, 0, 0, Math.PI, true);
  ctx.fill();
}

// 머핀
function drawMuffin(x, y) {
  // 머핀 몸통
  ctx.fillStyle = '#c49a6c';
  ctx.beginPath();
  ctx.ellipse(x, y, 20, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // 윗부분 (부푼 모양)
  ctx.fillStyle = '#b08968';
  ctx.beginPath();
  ctx.arc(x - 8, y - 8, 10, 0, Math.PI * 2);
  ctx.arc(x + 8, y - 8, 10, 0, Math.PI * 2);
  ctx.arc(x, y - 12, 12, 0, Math.PI * 2);
  ctx.fill();
}

// 티라미수
function drawTiramisu(x, y) {
  // 아래층 (스펀지)
  ctx.fillStyle = '#c9a87c';
  ctx.fillRect(x - 18, y + 5, 36, 10);

  // 크림층
  ctx.fillStyle = '#f5f5dc';
  ctx.fillRect(x - 18, y - 5, 36, 10);

  // 윗층 (코코아)
  ctx.fillStyle = '#6b4423';
  ctx.fillRect(x - 18, y - 15, 36, 10);
}

// 치즈케이크
function drawCheesecake(x, y) {
  // 케이크 본체
  ctx.fillStyle = '#fff8dc';
  ctx.beginPath();
  ctx.moveTo(x - 20, y + 10);
  ctx.lineTo(x - 18, y - 10);
  ctx.lineTo(x + 18, y - 10);
  ctx.lineTo(x + 20, y + 10);
  ctx.closePath();
  ctx.fill();

  // 딸기 토핑
  ctx.fillStyle = '#ff6b6b';
  ctx.beginPath();
  ctx.ellipse(x, y - 12, 15, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 크러스트
  ctx.fillStyle = '#d2b48c';
  ctx.fillRect(x - 20, y + 10, 40, 5);
}

function drawGrasslandBackground() {
  const { worldW, worldH } = getWorldDims();

  // 하늘 그라디언트 (밝은 파란 하늘) - 전체 화면
  const skyGradient = ctx.createLinearGradient(0, 0, 0, worldH);
  skyGradient.addColorStop(0, '#87ceeb'); // 스카이 블루
  skyGradient.addColorStop(0.7, '#98e4ff'); // 연한 하늘색
  skyGradient.addColorStop(1, '#b8f5b8'); // 연한 초록 (지평선 근처)
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, worldW, worldH);

  // 잔디밭 (밝은 초록색) - 전체 화면 하단
  const grassGradient = ctx.createLinearGradient(0, worldH * 0.6, 0, worldH);
  grassGradient.addColorStop(0, '#7dd87d'); // 밝은 초록
  grassGradient.addColorStop(0.5, '#66bb6a'); // 중간 초록
  grassGradient.addColorStop(1, '#4caf50'); // 진한 초록
  ctx.fillStyle = grassGradient;
  ctx.fillRect(0, worldH * 0.6, worldW, worldH * 0.4);

  // 월드 좌표 기준으로 고정된 배경 요소들 그리기
  drawFixedVillageElements();
}

// 월드 좌표에 고정된 마을 요소들 그리기
function drawFixedVillageElements() {

  // 월드 좌표에서의 고정 위치들 (맵 전체에 분산 배치)
  const houses = [
    { worldX: -400, worldY: -200, w: 60, h: 50 },
    { worldX: 300, worldY: -300, w: 70, h: 55 },
    { worldX: -100, worldY: 250, w: 55, h: 45 },
    { worldX: 450, worldY: 150, w: 65, h: 60 },
    { worldX: -350, worldY: 100, w: 50, h: 40 },
  ];

  for (const house of houses) {
    // 화면 좌표로 변환
    const screenPos = worldToScreen(vector(house.worldX, house.worldY));

    // 화면 밖이면 그리지 않음 (최적화)
    if (screenPos.x < -100 || screenPos.x > canvas.width + 100 ||
        screenPos.y < -100 || screenPos.y > canvas.height + 100) continue;

    // 집 본체 (벽)
    ctx.fillStyle = '#f4e4bc'; // 크림색 벽
    ctx.fillRect(screenPos.x, screenPos.y, house.w, house.h);

    // 지붕
    ctx.fillStyle = '#d32f2f'; // 빨간 지붕
    ctx.beginPath();
    ctx.moveTo(screenPos.x - 5, screenPos.y);
    ctx.lineTo(screenPos.x + house.w / 2, screenPos.y - house.h * 0.4);
    ctx.lineTo(screenPos.x + house.w + 5, screenPos.y);
    ctx.closePath();
    ctx.fill();

    // 문
    ctx.fillStyle = '#8d6e63'; // 갈색 문
    const doorW = house.w * 0.3;
    const doorH = house.h * 0.6;
    ctx.fillRect(screenPos.x + house.w / 2 - doorW / 2, screenPos.y + house.h - doorH, doorW, doorH);

    // 창문
    ctx.fillStyle = '#42a5f5'; // 파란 창문
    const winSize = house.w * 0.15;
    ctx.fillRect(screenPos.x + house.w * 0.2, screenPos.y + house.h * 0.3, winSize, winSize);
    ctx.fillRect(screenPos.x + house.w * 0.65, screenPos.y + house.h * 0.3, winSize, winSize);
  }

  // 나무들
  const trees = [
    { worldX: -500, worldY: -100, size: 30 },
    { worldX: 200, worldY: -450, size: 40 },
    { worldX: -250, worldY: 350, size: 35 },
    { worldX: 400, worldY: -50, size: 25 },
    { worldX: 100, worldY: 300, size: 45 },
    { worldX: -600, worldY: 200, size: 35 },
    { worldX: 550, worldY: -200, size: 30 },
  ];

  for (const tree of trees) {
    // 화면 좌표로 변환
    const screenPos = worldToScreen(vector(tree.worldX, tree.worldY));

    // 화면 밖이면 그리지 않음 (최적화)
    if (screenPos.x < -100 || screenPos.x > canvas.width + 100 ||
        screenPos.y < -100 || screenPos.y > canvas.height + 100) continue;

    // 나무 줄기
    ctx.fillStyle = '#8d6e63'; // 갈색 줄기
    const trunkW = tree.size * 0.2;
    const trunkH = tree.size * 0.8;
    ctx.fillRect(screenPos.x - trunkW / 2, screenPos.y, trunkW, trunkH);

    // 나무 잎
    ctx.fillStyle = '#2e7d32'; // 진한 초록 잎
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y + trunkH * 0.2, tree.size, 0, Math.PI * 2);
    ctx.fill();

    // 밝은 초록 하이라이트
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.arc(screenPos.x - tree.size * 0.3, screenPos.y, tree.size * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // 꽃들
  const flowers = [
    { worldX: -300, worldY: -50, color: '#ff5722' }, // 빨간 꽃
    { worldX: 150, worldY: -200, color: '#ffeb3b' }, // 노란 꽃
    { worldX: -50, worldY: 180, color: '#e91e63' }, // 분홍 꽃
    { worldX: 250, worldY: 100, color: '#9c27b0' }, // 보라 꽃
    { worldX: -450, worldY: 250, color: '#ff9800' }, // 주황 꽃
    { worldX: 350, worldY: -350, color: '#ff5722' },
    { worldX: -150, worldY: -300, color: '#ffeb3b' },
    { worldX: 500, worldY: 50, color: '#e91e63' },
  ];

  for (const flower of flowers) {
    // 화면 좌표로 변환
    const screenPos = worldToScreen(vector(flower.worldX, flower.worldY));

    // 화면 밖이면 그리지 않음 (최적화)
    if (screenPos.x < -20 || screenPos.x > canvas.width + 20 ||
        screenPos.y < -20 || screenPos.y > canvas.height + 20) continue;

    ctx.fillStyle = flower.color;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, 3, 0, Math.PI * 2);
    ctx.fill();

    // 꽃 중심 (노란색)
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // 구름들 (높은 하늘에 고정)
  const clouds = [
    { worldX: -600, worldY: -600, size: 40 },
    { worldX: 400, worldY: -700, size: 50 },
    { worldX: 0, worldY: -650, size: 35 },
    { worldX: 700, worldY: -680, size: 30 },
    { worldX: -300, worldY: -720, size: 25 },
  ];

  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  for (const cloud of clouds) {
    // 화면 좌표로 변환
    const screenPos = worldToScreen(vector(cloud.worldX, cloud.worldY));

    // 화면 밖이면 그리지 않음 (최적화)
    if (screenPos.x < -200 || screenPos.x > canvas.width + 200 ||
        screenPos.y < -200 || screenPos.y > canvas.height + 200) continue;

    // 구름 그리기 (여러 원으로 구성)
    ctx.beginPath();
    ctx.arc(screenPos.x - cloud.size * 0.3, screenPos.y, cloud.size * 0.6, 0, Math.PI * 2);
    ctx.arc(screenPos.x, screenPos.y, cloud.size, 0, Math.PI * 2);
    ctx.arc(screenPos.x + cloud.size * 0.3, screenPos.y, cloud.size * 0.7, 0, Math.PI * 2);
    ctx.arc(screenPos.x - cloud.size * 0.1, screenPos.y - cloud.size * 0.3, cloud.size * 0.5, 0, Math.PI * 2);
    ctx.arc(screenPos.x + cloud.size * 0.1, screenPos.y - cloud.size * 0.2, cloud.size * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

// 사용하지 않는 함수들 제거됨

function drawSpaceBackground() {
  const { worldW, worldH, halfW, halfH } = getWorldDims();

  const skyGradient = ctx.createLinearGradient(0, 0, 0, worldH);
  skyGradient.addColorStop(0, '#050b1f');
  skyGradient.addColorStop(0.5, '#081b3f');
  skyGradient.addColorStop(1, '#020814');
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, worldW, worldH);

  const nebula = ctx.createRadialGradient(
    halfW - worldW * 0.3,
    halfH - worldH * 0.4,
    worldW * 0.1,
    halfW,
    halfH,
    worldW * 0.9,
  );
  nebula.addColorStop(0, 'rgba(128, 90, 213, 0.35)');
  nebula.addColorStop(0.6, 'rgba(64, 105, 255, 0.15)');
  nebula.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, worldW, worldH);

  const starSpacing = 140;
  const offsetX = state.playerPos.x % starSpacing;
  const offsetY = state.playerPos.y % starSpacing;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (let x = -starSpacing - offsetX; x < worldW; x += starSpacing) {
    for (let y = -starSpacing - offsetY; y < worldH; y += starSpacing) {
      ctx.beginPath();
      ctx.arc(x + halfW, y + halfH, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let x = -starSpacing * 0.5 - offsetX; x < worldW; x += starSpacing) {
    for (let y = -starSpacing * 0.5 - offsetY; y < worldH; y += starSpacing) {
      ctx.beginPath();
      ctx.arc(x + halfW, y + halfH, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
}

function drawObstacles() {
  // 타임어택 모드에서는 장애물 그리지 않음
  return;

  for (const obs of obstacles) {
    const style = DONUT_STYLES[obs.type] || DONUT_STYLES.boston_creme;
    const center = worldToScreen(obs.center);
    const radius = obs.radius;
    const icingRadius = radius * (style.icingRadius ?? 0.9);
    const holeRadius = style.holeRadius ? radius * style.holeRadius : 0;

    ctx.save();
    ctx.translate(center.x, center.y);

    const doughGradient = ctx.createRadialGradient(0, 0, radius * 0.25, 0, 0, radius);
    doughGradient.addColorStop(0, style.doughInner || '#f3c98c');
    doughGradient.addColorStop(1, style.doughOuter || '#b88642');
    ctx.fillStyle = doughGradient;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    if (style.icingColor) {
      ctx.fillStyle = style.icingColor;
      ctx.beginPath();
      ctx.arc(0, 0, icingRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = style.icingHighlight || 'rgba(255,255,255,0.2)';
      ctx.beginPath();
      ctx.ellipse(-icingRadius * 0.2, -icingRadius * 0.4, icingRadius * 0.55, icingRadius * 0.28, -0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    if (style.powderColor && obs.powder) {
      ctx.fillStyle = style.powderColor;
      for (const dust of obs.powder) {
        ctx.save();
        ctx.translate(dust.x * icingRadius, dust.y * icingRadius);
        ctx.rotate(dust.rotation);
        ctx.beginPath();
        ctx.ellipse(0, -icingRadius * 0.2, icingRadius * dust.width, icingRadius * dust.height, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    if (holeRadius > 0) {
      ctx.fillStyle = style.holeColor || style.doughInner || '#f5d6a3';
      ctx.beginPath();
      ctx.arc(0, 0, holeRadius, 0, Math.PI * 2);
      ctx.fill();
    } else if (style.fillingColor) {
      ctx.fillStyle = style.fillingColor;
      ctx.beginPath();
      ctx.arc(0, 0, icingRadius * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    if (style.glazeSheen) {
      ctx.strokeStyle = style.glazeSheen;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, icingRadius * 0.75, -Math.PI * 0.25, Math.PI * 0.1);
      ctx.stroke();
    }

    if (style.drizzleColor) {
      ctx.strokeStyle = style.drizzleColor;
      ctx.lineWidth = 5;
      const loops = 3;
      for (let i = 0; i < loops; i++) {
        const offset = (i / loops - 0.5) * icingRadius * 0.8;
        ctx.beginPath();
        ctx.moveTo(-icingRadius * 0.9, offset);
        ctx.quadraticCurveTo(0, offset + icingRadius * 0.15, icingRadius * 0.9, offset - icingRadius * 0.1);
        ctx.stroke();
      }
    }

    if (obs.sprinkles && style.sprinkleColors?.length) {
      for (const sprinkle of obs.sprinkles) {
        const sprRadius = icingRadius * sprinkle.radius;
        const sx = Math.cos(sprinkle.angle) * sprRadius;
        const sy = Math.sin(sprinkle.angle) * sprRadius;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(sprinkle.angle + sprinkle.tilt);
        ctx.fillStyle = style.sprinkleColors[sprinkle.colorIndex % style.sprinkleColors.length];
        const length = icingRadius * sprinkle.length;
        const width = icingRadius * sprinkle.width;
        ctx.fillRect(-length / 2, -width / 2, length, width);
        ctx.restore();
      }
    }

    ctx.restore();
  }
}

function drawWorldBounds() {
  const bounds = getCurrentWorldBounds();
  const corners = [
    vector(-bounds, -bounds),
    vector(bounds, -bounds),
    vector(bounds, bounds),
    vector(-bounds, bounds),
  ].map(worldToScreen);
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) {
    ctx.lineTo(corners[i].x, corners[i].y);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawSprite(sprite, worldPos, size) {
  if (!sprite) return;
  const screen = worldToScreen(worldPos);
  ctx.drawImage(sprite, screen.x - size / 2, screen.y - size / 2, size, size);
}

function drawSpecialBurstEffect(screenX, screenY, playerSize) {
  const timer = state.specialBurstEffectTimer;
  if (timer <= 0) return;

  const progress = clamp(1 - timer / SPECIAL_BURST_EFFECT_DURATION, 0, 1);
  const fade = 1 - progress;
  const orbCount = state.upgradeLevels.multi_shot >= 5 ? 7 : 4;
  const baseRadius = playerSize * 0.7;
  const extraRadius = playerSize * (state.upgradeLevels.multi_shot >= 5 ? 1.0 : 0.8);
  const radius = baseRadius + extraRadius * progress;

  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < orbCount; i++) {
    const angle = (-Math.PI / 2) + (i / (orbCount - 1)) * Math.PI;
    const wobble = Math.sin(performance.now() * 0.004 + i) * playerSize * 0.05 * fade;
    const px = Math.cos(angle) * radius;
    const py = Math.sin(angle) * radius + wobble;
    const orbRadius = playerSize * (0.18 + 0.12 * fade);

    const gradient = ctx.createRadialGradient(px, py, 0, px, py, orbRadius);
    gradient.addColorStop(0, `rgba(255, 255, 210, ${0.6 * fade + 0.2})`);
    gradient.addColorStop(0.5, `rgba(255, 180, 120, ${0.4 * fade + 0.1})`);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(px, py, orbRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(255, 230, 190, ${0.5 * fade})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(px, py, orbRadius * (0.55 + 0.25 * progress), 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawPlayer() {
  const { halfW, halfH } = getWorldDims();
  const screenX = halfW;
  const screenY = halfH;

  // 선택된 캐릭터에 따라 스프라이트 선택
  const playerSprite = state.selectedCharacter === 'glazed_ring' ? sprites.glazedDonut : sprites.player;

  // 타임어택 모드에서도 플레이어는 원래 크기 유지
  let playerSize = constants.PLAYER_SIZE;

  // 공격 방향 표시 (귀여운 화살표) - 캐릭터보다 먼저 그리기
  drawAttackIndicator(ctx, screenX, screenY, playerSize);

  drawSpecialBurstEffect(screenX, screenY, playerSize);

  if (state.playerInvuln > 0) {
    const alpha = 0.5 + 0.5 * Math.sin(performance.now() * 0.005);
    ctx.globalAlpha = clamp(alpha, 0.2, 1);
    ctx.drawImage(playerSprite, screenX - playerSize / 2, screenY - playerSize / 2, playerSize, playerSize);
    ctx.globalAlpha = 1;
  } else if (state.playerHealth <= getPlayerMaxHealth() * 0.2) {
    const alpha = 0.3 + 0.7 * Math.sin(performance.now() * 0.008);
    ctx.globalAlpha = clamp(alpha, 0.3, 1);
    ctx.drawImage(playerSprite, screenX - playerSize / 2, screenY - playerSize / 2, playerSize, playerSize);
    ctx.globalAlpha = 1;
  } else {
    ctx.drawImage(playerSprite, screenX - playerSize / 2, screenY - playerSize / 2, playerSize, playerSize);
  }
}

function drawEmEffect(effect) {
  // 전기 번개 효과
  const a = worldToScreen(effect.start);
  const b = worldToScreen(effect.end);
  const lifeRatio = clamp(effect.timer / constants.EM_EFFECT_LIFETIME, 0, 1);
  const alpha = 0.4 + 0.6 * lifeRatio; // 생성 직후 더 밝고, 사라질수록 어둡게

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // 지그재그 번개 모양 생성
  const distance = Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
  const segments = Math.max(8, Math.floor(distance / 20));
  const points = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    let x = a.x + (b.x - a.x) * t;
    let y = a.y + (b.y - a.y) * t;

    // 시작점과 끝점이 아닐 때만 지그재그 효과 추가
    if (i > 0 && i < segments) {
      const perpX = -(b.y - a.y) / distance;
      const perpY = (b.x - a.x) / distance;
      const zigzagAmount = (Math.random() - 0.5) * 40 * Math.sin(t * Math.PI);
      x += perpX * zigzagAmount;
      y += perpY * zigzagAmount;
    }

    points.push({ x, y });
  }

  // 검은색 테두리
  ctx.strokeStyle = `rgba(0, 0, 0, ${0.8 * alpha})`;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    if (i === 0) {
      ctx.moveTo(points[i].x, points[i].y);
    } else {
      ctx.lineTo(points[i].x, points[i].y);
    }
  }
  ctx.stroke();

  // 전기 번개 색상 (밝은 파란색-흰색)
  const lightningGrad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
  lightningGrad.addColorStop(0, `rgba(135, 206, 255, ${0.95 * alpha})`); // 하늘색
  lightningGrad.addColorStop(0.5, `rgba(255, 255, 255, ${1.0 * alpha})`); // 흰색
  lightningGrad.addColorStop(1, `rgba(173, 216, 230, ${0.9 * alpha})`); // 연한 파란색
  ctx.strokeStyle = lightningGrad;

  // 메인 번개
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i < points.length; i++) {
    if (i === 0) {
      ctx.moveTo(points[i].x, points[i].y);
    } else {
      ctx.lineTo(points[i].x, points[i].y);
    }
  }
  ctx.stroke();

  // 내부 밝은 코어
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 * alpha})`;
  ctx.lineWidth = 2;
  ctx.stroke();

  // 전기 스파크 효과
  for (let i = 1; i < points.length - 1; i++) {
    if (Math.random() < 0.3) {
      const sparkLength = 10 + Math.random() * 15;
      const angle = Math.random() * Math.PI * 2;
      const sparkX = points[i].x + Math.cos(angle) * sparkLength;
      const sparkY = points[i].y + Math.sin(angle) * sparkLength;

      ctx.strokeStyle = `rgba(135, 206, 255, ${0.6 * alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(points[i].x, points[i].y);
      ctx.lineTo(sparkX, sparkY);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawElectrocutionEffect(worldPos, size) {
  const screen = worldToScreen(worldPos);
  const radius = size / 2 + 10;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // 감전 플래시 효과 (파란 빛 오버레이)
  const flashIntensity = Math.sin(Date.now() * 0.02) * 0.3 + 0.5;
  ctx.fillStyle = `rgba(135, 206, 255, ${0.3 * flashIntensity})`;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
  ctx.fill();

  // 전기 스파크 효과들
  const sparkCount = 8;
  const time = Date.now() * 0.01;

  for (let i = 0; i < sparkCount; i++) {
    const angle = (i / sparkCount) * Math.PI * 2 + time;
    const distance = radius + Math.sin(time + i) * 8;
    const sparkX = screen.x + Math.cos(angle) * distance;
    const sparkY = screen.y + Math.sin(angle) * distance;

    // 작은 전기 스파크
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.7 + Math.sin(time * 2 + i) * 0.3})`;
    ctx.lineWidth = 2;
    ctx.beginPath();

    // 지그재그 스파크 모양
    const sparkLength = 12;
    const segments = 4;
    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      const sparkEndX = sparkX + Math.cos(angle + Math.PI * 0.1) * sparkLength * t;
      const sparkEndY = sparkY + Math.sin(angle + Math.PI * 0.1) * sparkLength * t;

      // 지그재그 효과
      const zigzag = Math.sin(t * Math.PI * 4) * 3;
      const perpX = -Math.sin(angle + Math.PI * 0.1);
      const perpY = Math.cos(angle + Math.PI * 0.1);

      const finalX = sparkEndX + perpX * zigzag;
      const finalY = sparkEndY + perpY * zigzag;

      if (j === 0) {
        ctx.moveTo(sparkX, sparkY);
      } else {
        ctx.lineTo(finalX, finalY);
      }
    }
    ctx.stroke();
  }

  // 중앙 전기 코어
  ctx.fillStyle = `rgba(255, 255, 255, ${0.8 + Math.sin(time * 3) * 0.2})`;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBurnEffect(worldPos, size, flashIntensity = 0) {
  const screen = worldToScreen(worldPos);
  const radius = size / 2 + 8;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // 화상 플래시 효과 (빨간/주황 빛 오버레이)
  const baseIntensity = Math.sin(Date.now() * 0.015) * 0.2 + 0.4;
  const totalIntensity = Math.min(baseIntensity + flashIntensity * 2, 1.0);

  // 화염 그라디언트
  const gradient = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, radius);
  gradient.addColorStop(0, `rgba(255, 255, 0, ${0.4 * totalIntensity})`); // 노란 중심
  gradient.addColorStop(0.5, `rgba(255, 140, 0, ${0.3 * totalIntensity})`); // 주황
  gradient.addColorStop(1, `rgba(255, 69, 0, ${0.1 * totalIntensity})`); // 빨강 외곽

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
  ctx.fill();

  // 화염 파티클 효과들
  const particleCount = 6;
  const time = Date.now() * 0.008;

  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2 + time;
    const distance = radius * 0.7 + Math.sin(time * 3 + i) * 6;
    const particleX = screen.x + Math.cos(angle) * distance;
    const particleY = screen.y + Math.sin(angle) * distance;

    // 작은 화염 파티클
    const particleSize = 3 + Math.sin(time * 4 + i) * 2;
    const particleAlpha = 0.6 + Math.sin(time * 2 + i) * 0.3;

    ctx.fillStyle = `rgba(255, ${100 + Math.sin(time + i) * 50}, 0, ${particleAlpha * totalIntensity})`;
    ctx.beginPath();
    ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // 중앙 화염 코어
  const coreAlpha = 0.9 + Math.sin(time * 5) * 0.1;
  ctx.fillStyle = `rgba(255, 255, 255, ${coreAlpha * totalIntensity})`;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawSprinkleProjectile(projectile) {
  const screen = worldToScreen(projectile.pos);
  const angle = Math.atan2(projectile.dir.y, projectile.dir.x);
  const sprite = sprites.sprinkle;
  const size = projectile.size || constants.BULLET_SIZE * 1.2;
  const width = size * 0.6;
  const height = size * 1.6;
  const color = projectile.color || '#f5f5f5';

  if (projectile.trail && projectile.trail.length > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const trail of projectile.trail) {
      const lifeRatio = clamp(trail.life / 0.18, 0, 1);
      const trailScreen = worldToScreen(trail.pos);
      const trailSize = width * lifeRatio;
      ctx.fillStyle = hexToRgba(color, 0.35 * lifeRatio + 0.05);
      ctx.beginPath();
      ctx.ellipse(trailScreen.x, trailScreen.y, trailSize, trailSize * 0.6, angle, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.translate(screen.x, screen.y);
  ctx.rotate(angle);

  ctx.fillStyle = color;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.ellipse(-width * 0.1, 0, width * 0.95, height * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.drawImage(sprite, -width / 2, -height / 2, width, height);

  ctx.fillStyle = hexToRgba(color, 0.55);
  ctx.beginPath();
  ctx.ellipse(-width * 0.65, 0, width * 0.6, height * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBulletSprite(bullet) {
  const screen = worldToScreen(bullet.pos);
  const angle = Math.atan2(bullet.dir.y, bullet.dir.x);
  const bulletSprite = bullet.sprite || sprites.bullet;
  let bulletSize = bullet.size || constants.BULLET_SIZE;

  // 타임어택 모드에서는 총알 크기 50% 축소
  bulletSize *= constants.TIME_ATTACK_OBJECT_SCALE;

  const width = bulletSize * 0.9;
  const height = bulletSize * 1.6;

  ctx.save();
  ctx.translate(screen.x, screen.y);
  ctx.rotate(angle);
  ctx.drawImage(bulletSprite, -width / 2, -height / 2, width, height);
  ctx.restore();
}

function drawBossEntity(boss) {
  const screen = worldToScreen(boss.pos);
  let size = constants.BOSS_RADIUS * 3.2;

  // 움직임 효과: 통통 튕기는 애니메이션
  const bounceOffset = Math.sin(state.elapsed * 8) * size * 0.03;
  const squashStretch = 1 + Math.sin(state.elapsed * 8) * 0.05;

  ctx.save();

  // 그림자 효과
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.ellipse(screen.x, screen.y + size * 0.4, size * 0.4, size * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1.0;

  // 보스 본체
  ctx.translate(screen.x, screen.y + bounceOffset);

  // 스프라이트가 위쪽을 향하고 있으므로 90도 오프셋 추가
  const spriteAngleOffset = Math.PI / 2;
  ctx.rotate((boss.facingAngle || 0) + spriteAngleOffset);
  ctx.scale(squashStretch, 1 / squashStretch);

  const bossSprite = (sprites.bossSprites && sprites.bossSprites[boss.bossType])
    ? sprites.bossSprites[boss.bossType]
    : sprites.bossSprites?.default || sprites.boss;
  ctx.drawImage(bossSprite, -size / 2, -size / 2, size, size);
  ctx.restore();

  // 보스 감전 효과 그리기
  if (boss.electrocuted && boss.electrocutionFlash > 0) {
    drawElectrocutionEffect(boss.pos, size);
  }

  // 보스 화상 효과 그리기
  if (boss.burning) {
    drawBurnEffect(boss.pos, size, boss.burnFlash || 0);
  }
}

function drawBossWarning() {
  // 타임어택 모드에서는 보스 출현 알림창으로 표시
  if (state.bossWarningTimer > 0) {
    drawTimeAttackBossWarning(ctx, state, getWorldDims);
  }
  return;

  // 노말 모드: 돌진 경고
  const { halfW, halfH } = getWorldDims();
  const screenX = halfW;
  const screenY = halfH * 0.3;

  // 텍스트 그림자 효과
  ctx.font = "900 64px 'Apple SD Gothic Neo','NanumGothic','Malgun Gothic','Noto Sans KR',sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 검은색 그림자
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillText('돌진!', screenX + 3, screenY + 3);

  // 빨간색 메인 텍스트
  ctx.fillStyle = '#ff0000';
  ctx.fillText('돌진!', screenX, screenY);

  // 흰색 테두리
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeText('돌진!', screenX, screenY);

  // 빨간색 글로우 효과
  ctx.shadowColor = '#ff0000';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#ff4444';
  ctx.fillText('돌진!', screenX, screenY);

  // 그림자 효과 초기화
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

function drawPlayerHPBar() {
  const { halfW, halfH } = getWorldDims();
  const screenX = halfW;
  const screenY = halfH - constants.PLAYER_SIZE / 2 - 20;

  const barWidth = 80;
  const barHeight = 8;
  const bgColor = 'rgba(0, 0, 0, 0.6)';
  const hpColor = '#ff4444';
  const fullColor = '#ff4444';

  const alpha = 1;

  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.fillStyle = bgColor;
  ctx.fillRect(screenX - barWidth / 2, screenY - barHeight / 2, barWidth, barHeight);

  const hpRatio = state.playerHealth / getPlayerMaxHealth();
  const fillWidth = barWidth * hpRatio;

  if (state.playerHealth <= getPlayerMaxHealth() * 0.2) {
    const flash = 0.7 + 0.3 * Math.sin(performance.now() * 0.01);
    ctx.globalAlpha = alpha * flash;
  }

  ctx.fillStyle = hpRatio > 0.5 ? fullColor : hpColor;
  ctx.fillRect(screenX - barWidth / 2, screenY - barHeight / 2, fillWidth, barHeight);

  ctx.restore();
}

function drawMineFlash() {
  const ratio = state.mineFlashTimer / constants.MINE_FLASH_DURATION;
  const mineRadius = timeAttackConstants.TIME_ATTACK_ATTACK_RADIUS;
  const radius = mineRadius * (1 + ratio * 1.5);
  const screen = worldToScreen(state.mine.pos);
  const gradient = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, radius);
  gradient.addColorStop(0, 'rgba(255,200,120,0.6)');
  gradient.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawToothpasteFlash() {
  const ratio = state.toothpasteFlashTimer / constants.TOOTHPASTE_FLASH_DURATION;
  const pickupRadius = timeAttackConstants.TIME_ATTACK_ATTACK_RADIUS;
  const radius = pickupRadius * (1 + ratio * 1.2);
  const screen = worldToScreen(state.playerPos);
  const gradient = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, radius);
  gradient.addColorStop(0, 'rgba(140,220,255,0.45)');
  gradient.addColorStop(1, 'rgba(140,220,255,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawToothpasteItem(item) {
  const screen = worldToScreen(item.pos);
  let glowRadius = 28 + 4 * Math.sin(state.toothpasteGlowPhase);
  let toothpasteSize = 44;

  // 타임어택 모드에서는 치약 아이템 크기 50% 축소
  glowRadius *= constants.TIME_ATTACK_OBJECT_SCALE;
  toothpasteSize *= constants.TIME_ATTACK_OBJECT_SCALE;

  const glowGradient = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, glowRadius);
  glowGradient.addColorStop(0, 'rgba(120, 230, 255, 0.45)');
  glowGradient.addColorStop(1, 'rgba(120, 230, 255, 0)');
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, glowRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(30, 140, 220, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, glowRadius * 0.62, 0, Math.PI * 2);
  ctx.stroke();
  drawSprite(sprites.toothpaste, item.pos, toothpasteSize);
}

function drawLevelBlast() {
  const ratio = state.levelBlastTimer / constants.LEVEL_BLAST_DURATION;
  if (ratio <= 0) return;
  const screen = worldToScreen(state.playerPos);
  const blastRadius = timeAttackConstants.TIME_ATTACK_ATTACK_RADIUS;
  const radius = blastRadius * (0.8 + (1 - ratio) * 0.7);
  const gradient = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, radius);
  gradient.addColorStop(0, `rgba(255, 245, 170, ${0.5 * ratio + 0.3})`);
  gradient.addColorStop(0.55, `rgba(255, 214, 90, ${0.35 * ratio})`);
  gradient.addColorStop(1, 'rgba(255, 180, 0, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(255,220,80,${0.4 * ratio + 0.2})`;
  ctx.lineWidth = 4 * ratio + 2;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawOffScreenToothpasteIndicators() {
  if (!state.toothpasteItems || state.toothpasteItems.length === 0) return;

  const { worldW, worldH } = getWorldDims();
  const margin = 40; // 화면 가장자리 여백
  const indicatorSize = 20; // 화살표 크기

  for (const item of state.toothpasteItems) {
    const screen = worldToScreen(item.pos);

    // 화면 안에 있으면 스킵
    if (screen.x >= margin && screen.x <= worldW - margin &&
        screen.y >= margin && screen.y <= worldH - margin) {
      continue;
    }

    // 플레이어에서 치약으로의 방향 벡터
    const dx = item.pos.x - state.playerPos.x;
    const dy = item.pos.y - state.playerPos.y;
    const angle = Math.atan2(dy, dx);

    // 화면 가장자리에 위치 계산
    let indicatorX = worldW / 2 + dx;
    let indicatorY = worldH / 2 + dy;

    // 화면 가장자리로 클램핑
    const centerX = worldW / 2;
    const centerY = worldH / 2;
    const edgeMargin = 50; // 가장자리에서의 거리

    // 화면 경계에 맞춰 위치 조정
    if (indicatorX < edgeMargin) indicatorX = edgeMargin;
    if (indicatorX > worldW - edgeMargin) indicatorX = worldW - edgeMargin;
    if (indicatorY < edgeMargin) indicatorY = edgeMargin;
    if (indicatorY > worldH - edgeMargin) indicatorY = worldH - edgeMargin;

    // 가장자리로 이동 (방향에 따라)
    const toEdgeX = indicatorX - centerX;
    const toEdgeY = indicatorY - centerY;
    const maxX = centerX - edgeMargin;
    const maxY = centerY - edgeMargin;

    let t = 1.0;
    if (Math.abs(toEdgeX) > 0) {
      t = Math.min(t, maxX / Math.abs(toEdgeX));
    }
    if (Math.abs(toEdgeY) > 0) {
      t = Math.min(t, maxY / Math.abs(toEdgeY));
    }

    indicatorX = centerX + toEdgeX * t;
    indicatorY = centerY + toEdgeY * t;

    // 귀여운 하트 화살표 그리기
    ctx.save();
    ctx.translate(indicatorX, indicatorY);
    ctx.rotate(angle);

    // 펄스 애니메이션
    const pulseScale = 1 + Math.sin(state.toothpasteGlowPhase * 2) * 0.15;
    ctx.scale(pulseScale, pulseScale);

    // 외곽 글로우 효과
    const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, indicatorSize * 1.5);
    glowGradient.addColorStop(0, 'rgba(120, 230, 255, 0.4)');
    glowGradient.addColorStop(1, 'rgba(120, 230, 255, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, indicatorSize * 1.5, 0, Math.PI * 2);
    ctx.fill();

    // 귀여운 하트 모양 화살표
    ctx.fillStyle = '#78E6FF';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';

    ctx.beginPath();
    // 화살촉 (뾰족한 부분)
    ctx.moveTo(indicatorSize, 0);
    // 오른쪽 날개
    ctx.lineTo(indicatorSize * -0.3, indicatorSize * -0.5);
    // 오른쪽 하트 곡선
    ctx.quadraticCurveTo(indicatorSize * -0.6, indicatorSize * -0.8, indicatorSize * -0.8, indicatorSize * -0.5);
    ctx.quadraticCurveTo(indicatorSize * -1.0, indicatorSize * -0.2, indicatorSize * -0.8, 0);
    // 중간 지점
    ctx.lineTo(indicatorSize * -0.5, 0);
    // 왼쪽 하트 곡선
    ctx.lineTo(indicatorSize * -0.8, 0);
    ctx.quadraticCurveTo(indicatorSize * -1.0, indicatorSize * 0.2, indicatorSize * -0.8, indicatorSize * 0.5);
    ctx.quadraticCurveTo(indicatorSize * -0.6, indicatorSize * 0.8, indicatorSize * -0.3, indicatorSize * 0.5);
    // 왼쪽 날개
    ctx.lineTo(indicatorSize, 0);
    ctx.closePath();

    // 그림자 효과
    ctx.shadowColor = 'rgba(120, 230, 255, 0.6)';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.shadowBlur = 0;

    // 하얀 테두리
    ctx.stroke();

    // 반짝이 효과 (작은 별)
    const sparkleOffset = Math.sin(state.toothpasteGlowPhase * 3) * 3;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(indicatorSize * -1.2 + sparkleOffset, indicatorSize * -0.6, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

// calculateTotalScore 함수는 gameState.js에서 import

function updateHud() {
  const totalScore = calculateTotalScore();

  statNickname.textContent = state.nickname || '---';

  // 타임어택 모드일 때는 경과 시간을 표시 (0분→15분)
  statTime.textContent = formatTime(state.elapsed);

  statScore.textContent = totalScore.toString().padStart(5, '0');
  statHP.textContent = `${Math.max(0, state.playerHealth)} / ${getPlayerMaxHealth()}`;
  statLevel.textContent = state.level;

  // Mirror to mobile top HUD if available
  if (mobileHud) {
    if (mobileHP) mobileHP.textContent = `${Math.max(0, state.playerHealth)} / ${getPlayerMaxHealth()}`;
    if (mobileScore) mobileScore.textContent = totalScore.toString().padStart(5, '0');
    if (mobileTime) {
      mobileTime.textContent = formatTime(state.elapsed);
    }
  }


  if (state.boss) {
    statBoss.hidden = false;
    statBossHP.textContent = `HP ${Math.max(0, state.boss.health)} / ${constants.BOSS_HEALTH}`;
  } else {
    statBoss.hidden = true;
  }

  const progress = state.xpToNext > 0 ? clamp(state.xp / state.xpToNext, 0, 1) : 0;
  xpBarFill.style.width = `${progress * 100}%`;
  xpLevelText.textContent = `LV ${state.level}`;
  xpProgressText.textContent = `${state.xp} / ${state.xpToNext}`;
}

function handleKeyDown(event) {
  const { code } = event;

  if (!state.started) {
    if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
      event.preventDefault();
      attemptStart();
    }
    return;
  }

  if (state.selectingUpgrade) {
    if (code === 'Digit1' || code === 'Numpad1') return applyUpgrade(0);
    if (code === 'Digit2' || code === 'Numpad2') return applyUpgrade(1);
    if (code === 'Digit3' || code === 'Numpad3') return applyUpgrade(2);
    if (code === 'Space' || code === 'Enter') return applyUpgrade(0);
  }

  if (code === 'Escape') {
    handleGameOver();
    return;
  }

  keys.add(code);
}

function handleKeyUp(event) {
  keys.delete(event.code);
}

function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTimestamp) / 1000, 0.1);
  lastTimestamp = timestamp;
  update(dt);
  render();
  requestAnimationFrame(gameLoop);
}

function init() {
  ensureChunk(0, 0);
  ensureChunksAroundPlayer();
  recomputePlayerStats();
  requestAnimationFrame(gameLoop);
}


// 캐릭터 선택 기능 초기화
function initCharacterSelection() {
  const characterOptions = document.querySelectorAll('.character-option');
  const characterPreviews = document.querySelectorAll('.character-preview');

  // 캐릭터 미리보기 캔버스에 스프라이트 그리기
  characterPreviews.forEach((canvas, index) => {
    const ctx = canvas.getContext('2d');
    const sprite = index === 0 ? sprites.player : sprites.glazedDonut;
    if (sprite) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 스프라이트를 캔버스 중앙에 적절한 크기로 그리기
      const spriteSize = Math.min(canvas.width, canvas.height) * 0.8; // 캔버스의 80% 크기
      const x = (canvas.width - spriteSize) / 2;
      const y = (canvas.height - spriteSize) / 2;

      ctx.drawImage(sprite, x, y, spriteSize, spriteSize);
    }
  });

  // 캐릭터 옵션 클릭 이벤트
  characterOptions.forEach(option => {
    option.addEventListener('click', () => {
      // 모든 옵션에서 selected 클래스 제거
      characterOptions.forEach(opt => opt.classList.remove('selected'));
      // 클릭된 옵션에 selected 클래스 추가
      option.classList.add('selected');
      // 선택된 캐릭터 상태 업데이트
      state.selectedCharacter = option.dataset.character;
    });
  });
}

// 전역에서 사용할 수 있도록 window 객체에 연결
window.restartGame = restartGame;
window.resetGameplayState = resetGameplayState;
window.state = state;

// 초기화
async function initialize() {
  await initializeDB(); // DB 초기화
  initializeUIElements(); // UI 요소 초기화

  // 이벤트 리스너 설정
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  nicknameInput.addEventListener('input', () => {
    updateStartButtonState();
  });
  nicknameInput.addEventListener('keydown', (event) => {
    if (event.code === 'Enter' || event.code === 'NumpadEnter') {
      event.preventDefault();
      attemptStart();
    }
  });
  startButton.addEventListener('click', attemptStart);

  // 모드 선택은 index.html에서 처리됨

  // 패치 노트 버튼 이벤트 리스너
  const patchNotesButton = document.getElementById('patch-notes-button');
  if (patchNotesButton) {
    patchNotesButton.addEventListener('click', () => {
      const discordLink = 'https://discord.gg/vMSRcupzgb';
      window.open(discordLink, '_blank');
    });
  }

  initCharacterSelection();
  updateStartButtonState();
  nicknameInput.focus();
  init();
}

initialize();
