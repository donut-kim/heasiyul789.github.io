// 공격 관련 함수들
import * as constants from './constants.js';
import { state } from './gameState.js';
import {
  vector,
  vectorSub,
  vectorNormalize,
  vectorLengthSq,
  vectorLength,
  vectorCopy
} from './utils.js';

// 타임어택 모드 공격 타겟 찾기 (이동 방향 기준 ±30도)
export function findTimeAttackTarget() {
  const moveAngle = Math.atan2(state.lastMoveDirection.y, state.lastMoveDirection.x);
  const angleThreshold = (30 * Math.PI) / 180; // 30도를 라디안으로 변환

  let closestEnemy = null;
  let closestDistance = Infinity;

  // 보스가 있으면 보스 우선
  if (state.boss) {
    const dirToBoss = vectorNormalize(vectorSub(state.boss.pos, state.playerPos));
    const bossAngle = Math.atan2(dirToBoss.y, dirToBoss.x);
    let angleDiff = Math.abs(bossAngle - moveAngle);
    // 각도 차이를 -π ~ π 범위로 정규화
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

    if (angleDiff <= angleThreshold) {
      return { type: 'boss', target: state.boss, direction: dirToBoss };
    }
  }

  // 보스를 타겟하지 않았다면 범위 내 가장 가까운 적 찾기
  if (state.enemies.length > 0) {
    for (const enemy of state.enemies) {
      const dirToEnemy = vectorSub(enemy.pos, state.playerPos);
      const distance = vectorLength(dirToEnemy);
      const enemyAngle = Math.atan2(dirToEnemy.y, dirToEnemy.x);
      let angleDiff = Math.abs(enemyAngle - moveAngle);
      // 각도 차이를 -π ~ π 범위로 정규화
      if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

      if (angleDiff <= angleThreshold && distance < closestDistance) {
        closestDistance = distance;
        closestEnemy = enemy;
      }
    }

    if (closestEnemy) {
      const dir = vectorNormalize(vectorSub(closestEnemy.pos, state.playerPos));
      return { type: 'enemy', target: closestEnemy, direction: dir };
    }
  }

  // 범위 내에 적이 없으면 이동 방향으로 발사
  const dir = state.lastMoveDirection;
  return { type: 'manual', target: null, direction: dir };
}

// 노말 모드 공격 타겟 찾기 (자동 조준)
export function findNormalModeTarget(dt) {
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
    return { type: 'enemy', target: chosen, direction: dir };
  } else if (state.boss) {
    const dir = vectorNormalize(vectorSub(state.boss.pos, state.playerPos));
    return { type: 'boss', target: state.boss, direction: dir };
  }

  // 적이 없으면 회전하며 발사
  state.autoAimAngle = (state.autoAimAngle + dt * 120) % 360;
  const radians = (state.autoAimAngle * Math.PI) / 180;
  const sweepDir = vector(Math.cos(radians), Math.sin(radians));
  return { type: 'sweep', target: null, direction: sweepDir };
}

// 공격 방향 계산 (bulletCount에 따라 분산)
export function calculateAttackDirections(targetDir, bulletCount) {
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

  return baseDirections;
}

// 발사 후 타겟 ID 업데이트
export function updateLastTargetId(targetInfo) {
  if (targetInfo.type === 'enemy' && targetInfo.target) {
    state.lastEnemyTargetId = targetInfo.target.id;
  } else {
    state.lastEnemyTargetId = null;
  }
}

// 공격 방향 표시 그리기 (타임어택 전용)
export function drawAttackIndicator(ctx, screenX, screenY, playerSize) {
  if (state.gameMode !== 'timeattack') return;

  const direction = state.lastMoveDirection;
  const angle = Math.atan2(direction.y, direction.x);
  const distance = playerSize / 2 + 16;
  const indicatorX = screenX + Math.cos(angle) * distance;
  const indicatorY = screenY + Math.sin(angle) * distance;

  const time = performance.now() * 0.003;
  const bounce = Math.sin(time * 2) * 2; // 위아래로 통통 튀는 애니메이션

  ctx.save();
  ctx.translate(indicatorX + Math.cos(angle) * bounce, indicatorY + Math.sin(angle) * bounce);
  ctx.rotate(angle);

  // 귀여운 작고 둥근 화살표 그리기
  const scale = 0.85 + Math.sin(time * 3) * 0.15; // 살짝 커졌다 작아지는 효과
  ctx.scale(scale, scale);

  // 외곽선 (더 두껍게)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(8, 0);      // 앞쪽 짧게
  ctx.lineTo(-5, -5);    // 왼쪽 날개
  ctx.lineTo(-3, 0);     // 가운데
  ctx.lineTo(-5, 5);     // 오른쪽 날개
  ctx.closePath();
  ctx.stroke();

  // 안쪽 채우기 (초록색 그라디언트)
  const gradient = ctx.createLinearGradient(-5, 0, 8, 0);
  gradient.addColorStop(0, 'rgba(100, 255, 150, 0.95)');  // 연한 초록
  gradient.addColorStop(1, 'rgba(50, 220, 100, 0.95)');   // 진한 초록
  ctx.fillStyle = gradient;
  ctx.fill();

  // 반짝이는 하이라이트
  const highlightAlpha = 0.4 + Math.sin(time * 4) * 0.3;
  ctx.fillStyle = `rgba(255, 255, 255, ${highlightAlpha})`;
  ctx.beginPath();
  ctx.arc(2, -1, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}