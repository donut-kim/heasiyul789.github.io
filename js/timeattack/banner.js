// 타임어택 모드 배너 UI
import * as timeAttackConstants from './timeAttackConstants.js';

// 보스 출현 배너
export function drawTimeAttackBossWarning(ctx, state, getWorldDims) {
  const { worldW, worldH } = getWorldDims();

  ctx.save();

  const warningText = '보스가 출현합니다!';
  const bannerHeight = 70;
  const bannerY = worldH * 0.08;

  // 심플한 반투명 검은 배경
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, bannerY, worldW, bannerHeight);

  // 상하단 흰색 라인
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, bannerY, worldW, 2);
  ctx.fillRect(0, bannerY + bannerHeight - 2, worldW, 2);

  // 텍스트
  const centerX = worldW / 2;
  const centerY = bannerY + bannerHeight / 2;

  ctx.font = "800 36px 'Apple SD Gothic Neo','NanumGothic','Malgun Gothic','Noto Sans KR',sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 텍스트 그림자
  ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
  ctx.shadowBlur = 8;

  // 흰색 텍스트
  ctx.fillStyle = '#ffffff';
  ctx.fillText(warningText, centerX, centerY);

  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  ctx.restore();
}

// 검은먼지 경고 배너
export function drawBlackDustWarning(ctx, state, getWorldDims, timeAttackConstants) {
  const { worldW, worldH } = getWorldDims();

  // 깜박임 효과
  const flashPhase = Math.floor(state.sirenPhase / timeAttackConstants.TIME_ATTACK_BLACK_DUST_WARNING_FLASH_INTERVAL) % 2;
  if (flashPhase === 0) return;

  ctx.save();

  const warningText = timeAttackConstants.TIME_ATTACK_BLACK_DUST_WARNING_TEXT;
  const bannerHeight = 70;
  const bannerY = worldH * 0.08;

  // 빨간색 배경
  ctx.fillStyle = 'rgba(220, 38, 38, 0.9)';
  ctx.fillRect(0, bannerY, worldW, bannerHeight);

  // 상하단 노란색 라인
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(0, bannerY, worldW, 2);
  ctx.fillRect(0, bannerY + bannerHeight - 2, worldW, 2);

  // 텍스트
  const centerX = worldW / 2;
  const centerY = bannerY + bannerHeight / 2;

  ctx.font = "800 34px 'Apple SD Gothic Neo','NanumGothic','Malgun Gothic','Noto Sans KR',sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 텍스트 외곽선
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.lineWidth = 4;
  ctx.strokeText(warningText, centerX, centerY);

  // 노란색 텍스트
  ctx.fillStyle = '#fbbf24';
  ctx.fillText(warningText, centerX, centerY);

  ctx.restore();
}

// 게임 시작 메시지 배너
export function drawGameStartMessage(ctx, state, getWorldDims) {
  const { worldW, worldH } = getWorldDims();

  ctx.save();

  const bannerHeight = 110;
  const bannerY = worldH * 0.25;

  // 페이드 효과
  const fadeStart = 1.0;
  const opacity = state.gameStartMessageTimer < fadeStart
    ? state.gameStartMessageTimer / fadeStart
    : 1.0;

  // 반투명 배경
  ctx.fillStyle = `rgba(20, 20, 30, ${0.9 * opacity})`;
  ctx.fillRect(0, bannerY, worldW, bannerHeight);

  // 상하단 파란 라인
  ctx.fillStyle = `rgba(100, 200, 255, ${0.8 * opacity})`;
  ctx.fillRect(0, bannerY, worldW, 2);
  ctx.fillRect(0, bannerY + bannerHeight - 2, worldW, 2);

  // 텍스트
  const centerX = worldW / 2;
  const centerY = bannerY + bannerHeight / 2;

  // 첫 번째 줄
  ctx.font = "800 38px 'Apple SD Gothic Neo','NanumGothic','Malgun Gothic','Noto Sans KR',sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 텍스트 그림자
  ctx.shadowColor = `rgba(100, 200, 255, ${0.4 * opacity})`;
  ctx.shadowBlur = 8;

  ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
  ctx.fillText('15분동안 생존하세요!', centerX, centerY - 18);

  // 두 번째 줄
  ctx.font = "600 22px 'Apple SD Gothic Neo','NanumGothic','Malgun Gothic','Noto Sans KR',sans-serif";
  ctx.shadowBlur = 4;

  ctx.fillStyle = `rgba(100, 200, 255, ${0.9 * opacity})`;
  ctx.fillText('랭킹은 시간으로 집계 됩니다.', centerX, centerY + 22);

  ctx.shadowBlur = 0;
  ctx.shadowColor = 'transparent';

  ctx.restore();
}

