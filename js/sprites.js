// Sprite creation functions
import { PLAYER_SIZE, ENEMY_SIZE, BIG_ENEMY_SIZE, BOSS_RADIUS, BLADE_SIZE, BULLET_SIZE, MINE_SIZE, GIM_VARIANTS } from './constants.js';
import { roundRect } from './utils.js';

// Donut styles configuration
export const DONUT_STYLES = {
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
    doughOuter: '#c4a373',
    icingColor: 'transparent',
    icingRadius: 0,
    holeRadius: 0,
    fillingColor: '#f4e6d1',
    sprinkleColors: ['#8ad4ff', '#ff8daa'],
  },
  glazed_ring: {
    doughInner: '#e8c799',
    doughOuter: '#ba9147',
    icingColor: '#ffffff',
    icingHighlight: 'rgba(255,255,255,0.9)',
    icingRadius: 0.88,
    holeRadius: 0.38,
    holeColor: '#241306',
    sprinkleColors: [],
  },
  signature_knotted: {
    doughInner: '#ddbf85',
    doughOuter: '#b59954',
    icingColor: '#ffcc5c',
    icingHighlight: 'rgba(255,255,255,0.32)',
    icingRadius: 0.94,
    holeRadius: 0.15,
    holeColor: '#241306',
    sprinkleColors: ['#ff6b35', '#f7931e'],
  },
};

export function createDonutSprite(size) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ict = off.getContext('2d');
  const center = size / 2;
  const radius = center - 2;
  const style = DONUT_STYLES.signature_knotted;

  // Main dough with gradient
  const doughGradient = ict.createRadialGradient(center, center, radius * 0.3, center, center, radius);
  doughGradient.addColorStop(0, style.doughInner);
  doughGradient.addColorStop(1, style.doughOuter);

  ict.fillStyle = doughGradient;
  ict.beginPath();
  ict.arc(center, center, radius, 0, Math.PI * 2);
  ict.fill();

  // Hole filled with yellow choux cream
  if (style.holeRadius > 0) {
    // 노란색 슈크림으로 구멍 채우기
    const creamGradient = ict.createRadialGradient(
      center, center, 0,
      center, center, radius * style.holeRadius
    );
    creamGradient.addColorStop(0, '#fff2a6');
    creamGradient.addColorStop(0.7, '#ffeb3b');
    creamGradient.addColorStop(1, '#ffd600');

    ict.fillStyle = creamGradient;
    ict.beginPath();
    ict.arc(center, center, radius * style.holeRadius, 0, Math.PI * 2);
    ict.fill();

    // 슈크림 하이라이트
    ict.fillStyle = 'rgba(255,255,255,0.4)';
    ict.beginPath();
    ict.arc(center - radius * style.holeRadius * 0.3, center - radius * style.holeRadius * 0.3, radius * style.holeRadius * 0.4, 0, Math.PI * 2);
    ict.fill();
  }

  // Icing
  if (style.icingRadius > 0 && style.icingColor !== 'transparent') {
    ict.fillStyle = style.icingColor;
    ict.beginPath();
    ict.arc(center, center, radius * style.icingRadius, 0, Math.PI * 2);
    ict.fill();

    if (style.holeRadius > 0) {
      ict.globalCompositeOperation = 'destination-out';
      ict.beginPath();
      ict.arc(center, center, radius * style.holeRadius, 0, Math.PI * 2);
      ict.fill();
      ict.globalCompositeOperation = 'source-over';
    }

    // Icing highlight
    if (style.icingHighlight) {
      const highlightGradient = ict.createRadialGradient(
        center - radius * 0.2, center - radius * 0.2, 0,
        center - radius * 0.2, center - radius * 0.2, radius * 0.6
      );
      highlightGradient.addColorStop(0, style.icingHighlight);
      highlightGradient.addColorStop(1, 'rgba(255,255,255,0)');

      ict.fillStyle = highlightGradient;
      ict.beginPath();
      ict.arc(center, center, radius * style.icingRadius, 0, Math.PI * 2);
      ict.fill();

      if (style.holeRadius > 0) {
        ict.globalCompositeOperation = 'destination-out';
        ict.beginPath();
        ict.arc(center, center, radius * style.holeRadius, 0, Math.PI * 2);
        ict.fill();
        ict.globalCompositeOperation = 'source-over';
      }
    }
  }

  // Sprinkles
  if (style.sprinkleColors.length > 0) {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const dist = radius * (0.4 + Math.random() * 0.3);
      const x = center + Math.cos(angle) * dist;
      const y = center + Math.sin(angle) * dist;

      ict.fillStyle = style.sprinkleColors[Math.floor(Math.random() * style.sprinkleColors.length)];
      ict.fillRect(x - 1, y - 3, 2, 6);
    }
  }

  return off;
}

