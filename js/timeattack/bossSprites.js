// 타임어택 보스 스프라이트 생성 함수들

// 무당벌레 보스 스프라이트 (3분) - 매우 귀여운 캐릭터 스타일
export function createLadybugBossSprite(size) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ctx = off.getContext('2d');
  const half = size / 2;
  ctx.translate(half, half);

  const s = size / 2;

  // 귀여운 다리 6개
  ctx.strokeStyle = '#2c1810';
  ctx.lineWidth = s * 0.08;
  ctx.lineCap = 'round';

  // 왼쪽 다리
  [[-s * 0.6, -s * 0.3], [-s * 0.65, 0], [-s * 0.6, s * 0.3]].forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx - s * 0.4, sy - s * 0.15, sx - s * 0.55, sy);
    ctx.stroke();
  });

  // 오른쪽 다리
  [[s * 0.6, -s * 0.3], [s * 0.65, 0], [s * 0.6, s * 0.3]].forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + s * 0.4, sy - s * 0.15, sx + s * 0.55, sy);
    ctx.stroke();
  });

  // 통통한 몸통
  const bodyGrad = ctx.createRadialGradient(s * 0.2, -s * 0.15, 0, 0, 0, s * 0.9);
  bodyGrad.addColorStop(0, '#ff6b6b');
  bodyGrad.addColorStop(0.7, '#ff4444');
  bodyGrad.addColorStop(1, '#dd2222');

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, s * 0.05, s * 0.75, s * 0.85, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#aa0000';
  ctx.lineWidth = s * 0.05;
  ctx.beginPath();
  ctx.ellipse(0, s * 0.05, s * 0.75, s * 0.85, 0, 0, Math.PI * 2);
  ctx.stroke();

  // 중앙 분할선
  ctx.strokeStyle = '#2c1810';
  ctx.lineWidth = s * 0.08;
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.78);
  ctx.lineTo(0, s * 0.88);
  ctx.stroke();

  // 큰 점무늬
  ctx.fillStyle = '#2c1810';
  [[-s * 0.4, -s * 0.25], [s * 0.42, -s * 0.3], [-s * 0.38, s * 0.38], [s * 0.4, s * 0.42]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
  });

  // 머리
  const headGrad = ctx.createRadialGradient(0, -s * 1.05, s * 0.1, 0, -s * 1.05, s * 0.55);
  headGrad.addColorStop(0, '#3a3a3a');
  headGrad.addColorStop(1, '#1a1a1a');

  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(0, -s * 1.05, s * 0.52, 0, Math.PI * 2);
  ctx.fill();

  // 초대형 눈
  const eyeSize = s * 0.28;
  const eyeGap = s * 0.35;

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(-eyeGap, -s * 1.05, eyeSize, eyeSize * 1.15, 0, 0, Math.PI * 2);
  ctx.ellipse(eyeGap, -s * 1.05, eyeSize, eyeSize * 1.15, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath();
  ctx.arc(-eyeGap, -s * 0.98, eyeSize * 0.55, 0, Math.PI * 2);
  ctx.arc(eyeGap, -s * 0.98, eyeSize * 0.55, 0, Math.PI * 2);
  ctx.fill();

  // 반짝이
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-eyeGap - eyeSize * 0.25, -s * 1.08, eyeSize * 0.35, 0, Math.PI * 2);
  ctx.arc(eyeGap - eyeSize * 0.25, -s * 1.08, eyeSize * 0.35, 0, Math.PI * 2);
  ctx.arc(-eyeGap + eyeSize * 0.2, -s * 0.92, eyeSize * 0.15, 0, Math.PI * 2);
  ctx.arc(eyeGap + eyeSize * 0.2, -s * 0.92, eyeSize * 0.15, 0, Math.PI * 2);
  ctx.fill();

  // 볼터치
  ctx.fillStyle = 'rgba(255, 120, 120, 0.5)';
  ctx.beginPath();
  ctx.arc(-s * 0.75, -s * 0.85, s * 0.2, 0, Math.PI * 2);
  ctx.arc(s * 0.75, -s * 0.85, s * 0.2, 0, Math.PI * 2);
  ctx.fill();

  // 더듬이
  ctx.strokeStyle = '#2c1810';
  ctx.lineWidth = s * 0.07;
  ctx.lineCap = 'round';

  [-1, 1].forEach(dir => {
    ctx.beginPath();
    ctx.moveTo(dir * eyeGap * 0.8, -s * 1.4);
    ctx.quadraticCurveTo(dir * s * 0.4, -s * 1.65, dir * s * 0.52, -s * 1.7);
    ctx.stroke();

    ctx.fillStyle = '#2c1810';
    ctx.beginPath();
    ctx.arc(dir * s * 0.52, -s * 1.7, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
  });

  // 미소
  ctx.strokeStyle = '#2c1810';
  ctx.lineWidth = s * 0.05;
  ctx.beginPath();
  ctx.arc(0, -s * 0.75, s * 0.2, 0.3, Math.PI - 0.3);
  ctx.stroke();

  return off;
}

// 다른 보스들도 여기에 추가...
export function createAntBossSprite(size) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ctx = off.getContext('2d');
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(0, 0, size, size);
  return off;
}

export function createButterflyBossSprite(size) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ctx = off.getContext('2d');
  ctx.fillStyle = '#FFB6C1';
  ctx.fillRect(0, 0, size, size);
  return off;
}

export function createCatBossSprite(size) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ctx = off.getContext('2d');
  ctx.fillStyle = '#FFA500';
  ctx.fillRect(0, 0, size, size);
  return off;
}

export function createDogBossSprite(size) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ctx = off.getContext('2d');
  ctx.fillStyle = '#A0522D';
  ctx.fillRect(0, 0, size, size);
  return off;
}
