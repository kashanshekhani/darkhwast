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

// Salted scrypt password hashes (`salt:hash`). Existing databases seeded with
// bare sha256 keep working via the legacy branch of verifyPassword.
export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (typeof stored !== 'string' || !stored) return false;
  if (stored.includes(':')) {
    const [salt, hash] = stored.split(':');
    const candidate = crypto.scryptSync(String(password), salt, 64);
    const expected = Buffer.from(hash, 'hex');
    return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
  }
  // Pre-salt legacy hashes: compare in constant time to avoid timing leaks.
  const candidate = Buffer.from(sha256(password), 'hex');
  const expected = Buffer.from(stored, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

export class RateLimiter {
  constructor(max, windowMs) {
    this.max = max;
    this.windowMs = windowMs;
    this.hits = new Map();
    this.lastSweep = 0;
  }
  check(key) {
    const now = Date.now();
    if (now - this.lastSweep >= this.windowMs) this.sweep(now);
    const arr = (this.hits.get(key) || []).filter((t) => now - t < this.windowMs);
    if (arr.length >= this.max) {
      this.hits.set(key, arr);
      return false;
    }
    arr.push(now);
    this.hits.set(key, arr);
    return true;
  }
  // Drop keys whose window has fully elapsed so the map cannot grow forever.
  sweep(now) {
    this.lastSweep = now;
    for (const [key, times] of this.hits) {
      const alive = times.filter((t) => now - t < this.windowMs);
      if (alive.length) this.hits.set(key, alive);
      else this.hits.delete(key);
    }
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

// X-Forwarded-For is only trusted behind a known reverse proxy (TRUST_PROXY=true);
// otherwise a client could spoof it to rotate its way past every rate limit.
export const ipOf = (req) => {
  const xff = process.env.TRUST_PROXY === 'true'
    ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
    : '';
  return xff || req.socket.remoteAddress || 'unknown';
};
