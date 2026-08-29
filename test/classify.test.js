// Offline rules-classifier tests. The 31-case set implements the PRD section 9
// metric: >= 80% classification accuracy across Urdu / Roman Urdu / English.
// The rules engine is the demo-insurance fallback, so these double as its
// correctness contract. If a keyword change breaks a case, update the case
// deliberately, not silently.

import test from 'node:test';
import assert from 'node:assert/strict';
import { fallbackClassify, resolveDepartment, CATEGORIES, SEVERITIES } from '../lib/classify.js';
import { DEPARTMENTS } from '../lib/seed.js';

const CASES = [
  // Roman Urdu
  ['Gulshan block 5 mein kachra 10 din se nahi utha', 'karachi', 'garbage'],
  ['Kachra saaf nahi ho raha, safai wale nahi aa rahe', 'lahore', 'garbage'],
  ['Gali mein trash aur waste pada hai', 'karachi', 'garbage'],
  ['Street light band hai do hafte se, raat mein andhera rehta hai', 'karachi', 'streetlight'],
  ['Batti kharab hai, streetlight nahi jal rahi', 'islamabad', 'streetlight'],
  ['Light out ho gayi hai hamari gali mein', 'lahore', 'streetlight'],
  // pure Roman Urdu, no English keyword to lean on (batti/andhera vocabulary)
  ['Gali ki batti do hafte se nahi jal rahi, raat ko andhera rehta hai', 'lahore', 'streetlight'],
  ['Paani nahi aa raha teen din se', 'karachi', 'water'],
  ['Pani ki supply band hai, nul sookha hua hai', 'faisalabad', 'water'],
  ['Water supply kat gayi, paani ka masla hai', 'lahore', 'water'],
  ['Nali band hai aur sewerage ka pani bahar khara hai', 'karachi', 'sewage'],
  ['Gali ki naliyan block ho gayi hain', 'islamabad', 'sewage'],
  ['Sewage line overflow ho rahi hai', 'karachi', 'sewage'],
  ['Road par bara gaddha hai, pothole se bike slip hui', 'faisalabad', 'road'],
  ['Bara gaddha hai, road se guzarna mushkil hai', 'lahore', 'road'],
  ['Potholes se bhari road, accident hone ka khatra', 'islamabad', 'road'],
  // Urdu script
  ['محلے میں کچرا جمع ہے، صفائی نہیں ہو رہی', 'karachi', 'garbage'],
  ['کچرا اٹھانے والے نہیں آئے', 'faisalabad', 'garbage'],
  ['اسٹریٹ لائٹ خراب ہے، رات میں اندھیرا رہتا ہے', 'lahore', 'streetlight'],
  ['گلی کی بتی نہیں جل رہی', 'karachi', 'streetlight'],
  ['پانی کی فراہمی بند ہے، پینے کا پانی نہیں مل رہا', 'faisalabad', 'water'],
  ['نل سے پانی نہیں آ رہا', 'islamabad', 'water'],
  ['گندا پانی کھلی نالی میں کھڑا ہے', 'karachi', 'sewage'],
  ['نالی بند ہے، گندگی بڑھ رہی ہے', 'lahore', 'sewage'],
  ['سڑک پر بڑا گڑھا بن گیا ہے', 'karachi', 'road'],
  ['روڈ ٹوٹی ہوئی ہے، سڑک مرمت درکار', 'islamabad', 'road'],
  // English
  ['Garbage has not been collected from our street for a week', 'karachi', 'garbage'],
  ['The streetlight outside our house is not working', 'lahore', 'streetlight'],
  ['No water supply since Monday, we are buying tankers', 'faisalabad', 'water'],
  ['Sewage is overflowing from the blocked drain outside our home', 'karachi', 'sewage'],
  ['The road is full of potholes after the rains', 'islamabad', 'road'],
];

test('rules classifier meets the PRD 80% accuracy bar on the 31-case set', () => {
  const results = CASES.map(([text, city, expected]) => ({ expected, actual: fallbackClassify(text, city, '').category }));
  const correct = results.filter((r) => r.actual === r.expected).length;
  console.log(`[classify] rules accuracy: ${correct}/${CASES.length}`);
  assert.ok(correct / CASES.length >= 0.8, `accuracy ${correct}/${CASES.length} below the 0.8 PRD bar`);
});

test('every rules classification returns a valid category and bounded confidence', () => {
  for (const [text, city] of CASES) {
    const out = fallbackClassify(text, city, '');
    assert.ok(CATEGORIES.includes(out.category), `bad category ${out.category} for "${text}"`);
    assert.ok(out.confidence > 0 && out.confidence <= 0.9);
  }
});

test('unclear or out-of-scope complaints fall back to other with low confidence', () => {
  const out = fallbackClassify('The minister should resign immediately', 'karachi', '');
  assert.equal(out.category, 'other');
  assert.ok(out.confidence < 0.6);
});

test('sewage is always high severity; explicit danger words escalate any category', () => {
  assert.equal(fallbackClassify('Nali jam gayi hai', 'karachi', '').severity, 'high');
  const dengue = fallbackClassify('Kachra utha nahi raha, dengue ka khatra hai', 'karachi', '');
  assert.equal(dengue.category, 'garbage');
  assert.equal(dengue.severity, 'high');
});

test('resolveDepartment prefers city coverage, then national, then null', () => {
  assert.equal(resolveDepartment(DEPARTMENTS, 'karachi', 'garbage')?.id, 'sswmb');
  assert.equal(resolveDepartment(DEPARTMENTS, 'karachi', 'water')?.id, 'kwsb');
  assert.equal(resolveDepartment(DEPARTMENTS, 'faisalabad', 'streetlight')?.id, 'mcf');
  assert.equal(resolveDepartment(DEPARTMENTS, 'lahore', 'other')?.id, 'lda');
  // no city entry -> national coverage entities
  assert.equal(resolveDepartment(DEPARTMENTS, 'quetta', 'garbage')?.id, 'mlc');
  // no national entity covers water either -> operator review
  assert.equal(resolveDepartment(DEPARTMENTS, 'quetta', 'water'), null);
});

test('severity vocabulary and categories stay in sync with the enum', () => {
  assert.deepEqual(CATEGORIES, ['garbage', 'streetlight', 'water', 'sewage', 'road', 'other']);
  assert.deepEqual(SEVERITIES, ['low', 'medium', 'high']);
});
