// 모듈 imports
import * as constants from './constants.js';
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

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// ===== Canvas resize & DPR handling =====
const mediaPortrait = window.matchMedia('(max-width: 820px), (orientation: portrait)');
const BASE_LANDSCAPE = { w: 960, h: 540 };
const BASE_PORTRAIT  = { w: 360, h: 640 };

function sizeCanvasToCss() {
  // 1) CSS로 보이는 크기
  const rect = canvas.getBoundingClientRect();

  // 2) DPR 반영한 실제 비트맵 크기
  const dpr = window.devicePixelRatio || 1;
  const displayW = Math.max(1, Math.round(rect.width  * dpr));
  const displayH = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== displayW || canvas.height !== displayH) {
    canvas.width  = displayW;
    canvas.height = displayH;
  }

  // 3) 컨텍스트를 DPR에 맞추기
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // 4) 게임의 “논리 좌표계”를 세팅(가로/세로 모드별)
  const target = mediaPortrait.matches ? BASE_PORTRAIT : BASE_LANDSCAPE;
  const sx = rect.width  / target.w;
  const sy = rect.height / target.h;
  const s = Math.min(sx, sy); // 균등 스케일로 왜곡 방지
  const offsetX = (rect.width  - target.w * s) * 0.5;
  const offsetY = (rect.height - target.h * s) * 0.5;

  // 렌더 시 참조할 수 있게 전역에 저장
  window.__renderScale = { s, worldW: target.w, worldH: target.h, offsetX, offsetY };
  // Helper: getWorldDims 함수는 전역에서 정의됨
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

  // 도넛 베이스 (꽉 찬 원형)
  const doughGradient = ict.createRadialGradient(center, center, outer * 0.2, center, center, outer);
  doughGradient.addColorStop(0, '#f2d794');
  doughGradient.addColorStop(0.6, '#e8c799');
  doughGradient.addColorStop(1, '#ba9147');
  ict.fillStyle = doughGradient;
  ict.beginPath();
  ict.arc(center, center, outer, 0, Math.PI * 2);
  ict.fill();

  // 흰색 글레이즈 (꽉 찬 원형)
  const glazeGradient = ict.createRadialGradient(center, center, 0, center, center, outer * 0.85);
  glazeGradient.addColorStop(0, '#ffffff');
  glazeGradient.addColorStop(0.8, '#f8f8f8');
  glazeGradient.addColorStop(1, '#e8e8e8');
  ict.fillStyle = glazeGradient;
  ict.beginPath();
  ict.arc(center, center, outer * 0.85, 0, Math.PI * 2);
  ict.fill();

  // 글레이즈 하이라이트 (더 밝은 반짝임)
  ict.fillStyle = 'rgba(255,255,255,0.8)';
  ict.beginPath();
  ict.ellipse(center - outer * 0.25, center - outer * 0.25, outer * 0.35, outer * 0.22, -0.55, 0, Math.PI * 2);
  ict.fill();

  // 작은 하이라이트
  ict.fillStyle = 'rgba(255,255,255,0.6)';
  ict.beginPath();
  ict.ellipse(center + outer * 0.2, center + outer * 0.15, outer * 0.15, outer * 0.1, 0.8, 0, Math.PI * 2);
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

  // 가위 손잡이 부분
  const handleLength = size * 0.25;
  const handleWidth = size * 0.08;
  const bladeLength = size * 0.35;

  // 가위의 금속질감 그라디언트
  const metalGradient = ict.createLinearGradient(-handleLength, -handleLength, handleLength, handleLength);
  metalGradient.addColorStop(0, '#9ca3af');
  metalGradient.addColorStop(0.5, '#d1d5db');
  metalGradient.addColorStop(1, '#6b7280');

  // 위쪽 가위날 (손잡이 포함)
  ict.save();
  ict.rotate(-Math.PI / 6);

  // 손잡이
  ict.fillStyle = '#4b5563';
  ict.strokeStyle = '#374151';
  ict.lineWidth = size * 0.015;
  ict.fillRect(-handleLength, -handleWidth / 2, handleLength * 0.8, handleWidth);
  ict.strokeRect(-handleLength, -handleWidth / 2, handleLength * 0.8, handleWidth);

  // 날 부분
  ict.fillStyle = metalGradient;
  ict.strokeStyle = '#4b5563';
  ict.lineWidth = size * 0.02;
  ict.beginPath();
  ict.moveTo(-handleLength * 0.2, 0);
  ict.lineTo(bladeLength, -handleWidth * 0.3);
  ict.lineTo(bladeLength + size * 0.08, 0);
  ict.lineTo(bladeLength, handleWidth * 0.3);
  ict.closePath();
  ict.fill();
  ict.stroke();

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

  // 아래쪽 가위날 (손잡이 포함)
  ict.save();
  ict.rotate(Math.PI / 6);

  // 손잡이
  ict.fillStyle = '#4b5563';
  ict.strokeStyle = '#374151';
  ict.lineWidth = size * 0.015;
  ict.fillRect(-handleLength, -handleWidth / 2, handleLength * 0.8, handleWidth);
  ict.strokeRect(-handleLength, -handleWidth / 2, handleLength * 0.8, handleWidth);

  // 날 부분
  ict.fillStyle = metalGradient;
  ict.strokeStyle = '#4b5563';
  ict.lineWidth = size * 0.02;
  ict.beginPath();
  ict.moveTo(-handleLength * 0.2, 0);
  ict.lineTo(bladeLength, -handleWidth * 0.3);
  ict.lineTo(bladeLength + size * 0.08, 0);
  ict.lineTo(bladeLength, handleWidth * 0.3);
  ict.closePath();
  ict.fill();
  ict.stroke();

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

  // 중심 연결부 (나사/리벳)
  const centerRadius = size * 0.06;
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


