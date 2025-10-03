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

// 여왕 개미 보스 스프라이트 (1분)
export function createAntBossSprite(size) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ctx = off.getContext('2d');
  const half = size / 2;
  ctx.translate(half, half);

  const s = size / 2;

  // 복부 (가장 큰 부분)
  const abdomenGrad = ctx.createRadialGradient(0, s * 0.3, 0, 0, s * 0.3, s * 0.65);
  abdomenGrad.addColorStop(0, '#2a2a2a');
  abdomenGrad.addColorStop(0.6, '#1a1a1a');
  abdomenGrad.addColorStop(1, '#0a0a0a');

  ctx.fillStyle = abdomenGrad;
  ctx.beginPath();
  ctx.ellipse(0, s * 0.3, s * 0.55, s * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();

  // 복부 하이라이트
  ctx.fillStyle = 'rgba(80, 80, 80, 0.3)';
  ctx.beginPath();
  ctx.ellipse(-s * 0.15, s * 0.1, s * 0.3, s * 0.2, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // 가슴 (중간 부분)
  const thoraxGrad = ctx.createRadialGradient(0, -s * 0.2, 0, 0, -s * 0.2, s * 0.4);
  thoraxGrad.addColorStop(0, '#3a3a3a');
  thoraxGrad.addColorStop(0.7, '#2a2a2a');
  thoraxGrad.addColorStop(1, '#1a1a1a');

  ctx.fillStyle = thoraxGrad;
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.2, s * 0.4, s * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  // 머리
  const headGrad = ctx.createRadialGradient(0, -s * 0.8, s * 0.1, 0, -s * 0.8, s * 0.35);
  headGrad.addColorStop(0, '#2a2a2a');
  headGrad.addColorStop(0.7, '#1a1a1a');
  headGrad.addColorStop(1, '#0a0a0a');

  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(0, -s * 0.8, s * 0.35, 0, Math.PI * 2);
  ctx.fill();

  // 더듬이
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = s * 0.06;
  ctx.lineCap = 'round';

  [-1, 1].forEach(dir => {
    ctx.beginPath();
    ctx.moveTo(dir * s * 0.2, -s * 1.0);
    ctx.quadraticCurveTo(dir * s * 0.4, -s * 1.3, dir * s * 0.5, -s * 1.35);
    ctx.stroke();

    // 더듬이 끝 마디
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    ctx.arc(dir * s * 0.5, -s * 1.35, s * 0.08, 0, Math.PI * 2);
    ctx.fill();
  });

  // 다리 6개 (3쌍)
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = s * 0.07;
  ctx.lineCap = 'round';

  // 앞다리
  [[-s * 0.35, -s * 0.5], [s * 0.35, -s * 0.5]].forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx * 1.8, sy - s * 0.2);
    ctx.lineTo(sx * 2.2, sy);
    ctx.stroke();
  });

  // 중간다리
  [[-s * 0.4, -s * 0.15], [s * 0.4, -s * 0.15]].forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx * 1.9, sy);
    ctx.lineTo(sx * 2.2, sy + s * 0.2);
    ctx.stroke();
  });

  // 뒷다리
  [[-s * 0.45, s * 0.2], [s * 0.45, s * 0.2]].forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx * 1.7, sy + s * 0.3);
    ctx.lineTo(sx * 2.0, sy + s * 0.5);
    ctx.stroke();
  });

  // 날개 (투명한 회색)
  ctx.fillStyle = 'rgba(150, 150, 150, 0.4)';
  ctx.strokeStyle = 'rgba(100, 100, 100, 0.6)';
  ctx.lineWidth = s * 0.03;

  // 왼쪽 날개
  ctx.beginPath();
  ctx.ellipse(-s * 0.3, -s * 0.1, s * 0.7, s * 0.35, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 오른쪽 날개
  ctx.beginPath();
  ctx.ellipse(s * 0.3, -s * 0.1, s * 0.7, s * 0.35, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 날개 무늬
  ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
  ctx.lineWidth = s * 0.02;
  [-1, 1].forEach(dir => {
    ctx.beginPath();
    ctx.moveTo(dir * s * 0.1, -s * 0.1);
    ctx.lineTo(dir * s * 0.8, -s * 0.25);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(dir * s * 0.15, 0);
    ctx.lineTo(dir * s * 0.7, 0.05);
    ctx.stroke();
  });

  // 눈 (빨간색)
  ctx.fillStyle = '#aa0000';
  ctx.beginPath();
  ctx.arc(-s * 0.15, -s * 0.85, s * 0.12, 0, Math.PI * 2);
  ctx.arc(s * 0.15, -s * 0.85, s * 0.12, 0, Math.PI * 2);
  ctx.fill();

  // 눈 하이라이트
  ctx.fillStyle = 'rgba(255, 100, 100, 0.6)';
  ctx.beginPath();
  ctx.arc(-s * 0.18, -s * 0.88, s * 0.05, 0, Math.PI * 2);
  ctx.arc(s * 0.12, -s * 0.88, s * 0.05, 0, Math.PI * 2);
  ctx.fill();

  return off;
}

export function createButterflyBossSprite(size) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ctx = off.getContext('2d');
  const half = size / 2;
  ctx.translate(half, half);

  const s = size / 2;

  // 뒷날개 (먼저 그려서 뒤에 배치)
  const backWingGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.8);
  backWingGrad.addColorStop(0, '#ffb3d9');
  backWingGrad.addColorStop(0.5, '#ff8dc7');
  backWingGrad.addColorStop(1, '#ff66b2');

  // 왼쪽 뒷날개
  ctx.fillStyle = backWingGrad;
  ctx.beginPath();
  ctx.ellipse(-s * 0.5, s * 0.2, s * 0.6, s * 0.7, -0.3, 0, Math.PI * 2);
  ctx.fill();

  // 오른쪽 뒷날개
  ctx.beginPath();
  ctx.ellipse(s * 0.5, s * 0.2, s * 0.6, s * 0.7, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // 앞날개
  const frontWingGrad = ctx.createRadialGradient(0, -s * 0.1, 0, 0, -s * 0.1, s * 0.9);
  frontWingGrad.addColorStop(0, '#ffe0f0');
  frontWingGrad.addColorStop(0.4, '#ffb3d9');
  frontWingGrad.addColorStop(0.7, '#ff8dc7');
  frontWingGrad.addColorStop(1, '#ff66b2');

  // 왼쪽 앞날개
  ctx.fillStyle = frontWingGrad;
  ctx.beginPath();
  ctx.ellipse(-s * 0.45, -s * 0.3, s * 0.75, s * 0.85, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // 오른쪽 앞날개
  ctx.beginPath();
  ctx.ellipse(s * 0.45, -s * 0.3, s * 0.75, s * 0.85, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // 날개 무늬 (흰색 점)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  [
    [-s * 0.6, -s * 0.5], [-s * 0.4, -s * 0.2], [-s * 0.5, s * 0.1],
    [s * 0.6, -s * 0.5], [s * 0.4, -s * 0.2], [s * 0.5, s * 0.1]
  ].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.arc(x, y, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
  });

  // 날개 테두리
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.lineWidth = s * 0.02;

  ctx.beginPath();
  ctx.ellipse(-s * 0.45, -s * 0.3, s * 0.75, s * 0.85, -0.2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(s * 0.45, -s * 0.3, s * 0.75, s * 0.85, 0.2, 0, Math.PI * 2);
  ctx.stroke();

  // 몸통
  const bodyGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, s * 0.2);
  bodyGrad.addColorStop(0, '#3a3a3a');
  bodyGrad.addColorStop(1, '#1a1a1a');

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.18, s * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();

  // 머리
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath();
  ctx.arc(0, -s * 0.7, s * 0.25, 0, Math.PI * 2);
  ctx.fill();

  // 더듬이
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = s * 0.04;
  ctx.lineCap = 'round';

  [-1, 1].forEach(dir => {
    ctx.beginPath();
    ctx.moveTo(dir * s * 0.1, -s * 0.85);
    ctx.quadraticCurveTo(dir * s * 0.3, -s * 1.1, dir * s * 0.35, -s * 1.15);
    ctx.stroke();

    // 더듬이 끝 동그라미
    ctx.fillStyle = '#3a3a3a';
    ctx.beginPath();
    ctx.arc(dir * s * 0.35, -s * 1.15, s * 0.08, 0, Math.PI * 2);
    ctx.fill();
  });

  return off;
}

