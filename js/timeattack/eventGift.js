import { state } from './gameState.js';
import { vector, vectorAdd, vectorSub, vectorScale, vectorLength, vectorNormalize, randRange } from './utils.js';
import { showBanner } from './banner.js';
import { spawnXpCrumbs } from './xp.js';
import * as constants from './constants.js';
import { sprites } from './sprites.js';

// 이벤트 상태
const eventState = {
  scheduled: [], // 예정된 이벤트 [{triggerTime: number, triggered: false}]
  activeDelivery: null, // 현재 활성화된 배달 {rider, phase, etc}
  giftBox: null, // 떨어진 선물 상자 (라이더와 별도 관리)
  dustParticles: [], // 먼지 파티클
  flyingEnemies: [] // 라이더에 치인 적들 (포물선 애니메이션)
};

// 게임 시작 시 이벤트 스케줄링
export function scheduleEvents() {
  eventState.scheduled = [];

  // 0~5분 사이 랜덤
  eventState.scheduled.push({
    triggerTime: randRange(0, 300),
    triggered: false
  });

  // 5~10분 사이 랜덤
  eventState.scheduled.push({
    triggerTime: randRange(300, 600),
    triggered: false
  });

  // 10~14분 사이 랜덤
  eventState.scheduled.push({
    triggerTime: randRange(600, 840),
    triggered: false
  });
}

// 이벤트 체크 및 발동
export function updateEventGift(dt, elapsed) {
  // 스케줄된 이벤트 체크
  for (const event of eventState.scheduled) {
    if (!event.triggered && elapsed >= event.triggerTime) {
      event.triggered = true;
      console.log('[이벤트 시작] 경과 시간:', elapsed.toFixed(1), '초');
      startDeliveryEvent();
    }
  }

  // 활성화된 배달 처리
  if (eventState.activeDelivery) {
    updateDelivery(dt);
  }

  // 선물 상자 업데이트 (라이더와 별도)
  if (eventState.giftBox) {
    eventState.giftBox.bobTimer += dt * 3;

    // 플레이어가 획득
    const toPlayer = vectorSub(state.playerPos, eventState.giftBox.pos);
    const distance = vectorLength(toPlayer);

    if (distance < 30) {
      console.log('[선물 획득] 거리:', distance.toFixed(1));
      applyGiftEffect();
      eventState.giftBox = null;
    }
  }

  // 먼지 파티클 업데이트
  updateDustParticles(dt);

  // 날아가는 적 업데이트
  updateFlyingEnemies(dt);
}

// 배달 이벤트 시작
function startDeliveryEvent() {
  // 배너 표시
  showBanner('도넛잇츠가 거의 도착하였습니다.', 3, '#8B4513');

  // 라이더 생성 (왼쪽 또는 오른쪽에서 시작)
  const fromLeft = Math.random() < 0.5;
  const startX = fromLeft ? state.playerPos.x - 800 : state.playerPos.x + 800;
  const startY = state.playerPos.y + (Math.random() - 0.5) * 200;
  const startPos = vector(startX, startY);

  eventState.activeDelivery = {
    rider: {
      pos: startPos,
      angle: 0,
      wheelRotation: 0,
      facingRight: !fromLeft // 왼쪽에서 오면 오른쪽을 봄
    },
    phase: 'approaching', // approaching, dropping_animation, leaving
    timer: 0,
    dropTimer: 0,
    dropDuration: 1.5,
    riderBendProgress: 0,
    giftBox: null,
    targetPos: { ...state.playerPos }
  };
}

