// Unit tests for lib/util.js: IDs, password hashing (scrypt + legacy sha256),
// rate limiter (including pruning), validation, profanity screen, client IP.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  genTrackingId, sha256, hashPassword, verifyPassword, RateLimiter,
  hasProfanity, isPhone, isEmail, ipOf, nowIso, daysAgoIso,
  OFFICIAL_STATUSES, PUBLIC_STATUSES,
} from '../lib/util.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

test('genTrackingId emits DK-2026 IDs from the unambiguous alphabet', () => {
  const seen = new Set();
  for (let i = 0; i < 200; i++) {
    const id = genTrackingId();
    assert.match(id, /^DK-2026-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
    seen.add(id);
  }
  assert.equal(seen.size, 200, 'tracking IDs must not repeat');
});

test('RateLimiter enforces the max inside the window and frees after it', async () => {
  const rl = new RateLimiter(2, 40);
  assert.equal(rl.check('a'), true);
  assert.equal(rl.check('a'), true);
  assert.equal(rl.check('a'), false);
  await sleep(50);
  assert.equal(rl.check('a'), true);
});

test('RateLimiter keys are independent', () => {
  const rl = new RateLimiter(1, 60_000);
  assert.equal(rl.check('ip-1'), true);
  assert.equal(rl.check('ip-1'), false);
  assert.equal(rl.check('ip-2'), true);
});

test('RateLimiter prunes stale keys so the map cannot grow forever', async () => {
  const rl = new RateLimiter(1, 30);
  rl.check('old-ip');
  assert.equal(rl.hits.has('old-ip'), true);
  await sleep(40);
  rl.check('new-ip'); // triggers a sweep past the window
  assert.equal(rl.hits.has('old-ip'), false);
  assert.equal(rl.hits.has('new-ip'), true);
});

test('hashPassword produces salt:hash and verifies round-trip', () => {
  const stored = hashPassword('darkhwast2026');
  assert.match(stored, /^[0-9a-f]{32}:[0-9a-f]{128}$/);
  assert.equal(verifyPassword('darkhwast2026', stored), true);
  assert.equal(verifyPassword('wrong-password', stored), false);
  assert.equal(verifyPassword('darkhwast2026', ''), false);
});

test('hashPassword salts every hash differently', () => {
  assert.notEqual(hashPassword('x'), hashPassword('x'));
});

test('verifyPassword still accepts legacy unsalted sha256 hashes', () => {
  assert.equal(verifyPassword('darkhwast2026', sha256('darkhwast2026')), true);
  assert.equal(verifyPassword('nope', sha256('darkhwast2026')), false);
});

test('hasProfanity screens English and Urdu abuse', () => {
  assert.equal(hasProfanity('this is shit'), true);
  assert.equal(hasProfanity('یہ حرامی ہے'), true);
  assert.equal(hasProfanity('Gulshan mein kachra utha nahi raha'), false);
  assert.equal(hasProfanity(''), false);
});

test('phone and email validators match the intake regexes', () => {
  assert.equal(isPhone('0300-1234567'), true);
  assert.equal(isPhone('+92 300 1234567'), true);
  assert.equal(isPhone('abc'), false);
  assert.equal(isEmail('farhan@example.com'), true);
  assert.equal(isEmail('farhan@'), false);
});

test('ipOf ignores X-Forwarded-For unless TRUST_PROXY is enabled', () => {
  const req = { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }, socket: { remoteAddress: '9.9.9.9' } };
  const prev = process.env.TRUST_PROXY;
  try {
    delete process.env.TRUST_PROXY;
    assert.equal(ipOf(req), '9.9.9.9', 'spoofed XFF must not be trusted by default');
    process.env.TRUST_PROXY = 'true';
    assert.equal(ipOf(req), '1.2.3.4', 'first hop of XFF behind a proxy');
  } finally {
    if (prev === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = prev;
  }
});

test('public tracking statuses never expose pre-send states', () => {
  assert.equal(PUBLIC_STATUSES.includes('draft'), false);
  assert.equal(PUBLIC_STATUSES.includes('needs_review'), false);
  assert.ok(OFFICIAL_STATUSES.includes('resolved'));
});

test('timestamp helpers emit ISO strings', () => {
  assert.match(nowIso(), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  assert.ok(new Date(daysAgoIso(1, 1)).getTime() < Date.now() - 86_000_000);
});