export function createCatBossSprite(size) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ctx = off.getContext('2d');
  const half = size / 2;
  ctx.translate(half, half);

  const s = size / 2;

  // 꼬리
  ctx.strokeStyle = '#ff8800';
  ctx.lineWidth = s * 0.25;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(s * 0.4, s * 0.6);
  ctx.quadraticCurveTo(s * 0.9, s * 0.8, s * 1.0, s * 0.3);
  ctx.stroke();

  // 몸통
  const bodyGrad = ctx.createRadialGradient(-s * 0.1, 0, 0, 0, 0, s * 0.8);
  bodyGrad.addColorStop(0, '#ffaa44');
  bodyGrad.addColorStop(0.6, '#ff8800');
  bodyGrad.addColorStop(1, '#dd6600');

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0.1 * s, s * 0.7, s * 0.65, 0, 0, Math.PI * 2);
  ctx.fill();

  // 머리
  const headGrad = ctx.createRadialGradient(-s * 0.15, -s * 0.7, 0, 0, -s * 0.7, s * 0.6);
  headGrad.addColorStop(0, '#ffaa44');
  headGrad.addColorStop(0.7, '#ff8800');
  headGrad.addColorStop(1, '#dd6600');

  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(0, -s * 0.7, s * 0.55, 0, Math.PI * 2);
  ctx.fill();

  // 귀
  ctx.fillStyle = '#ff8800';
  ctx.beginPath();
  ctx.moveTo(-s * 0.4, -s * 1.1);
  ctx.lineTo(-s * 0.2, -s * 0.9);
  ctx.lineTo(-s * 0.5, -s * 0.8);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(s * 0.4, -s * 1.1);
  ctx.lineTo(s * 0.2, -s * 0.9);
  ctx.lineTo(s * 0.5, -s * 0.8);
  ctx.closePath();
  ctx.fill();

  // 귀 안쪽 (분홍색)
  ctx.fillStyle = '#ffb3d9';
  ctx.beginPath();
  ctx.moveTo(-s * 0.38, -s * 1.05);
  ctx.lineTo(-s * 0.25, -s * 0.92);
  ctx.lineTo(-s * 0.45, -s * 0.88);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(s * 0.38, -s * 1.05);
  ctx.lineTo(s * 0.25, -s * 0.92);
  ctx.lineTo(s * 0.45, -s * 0.88);
  ctx.closePath();
  ctx.fill();

  // 눈
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath();
  ctx.ellipse(-s * 0.25, -s * 0.75, s * 0.12, s * 0.18, 0.2, 0, Math.PI * 2);
  ctx.ellipse(s * 0.25, -s * 0.75, s * 0.12, s * 0.18, -0.2, 0, Math.PI * 2);
  ctx.fill();

  // 눈 하이라이트
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.beginPath();
  ctx.arc(-s * 0.28, -s * 0.8, s * 0.06, 0, Math.PI * 2);
  ctx.arc(s * 0.22, -s * 0.8, s * 0.06, 0, Math.PI * 2);
  ctx.fill();

  // 코
  ctx.fillStyle = '#ffb3d9';
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.55);
  ctx.lineTo(-s * 0.08, -s * 0.45);
  ctx.lineTo(s * 0.08, -s * 0.45);
  ctx.closePath();
  ctx.fill();

  // 입
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = s * 0.04;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(0, -s * 0.45);
  ctx.lineTo(0, -s * 0.35);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(-s * 0.15, -s * 0.3, s * 0.15, 0.3, Math.PI - 0.3);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(s * 0.15, -s * 0.3, s * 0.15, 0.3, Math.PI - 0.3);
  ctx.stroke();

  // 수염
  ctx.strokeStyle = '#2a2a2a';
  ctx.lineWidth = s * 0.03;

  // 왼쪽 수염
  [[-0.4, -0.6], [-0.45, -0.5], [-0.4, -0.4]].forEach(([endX, endY]) => {
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s * 0.5);
    ctx.lineTo(s * endX * 1.8, s * endY);
    ctx.stroke();
  });

  // 오른쪽 수염
  [[0.4, -0.6], [0.45, -0.5], [0.4, -0.4]].forEach(([endX, endY]) => {
    ctx.beginPath();
    ctx.moveTo(s * 0.5, -s * 0.5);
    ctx.lineTo(s * endX * 1.8, s * endY);
    ctx.stroke();
  });

  return off;
}