// 배달 업데이트
function updateDelivery(dt) {
  const delivery = eventState.activeDelivery;
  delivery.timer += dt;

  if (delivery.phase === 'approaching') {
    // 플레이어 위치로 이동
    const toTarget = vectorSub(delivery.targetPos, delivery.rider.pos);
    const distance = vectorLength(toTarget);

    if (distance > 50) {
      const speed = 300;
      const direction = vectorNormalize(toTarget);
      delivery.rider.pos = vectorAdd(delivery.rider.pos, vectorScale(direction, speed * dt));
      delivery.rider.wheelRotation += dt * speed * 0.1;

      // 방향 업데이트
      delivery.rider.facingRight = direction.x > 0;

      // 먼지 파티클 생성 (뒤쪽에서)
      if (Math.random() < 0.3) {
        const dustPos = vectorAdd(delivery.rider.pos, vectorScale(direction, -30));
        spawnDustParticle(dustPos, 0);
      }

      // 적 처치 (이동 중 계속)
      killNearbyEnemies(delivery.rider.pos, 80, direction);
    } else {
      // 도착 - 배달통 드롭 애니메이션 시작
      delivery.phase = 'dropping_animation';
      delivery.dropTimer = 0;
      delivery.dropStartPos = { ...delivery.rider.pos };

      // 적 처치 (도착 시)
      const direction = vectorNormalize(toTarget);
      killNearbyEnemies(delivery.rider.pos, 150, direction);
    }
  } else if (delivery.phase === 'dropping_animation') {
    // 배달통 내려놓는 애니메이션
    delivery.dropTimer += dt;
    const progress = Math.min(delivery.dropTimer / delivery.dropDuration, 1);

    // 라이더 몸 숙이기 애니메이션 (0~0.4 구간)
    if (progress < 0.4) {
      delivery.riderBendProgress = progress / 0.4;
    } else {
      delivery.riderBendProgress = 1 - (progress - 0.4) / 0.6; // 다시 일어남
    }

    if (progress >= 1) {
      // 애니메이션 완료 - 선물 상자 생성하고 바로 퇴장
      eventState.giftBox = {
        pos: { ...delivery.dropStartPos },
        size: 20,
        bobTimer: 0
      };
      console.log('[선물 드롭] 위치:', eventState.giftBox.pos);
      delivery.phase = 'leaving';
    }
  } else if (delivery.phase === 'leaving') {
    // 화면 밖으로 퇴장 (반대편으로)
    const speed = 350;
    const dirX = delivery.rider.facingRight ? 1 : -1;
    const direction = vector(dirX, 0);
    delivery.rider.pos.x += dirX * speed * dt;
    delivery.rider.wheelRotation += dt * speed * 0.1;

    // 먼지 파티클 생성 (뒤쪽에서)
    if (Math.random() < 0.3) {
      const dustPos = vector(delivery.rider.pos.x - dirX * 30, delivery.rider.pos.y);
      spawnDustParticle(dustPos, 0);
    }

    // 적 처치 (퇴장 중)
    killNearbyEnemies(delivery.rider.pos, 80, direction);

    // 화면 밖으로 나가면 종료
    const distanceFromPlayer = vectorLength(vectorSub(delivery.rider.pos, state.playerPos));
    if (distanceFromPlayer > 1000) {
      console.log('[라이더 퇴장] 화면 밖으로 나감');
      eventState.activeDelivery = null;
    }
  }
}

// 라이더와 충돌한 적 처치 (오토바이 바퀴, 몸체와 부딪히는 적들)
function killNearbyEnemies(pos, radius, riderDirection) {
  if (!state.enemies) return;

  // 라이더 크기 (오토바이 + 라이더)
  const riderWidth = 60; // 오토바이 전체 너비
  const riderHeight = 40; // 오토바이 높이

  let hitCount = 0;

  for (let i = state.enemies.length - 1; i >= 0; i--) {
    const enemy = state.enemies[i];

    // 보스는 제외
    if (enemy.isBoss) continue;

    // 적과 라이더의 거리 계산
    const diff = vectorSub(enemy.pos, pos);
    const distance = Math.sqrt(diff.x * diff.x + diff.y * diff.y);

    // 적 크기
    const enemyRadius = (enemy.size || constants.ENEMY_SIZE || 20) / 2;

    // 충돌 판정: 라이더의 직사각형 영역과 적의 원 충돌
    const collisionDistance = riderWidth / 2 + enemyRadius;

    if (distance <= collisionDistance) {
      hitCount++;

      // 적의 경험치 드롭 (enemy.xpValue 사용)
      const xpAmount = enemy.xpValue || 1;
      spawnXpCrumbs(enemy.pos, xpAmount);
      console.log(`[라이더 충돌] ${enemy.type || '적'} 처치, 경험치 ${xpAmount} 드롭, 위치:`, enemy.pos);

      // 적을 날려보내는 애니메이션 추가
      const knockbackDir = riderDirection ? vectorNormalize(riderDirection) : vector(-1, 0);

      // 라이더가 온 반대 방향으로 날아감
      const flyDirection = vectorScale(knockbackDir, -1);

      eventState.flyingEnemies.push({
        pos: { ...enemy.pos },
        velocity: vector(flyDirection.x * 300, -200), // 위쪽으로도 살짝 띄움
        rotation: 0,
        rotationSpeed: randRange(8, 15) * (Math.random() < 0.5 ? 1 : -1),
        lifetime: 2,
        size: enemy.size || constants.ENEMY_SIZE || 20,
        type: enemy.type,
        sprite: enemy.sprite || sprites.enemy // 적의 스프라이트 저장
      });

      // 적 제거
      state.enemies.splice(i, 1);
    }
  }

  if (hitCount > 0) {
    console.log(`[라이더 충돌] 총 ${hitCount}마리 처치`);
  }
}

