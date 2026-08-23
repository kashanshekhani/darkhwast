// Formal complaint letter builder (FR-3).
// The letter is assembled deterministically from AI-extracted facts into a
// formal template: instant, auditable, and identical in demo and production.
// (v2 idea: optional LLM polish pass - deliberately not in the MVP path.)

import { CITIES } from './seed.js';
import { CATEGORY_PHRASE } from './classify.js';

const PUBLIC_BASE_URL = () => (process.env.PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

const SEVERITY_SENTENCE = {
  high: 'This issue presents an ongoing risk to public health and safety and may be treated as urgent.',
  medium: 'The issue is affecting daily life in the area and early attention is requested.',
  low: 'The issue is a maintenance matter and your routine attention is requested.',
};

export function buildSubject(c) {
  return `Citizen complaint ${c.tracking_id}: ${CATEGORY_PHRASE[c.category]} (${CITIES[c.city]?.en || c.city})`;
}

export function buildLetter({ complaint: c, dept, identity }) {
  const city = CITIES[c.city]?.en || c.city;
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const deptLines = dept
    ? [`The Concerned Officer,`, dept.name + ',', (dept.city === 'national' ? 'Cantonment / National jurisdiction' : CITIES[dept.city]?.en || '') + '.']
    : ['The Concerned Officer,', '[Authority to be determined after review],', city + '.'];

  const identityBlock = identity && !identity.anonymous
    ? `Complainant: ${identity.name}\nPhone: ${identity.phone || '-'}\nEmail: ${identity.email || '-'}\nA reply may be sent directly to the complainant, or through the DarKhwast tracking reference below.`
    : `This complaint has been filed anonymously through DarKhwast. No citizen contact details are attached. Status updates are publicly viewable at the tracking reference below.`;

  const signature = identity && !identity.anonymous ? identity.name : 'A concerned citizen';

  return [
    'DARKHWAST - CITIZEN COMPLAINT SERVICE',
    `Reference: ${c.tracking_id}    Date: ${date}`,
    '',
    'To,',
    ...deptLines,
    '',
    `Subject: ${CATEGORY_PHRASE[c.category]} - ${c.area ? c.area + ', ' : ''}${city} (Ref: ${c.tracking_id})`,
    '',
    'Respected Sir / Madam,',
    '',
    'I wish to bring the following civic issue to your kind attention:',
    '',
    c.summary_en,
    '',
    `Issue type: ${CATEGORY_PHRASE[c.category]}`,
    `Location: ${c.location_description || `${c.area ? c.area + ', ' : ''}${city}`}`,
    `Severity: ${c.severity.toUpperCase()}`,
    '',
    SEVERITY_SENTENCE[c.severity] || SEVERITY_SENTENCE.medium,
    '',
    'I request that this matter be reviewed and addressed at the earliest.',
    '',
    '---',
    identityBlock,
    '',
    'Yours sincerely,',
    signature,
    'via DarKhwast (AI-assisted citizen complaint service)',
    '',
    `Track this complaint: ${PUBLIC_BASE_URL()}/track/${c.tracking_id}`,
  ].join('\n');
}