const sprites = {
  player: createDonutSprite(constants.PLAYER_SIZE),
  glazedDonut: createGlazedDonutSprite(constants.PLAYER_SIZE),
  enemy: createBacteriaSprite(constants.ENEMY_SIZE),
  bigEnemy: createBacteriaSpritePurple(constants.BIG_ENEMY_SIZE),
  darkBlueEnemy: createBacteriaSpriteDarkBlue(constants.DARK_BLUE_ENEMY_SIZE),
  boss: createClampBossSprite(constants.BOSS_RADIUS * 2.6),
  blades: constants.GIM_VARIANTS.map((label) => createGimSprite(constants.BLADE_SIZE, label)),
  bullet: createSeaweedSprite(constants.BULLET_SIZE),
  kimBugakBullet: createKimBugakSprite(Math.round(constants.BULLET_SIZE * 2)),
  enemyProjectile: createEnemyProjectileSprite(constants.DARK_BLUE_PROJECTILE_SIZE),
  mine: createMineSprite(constants.MINE_SIZE),
  toothpaste: createToothpasteSprite(48),
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

  if (cx === 0 && cy === 0) {
    baseObstacleTemplates.forEach((tpl, index) => {
      const type = constants.DONUT_TYPES[index % constants.DONUT_TYPES.length];
      obstacles.push(createDonutObstacle(tpl, type));
    });
    return;
  }

  const minX = cx * constants.CHUNK_SIZE;
  const maxX = minX + constants.CHUNK_SIZE;
  const minY = cy * constants.CHUNK_SIZE;
  const maxY = minY + constants.CHUNK_SIZE;

  const count = randInt(4, 9);
  for (let i = 0; i < count; i++) {
    const width = randInt(80, 160);
    const height = randInt(60, 140);
    const xMin = clamp(minX + 40, -constants.WORLD_BOUNDS + 40, constants.WORLD_BOUNDS - width - 40);
    const xMax = clamp(maxX - width - 40, -constants.WORLD_BOUNDS + 40, constants.WORLD_BOUNDS - width - 40);
    const yMin = clamp(minY + 40, -constants.WORLD_BOUNDS + 40, constants.WORLD_BOUNDS - height - 40);
    const yMax = clamp(maxY - height - 40, -constants.WORLD_BOUNDS + 40, constants.WORLD_BOUNDS - height - 40);
    if (xMax <= xMin || yMax <= yMin) continue;
    const x = randInt(xMin, xMax);
    const y = randInt(yMin, yMax);
    obstacles.push(createDonutObstacle({ x, y, w: width, h: height }));
  }
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
  state.started = true;
  state.paused = false;
  state.gameStartTime = performance.now();
  spawnToothpasteAroundPlayer(10);
}

function attemptStart() {
  const trimmed = nicknameInput.value.trim();
  if (!isNicknameValid(trimmed)) {
    showModal('닉네임 오류', '닉네임은 2글자 이상이어야 합니다.', { showRestart: false });
    return;
  }
  state.nickname = trimmed;
  startOverlay.classList.remove('active');
  nicknameInput.blur();
  startGame();
}


const upgradeDescriptions = {
  speed: (next) => `이동 속도 +${next * 12}%`,
  attack_speed: (next) => `공격 간격 -${next * 10}%`,
  multi_shot: (next) => `추가 탄환 +${next}`,
  double_shot: () => '90도 방향 추가 발사',
  blade: (next) => `브랜드의 방부제 김들이 도넛을 지켜줍니다. ${next}개`,
  em_field: () => '가장 가까운 적들을 연쇄로 공격하는 슈크림이 발사됩니다. (3연쇄)',
  ganjang_gim: () => '간장에 조려진 김 발사: 탄환 1회 관통(최대 두 마리 적 처치)',
  kim_bugak: () => '기본발사가 김부각으로 변경됩니다. 크기가 조금 더 커지고 장애물을 통과할 수 있습니다.',
  full_heal: () => '현재 라이프를 모두 회복',
};