// 선물 효과 적용
function applyGiftEffect() {
  const effects = ['hp_full', 'toothpaste', 'fail'];
  const randomValue = Math.random();
  const randomIndex = Math.floor(randomValue * effects.length);
  const randomEffect = effects[randomIndex];

  console.log(`[선물 효과 랜덤] random=${randomValue.toFixed(3)}, index=${randomIndex}, effect=${randomEffect}`);

  switch (randomEffect) {
    case 'hp_full':
      // HP 전체 회복
      const beforeHP = state.playerHealth;
      const maxHP = getPlayerMaxHealth();
      state.playerHealth = maxHP;
      console.log(`[HP 회복] ${beforeHP} → ${maxHP}`);
      showBanner('HP 전체 회복!', 2, '#4ade80');
      break;

    case 'toothpaste':
      // 모든 적 처치
      let killedCount = 0;
      if (state.enemies) {
        for (let i = state.enemies.length - 1; i >= 0; i--) {
          const enemy = state.enemies[i];

          // 보스는 제외
          if (enemy.isBoss) continue;

          // 경험치 드롭
          if (enemy.xpValue && enemy.xpValue > 0) {
            spawnXpCrumbs(enemy.pos, enemy.xpValue);
          }

          state.enemies.splice(i, 1);
          killedCount++;
        }
      }
      console.log(`[치약 효과] ${killedCount}마리 처치`);
      showBanner('치약 효과! 모든 적 처치!', 2, '#60a5fa');
      break;

    case 'fail':
      // 꽝
      console.log('[꽝] 아무 효과 없음');
      showBanner('꽝! 누가 음식을 쏟았어!', 2, '#ef4444');
      break;
  }
}

// 플레이어 최대 HP 가져오기
function getPlayerMaxHealth() {
  const baseHealth = constants.TIME_ATTACK_PLAYER_MAX_HEALTH || 10;
  const maxHealthBonus = (state.upgradeLevels?.hp_increase || 0) * 2;
  return baseHealth + maxHealthBonus;
}

// 먼지 파티클 생성
function spawnDustParticle(pos, angle) {
  const offsetAngle = angle + Math.PI + randRange(-0.5, 0.5);
  const offsetDistance = randRange(15, 25);

  eventState.dustParticles.push({
    pos: vectorAdd(pos, vector(
      Math.cos(offsetAngle) * offsetDistance,
      Math.sin(offsetAngle) * offsetDistance
    )),
    velocity: vector(
      Math.cos(offsetAngle) * randRange(20, 40),
      Math.sin(offsetAngle) * randRange(20, 40)
    ),
    size: randRange(3, 8),
    lifetime: randRange(0.3, 0.6),
    maxLifetime: randRange(0.3, 0.6),
    rotation: Math.random() * Math.PI * 2
  });
}

// 먼지 파티클 업데이트
function updateDustParticles(dt) {
  for (let i = eventState.dustParticles.length - 1; i >= 0; i--) {
    const particle = eventState.dustParticles[i];

    particle.lifetime -= dt;
    if (particle.lifetime <= 0) {
      eventState.dustParticles.splice(i, 1);
      continue;
    }

    particle.pos = vectorAdd(particle.pos, vectorScale(particle.velocity, dt));
    particle.velocity = vectorScale(particle.velocity, 0.95);
    particle.rotation += dt * 2;
  }
}

// 날아가는 적 업데이트
function updateFlyingEnemies(dt) {
  for (let i = eventState.flyingEnemies.length - 1; i >= 0; i--) {
    const enemy = eventState.flyingEnemies[i];

    enemy.lifetime -= dt;
    if (enemy.lifetime <= 0) {
      eventState.flyingEnemies.splice(i, 1);
      continue;
    }

    // 포물선 운동 (중력 추가)
    enemy.velocity.y += 500 * dt; // 중력
    enemy.pos = vectorAdd(enemy.pos, vectorScale(enemy.velocity, dt));
    enemy.rotation += enemy.rotationSpeed * dt;
  }
}

