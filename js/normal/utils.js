// Utility functions

// Vector operations
export function vector(x, y) {
  return { x, y };
}

export function vectorAdd(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vectorSub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function vectorScale(v, scale) {
  return { x: v.x * scale, y: v.y * scale };
}

export function vectorLength(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function vectorLengthSq(v) {
  return v.x * v.x + v.y * v.y;
}

export function vectorNormalize(v) {
  const len = vectorLength(v);
  return len > 0 ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 };
}

export function vectorClampLength(v, maxLength) {
  const lenSq = vectorLengthSq(v);
  if (lenSq <= maxLength * maxLength) return v;
  const len = Math.sqrt(lenSq);
  const scale = maxLength / len;
  return { x: v.x * scale, y: v.y * scale };
}

export function vectorCopy(v) {
  return { x: v.x, y: v.y };
}


// Math utilities
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function randRange(min, max) {
  return Math.random() * (max - min) + min;
}

export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Collision detection
export function circleIntersects(posA, radiusA, posB, radiusB) {
  return vectorLengthSq(vectorSub(posA, posB)) <= (radiusA + radiusB) * (radiusA + radiusB);
}

// UI utilities
export function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  if (mins > 0) {
    return secs > 0 ? `${mins}분 ${secs}초` : `${mins}분`;
  }
  return `${secs}초`;
}

export function getElementCenter(element) {
  const rect = element.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

// Canvas utilities
export function roundRect(ctx, x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 난수 생성기
export function makeRng(seed = Date.now()) {
  let s = seed >>> 0;
  return function rng() {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 거리 계산
export function distance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// 각도 관련
export function angleTowards(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export function angleDifference(a, b) {
  let diff = b - a;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return diff;
}

// 배열 유틸리티
export function shuffleArray(array) {
  const rng = makeRng();
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function removeFromArray(array, item) {
  const index = array.indexOf(item);
  if (index > -1) {
    array.splice(index, 1);
  }
}