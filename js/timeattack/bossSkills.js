// 보스 스킬 관련 함수들

import { vector, vectorCopy, vectorSub, vectorNormalize, vectorAdd, vectorScale, vectorLengthSq } from './utils.js';

// 무당벌레 보스 점프 스킬 업데이트
export function updateLadybugJumpSkill(boss, state, dt) {
  // 스킬 초기화 (첫 실행)
  if (!boss.skillTimer) {
    boss.skillTimer = 10; // 10초마다 스킬 사용
    boss.nextSkill = 'charge'; // 첫 스킬은 돌진
    boss.isJumping = false;
    boss.jumpWarning = false;
    boss.jumpTarget = null;
    boss.jumpProgress = 0;
    boss.jumpStartPos = null;
    boss.isCharging = false;
    boss.chargeWarning = false;
    boss.chargeTarget = null;
    boss.chargeProgress = 0;
  }

  // 돌진 중인 경우 처리
  if (boss.isCharging) {
    boss.chargeProgress += dt * 3; // 빠르게 돌진
    if (boss.chargeProgress >= 1) {
      // 돌진 완료
      boss.pos = vectorCopy(boss.chargeTarget);
      boss.isCharging = false;
      boss.chargeProgress = 0;
    } else {
      // 돌진 이동
      const t = boss.chargeProgress;
      const chargeDir = vectorNormalize(vectorSub(boss.chargeTarget, boss.chargeStartPos));
      const chargeStep = vectorScale(chargeDir, 500 * dt); // 빠른 속도로 돌진
      boss.pos = vectorAdd(boss.pos, chargeStep);
    }
    return true; // 돌진 중이므로 일반 이동 차단
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
        radius: 0
      };
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

  // 스킬 1초 전 경고
  if (boss.skillTimer <= 1 && !boss.jumpWarning && !boss.chargeWarning) {
    if (boss.nextSkill === 'jump') {
      boss.jumpWarning = true;
      boss.jumpTarget = vectorCopy(state.playerPos);

      // 경고 텍스트 표시
      state.jumpWarningText = {
        timer: 1,
        target: vectorCopy(boss.jumpTarget)
      };
    } else if (boss.nextSkill === 'charge') {
      boss.chargeWarning = true;
      boss.chargeTarget = vectorCopy(state.playerPos);

      // 돌진 경고 텍스트 표시
      state.chargeWarningText = {
        timer: 1,
        text: '돌진'
      };
    }
  }

  // 스킬 실행
  if (boss.skillTimer <= 0) {
    if (boss.nextSkill === 'jump') {
      boss.isJumping = true;
      boss.jumpStartPos = vectorCopy(boss.pos);
      boss.jumpWarning = false;
      boss.jumpProgress = 0;
      boss.nextSkill = 'charge'; // 다음 스킬은 돌진
    } else if (boss.nextSkill === 'charge') {
      boss.isCharging = true;
      boss.chargeStartPos = vectorCopy(boss.pos);
      boss.chargeWarning = false;
      boss.chargeProgress = 0;
      boss.nextSkill = 'jump'; // 다음 스킬은 점프
    }

    boss.skillTimer = 10; // 다시 10초 타이머 설정
  }

  return false; // 스킬 중이 아니므로 일반 이동 가능
}

// 점프 경고 텍스트 렌더링
export function renderJumpWarning(ctx, state, dt) {
  if (state.jumpWarningText && state.jumpWarningText.timer > 0) {
    state.jumpWarningText.timer -= dt;

    const pos = state.jumpWarningText.target;

    // 착지 지점 표시 (빨간 원)
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 50, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 경고 텍스트
    ctx.font = 'bold 24px "NanumSquare", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // 텍스트 그림자
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillText('스킬발동! 점프!', pos.x + 2, pos.y - 60 + 2);

    // 메인 텍스트
    ctx.fillStyle = '#ff3333';
    ctx.fillText('스킬발동! 점프!', pos.x, pos.y - 60);
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
export function renderLandingEffect(ctx, state, dt) {
  if (state.landingEffect && state.landingEffect.timer > 0) {
    state.landingEffect.timer -= dt;
    state.landingEffect.radius += dt * 300; // 반경 증가 속도

    const alpha = state.landingEffect.timer / 0.5; // 페이드 아웃
    const pos = state.landingEffect.pos;
    const radius = state.landingEffect.radius;

    // 먼지 효과 (여러 개의 작은 원)
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const offsetX = Math.cos(angle) * radius * 0.5;
      const offsetY = Math.sin(angle) * radius * 0.5;

      ctx.fillStyle = `rgba(180, 150, 120, ${alpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(pos.x + offsetX, pos.y + offsetY, 10 + radius * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // 충격파 효과
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.stroke();

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