// 렌더링
export function drawEventGift(ctx, worldToScreen) {
  // 먼지 파티클 그리기
  drawDustParticles(ctx, worldToScreen);

  // 날아가는 적 그리기
  drawFlyingEnemies(ctx, worldToScreen);

  // 배달 라이더 그리기
  if (eventState.activeDelivery) {
    drawRider(ctx, worldToScreen, eventState.activeDelivery);
  }

  // 선물 상자 그리기 (라이더와 별도 관리)
  if (eventState.giftBox) {
    drawGiftBox(ctx, worldToScreen, eventState.giftBox);
  }
}

// 먼지 파티클 그리기
function drawDustParticles(ctx, worldToScreen) {
  for (const particle of eventState.dustParticles) {
    const screen = worldToScreen(particle.pos);
    const alpha = particle.lifetime / particle.maxLifetime;

    ctx.save();
    ctx.translate(screen.x, screen.y);
    ctx.rotate(particle.rotation);
    ctx.fillStyle = `rgba(200, 180, 160, ${alpha * 0.5})`;
    ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
    ctx.restore();
  }
}

// 날아가는 적 그리기
function drawFlyingEnemies(ctx, worldToScreen) {
  for (const enemy of eventState.flyingEnemies) {
    const screen = worldToScreen(enemy.pos);
    const alpha = Math.min(enemy.lifetime / 0.5, 1); // 페이드 아웃

    ctx.save();
    ctx.translate(screen.x, screen.y);
    ctx.rotate(enemy.rotation); // 뱅글뱅글 회전
    ctx.globalAlpha = alpha;

    // 적 스프라이트 그리기
    if (enemy.sprite) {
      const halfSize = enemy.size / 2;
      ctx.drawImage(enemy.sprite, -halfSize, -halfSize, enemy.size, enemy.size);
    } else {
      // 스프라이트가 없으면 원으로 대체
      ctx.fillStyle = '#8B4513';
      ctx.beginPath();
      ctx.arc(0, 0, enemy.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }
}

// 라이더 그리기 (오토바이 + 라이더)
function drawRider(ctx, worldToScreen, delivery) {
  const rider = delivery.rider;
  const screen = worldToScreen(rider.pos);
  const playerSize = 32; // 플레이어 크기와 동일

  ctx.save();
  ctx.translate(screen.x, screen.y);

  // 왼쪽을 보고 있으면 뒤집기
  if (!rider.facingRight) {
    ctx.scale(-1, 1);
  }

  // 오토바이 (빨간색 시티 오토바이)
  drawMotorcycle(ctx, rider.wheelRotation, playerSize);

  // 라이더 그리기 (드롭 애니메이션 중에는 몸을 숙임)
  if (delivery.phase === 'dropping_animation') {
    const bendProgress = delivery.riderBendProgress || 0;
    const bendOffset = bendProgress * 10; // 몸을 숙이는 정도

    ctx.save();
    ctx.translate(0, bendOffset);
    drawRiderCharacter(ctx, playerSize);
    ctx.restore();

    // 선물 상자를 손에 들고 내려놓는 애니메이션
    const progress = delivery.dropTimer / delivery.dropDuration;
    const handX = playerSize * 0.3; // 손 위치 (앞쪽)
    const handY = -playerSize * 0.4 + bendOffset; // 손 높이

    // 선물 상자가 손에서 땅으로 내려가는 애니메이션
    const giftY = handY + progress * (playerSize * 0.8); // 손에서 땅까지

    ctx.save();
    ctx.translate(handX, giftY);

    // 선물 상자 그리기 (작은 선물)
    const giftSize = 12;
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(-giftSize, -giftSize, giftSize * 2, giftSize * 2);

    // 리본
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -giftSize);
    ctx.lineTo(0, giftSize);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-giftSize, 0);
    ctx.lineTo(giftSize, 0);
    ctx.stroke();

    // 리본 매듭
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(0, -giftSize * 0.5, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 배달통은 오토바이에 그대로 부착
    drawDeliveryBox(ctx, playerSize);
  } else {
    // 일반 상태
    drawRiderCharacter(ctx, playerSize);

    if (delivery.phase === 'approaching') {
      // 접근 중일 때만 배달통 부착
      drawDeliveryBox(ctx, playerSize);
    }
  }
  // leaving 단계에서는 배달통 없이 표시 (이미 내려놓은 상태)

  ctx.restore();
}

// 오토바이 그리기
function drawMotorcycle(ctx, wheelRotation, size) {
  const scale = size / 32;

  // 바퀴 (초코도넛, 스프링클 포함, 회전 애니메이션)
  // 뒷바퀴
  ctx.save();
  ctx.translate(-size * 0.5, size * 0.3);
  drawDonutWheel(ctx, wheelRotation, size * 0.35);
  ctx.restore();

  // 앞바퀴
  ctx.save();
  ctx.translate(size * 0.5, size * 0.3);
  drawDonutWheel(ctx, wheelRotation, size * 0.35);
  ctx.restore();

  // 오토바이 본체 (빨간색)
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(-size * 0.4, -size * 0.1, size * 0.8, size * 0.3);

  // 핸들
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 3 * scale;
  ctx.beginPath();
  ctx.moveTo(size * 0.3, -size * 0.1);
  ctx.lineTo(size * 0.5, -size * 0.4);
  ctx.stroke();

  // 시트 (검은색)
  ctx.fillStyle = '#1f2937';
  ctx.beginPath();
  ctx.ellipse(-size * 0.1, -size * 0.2, size * 0.3, size * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
}

// 도넛 바퀴 그리기 (초코도넛 + 스프링클)
function drawDonutWheel(ctx, rotation, radius) {
  ctx.save();
  ctx.rotate(rotation);

  // 도넛 본체 (초콜릿)
  ctx.fillStyle = '#8B4513';
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  // 중앙 구멍
  ctx.fillStyle = '#f5f5f5';
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // 스프링클 (회전하는 효과)
  const sprinkleCount = 8;
  for (let i = 0; i < sprinkleCount; i++) {
    const angle = (i / sprinkleCount) * Math.PI * 2;
    const x = Math.cos(angle) * radius * 0.7;
    const y = Math.sin(angle) * radius * 0.7;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 2);

    // 랜덤 색상 스프링클
    const colors = ['#ff6b9d', '#4ade80', '#60a5fa', '#fbbf24'];
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(-radius * 0.08, -radius * 0.2, radius * 0.16, radius * 0.4);
    ctx.restore();
  }

  ctx.restore();
}

// 라이더 캐릭터 그리기
function drawRiderCharacter(ctx, size) {
  const scale = size / 32;

  // 몸 (귀여운 캐릭터)
  ctx.fillStyle = '#60a5fa';
  ctx.fillRect(-size * 0.15, -size * 0.6, size * 0.3, size * 0.5);

  // 헬멧 (흰색)
  ctx.fillStyle = '#f5f5f5';
  ctx.beginPath();
  ctx.arc(0, -size * 0.7, size * 0.2, 0, Math.PI * 2);
  ctx.fill();

  // 헬멧 바이저 (검은색)
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(-size * 0.15, -size * 0.75, size * 0.3, size * 0.12);

  // 팔 (왼쪽)
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  ctx.moveTo(-size * 0.15, -size * 0.4);
  ctx.lineTo(size * 0.3, -size * 0.3);
  ctx.stroke();
}

// 배달통 그리기
function drawDeliveryBox(ctx, size) {
  const scale = size / 32;

  // 배달통 본체 (검은색, 뒤쪽에 부착)
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(-size * 0.7, -size * 0.5, size * 0.35, size * 0.4);

  // 도넛잇츠 텍스트 (작게)
  ctx.fillStyle = '#ffffff';
  ctx.font = `${6 * scale}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('도넛잇츠', -size * 0.525, -size * 0.3);
}

// 선물 상자 그리기
function drawGiftBox(ctx, worldToScreen, giftBox) {
  const screen = worldToScreen(giftBox.pos);
  const bob = Math.sin(giftBox.bobTimer) * 5;

  ctx.save();
  ctx.translate(screen.x, screen.y + bob);

  // 상자 본체 (갈색)
  ctx.fillStyle = '#8B4513';
  ctx.fillRect(-giftBox.size, -giftBox.size, giftBox.size * 2, giftBox.size * 2);

  // 리본 (빨간색)
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 3;

  // 세로 리본
  ctx.beginPath();
  ctx.moveTo(0, -giftBox.size);
  ctx.lineTo(0, giftBox.size);
  ctx.stroke();

  // 가로 리본
  ctx.beginPath();
  ctx.moveTo(-giftBox.size, 0);
  ctx.lineTo(giftBox.size, 0);
  ctx.stroke();

  // 리본 매듭
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.arc(0, -giftBox.size * 0.5, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

// 초기화 (게임 시작 시 호출)
export function resetEventGift() {
  eventState.scheduled = [];
  eventState.activeDelivery = null;
  eventState.giftBox = null;
  eventState.dustParticles = [];
  eventState.flyingEnemies = [];
}