export function createGlazedDonutSprite(size) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ict = off.getContext('2d');
  const center = size / 2;
  const radius = center - 2;
  const style = DONUT_STYLES.glazed_ring;

  // Main dough with gradient
  const doughGradient = ict.createRadialGradient(center, center, radius * 0.3, center, center, radius);
  doughGradient.addColorStop(0, style.doughInner);
  doughGradient.addColorStop(1, style.doughOuter);

  ict.fillStyle = doughGradient;
  ict.beginPath();
  ict.arc(center, center, radius, 0, Math.PI * 2);
  ict.fill();

  // Hole
  if (style.holeRadius > 0) {
    ict.fillStyle = style.holeColor;
    ict.beginPath();
    ict.arc(center, center, radius * style.holeRadius, 0, Math.PI * 2);
    ict.fill();
  }

  // White glaze icing
  if (style.icingRadius > 0 && style.icingColor !== 'transparent') {
    ict.fillStyle = style.icingColor;
    ict.beginPath();
    ict.arc(center, center, radius * style.icingRadius, 0, Math.PI * 2);
    ict.fill();

    if (style.holeRadius > 0) {
      ict.globalCompositeOperation = 'destination-out';
      ict.beginPath();
      ict.arc(center, center, radius * style.holeRadius, 0, Math.PI * 2);
      ict.fill();
      ict.globalCompositeOperation = 'source-over';
    }

    // Glaze highlight
    if (style.icingHighlight) {
      const highlightGradient = ict.createRadialGradient(
        center - radius * 0.2, center - radius * 0.2, 0,
        center - radius * 0.2, center - radius * 0.2, radius * 0.6
      );
      highlightGradient.addColorStop(0, style.icingHighlight);
      highlightGradient.addColorStop(1, 'rgba(255,255,255,0)');

      ict.fillStyle = highlightGradient;
      ict.beginPath();
      ict.arc(center, center, radius * style.icingRadius, 0, Math.PI * 2);
      ict.fill();

      if (style.holeRadius > 0) {
        ict.globalCompositeOperation = 'destination-out';
        ict.beginPath();
        ict.arc(center, center, radius * style.holeRadius, 0, Math.PI * 2);
        ict.fill();
        ict.globalCompositeOperation = 'source-over';
      }
    }
  }

  return off;
}

export function createBacteriaSprite(size) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ict = off.getContext('2d');
  const center = size / 2;
  const radius = center - 2;

  const bodyGradient = ict.createRadialGradient(center, center, radius * 0.2, center, center, radius);
  bodyGradient.addColorStop(0, '#72ff72');
  bodyGradient.addColorStop(0.6, '#4ade80');
  bodyGradient.addColorStop(1, '#22c55e');

  ict.fillStyle = bodyGradient;
  ict.beginPath();
  ict.arc(center, center, radius, 0, Math.PI * 2);
  ict.fill();

  ict.strokeStyle = '#15803d';
  ict.lineWidth = 2;
  ict.stroke();

  // Spots
  ict.fillStyle = '#16a34a';
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2;
    const dist = radius * 0.4;
    const x = center + Math.cos(angle) * dist;
    const y = center + Math.sin(angle) * dist;
    ict.beginPath();
    ict.arc(x, y, 2, 0, Math.PI * 2);
    ict.fill();
  }

  return off;
}

export function createBacteriaSpritePurple(size) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ict = off.getContext('2d');
  const center = size / 2;
  const radius = center - 2;

  const bodyGradient = ict.createRadialGradient(center, center, radius * 0.2, center, center, radius);
  bodyGradient.addColorStop(0, '#c084fc');
  bodyGradient.addColorStop(0.6, '#a855f7');
  bodyGradient.addColorStop(1, '#9333ea');

  ict.fillStyle = bodyGradient;
  ict.beginPath();
  ict.arc(center, center, radius, 0, Math.PI * 2);
  ict.fill();

  ict.strokeStyle = '#7c3aed';
  ict.lineWidth = 2;
  ict.stroke();

  // Spikes
  ict.fillStyle = '#a855f7';
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const x1 = center + Math.cos(angle) * radius;
    const y1 = center + Math.sin(angle) * radius;
    const x2 = center + Math.cos(angle) * (radius + 4);
    const y2 = center + Math.sin(angle) * (radius + 4);
    ict.beginPath();
    ict.moveTo(center, center);
    ict.lineTo(x1, y1);
    ict.lineTo(x2, y2);
    ict.closePath();
    ict.fill();
  }

  return off;
}

// Additional sprite creation functions would be added here
// (createGimSprite, createSeaweedSprite, createMineSprite, etc.)

export function createClampBossSprite(size) {
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

// Create sprites object
export const sprites = {
  player: createDonutSprite(PLAYER_SIZE),
  glazedDonut: createGlazedDonutSprite(PLAYER_SIZE),
  enemy: createBacteriaSprite(ENEMY_SIZE),
  bigEnemy: createBacteriaSpritePurple(BIG_ENEMY_SIZE),
  boss: createClampBossSprite(BOSS_RADIUS * 2.6),
  // Additional sprites would be initialized here
};