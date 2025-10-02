import { state } from './gameState.js';
import {
  vector,
  vectorAdd,
  vectorScale,
  vectorSub,
  randRange,
  vectorLengthSq
} from './utils.js';

let crumbIdCounter = 0;

function ensureXpArray() {
  if (!state.xpCrumbs) {
    state.xpCrumbs = [];
  }
}

export function spawnXpCrumbs(origin, totalXp) {
  if (!totalXp || totalXp <= 0) return;
  ensureXpArray();
  const crumbCount = 1; // 빵가루를 1개로 고정
  const baseXp = Math.floor(totalXp / crumbCount);
  let remainder = Math.round(totalXp - baseXp * crumbCount);

  for (let i = 0; i < crumbCount; i++) {
    const angle = randRange(0, Math.PI * 2);
    const distance = randRange(6, 18);
    const offset = vector(Math.cos(angle) * distance, Math.sin(angle) * distance);
    const velocity = vector(Math.cos(angle) * randRange(10, 20), Math.sin(angle) * randRange(10, 20));

    const bonus = remainder > 0 ? 1 : 0;
    if (remainder > 0) remainder -= 1;

    state.xpCrumbs.push({
      id: crumbIdCounter++,
      pos: vectorAdd(origin, offset),
      velocity,
      driftTimer: randRange(0, Math.PI * 2),
      pulse: randRange(0, Math.PI * 2),
      xp: baseXp + bonus,
      size: randRange(10, 16)
    });
  }
}

// 빵가루 합치기: 가까운 빵가루들을 하나로 합쳐서 개수 줄이기
function mergeCrumbs(crumbs) {
  if (crumbs.length <= 20) return crumbs; // 20개 이하면 합치기 안 함

  const mergeDistanceSq = 30 * 30; // 30px 이내의 빵가루 합치기
  const merged = [];
  const processed = new Set();

  for (let i = 0; i < crumbs.length; i++) {
    if (processed.has(i)) continue;

    const crumb = crumbs[i];
    let totalXp = crumb.xp;
    let totalSize = crumb.size;
    let count = 1;

    // 흡수 중이 아닌 빵가루만 합치기
    if (!crumb.absorbing) {
      for (let j = i + 1; j < crumbs.length; j++) {
        if (processed.has(j)) continue;

        const other = crumbs[j];
        if (other.absorbing) continue;

        const distSq = vectorLengthSq(vectorSub(crumb.pos, other.pos));
        if (distSq <= mergeDistanceSq) {
          totalXp += other.xp;
          totalSize += other.size;
          count++;
          processed.add(j);
        }
      }
    }

    processed.add(i);

    // 합쳐진 빵가루 생성
    merged.push({
      ...crumb,
      xp: totalXp,
      size: Math.min(totalSize / count * 1.2, 24) // 크기 제한
    });
  }

  return merged;
}

