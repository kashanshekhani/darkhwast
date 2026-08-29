// Formal complaint letter builder (FR-3).
// The letter is built from the citizen's actual complaint text (raw_text),
// not generic category summaries. This ensures the letter faithfully
// represents what the citizen reported without inventing facts.

import { CITIES } from './seed.js';
import { CATEGORY_PHRASE } from './classify.js';

const PUBLIC_BASE_URL = () => (process.env.PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

export function buildSubject(c) {
  const city = CITIES[c.city]?.en || c.city;
  const area = c.area ? `${c.area}, ` : '';
  return `Citizen Complaint – ${CATEGORY_PHRASE[c.category]} – ${area}${city} [Ref: ${c.tracking_id}]`;
}

export function buildLetter({ complaint: c, dept, identity }) {
  const city = CITIES[c.city]?.en || c.city;
  const date = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // Addressee block
  const deptLines = dept
    ? [dept.name + ',', (dept.city === 'national' ? 'Cantonment / National Jurisdiction' : CITIES[dept.city]?.en || city) + '.']
    : ['[Authority to be determined after review],', city + '.'];

  // Subject line
  const locationStr = c.area ? `${c.area}, ${city}` : city;
  const subject = `Complaint Regarding: ${CATEGORY_PHRASE[c.category]} in ${locationStr}`;

  // Identity / anonymous block
  const identityBlock = identity && !identity.anonymous
    ? [
        `Complainant: ${identity.name}`,
        identity.phone ? `Phone: ${identity.phone}` : null,
        identity.email ? `Email: ${identity.email}` : null,
      ].filter(Boolean).join('\n')
    : `This complaint has been filed anonymously through DarKhwast. No citizen contact details are attached.\nStatus updates are publicly viewable at the tracking link below.`;

  const signature = identity && !identity.anonymous ? identity.name : 'A Concerned Citizen';

  // Severity note — only factual framing, no invented urgency
  const severityNote = c.severity === 'high'
    ? 'I request that this matter be treated with urgency given the nature of the issue.'
    : 'I kindly request that the concerned department look into this matter and arrange for its resolution at the earliest convenience.';

  const lines = [
    `Date: ${date}`,
    `Reference: ${c.tracking_id}`,
    '',
    'To,',
    'The Concerned Officer,',
    ...deptLines,
    '',
    `Subject: ${subject}`,
    '',
    'Respected Sir / Madam,',
    '',
    'I am writing to formally report the following civic issue for your attention and action:',
    '',
    // The citizen's actual complaint — the heart of the letter
    String(c.raw_text || '').trim(),
    '',
  ];

  // Location line (only add if area is specified)
  if (c.area) {
    lines.push(`Location: ${locationStr}`);
    lines.push('');
  }

  lines.push(severityNote);
  lines.push('');
  lines.push('---');
  lines.push(identityBlock);
  lines.push('');
  lines.push('Yours sincerely,');
  lines.push(signature);
  lines.push('(via DarKhwast — AI-assisted Citizen Complaint Service)');
  lines.push('');
  lines.push(`Track this complaint: ${PUBLIC_BASE_URL()}/track/${c.tracking_id}`);

  return lines.join('\n');
}
