// 보스 스킬 관련 함수들

import { vector, vectorCopy, vectorSub, vectorNormalize, vectorAdd, vectorScale, vectorLengthSq } from './utils.js';

// 착지 넉백 효과 적용 함수 (속도 기반 넉백)
function applyLandingKnockback(boss, state) {
  const knockbackSpeed = 1800; // 넉백 속도 (멀리 밀려나는 정도)
  const knockbackRadius = 200; // 넉백 적용 범위 (이 범위 안에 있어야 넉백됨)

  console.log('착지 넉백 발동! 보스 위치:', boss.pos);

  // 플레이어 넉백 (속도 적용)
  const playerDiff = vectorSub(state.playerPos, boss.pos);
  const playerDistSq = vectorLengthSq(playerDiff);
  const playerDist = Math.sqrt(playerDistSq);

  console.log('플레이어 거리:', playerDist, '넉백 범위:', knockbackRadius);

  if (playerDistSq < knockbackRadius * knockbackRadius) {
    let playerDir;

    // 정중앙에 있으면 랜덤 방향으로 밀어냄
    if (playerDist < 5) {
      const randomAngle = Math.random() * Math.PI * 2;
      playerDir = vector(Math.cos(randomAngle), Math.sin(randomAngle));
    } else {
      playerDir = vectorScale(playerDiff, 1 / playerDist);
    }

    const knockbackStrength = playerDist < 5 ? 1 : (1 - playerDist / knockbackRadius); // 0 ~ 1

    // 플레이어에게 넉백 속도 적용
    if (!state.playerKnockbackVelocity) {
      state.playerKnockbackVelocity = vector(0, 0);
    }
    const knockbackVel = vectorScale(playerDir, knockbackSpeed * knockbackStrength);
    state.playerKnockbackVelocity = vectorAdd(state.playerKnockbackVelocity, knockbackVel);

    console.log('플레이어 넉백 속도:', knockbackVel);
  }

  // 몬스터 넉백 (속도 적용)
  let knockedEnemies = 0;
  for (const enemy of state.enemies) {
    const enemyDiff = vectorSub(enemy.pos, boss.pos);
    const enemyDistSq = vectorLengthSq(enemyDiff);

    if (enemyDistSq < knockbackRadius * knockbackRadius) {
      const enemyDist = Math.sqrt(enemyDistSq);
      let enemyDir;

      // 정중앙에 있으면 랜덤 방향으로 밀어냄
      if (enemyDist < 5) {
        const randomAngle = Math.random() * Math.PI * 2;
        enemyDir = vector(Math.cos(randomAngle), Math.sin(randomAngle));
      } else {
        enemyDir = vectorScale(enemyDiff, 1 / enemyDist);
      }

      const knockbackStrength = enemyDist < 5 ? 1 : (1 - enemyDist / knockbackRadius);

      // 몬스터에게 넉백 속도 적용 (기존 knockbackVelocity 시스템 사용)
      if (!enemy.knockbackVelocity) {
        enemy.knockbackVelocity = vector(0, 0);
      }
      const knockbackVel = vectorScale(enemyDir, knockbackSpeed * knockbackStrength);
      enemy.knockbackVelocity = vectorAdd(enemy.knockbackVelocity, knockbackVel);

      knockedEnemies++;
    }
  }
  console.log('넉백된 몬스터 수:', knockedEnemies);
}

// 무당벌레 보스 점프 스킬 업데이트
export function updateLadybugJumpSkill(boss, state, dt) {
  // 스킬 초기화 (첫 실행)
  if (!boss.skillTimer) {
    boss.skillTimer = 5; // 5초마다 스킬 사용 (테스트용)
    boss.nextSkill = 'jump'; // 점프만 사용
    boss.isJumping = false;
    boss.jumpWarning = false;
    boss.jumpTarget = null;
    boss.jumpProgress = 0;
    boss.jumpStartPos = null;
  }

  // 점프 중인 경우 처리
  if (boss.isJumping) {
    boss.jumpProgress += dt * 2; // 0.5초에 완료
    if (boss.jumpProgress >= 1) {
      // 착지
      boss.pos = vectorCopy(boss.jumpTarget);
      boss.isJumping = false;
      boss.jumpProgress = 0;

      // 착지 이펙트 생성
      state.landingEffect = {
        pos: vectorCopy(boss.pos),
        timer: 0.5,
        radius: 0,
        knockbackRadius: 200 // 넉백 범위 시각화용
      };

      // 착지 넉백 효과 (플레이어 + 몬스터)
      applyLandingKnockback(boss, state);
    } else {
      // 점프 궤적 (포물선)
      const t = boss.jumpProgress;
      const height = Math.sin(t * Math.PI) * 200; // 최대 200px 높이

      // 선형 보간으로 위치 이동
      boss.pos = vector(
        boss.jumpStartPos.x + (boss.jumpTarget.x - boss.jumpStartPos.x) * t,
        boss.jumpStartPos.y + (boss.jumpTarget.y - boss.jumpStartPos.y) * t
      );

      // 점프 높이 시각적 효과를 위한 크기 조절
      boss.jumpHeight = height;
    }
    return true; // 점프 중이므로 일반 이동 차단
  }

  // 스킬 타이머 감소
  boss.skillTimer -= dt;

  // 스킬 1초 전 경고 (점프만)
  if (boss.skillTimer <= 1 && !boss.jumpWarning) {
    boss.jumpWarning = true;
    boss.jumpTarget = vectorCopy(state.playerPos);

    // 경고 텍스트 표시
    state.jumpWarningText = {
      timer: 1,
      target: vectorCopy(boss.jumpTarget)
    };
  }

  // 스킬 실행 (점프만)
  if (boss.skillTimer <= 0) {
    boss.isJumping = true;
    boss.jumpStartPos = vectorCopy(boss.pos);
    boss.jumpWarning = false;
    boss.jumpProgress = 0;
    boss.skillTimer = 5; // 다시 5초 타이머 설정 (테스트용)
  }

  return false; // 스킬 중이 아니므로 일반 이동 가능
}