function rollUpgradeCards() {
  // 기본 풀: 특별 스킬들은 평소엔 제외하고 최대치 달성한 스킬도 제외
  const pool = Object.entries(constants.UPGRADE_DEFINITIONS)
    .filter(([key, def]) =>
      key !== 'ganjang_gim' &&
      key !== 'kim_bugak' &&
      state.upgradeLevels[key] < def.max
    )
    .map(([key]) => key);
  if (pool.length === 0) return [];
  const shuffled = pool.sort(() => Math.random() - 0.5);
  const cards = shuffled.slice(0, 3).map((key) => ({ key }));

  // 5% 확률로 간장김 카드 주입 (아직 못 얻었을 때만)
  if (!state.hasGanjangGim && state.upgradeLevels.ganjang_gim === 0 && Math.random() < 0.05) {
    const replaceIndex = Math.floor(Math.random() * cards.length);
    cards[replaceIndex] = { key: 'ganjang_gim' };
  }

  // 5% 확률로 김부각 카드 주입 (아직 못 얻었을 때만)
  if (!state.hasKimBugak && state.upgradeLevels.kim_bugak === 0 && Math.random() < 0.02) {
    const replaceIndex = Math.floor(Math.random() * cards.length);
    cards[replaceIndex] = { key: 'kim_bugak' };
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
  upgradeCardsWrapper.innerHTML = '';
  state.upgradeChoices.forEach(({ key }, index) => {
    const def = constants.UPGRADE_DEFINITIONS[key];
    const current = state.upgradeLevels[key];
    const next = current + 1;
    const card = document.createElement('div');
    card.className = 'upgrade-card';
    card.dataset.index = String(index);
    const titleStyle = (key === 'ganjang_gim' || key === 'kim_bugak') ? 'style="color: #4ade80;"' : '';
    card.innerHTML = `
      <div class="card-title" ${titleStyle}>${def.title}</div>
      <div class="card-level">Lv.${next} / ${def.max}</div>
      <div class="card-desc">${(upgradeDescriptions[key] || (() => '효과 없음'))(next)}</div>
      <div class="card-hint">선택키: ${index + 1}</div>
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
      state.playerHealth = constants.PLAYER_MAX_HEALTH;
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

function recomputePlayerStats() {
  currentPlayerSpeed = constants.PLAYER_SPEED * (1 + 0.12 * state.upgradeLevels.speed);
  currentFireInterval = Math.max(0.08, constants.PLAYER_FIRE_INTERVAL * Math.pow(0.9, state.upgradeLevels.attack_speed));
  bulletCount = 1 + state.upgradeLevels.multi_shot;

  // 공속 업그레이드가 블레이드 회전속도에도 영향
  currentBladeRotationSpeed = constants.BLADE_ROTATION_SPEED * (1 + 0.3 * state.upgradeLevels.attack_speed);

  // 공속 업그레이드가 슈크림 발사 간격에도 영향
  currentEmInterval = Math.max(
    constants.EM_FIELD_MIN_INTERVAL,
    constants.EM_FIELD_BASE_INTERVAL * Math.pow(0.85, state.upgradeLevels.attack_speed)
  );
}

function addKillRewardsRaw(count) {
  if (count <= 0) return;
  state.score += 10 * count;
  state.xp += constants.XP_PER_KILL * count;
}

function triggerLevelBlast() {
  const radiusSq = constants.LEVEL_BLAST_RADIUS * constants.LEVEL_BLAST_RADIUS;
  let removed = 0;
  const survivors = [];
  for (const enemy of state.enemies) {
    const distSq = vectorLengthSq(vectorSub(enemy.pos, state.playerPos));
    if (distSq <= radiusSq) {
      removed += 1;
      onEnemyRemoved(enemy);
    } else {
      survivors.push(enemy);
    }
  }
  state.enemies = survivors;
  state.levelBlastTimer = constants.LEVEL_BLAST_DURATION;
  if (removed > 0) {
    addKillRewardsRaw(removed);
  }
  return removed;
}

function spawnToothpasteItem(distanceMin = constants.TOOTHPASTE_DROP_MIN_DISTANCE, distanceMax = constants.TOOTHPASTE_DROP_DISTANCE) {
  const attempts = 18;
  for (let i = 0; i < attempts; i++) {
    const angle = randRange(0, Math.PI * 2);
    const distance = distanceMin + Math.random() * (distanceMax - distanceMin);
    const pos = vector(
      state.playerPos.x + Math.cos(angle) * distance,
      state.playerPos.y + Math.sin(angle) * distance,
    );
    if (Math.abs(pos.x) > constants.WORLD_BOUNDS - 40 || Math.abs(pos.y) > constants.WORLD_BOUNDS - 40) continue;
    if (!collidesWithObstacles(pos.x, pos.y, constants.PLAYER_SIZE)) {
      state.toothpasteItems.push({ pos });
      return true;
    }
  }
  return false;
}

function spawnToothpasteAroundPlayer(count) {
  let placed = 0;
  const maxAttempts = count * 8;
  let attempts = 0;
  while (placed < count && attempts < maxAttempts) {
    if (spawnToothpasteItem(40, constants.TOOTHPASTE_DROP_DISTANCE)) placed += 1;
    attempts += 1;
  }
}

function tryDropToothpaste() {
  if (Math.random() >= constants.TOOTHPASTE_DROP_CHANCE) {
    state.toothpasteTimer = constants.TOOTHPASTE_DROP_INTERVAL;
    return;
  }
  spawnToothpasteItem();
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
  for (const enemy of state.enemies) {
    if (idsToRemove.has(enemy.id)) {
      onEnemyRemoved(enemy);
    } else {
      survivors.push(enemy);
    }
  }
  state.enemies = survivors;
  addKillRewardsRaw(idsToRemove.size);
  processLevelUps();
  resolvePendingLevelBlast();
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
  while (state.xp >= state.xpToNext && !state.selectingUpgrade) {
    state.xp -= state.xpToNext;
    state.level += 1;
    state.xpToNext = xpRequired(state.level);
    state.pendingLevelBlast = (state.pendingLevelBlast || 0) + 1;
    openUpgradeSelection();
    if (state.selectingUpgrade) break;
  }
  setProcessingLevelChain(false);
  if (!state.selectingUpgrade) {
    resolvePendingLevelBlast();
  }
}

function grantKillReward(count = 1) {
  if (count <= 0) return;
  addKillRewardsRaw(count);
  processLevelUps();
  resolvePendingLevelBlast();
}

function onEnemyRemoved(enemy) {
  if (enemy && state.lastEnemyTargetId === enemy.id) {
    state.lastEnemyTargetId = null;
  }
}

function detonateMine() {
  if (!state.mine.active) return;
  const defeated = state.enemies.length;
  state.mine.active = false;
  state.mineFlashTimer = constants.MINE_FLASH_DURATION;
  if (defeated) {
    grantKillReward(defeated);
  }
  state.enemies.length = 0;
  state.lastEnemyTargetId = null;
  if (state.boss) {
    state.boss.health = 0;
    state.boss = null;
    state.bossWarningTimer = 0;
    handleVictory();
  }
}

function spawnEnemy() {
  // default small enemy
  const angle = randRange(0, Math.PI * 2);
  const radius = randRange(constants.SPAWN_RADIUS_MIN, constants.SPAWN_RADIUS_MAX);
  const pos = vector(
    state.playerPos.x + Math.cos(angle) * radius,
    state.playerPos.y + Math.sin(angle) * radius,
  );
  const speed = constants.ENEMY_BASE_SPEED + state.elapsed * constants.ENEMY_SPEED_SCALE * constants.ENEMY_BASE_SPEED;
  state.enemies.push({ id: enemyIdCounter++, pos, speed, health: 1, size: constants.ENEMY_SIZE, sprite: sprites.enemy });
}

function spawnDarkBlueEnemy() {
  let pos;
  let attempts = 0;
  const maxAttempts = 20;

  // 장애물이 없는 위치를 찾을 때까지 반복
  do {
    const angle = randRange(0, Math.PI * 2);
    const radius = randRange(constants.SPAWN_RADIUS_MIN, constants.SPAWN_RADIUS_MAX);
    pos = vector(
      state.playerPos.x + Math.cos(angle) * radius,
      state.playerPos.y + Math.sin(angle) * radius,
    );
    attempts++;
  } while (collidesWithObstacles(pos.x, pos.y, constants.DARK_BLUE_ENEMY_SIZE) && attempts < maxAttempts);

  // 최대 시도 횟수를 초과하면 기본 위치 사용 (장애물과 겹치더라도)
  if (attempts >= maxAttempts) {
    const angle = randRange(0, Math.PI * 2);
    const radius = constants.SPAWN_RADIUS_MAX;
    pos = vector(
      state.playerPos.x + Math.cos(angle) * radius,
      state.playerPos.y + Math.sin(angle) * radius,
    );
  }

  const speed = constants.DARK_BLUE_ENEMY_SPEED + state.elapsed * constants.ENEMY_SPEED_SCALE * constants.DARK_BLUE_ENEMY_SPEED;
  state.enemies.push({
    id: enemyIdCounter++,
    pos,
    speed,
    health: constants.DARK_BLUE_ENEMY_HEALTH,
    size: constants.DARK_BLUE_ENEMY_SIZE,
    sprite: sprites.darkBlueEnemy,
    fireTimer: randRange(0, constants.DARK_BLUE_ENEMY_FIRE_INTERVAL),
    type: 'darkBlue'
  });
}

function spawnBigEnemy() {
  const angle = randRange(0, Math.PI * 2);
  const radius = randRange(constants.SPAWN_RADIUS_MIN, constants.SPAWN_RADIUS_MAX);
  const pos = vector(
    state.playerPos.x + Math.cos(angle) * radius,
    state.playerPos.y + Math.sin(angle) * radius,
  );
  const speed = constants.BIG_ENEMY_SPEED + state.elapsed * constants.ENEMY_SPEED_SCALE * constants.BIG_ENEMY_SPEED;
  state.enemies.push({ id: enemyIdCounter++, pos, speed, health: constants.BIG_ENEMY_HEALTH, size: constants.BIG_ENEMY_SIZE, sprite: sprites.bigEnemy });
}

function spawnBoss() {
  const angle = randRange(0, Math.PI * 2);
  const distance = 600;
  const bossPos = vector(
    state.playerPos.x + Math.cos(angle) * distance,
    state.playerPos.y + Math.sin(angle) * distance,
  );
  state.boss = {
    pos: bossPos,
    health: constants.BOSS_HEALTH,
    state: 'idle',
    direction: vector(0, 0),
    attackTarget: vectorCopy(bossPos),
    attackTimer: constants.BOSS_ATTACK_INTERVAL,
    windupTimer: 0,
    facingAngle: 0,
  };
  state.enemies.length = 0;
}

function updateBoss(dt) {
  const boss = state.boss;
  if (!boss) return;
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
  pos.x = clamp(pos.x, -constants.WORLD_BOUNDS, constants.WORLD_BOUNDS);
  pos.y = clamp(pos.y, -constants.WORLD_BOUNDS, constants.WORLD_BOUNDS);
}

function moveWithCollision(position, movement, colliderSize) {
  const newPos = vectorCopy(position);
  if (movement.x !== 0) {
    newPos.x += movement.x;
    if (collidesWithObstacles(newPos.x, position.y, colliderSize)) {
      newPos.x -= movement.x;
    }
  }
  if (movement.y !== 0) {
    newPos.y += movement.y;
    if (collidesWithObstacles(newPos.x, newPos.y, colliderSize)) {
      newPos.y -= movement.y;
    }
  }
  return newPos;
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
    const rect = canvas.getBoundingClientRect();
    const canvasHeight = rect.height;
    const touchY = t.clientY - rect.top;

    // Only activate joystick if touch is in bottom half of screen
    if (touchY > canvasHeight * 0.5) {
      start(t.clientX, t.clientY);
      e.preventDefault();
    }
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

  state.playerInvuln = Math.max(0, state.playerInvuln - dt);
  state.mineFlashTimer = Math.max(0, state.mineFlashTimer - dt);
  state.levelBlastTimer = Math.max(0, state.levelBlastTimer - dt);
  state.toothpasteFlashTimer = Math.max(0, state.toothpasteFlashTimer - dt);
  state.toothpasteGlowPhase = (state.toothpasteGlowPhase + dt * 4) % (Math.PI * 2);
  state.hpBarTimer = Math.max(0, state.hpBarTimer - dt);
  if (state.bossWarningTimer > 0) {
    state.bossWarningTimer = Math.max(0, state.bossWarningTimer - dt);
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

  if (!state.boss && !state.victory && state.elapsed >= constants.BOSS_SPAWN_TIME) {
    spawnBoss();
  }

  if (!activePlay) return;

  state.fireTimer -= dt;
  state.spawnTimer -= dt;
  if (state.emFieldCount > 0) {
    state.emCooldown -= dt;
  }
  state.toothpasteTimer -= dt;
  if (state.toothpasteTimer <= 0) {
    tryDropToothpaste();
  }

  handleMovement(dt);
  handleShooting(dt);
  handleBullets(dt);
  handleEnemies(dt);
  handleEnemyProjectiles(dt);
  if (state.boss) {
    updateBoss(dt);
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
  state.playerPos = moveWithCollision(state.playerPos, move, constants.PLAYER_SIZE);
  clampWorldPosition(state.playerPos);
  ensureChunksAroundPlayer();

  if (state.mine.active) {
    const distSq = vectorLengthSq(vectorSub(state.playerPos, state.mine.pos));
    if (distSq <= constants.MINE_TRIGGER_RADIUS * constants.MINE_TRIGGER_RADIUS) detonateMine();
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
  if (state.spawnTimer <= 0) {
    if (!state.boss) {
      const batch = 1 + Math.floor(state.elapsed / 30);
      for (let i = 0; i < batch; i++) {
        // 테스트용: 남색 세균을 시작부터 등장 (30% 확률)
        if(state.stage >= 2 && Math.random() < 0.3) {
          spawnDarkBlueEnemy();
        } else if (state.elapsed >= constants.BIG_ENEMY_SPAWN_TIME && Math.random() < constants.BIG_ENEMY_SPAWN_CHANCE) {
          spawnBigEnemy();
        } else {
          spawnEnemy();
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
    state.bladeAngle = (state.bladeAngle + dt * currentBladeRotationSpeed) % tau;
    const step = tau / bladeCount;
    for (let i = 0; i < bladeCount; i++) {
      const angle = state.bladeAngle + i * step;
      const offset = vector(Math.cos(angle) * constants.BLADE_RADIUS, Math.sin(angle) * constants.BLADE_RADIUS);
      state.blades.push({
        pos: vectorAdd(state.playerPos, offset),
        spriteIndex: Math.min(i, sprites.blades.length - 1),
      });
    }
  }
}

function rotate90(vec) {
  return vector(-vec.y, vec.x);
}

function spawnProjectile(direction) {
  const norm = vectorNormalize(direction);
  if (vectorLengthSq(norm) === 0) return;
  const bulletSize = state.hasKimBugak ? Math.round(constants.BULLET_SIZE * 2) : constants.BULLET_SIZE;
  const bulletSprite = state.hasKimBugak ? sprites.kimBugakBullet : sprites.bullet;

  state.bullets.push({
    pos: vectorCopy(state.playerPos),
    dir: norm,
    lifetime: constants.BULLET_LIFETIME,
    pierce: state.hasGanjangGim ? 1 : 0,
    penetratesObstacles: state.hasKimBugak,
    size: bulletSize,
    sprite: bulletSprite
  });
}

function handleShooting(dt) {
  if (state.enemies.length === 0) {
    state.lastEnemyTargetId = null;
  }

  let targetInfo = null;

  if (state.enemies.length > 0) {
    const sorted = [...state.enemies].sort((a, b) => {
      const da = vectorLengthSq(vectorSub(a.pos, state.playerPos));
      const db = vectorLengthSq(vectorSub(b.pos, state.playerPos));
      return da - db;
    });
    let chosen = sorted.find((enemy) => enemy.id !== state.lastEnemyTargetId);
    if (!chosen) {
      chosen = sorted[0];
    }
    const dir = vectorNormalize(vectorSub(chosen.pos, state.playerPos));
    targetInfo = { type: 'enemy', target: chosen, direction: dir };
  } else if (state.boss) {
    const dir = vectorNormalize(vectorSub(state.boss.pos, state.playerPos));
    targetInfo = { type: 'boss', target: state.boss, direction: dir };
  }

  if (!targetInfo) {
    state.autoAimAngle = (state.autoAimAngle + dt * 120) % 360;
    const radians = (state.autoAimAngle * Math.PI) / 180;
    const sweepDir = vector(Math.cos(radians), Math.sin(radians));
    targetInfo = { type: 'sweep', target: null, direction: sweepDir };
  }

  const targetDir = targetInfo.direction;
  if (!targetDir) return;

  if (state.fireTimer <= 0) {
    const baseAngle = Math.atan2(targetDir.y, targetDir.x);
    const spreadStep = (Math.PI / 180) * 8;
    const baseDirections = [];
    for (let i = 0; i < bulletCount; i++) {
      if (bulletCount === 1) {
        baseDirections.push(targetDir);
      } else {
        const offset = i - (bulletCount - 1) / 2;
        const angle = baseAngle + offset * spreadStep;
        baseDirections.push(vector(Math.cos(angle), Math.sin(angle)));
      }
    }

    const doubleShotLevel = state.upgradeLevels.double_shot;
    for (const dir of baseDirections) {
      const baseAngle = Math.atan2(dir.y, dir.x);

      if (doubleShotLevel <= 0) {
        // 기본 한 발
        spawnProjectile(dir);
        continue;
      }

      // 레벨 N => N+1 발
      const count = doubleShotLevel + 1;

      // 각도 간격: 레벨1은 180°, 그 이상은 360°/count
      const step = (count === 2) ? Math.PI : (Math.PI * 2) / count;

      for (let i = 0; i < count; i++) {
        const angle = baseAngle + i * step;
        const vx = Math.cos(angle);
        const vy = Math.sin(angle);
        spawnProjectile(vector(vx, vy));
      }
    }

    state.fireTimer = currentFireInterval;
    if (targetInfo.type === 'enemy' && targetInfo.target) {
      state.lastEnemyTargetId = targetInfo.target.id;
    } else if (targetInfo.type === 'boss') {
      state.lastEnemyTargetId = null;
    } else if (targetInfo.type === 'sweep') {
      state.lastEnemyTargetId = null;
    }
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
          state.enemies.splice(i, 1);
          onEnemyRemoved(enemy);
          grantKillReward();
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
          state.boss = null;
          state.bossWarningTimer = 0;
          handleVictory();
        }
        if (bullet.pierce && bullet.pierce > 0) {
          bullet.pierce -= 1;   // 관통 소모 후 계속 진행
        } else {
          continue;             // 관통 없으면 소멸
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
          // EM 필드도 1 데미지
          enemy.health = (enemy.health || 1) - 1;
          if (enemy.health <= 0) {
            state.enemies.splice(idx, 1);
            onEnemyRemoved(enemy);
            grantKillReward();
          }
        }
        targetPos = vectorCopy(enemy.pos);
      } else {
        const boss = state.boss;
        if (boss) {
          boss.health -= 1;
          state.score += constants.BOSS_HIT_SCORE;
          if (boss.health <= 0) {
            state.boss = null;
            state.bossWarningTimer = 0;
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

function handleEnemies(dt) {
  const nextEnemies = [];
  for (const enemy of state.enemies) {
    const direction = vectorNormalize(vectorSub(state.playerPos, enemy.pos));
    enemy.pos = moveWithCollision(enemy.pos, vectorScale(direction, enemy.speed * dt), enemy.size || constants.ENEMY_SIZE);
    clampWorldPosition(enemy.pos);

    // 남색 세균의 발사 로직
    if (enemy.type === 'darkBlue') {
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
    for (const blade of state.blades) {
      if (circleIntersects(enemy.pos, (enemy.size || constants.ENEMY_SIZE) / 2, blade.pos, constants.BLADE_SIZE / 2)) {
        enemy.health = (enemy.health || 1) - 1; // 블레이드도 1 데미지
        if (enemy.health <= 0) {
          grantKillReward();
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
    if (Math.abs(projectile.pos.x) > constants.WORLD_BOUNDS || Math.abs(projectile.pos.y) > constants.WORLD_BOUNDS) {
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
      if (state.playerHealth <= 0) {
        handleGameOver();
      }
    }

    if (!state.gameOver && state.blades.length > 0) {
      const id = 'boss';
      if (!state.bladeCooldowns.has(id)) {
        for (const blade of state.blades) {
          if (circleIntersects(state.boss.pos, constants.BOSS_RADIUS, blade.pos, constants.BLADE_SIZE / 2)) {
            state.boss.health -= 1;
            state.score += constants.BOSS_HIT_SCORE;
            state.bladeCooldowns.set(id, constants.BLADE_HIT_COOLDOWN);
            if (state.boss.health <= 0) {
              state.boss = null;
              state.victory = true;
              state.bossWarningTimer = 0;
              handleVictory();
            }
            break;
          }
        }
      }
    }
  }
}

function getWorldDims() {
  const worldW = (window.__renderScale && window.__renderScale.worldW) || constants.WIDTH;
  const worldH = (window.__renderScale && window.__renderScale.worldH) || constants.HEIGHT;
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
  ctx.save();
  // Clear the full canvas (DPR-aware)
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = constants.BACKGROUND_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  //균등 스케일 + 중앙 정렬 적용
  if (window.__renderScale) {
    const { s, offsetX, offsetY } = window.__renderScale;
    ctx.translate(offsetX, offsetY);
    ctx.scale(s, s);
  }


  drawBackground();
  drawObstacles();
  drawWorldBounds();

  if (state.mine.active) {
    drawSprite(sprites.mine, state.mine.pos, constants.MINE_SIZE);
  }
  if (state.toothpasteItems.length > 0) {
    for (const item of state.toothpasteItems) {
      drawToothpasteItem(item);
    }
  }

  for (const enemy of state.enemies) {
    const spr = enemy.sprite || sprites.enemy;
    const sz = enemy.size || constants.ENEMY_SIZE;
    drawSprite(spr, enemy.pos, sz);
  }

  if (state.boss) {
    drawBossEntity(state.boss);
  }

  for (const effect of state.emEffects) {
    drawEmEffect(effect);
  }

  for (const bullet of state.bullets) {
    drawBulletSprite(bullet);
  }

  // 적 발사체 그리기
  for (const projectile of state.enemyProjectiles) {
    drawSprite(sprites.enemyProjectile, projectile.pos, projectile.size);
  }

  if (state.blades.length > 0) {
    for (const blade of state.blades) {
      const sprite = sprites.blades[blade.spriteIndex] || sprites.blades[sprites.blades.length - 1];
      drawSprite(sprite, blade.pos, constants.BLADE_SIZE);
    }
  }

  drawPlayer();

  if (state.boss && state.bossWarningTimer > 0) {
    drawBossWarning();
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
  drawPlayerHPBar();

  ctx.restore();

  updateHud();
}

function drawBackground() {
  const { worldW, worldH, halfW, halfH } = getWorldDims();

  // ===== Stainless (silver) base =====
  // Subtle radial/linear blend to mimic brushed metal
  const centerX = halfW;
  const centerY = halfH * 0.9; // slightly lower center for vignette feel

  // Base fill
  const baseGrad = ctx.createRadialGradient(centerX, centerY, Math.min(halfW, halfH) * 0.15, centerX, centerY, Math.max(worldW, worldH) * 0.7);
  baseGrad.addColorStop(0.0, '#f3f5f7');  // bright center
  baseGrad.addColorStop(0.45, '#e6eaee');
  baseGrad.addColorStop(1.0, '#d6dbe2');  // outer rim
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, worldW, worldH);

  // very soft vertical sheen
  const sheen = ctx.createLinearGradient(0, 0, worldW, 0);
  sheen.addColorStop(0.0, 'rgba(255,255,255,0.08)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0.02)');
  sheen.addColorStop(1.0, 'rgba(255,255,255,0.08)');
  ctx.fillStyle = sheen;
  ctx.globalAlpha = 1;
  ctx.fillRect(0, 0, worldW, worldH);

  // ===== Silver grid =====
  const tile = 180;
  const offsetX = state.playerPos.x % tile;
  const offsetY = state.playerPos.y % tile;

  ctx.lineWidth = 1;

  // light inner strokes
  ctx.strokeStyle = constants.GRID_COLOR; // '#c6ccd4'
  for (let x = -tile - offsetX; x < worldW; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x + halfW, 0);
    ctx.lineTo(x + halfW, worldH);
    ctx.stroke();
  }
  for (let y = -tile - offsetY; y < worldH; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y + halfH);
    ctx.lineTo(worldW, y + halfH);
    ctx.stroke();
  }

  // soft highlight on grid intersections (subtle)
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.globalAlpha = 0.35;
  for (let x = -tile - offsetX; x < worldW; x += tile) {
    ctx.beginPath();
    ctx.moveTo(x + halfW + 0.5, 0);
    ctx.lineTo(x + halfW + 0.5, worldH);
    ctx.stroke();
  }
  for (let y = -tile - offsetY; y < worldH; y += tile) {
    ctx.beginPath();
    ctx.moveTo(0, y + halfH + 0.5);
    ctx.lineTo(worldW, y + halfH + 0.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawObstacles() {
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
  const corners = [
    vector(-constants.WORLD_BOUNDS, -constants.WORLD_BOUNDS),
    vector(constants.WORLD_BOUNDS, -constants.WORLD_BOUNDS),
    vector(constants.WORLD_BOUNDS, constants.WORLD_BOUNDS),
    vector(-constants.WORLD_BOUNDS, constants.WORLD_BOUNDS),
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

function drawPlayer() {
  const { halfW, halfH } = getWorldDims();
  const screenX = halfW;
  const screenY = halfH;

  // 선택된 캐릭터에 따라 스프라이트 선택
  const playerSprite = state.selectedCharacter === 'glazed_ring' ? sprites.glazedDonut : sprites.player;

  if (state.playerInvuln > 0) {
    const alpha = 0.5 + 0.5 * Math.sin(performance.now() * 0.005);
    ctx.globalAlpha = clamp(alpha, 0.2, 1);
    ctx.drawImage(playerSprite, screenX - constants.PLAYER_SIZE / 2, screenY - constants.PLAYER_SIZE / 2, constants.PLAYER_SIZE, constants.PLAYER_SIZE);
    ctx.globalAlpha = 1;
  } else if (state.playerHealth <= 2) {
    const alpha = 0.3 + 0.7 * Math.sin(performance.now() * 0.008);
    ctx.globalAlpha = clamp(alpha, 0.3, 1);
    ctx.drawImage(playerSprite, screenX - constants.PLAYER_SIZE / 2, screenY - constants.PLAYER_SIZE / 2, constants.PLAYER_SIZE, constants.PLAYER_SIZE);
    ctx.globalAlpha = 1;
  } else {
    ctx.drawImage(playerSprite, screenX - constants.PLAYER_SIZE / 2, screenY - constants.PLAYER_SIZE / 2, constants.PLAYER_SIZE, constants.PLAYER_SIZE);
  }
}

function drawEmEffect(effect) {
  // 슈크림 색상(크림빛)으로 부드러운 광선 효과
  const a = worldToScreen(effect.start);
  const b = worldToScreen(effect.end);
  const lifeRatio = clamp(effect.timer / constants.EM_EFFECT_LIFETIME, 0, 1);
  const alpha = 0.25 + 0.75 * lifeRatio; // 생성 직후 더 밝고, 사라질수록 어둡게

  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // 밝은 노란색 그라디언트
  const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
  grad.addColorStop(0, `rgba(255, 255, 0, ${0.85 * alpha})`);
  grad.addColorStop(1, `rgba(255, 215, 0, ${0.95 * alpha})`);
  ctx.strokeStyle = grad;

  // 메인 스트로크
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();

  // 외곽 글로우
  ctx.globalAlpha = 0.20 * alpha;
  ctx.lineWidth = 12;
  ctx.stroke();

  // 소프트 오라
  ctx.globalAlpha = 0.08 * alpha;
  ctx.lineWidth = 24;
  ctx.stroke();

  ctx.restore();
}

function drawBulletSprite(bullet) {
  const screen = worldToScreen(bullet.pos);
  const angle = Math.atan2(bullet.dir.y, bullet.dir.x);
  const bulletSprite = bullet.sprite || sprites.bullet;
  const bulletSize = bullet.size || constants.BULLET_SIZE;
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
  const size = constants.BOSS_RADIUS * 2.4;
  ctx.save();
  ctx.translate(screen.x, screen.y);
  ctx.rotate(boss.facingAngle || 0);
  ctx.drawImage(sprites.boss, -size / 2, -size / 2, size, size);
  ctx.restore();
}

function drawBossWarning() {
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
  if (state.hpBarTimer <= 0) return;

  const { halfW, halfH } = getWorldDims();
  const screenX = halfW;
  const screenY = halfH - constants.PLAYER_SIZE / 2 - 20;

  const barWidth = 80;
  const barHeight = 8;
  const bgColor = 'rgba(0, 0, 0, 0.6)';
  const hpColor = '#ff4444';
  const fullColor = '#ff4444';

  const alpha = Math.min(1, state.hpBarTimer);

  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.fillStyle = bgColor;
  ctx.fillRect(screenX - barWidth / 2, screenY - barHeight / 2, barWidth, barHeight);

  const hpRatio = state.playerHealth / constants.PLAYER_MAX_HEALTH;
  const fillWidth = barWidth * hpRatio;

  if (state.playerHealth <= 2) {
    const flash = 0.7 + 0.3 * Math.sin(performance.now() * 0.01);
    ctx.globalAlpha = alpha * flash;
  }

  ctx.fillStyle = hpRatio > 0.5 ? fullColor : hpColor;
  ctx.fillRect(screenX - barWidth / 2, screenY - barHeight / 2, fillWidth, barHeight);

  ctx.restore();
}

function drawMineFlash() {
  const ratio = state.mineFlashTimer / constants.MINE_FLASH_DURATION;
  const radius = constants.MINE_TRIGGER_RADIUS * (1 + ratio * 1.5);
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
  const radius = constants.TOOTHPASTE_PICKUP_RADIUS * (1 + ratio * 1.2);
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
  const glowRadius = 28 + 4 * Math.sin(state.toothpasteGlowPhase);
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
  drawSprite(sprites.toothpaste, item.pos, 44);
}

function drawLevelBlast() {
  const ratio = state.levelBlastTimer / constants.LEVEL_BLAST_DURATION;
  if (ratio <= 0) return;
  const screen = worldToScreen(state.playerPos);
  const radius = constants.LEVEL_BLAST_RADIUS * (0.8 + (1 - ratio) * 0.7);
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

// calculateTotalScore 함수는 gameState.js에서 import

function updateHud() {
  const totalScore = calculateTotalScore();

  statNickname.textContent = state.nickname || '---';
  statTime.textContent = formatTime(state.elapsed);
  statScore.textContent = totalScore.toString().padStart(5, '0');
  statHP.textContent = `${Math.max(0, state.playerHealth)} / ${constants.PLAYER_MAX_HEALTH}`;
  statLevel.textContent = state.level;

  // Mirror to mobile top HUD if available
  if (mobileHud) {
    if (mobileHP) mobileHP.textContent = `${Math.max(0, state.playerHealth)} / ${constants.PLAYER_MAX_HEALTH}`;
    if (mobileScore) mobileScore.textContent = totalScore.toString().padStart(5, '0');
    if (mobileTime) mobileTime.textContent = formatTime(state.elapsed);
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

  initCharacterSelection();
  updateStartButtonState();
  nicknameInput.focus();
  init();
}

initialize();
