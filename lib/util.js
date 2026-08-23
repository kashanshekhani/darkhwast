import crypto from 'node:crypto';

export const OFFICIAL_STATUSES = ['acknowledged', 'in_progress', 'resolved', 'rejected'];
// statuses visible on the public tracking page
export const PUBLIC_STATUSES = ['sent', 'send_failed', 'acknowledged', 'in_progress', 'resolved', 'rejected'];

export const genId = () => crypto.randomUUID();

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export function genTrackingId() {
  const bytes = crypto.randomBytes(6);
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return `DK-2026-${s}`;
}

export const sha256 = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');

export class RateLimiter {
  constructor(max, windowMs) {
    this.max = max;
    this.windowMs = windowMs;
    this.hits = new Map();
  }
  check(key) {
    const now = Date.now();
    const arr = (this.hits.get(key) || []).filter((t) => now - t < this.windowMs);
    if (arr.length >= this.max) return false;
    arr.push(now);
    this.hits.set(key, arr);
    return true;
  }
}

// Minimal profanity screen before anything is dispatched in the product's name.
const PROFANITY = [
  'fuck', 'shit', 'bastard', 'bhenchod', 'behen chod', 'madarchod', 'motherfucker',
  'harami', 'gandu', 'kutta', 'kutte', 'lanat', 'بھینچود', 'حرامی', 'کمینہ',
];
export function hasProfanity(text) {
  const t = String(text || '').toLowerCase();
  return PROFANITY.some((w) => t.includes(w));
}

export const isPhone = (s) => /^[0-9+\-\s()]{7,20}$/.test(String(s || '').trim());
export const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());

export const nowIso = () => new Date().toISOString();

export const daysAgoIso = (days, hours = 0) =>
  new Date(Date.now() - days * 86400e3 - hours * 3600e3).toISOString();

export const ipOf = (req) =>
  (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
