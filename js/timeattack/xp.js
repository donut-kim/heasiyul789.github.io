import { state } from './gameState.js';
import {
  vector,
  vectorAdd,
  vectorScale,
  vectorSub,
  randRange,
  vectorLengthSq,
  clamp
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
  const chunkSize = 20;
  const crumbCount = Math.max(1, Math.round(totalXp / chunkSize));
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

    if (crumb.absorbing && playerPos) {
      const toPlayer = vectorSub(playerPos, crumb.pos);
      const distSq = vectorLengthSq(toPlayer);
      if (distSq <= absorbThresholdSq) {
        collectedXp += crumb.xp;
        continue;
      }
      const dist = Math.sqrt(distSq) || 1;
      const dir = vectorScale(toPlayer, 1 / dist);
      const speed = 220 + (magnetRadius > 0 ? (1 - Math.min(dist / magnetRadius, 1)) * 280 : 0);
      crumb.pos = vectorAdd(crumb.pos, vectorScale(dir, speed * dt));
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

  state.xpCrumbs = remaining;
  return collectedXp;
}

export function drawXpCrumbs(ctx, worldToScreen) {
  if (!state.xpCrumbs || state.xpCrumbs.length === 0) return;
  ensureXpArray();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (const crumb of state.xpCrumbs) {
    const screen = worldToScreen(crumb.pos);
    const bob = crumb.renderOffsetY ?? 0;
    const size = crumb.size * (0.9 + Math.sin(crumb.pulse) * 0.05);

    const gradient = ctx.createRadialGradient(screen.x, screen.y + bob, 0, screen.x, screen.y + bob, size);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.5, 'rgba(240, 240, 240, 0.45)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(screen.x + size * 0.6, screen.y + bob);
    ctx.quadraticCurveTo(screen.x, screen.y + bob - size * 0.7, screen.x - size * 0.4, screen.y + bob - size * 0.1);
    ctx.quadraticCurveTo(screen.x - size * 0.8, screen.y + bob + size * 0.3, screen.x, screen.y + bob + size * 0.4);
    ctx.quadraticCurveTo(screen.x + size * 0.7, screen.y + bob + size * 0.2, screen.x + size * 0.6, screen.y + bob);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(screen.x + size * 0.15, screen.y + bob - size * 0.2, size * 0.25, size * 0.16, -0.3, 0, Math.PI * 2);
    ctx.fill();

    if (crumb.absorbing) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.arc(screen.x, screen.y + bob, size * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}