export function updateXpCrumbs(dt, playerPos, magnetRadius = 28) {
  if (!state.xpCrumbs || state.xpCrumbs.length === 0) return 0;
  ensureXpArray();

  const damping = 0.88;
  const magnetSq = magnetRadius > 0 ? magnetRadius * magnetRadius : 0;
  const absorbThresholdSq = 9;
  let collectedXp = 0;
  const remaining = [];

  for (const crumb of state.xpCrumbs) {
    crumb.driftTimer += dt;
    crumb.pulse += dt * 4;

    // 자석 효과 처리
    if (crumb.isMagnetized && crumb.magnetDelay !== undefined) {
      crumb.magnetDelay -= dt;
      if (crumb.magnetDelay <= 0 && !crumb.absorbing) {
        crumb.absorbing = true;
        crumb.magnetSpeed = 150; // 자석 효과는 느리게 시작
      }
    }

    if (crumb.absorbing && playerPos) {
      const toPlayer = vectorSub(playerPos, crumb.pos);
      const distSq = vectorLengthSq(toPlayer);
      if (distSq <= absorbThresholdSq) {
        collectedXp += crumb.xp;
        continue;
      }
      const dist = Math.sqrt(distSq) || 1;
      const dir = vectorScale(toPlayer, 1 / dist);

      // 자석 효과일 때는 점진적으로 가속
      if (crumb.isMagnetized) {
        crumb.magnetSpeed = Math.min((crumb.magnetSpeed || 150) + dt * 300, 600);
        const speed = crumb.magnetSpeed;
        crumb.pos = vectorAdd(crumb.pos, vectorScale(dir, speed * dt));
      } else {
        // 일반 자석 효과
        const speed = 220 + (magnetRadius > 0 ? (1 - Math.min(dist / magnetRadius, 1)) * 280 : 0);
        crumb.pos = vectorAdd(crumb.pos, vectorScale(dir, speed * dt));
      }

      crumb.size = Math.max(crumb.size * (1 - dt * 3), crumb.size * 0.4);
      crumb.renderOffsetY = 0;
      crumb.absorbGlow = (crumb.absorbGlow || 0) + dt;
    } else {
      crumb.pos = vectorAdd(crumb.pos, vectorScale(crumb.velocity, dt));
      crumb.velocity = vectorScale(crumb.velocity, Math.pow(damping, dt * 60));
      crumb.renderOffsetY = Math.sin(crumb.driftTimer * 2) * 4;

      if (playerPos && magnetRadius > 0) {
        const diff = vectorSub(playerPos, crumb.pos);
        if (vectorLengthSq(diff) <= magnetSq) {
          crumb.absorbing = true;
          crumb.absorbGlow = 0;
        }
      }
    }

    remaining.push(crumb);
  }

  // 빵가루가 많을 때만 합치기 수행 (1초에 한 번 정도)
  state.xpMergeTimer = (state.xpMergeTimer || 0) + dt;
  if (state.xpMergeTimer >= 1.0 && remaining.length > 20) {
    state.xpCrumbs = mergeCrumbs(remaining);
    state.xpMergeTimer = 0;
  } else {
    state.xpCrumbs = remaining;
  }

  return collectedXp;
}

// 그라디언트 캐싱 (매번 생성하지 않음)
const gradientCache = new Map();
function getCachedGradient(ctx, x, y, size) {
  const key = Math.round(size / 2) * 2; // 크기를 2px 단위로 반올림
  if (!gradientCache.has(key)) {
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, key);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.5, 'rgba(240, 240, 240, 0.45)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    gradientCache.set(key, gradient);
  }
  return gradientCache.get(key);
}

export function drawXpCrumbs(ctx, worldToScreen) {
  if (!state.xpCrumbs || state.xpCrumbs.length === 0) return;
  ensureXpArray();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // 항상 상세한 렌더링 (원래 모양 유지)
  for (const crumb of state.xpCrumbs) {
    const screen = worldToScreen(crumb.pos);
    const bob = crumb.renderOffsetY ?? 0;
    const size = crumb.size * (0.9 + Math.sin(crumb.pulse) * 0.05);

    ctx.save();
    ctx.translate(screen.x, screen.y + bob);

    const gradient = getCachedGradient(ctx, 0, 0, size);
    ctx.fillStyle = gradient;

    ctx.beginPath();
    ctx.moveTo(size * 0.6, 0);
    ctx.quadraticCurveTo(0, -size * 0.7, -size * 0.4, -size * 0.1);
    ctx.quadraticCurveTo(-size * 0.8, size * 0.3, 0, size * 0.4);
    ctx.quadraticCurveTo(size * 0.7, size * 0.2, size * 0.6, 0);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(size * 0.15, -size * 0.2, size * 0.25, size * 0.16, -0.3, 0, Math.PI * 2);
    ctx.fill();

    if (crumb.absorbing) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  ctx.restore();
}