// 보스 HP바 표시
export function drawTimeAttackBossHP(ctx, state, getWorldDims) {
  if (!state.boss) return;

  const { worldW, worldH } = getWorldDims();
  const barY = 52;
  const barHeight = 24;
  const nameHeight = 18;

  // 보스 이름 설정
  const bossNames = {
    'ladybug': '무당벌레',
    'ant': '개미',
    'butterfly': '나비',
    'cat': '고양이',
    'dog': '강아지'
  };
  const bossName = bossNames[state.boss.bossType] || '보스';

  // HP 계산
  const currentHP = Math.max(0, Math.ceil(state.boss.health));
  const maxHP = state.boss.maxHealth;

  // 보스 이름 그리기
  ctx.fillStyle = '#ffffff';
  ctx.font = "bold 14px 'Apple SD Gothic Neo','NanumGothic','Malgun Gothic',sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(bossName, worldW / 2, barY - nameHeight);

  // HP 바 배경
  ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.fillRect(0, barY, worldW, barHeight);

  // HP 바 테두리
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, barY, worldW, barHeight);

  // 레이어 방식 HP 바: 도화지에 색깔 겹쳐 칠하듯이
  // 빨강 → 주황 → 노랑 → 초록 → 파랑 순서로 밑에서부터 쌓임
  const colors = ['#ff2222', '#ff8800', '#ffdd00', '#44ff44', '#4488ff'];
  const hpPerLayer = 100; // 각 레이어당 100 HP

  const barX = 2;
  const barYPos = barY + 2;
  const barWidth = worldW - 4;
  const barHeightInner = barHeight - 4;

  // 0 HP 상태일 때 검은색 바 표시 (HP가 없다는 것을 명확히)
  ctx.fillStyle = '#000000';
  ctx.fillRect(barX, barYPos, barWidth, barHeightInner);

  if (currentHP > 0) {
    // 현재 HP가 어느 레이어에 있는지 계산
    const currentLayer = Math.floor((currentHP - 1) / hpPerLayer); // 0부터 시작
    const hpInCurrentLayer = ((currentHP - 1) % hpPerLayer) + 1; // 현재 레이어에서의 HP (1~100)

    // 이전 레이어들을 모두 100%로 그리기 (밑에 깔리는 레이어)
    for (let layer = 0; layer < currentLayer; layer++) {
      ctx.fillStyle = colors[layer % colors.length];
      ctx.fillRect(barX, barYPos, barWidth, barHeightInner);
    }

    // 현재 레이어를 일부만 그리기
    ctx.fillStyle = colors[currentLayer % colors.length];
    const percentage = hpInCurrentLayer / hpPerLayer;
    ctx.fillRect(barX, barYPos, barWidth * percentage, barHeightInner);
  }

  // HP 텍스트
  ctx.fillStyle = '#ffffff';
  ctx.font = "bold 12px 'Apple SD Gothic Neo','NanumGothic','Malgun Gothic',sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 4;
  ctx.fillText(`HP: ${currentHP}/${maxHP}`, worldW / 2, barY + barHeight / 2);
  ctx.shadowBlur = 0;
}