// 점프 경고 텍스트 렌더링
export function renderJumpWarning(ctx, state, dt, worldToScreen) {
  if (state.jumpWarningText && state.jumpWarningText.timer > 0) {
    state.jumpWarningText.timer -= dt;

    const worldPos = state.jumpWarningText.target;
    const screenPos = worldToScreen(worldPos); // 월드 좌표 → 화면 좌표 변환

    // 착지 지점 표시 (빨간 원)
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, 60, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 안쪽 원 (더 강조)
    ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, 40, 0, Math.PI * 2);
    ctx.stroke();

    // 경고 텍스트
    ctx.font = 'bold 32px "Apple SD Gothic Neo","NanumGothic","Malgun Gothic","Noto Sans KR",sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // 텍스트 그림자
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillText('점프!', screenPos.x + 2, screenPos.y - 70 + 2);

    // 메인 텍스트
    ctx.fillStyle = '#ff3333';
    ctx.fillText('점프!', screenPos.x, screenPos.y - 70);

    // 흰색 테두리
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeText('점프!', screenPos.x, screenPos.y - 70);
  }
}

// 돌진 경고 텍스트 렌더링
export function renderChargeWarning(ctx, state, dt) {
  if (state.chargeWarningText && state.chargeWarningText.timer > 0) {
    state.chargeWarningText.timer -= dt;

    const { worldW, worldH } = { worldW: 600, worldH: 1000 }; // 타임어택 화면 크기
    const centerX = worldW / 2;
    const centerY = worldH * 0.3;

    // 경고 텍스트
    ctx.font = 'bold 48px "NanumSquare", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 텍스트 그림자
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillText('돌진!', centerX + 2, centerY + 2);

    // 메인 텍스트 (빨간색)
    ctx.fillStyle = '#ff3333';
    ctx.fillText('돌진!', centerX, centerY);

    // 흰색 테두리
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeText('돌진!', centerX, centerY);
  }
}

// 착지 이펙트 렌더링
export function renderLandingEffect(ctx, state, dt, worldToScreen) {
  if (state.landingEffect && state.landingEffect.timer > 0) {
    state.landingEffect.timer -= dt;
    state.landingEffect.radius += dt * 400; // 반경 증가 속도 (더 빠르게)

    const alpha = state.landingEffect.timer / 0.5; // 페이드 아웃
    const worldPos = state.landingEffect.pos;
    const screenPos = worldToScreen(worldPos); // 월드 좌표 → 화면 좌표 변환
    const radius = state.landingEffect.radius;

    // 먼지 효과 (여러 개의 작은 원) - 더 많이, 더 크게
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const offsetX = Math.cos(angle) * radius * 0.6;
      const offsetY = Math.sin(angle) * radius * 0.6;

      ctx.fillStyle = `rgba(180, 150, 120, ${alpha * 0.5})`;
      ctx.beginPath();
      ctx.arc(screenPos.x + offsetX, screenPos.y + offsetY, 15 + radius * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }

    // 충격파 효과 (바깥 원)
    ctx.strokeStyle = `rgba(255, 200, 100, ${alpha * 0.7})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 안쪽 충격파
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(screenPos.x, screenPos.y, radius * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    // 넉백 범위 표시 (디버깅용 - 빨간 원)
    if (state.landingEffect.knockbackRadius) {
      ctx.strokeStyle = `rgba(255, 0, 0, ${alpha * 0.3})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, state.landingEffect.knockbackRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (state.landingEffect.timer <= 0) {
      delete state.landingEffect;
    }
  }
}

// 보스 렌더링 시 점프 효과 적용
export function renderBossJumpEffect(ctx, boss) {
  if (boss.isJumping && boss.jumpHeight) {
    // 그림자 효과
    const shadowScale = 1 - (boss.jumpHeight / 200) * 0.3;
    ctx.save();
    ctx.translate(boss.pos.x, boss.pos.y + boss.jumpHeight * 0.3);
    ctx.scale(shadowScale, shadowScale * 0.3);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 0, boss.size * 0.8, boss.size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 보스를 위로 이동시켜 그리기 (점프 높이 적용)
    return -boss.jumpHeight * 0.5;
  }
  return 0;
}