export function createDogBossSprite(size) {
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const ctx = off.getContext('2d');
  const half = size / 2;
  ctx.translate(half, half);

  const s = size / 2;

  // 꼬리 (여러 개의 원으로 흔들리는 모양)
  ctx.fillStyle = '#8B4513';
  for (let i = 0; i < 4; i++) {
    const angle = Math.sin(i * 0.8) * 0.3;
    const x = s * 0.6 + i * s * 0.15;
    const y = s * 0.4 + Math.sin(i * 0.8) * s * 0.2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.12, s * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 몸통
  const bodyGrad = ctx.createRadialGradient(-s * 0.1, 0, 0, 0, 0, s * 0.8);
  bodyGrad.addColorStop(0, '#a0713d');
  bodyGrad.addColorStop(0.6, '#8B4513');
  bodyGrad.addColorStop(1, '#6d3510');

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0.15 * s, s * 0.75, s * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();

  // 머리
  const headGrad = ctx.createRadialGradient(-s * 0.15, -s * 0.6, 0, 0, -s * 0.6, s * 0.55);
  headGrad.addColorStop(0, '#a0713d');
  headGrad.addColorStop(0.7, '#8B4513');
  headGrad.addColorStop(1, '#6d3510');

  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.arc(0, -s * 0.6, s * 0.5, 0, Math.PI * 2);
  ctx.fill();

  // 귀 (늘어진)
  ctx.fillStyle = '#8B4513';
  ctx.beginPath();
  ctx.ellipse(-s * 0.45, -s * 0.7, s * 0.25, s * 0.4, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(s * 0.45, -s * 0.7, s * 0.25, s * 0.4, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // 귀 안쪽
  ctx.fillStyle = '#a0713d';
  ctx.beginPath();
  ctx.ellipse(-s * 0.45, -s * 0.7, s * 0.15, s * 0.28, -0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(s * 0.45, -s * 0.7, s * 0.15, s * 0.28, 0.3, 0, Math.PI * 2);
  ctx.fill();

  // 주둥이
  ctx.fillStyle = '#a0713d';
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.35, s * 0.35, s * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  // 코
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.45, s * 0.15, s * 0.12, 0, 0, Math.PI * 2);
  ctx.fill();

  // 코 하이라이트
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.arc(-s * 0.05, -s * 0.48, s * 0.05, 0, Math.PI * 2);
  ctx.fill();

  // 눈
  ctx.fillStyle = '#2a2a2a';
  ctx.beginPath();
  ctx.arc(-s * 0.2, -s * 0.65, s * 0.1, 0, Math.PI * 2);
  ctx.arc(s * 0.2, -s * 0.65, s * 0.1, 0, Math.PI * 2);
  ctx.fill();

  // 눈 하이라이트
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.beginPath();
  ctx.arc(-s * 0.23, -s * 0.68, s * 0.04, 0, Math.PI * 2);
  ctx.arc(s * 0.17, -s * 0.68, s * 0.04, 0, Math.PI * 2);
  ctx.fill();

  // 혀 (핑크색)
  ctx.fillStyle = '#ff6b9d';
  ctx.beginPath();
  ctx.ellipse(s * 0.05, -s * 0.22, s * 0.12, s * 0.18, 0.2, 0, Math.PI * 2);
  ctx.fill();

  // 혀 중앙선
  ctx.strokeStyle = '#ff3377';
  ctx.lineWidth = s * 0.02;
  ctx.beginPath();
  ctx.moveTo(s * 0.05, -s * 0.3);
  ctx.lineTo(s * 0.05, -s * 0.15);
  ctx.stroke();

  return off;
}
