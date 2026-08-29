// Formal letter builder tests (FR-3): the letter must carry the citizen's own
// words, the routed department, the tracking reference and link, and the
// identity/anonymity block the citizen chose — without inventing facts.

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLetter, buildSubject } from '../lib/letter.js';
import { DEPARTMENTS } from '../lib/seed.js';

const base = {
  tracking_id: 'DK-2026-TEST01',
  raw_text: 'Gulshan block 5 mein kachra 10 din se nahi utha.',
  city: 'karachi',
  area: 'Gulshan-e-Iqbal Block 5',
  category: 'garbage',
  severity: 'high',
};

const sswmb = DEPARTMENTS.find((d) => d.id === 'sswmb');

test('buildSubject carries category, location and tracking reference', () => {
  const s = buildSubject(base);
  assert.ok(s.includes('DK-2026-TEST01'));
  assert.ok(s.includes('Karachi'));
  assert.ok(s.includes('Uncollected garbage'));
});

test('anonymous letter embeds citizen text, department, location and tracking link', () => {
  const letter = buildLetter({ complaint: base, dept: sswmb, identity: null });
  assert.ok(letter.includes(base.raw_text), 'the citizen raw text is the heart of the letter');
  assert.ok(letter.includes(sswmb.name));
  assert.ok(letter.includes('DK-2026-TEST01'));
  assert.ok(letter.includes('Location: Gulshan-e-Iqbal Block 5, Karachi'));
  assert.ok(letter.includes('Track this complaint:'));
  assert.ok(letter.includes('filed anonymously'));
  assert.ok(!letter.includes('Complainant:'));
});

test('identified letter attaches the identity block instead of the anonymity note', () => {
  const letter = buildLetter({
    complaint: base,
    dept: sswmb,
    identity: { anonymous: false, name: 'Farhan Ahmed', phone: '0300-1234567', email: 'farhan@example.com' },
  });
  assert.ok(letter.includes('Complainant: Farhan Ahmed'));
  assert.ok(letter.includes('Phone: 0300-1234567'));
  assert.ok(letter.includes('Email: farhan@example.com'));
  assert.ok(!letter.includes('filed anonymously'));
});

test('high severity asks for urgency; low severity stays courteous', () => {
  const urgent = buildLetter({ complaint: base, dept: sswmb, identity: null });
  assert.ok(urgent.includes('treated with urgency'));
  const calm = buildLetter({ complaint: { ...base, severity: 'low' }, dept: sswmb, identity: null });
  assert.ok(calm.includes('earliest convenience'));
});

test('unrouted letter addresses a pending authority instead of a department', () => {
  const letter = buildLetter({ complaint: base, dept: null, identity: null });
  assert.ok(letter.includes('[Authority to be determined after review]'));
});
