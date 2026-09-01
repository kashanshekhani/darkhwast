// i18n string-table integrity: every key referenced by the templates must
// exist in both en and ur, and the new intake/about keys added in the audit
// fix pass are present and non-empty.

import test from 'node:test';
import assert from 'node:assert/strict';
import { STRINGS, VOCAB } from '../public/js/i18n.js';

const REQUIRED_KEYS = [
  // audit fixes: F4 city error, F5 about card, F7 intake labels
  'city_required',
  'about_cities_t', 'about_cities_sub', 'about_cities_note',
  'photos_add', 'optional', 'photos_help', 'photos_upload_text', 'photos_upload_hint',
  'location_label', 'no_location',
  'contact_heading', 'contact_help', 'email_label', 'phone_label',
  'anon_toggle_label', 'anon_toggle_help',
];

test('every required i18n key exists in both en and ur with a non-empty value', () => {
  for (const key of REQUIRED_KEYS) {
    assert.ok(STRINGS.en[key], `missing en key: ${key}`);
    assert.ok(STRINGS.ur[key], `missing ur key: ${key}`);
    assert.ok(String(STRINGS.en[key]).trim().length > 0, `empty en value: ${key}`);
    assert.ok(String(STRINGS.ur[key]).trim().length > 0, `empty ur value: ${key}`);
  }
});

test('the duplicate step1_t key was removed (only one definition per language)', () => {
  // After the F6 fix, step1_t should resolve to the "Describe" / "بیان کریں" value
  // used by index.html, not the old "Describe it" / "مسئلہ بتائیں" value.
  assert.equal(STRINGS.en.step1_t, 'Describe');
  assert.equal(STRINGS.ur.step1_t, 'بیان کریں');
});

test('dead step*_d / step2_t / step3_t keys were removed', () => {
  for (const k of ['step1_d', 'step2_d', 'step3_d', 'step2_t', 'step3_t']) {
    assert.equal(STRINGS.en[k], undefined, `en still has dead key ${k}`);
    assert.equal(STRINGS.ur[k], undefined, `ur still has dead key ${k}`);
  }
});

test('VOCAB cities cover all four supported cities in both languages', () => {
  for (const id of ['karachi', 'lahore', 'islamabad', 'faisalabad']) {
    assert.ok(VOCAB.cities.en[id], `missing en city ${id}`);
    assert.ok(VOCAB.cities.ur[id], `missing ur city ${id}`);
  }
});
