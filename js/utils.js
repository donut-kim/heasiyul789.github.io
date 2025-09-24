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
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}분${secs.toString().padStart(2, '0')}초`;
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