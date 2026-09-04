// Seed data: the routing knowledge base (FR-4), demo official accounts,
// and sample complaints so the dashboard is never empty on first run.
//
// IMPORTANT: department emails are public-directory placeholders, verified:false.
// They exist so routing and dispatch are demonstrable. Before any REAL outbound
// sending, each entry must be verified and updated (see README).

import { daysAgoIso } from './util.js';
import { buildLetter } from './letter.js';

export const CITIES = {
  karachi: { id: 'karachi', en: 'Karachi', ur: 'کراچی' },
  lahore: { id: 'lahore', en: 'Lahore', ur: 'لاہور' },
  islamabad: { id: 'islamabad', en: 'Islamabad', ur: 'اسلام آباد' },
  faisalabad: { id: 'faisalabad', en: 'Faisalabad', ur: 'فیصل آباد' },
};

export const DEPARTMENTS = [
  // Karachi
  { id: 'sswmb', name: 'Sindh Solid Waste Management Board (SSWMB)', city: 'karachi', coverage: 'seed',
    categories_covered: ['garbage'], email: 'info@sswmb.gos.pk',
    jurisdiction_notes: 'Solid waste collection and disposal, Karachi divisions.' },
  { id: 'kwsb', name: 'Karachi Water & Sewerage Board (KW&SB)', city: 'karachi', coverage: 'seed',
    categories_covered: ['water', 'sewage'], email: 'info@kwsb.gos.pk',
    jurisdiction_notes: 'Water supply and sewerage, Karachi.' },
  { id: 'kmc', name: 'Karachi Metropolitan Corporation (KMC)', city: 'karachi', coverage: 'seed',
    categories_covered: ['road', 'other'], email: 'info@kmc.gos.pk',
    jurisdiction_notes: 'Municipal roads, streets and general civic services.' },
  { id: 'ke', name: 'K-Electric', city: 'karachi', coverage: 'seed',
    categories_covered: ['streetlight'], email: 'info@ke.com.pk',
    jurisdiction_notes: 'Streetlights on major corridors, electricity distribution.' },
  // Lahore
  { id: 'lwmc', name: 'Lahore Waste Management Company (LWMC)', city: 'lahore', coverage: 'seed',
    categories_covered: ['garbage'], email: 'info@lwmc.com.pk',
    jurisdiction_notes: 'Solid waste collection, Lahore.' },
  { id: 'wasa-lhr', name: 'Water & Sanitation Agency (WASA) Lahore', city: 'lahore', coverage: 'seed',
    categories_covered: ['water', 'sewage'], email: 'info@wasa.lahore.gov.pk',
    jurisdiction_notes: 'Water supply, sewerage and drainage, Lahore.' },
  { id: 'lda', name: 'Lahore Development Authority (LDA)', city: 'lahore', coverage: 'seed',
    categories_covered: ['road', 'other'], email: 'info@lda.gop.pk',
    jurisdiction_notes: 'Development authority roads and infrastructure.' },
  { id: 'mcl', name: 'Metropolitan Corporation Lahore (MCL)', city: 'lahore', coverage: 'seed',
    categories_covered: ['streetlight'], email: 'info@mcl.gop.pk',
    jurisdiction_notes: 'Streetlights and municipal lighting, Lahore.' },
  // Islamabad
  { id: 'iwmc', name: 'Islamabad Waste Management Company (IWMC)', city: 'islamabad', coverage: 'seed',
    categories_covered: ['garbage'], email: 'info@iwmc.com.pk',
    jurisdiction_notes: 'Solid waste collection, Islamabad.' },
  { id: 'mci-isb', name: 'Metropolitan Corporation Islamabad (MCI)', city: 'islamabad', coverage: 'seed',
    categories_covered: ['water', 'sewage', 'streetlight'], email: 'info@mci.gov.pk',
    jurisdiction_notes: 'Water, sewerage and streetlights, Islamabad.' },
  { id: 'cda', name: 'Capital Development Authority (CDA)', city: 'islamabad', coverage: 'seed',
    categories_covered: ['road', 'other'], email: 'info@cda.gov.pk',
    jurisdiction_notes: 'Roads and general civic infrastructure, Islamabad.' },
  // Faisalabad
  { id: 'fmwmc', name: 'Faisalabad Waste Management Company (FMWMC)', city: 'faisalabad', coverage: 'seed',
    categories_covered: ['garbage'], email: 'info@fmwmc.com.pk',
    jurisdiction_notes: 'Solid waste collection, Faisalabad.' },
  { id: 'wasa-fsd', name: 'Water & Sanitation Agency (WASA) Faisalabad', city: 'faisalabad', coverage: 'seed',
    categories_covered: ['water', 'sewage'], email: 'info@wasafsd.gov.pk',
    jurisdiction_notes: 'Water supply and sewerage, Faisalabad.' },
  { id: 'mcf', name: 'Metropolitan Corporation Faisalabad (MCF)', city: 'faisalabad', coverage: 'seed',
    categories_covered: ['road', 'streetlight', 'other'], email: 'info@mcf.gop.pk',
    jurisdiction_notes: 'Municipal roads, streetlights and civic services.' },
  // National coverage
  { id: 'mlc', name: 'Military Lands & Cantonment (MLC) - local cantonment board', city: 'national', coverage: 'national',
    categories_covered: ['garbage', 'road', 'streetlight'], email: 'info@mlc.gov.pk',
    jurisdiction_notes: 'Cantonment areas across Pakistan (bypassed when a city entry exists).' },
  { id: 'nha', name: 'National Highway Authority (NHA)', city: 'national', coverage: 'national',
    categories_covered: ['road'], email: 'info@nha.gov.pk',
    jurisdiction_notes: 'National highways and motorways.' },
].map((d) => ({ ...d, verified: false, source: 'public web directory - VERIFY before real dispatch', updated_at: '2026-08-23T00:00:00.000Z' }));

export const OFFICIALS = [
  { id: 'off-demo', email: 'demo@darkhwast.pk', password: 'darkhwast2026', name: 'Demo Officer', role: 'admin', department_id: null },
  { id: 'off-view', email: 'viewer@darkhwast.pk', password: 'darkhwast2026', name: 'KW&SB Sample User', role: 'viewer', department_id: 'kwsb' },
];

// Demo citizen account for the community platform, seeded like the demo
// official so judges can try register/login/support/comment instantly.
export const CITIZENS = [
  { id: 'user-demo', email: 'demo.citizen@darkhwast.pk', password: 'darkhwast2026', name: 'Demo Citizen', google_id: null, auth_provider: 'password' },
];

// ---------------------------------------------------------------------------
// Sample complaints. Marked is_sample:true and tagged in the dashboard UI so
// the demo stays honest: judges see which rows are seeded vs filed live.
// ---------------------------------------------------------------------------
export function buildSamples() {
  const complaints = [];
  const events = [];
  const ev = (cid, from, to, actor, note, at) => events.push({ id: `ev-${cid}-${events.length}`, complaint_id: cid, from_status: from, to_status: to, actor, note, created_at: at });

  const mk = (o) => {
    const dept = DEPARTMENTS.find((d) => d.id === o.dept) || null;
    const identity = o.anonymous ? null : { anonymous: false, name: o.name || '', phone: o.phone || '', email: o.email || '' };
    const letter = buildLetter({ complaint: { tracking_id: o.tid, raw_text: o.raw, city: o.city, area: o.area, category: o.category, severity: o.severity }, dept, identity });
    const isSent = ['sent', 'acknowledged', 'in_progress', 'resolved', 'rejected'].includes(o.status);
    const c = {
      id: o.id, tracking_id: o.tid, raw_text: o.raw, language_detected: null,
      city: o.city, area: o.area, category: o.category, severity: o.severity,
      summary_en: o.summary_en, summary_ur: o.summary_ur, location_description: `${o.area}, ${CITIES[o.city].en}`,
      ai_confidence: 0.88, classification_source: 'qwen', classification_raw: { sample: true },
      department_id: o.dept, routing_rationale: o.rationale, status: o.status,
      is_anonymous: o.anonymous, citizen_name: o.name || null, citizen_phone: o.phone || null, citizen_email: o.email || null,
      created_at: o.created, sent_at: o.sent || null, resolved_at: o.resolved || null,
      dispatch_log: o.dispatch || [], draft_english: letter, letter_final: isSent ? letter : null, is_sample: true,
      visibility: 'public', created_by_user_id: null,
      escalation_level: 0, escalated_at: null, photo_assessment: null,
    };
    complaints.push(c);
  };

  mk({
    id: 'sample-1', tid: 'DK-2026-7K4M2P', city: 'faisalabad', area: 'Peoples Colony No. 1',
    raw: 'محلے میں چار دن سے پانی کی سپلائی بند ہے۔ پینے کے لیے ٹینکر منگوانا پڑ رہا ہے۔ بچوں اور بزرگوں کو بہت مشکل ہو رہی ہے۔',
    category: 'water', severity: 'high', dept: 'wasa-fsd', status: 'in_progress', anonymous: true,
    summary_en: 'No water supply for four days in Peoples Colony No. 1, Faisalabad; residents depend on tankers.',
    summary_ur: 'فیصل آباد کی پیپلز کالونی نمبر 1 میں چار دن سے پانی کی فراہمی بند ہے۔',
    rationale: 'WASA Faisalabad handles water supply in Faisalabad.',
    created: daysAgoIso(3, 2), sent: daysAgoIso(3, 1),
    dispatch: [{ at: daysAgoIso(3, 1), to: 'info@wasafsd.gov.pk', simulated: true, message_id: 'sim-sample-1', ok: true }],
  });
  ev('sample-1', null, 'draft', 'system', 'Sample data', daysAgoIso(3, 2));
  ev('sample-1', 'draft', 'sent', 'citizen', 'Complaint approved and sent by citizen', daysAgoIso(3, 1));
  ev('sample-1', 'sent', 'acknowledged', 'official', 'Received by WASA complaint cell', daysAgoIso(2, 20));
  ev('sample-1', 'acknowledged', 'in_progress', 'official', 'Team assigned, pipe repair scheduled', daysAgoIso(1, 4));

  mk({
    id: 'sample-2', tid: 'DK-2026-3QW8TR', city: 'karachi', area: 'Gulshan-e-Iqbal Block 5',
    raw: 'Gulshan block 5 mein kachra 10 din se nahi utha. Gali mein bo badboo hai aur sehat ke liye khatra hai.',
    category: 'garbage', severity: 'medium', dept: 'sswmb', status: 'acknowledged', anonymous: false,
    name: 'Farhan Ahmed', phone: '0300-1234567', email: null,
    summary_en: 'Garbage not collected for 10 days in Gulshan-e-Iqbal Block 5, Karachi; foul smell reported.',
    summary_ur: 'کراچی کے گلشن اقبال بلاک 5 میں دس دن سے کچرا نہیں اٹھایا جا رہا۔',
    rationale: 'SSWMB handles solid waste collection in Karachi.',
    created: daysAgoIso(2, 6), sent: daysAgoIso(2, 5),
    dispatch: [{ at: daysAgoIso(2, 5), to: 'info@sswmb.gos.pk', simulated: true, message_id: 'sim-sample-2', ok: true }],
  });
  ev('sample-2', null, 'draft', 'system', 'Sample data', daysAgoIso(2, 6));
  ev('sample-2', 'draft', 'sent', 'citizen', 'Complaint approved and sent by citizen', daysAgoIso(2, 5));
  ev('sample-2', 'sent', 'acknowledged', 'official', 'Noted by SSWMB zone office', daysAgoIso(1, 8));

  mk({
    id: 'sample-3', tid: 'DK-2026-9HF3XN', city: 'lahore', area: 'Model Town',
    raw: 'Model town C block main gali ki street lights 2 hafte se band hain, raat mein andhera rehta hai.',
    category: 'streetlight', severity: 'low', dept: 'mcl', status: 'resolved', anonymous: true,
    summary_en: 'Streetlights out for two weeks on a Model Town street, Lahore; the road is dark at night.',
    summary_ur: 'لاہور کی مور ٹاؤن میں دو ہفتوں سے اسٹریٹ لائٹس بند ہیں۔',
    rationale: 'MCL handles streetlights in Lahore.',
    created: daysAgoIso(6, 0), sent: daysAgoIso(6, -1), resolved: daysAgoIso(1, 12),
    dispatch: [{ at: daysAgoIso(6, -1), to: 'info@mcl.gop.pk', simulated: true, message_id: 'sim-sample-3', ok: true }],
  });
  ev('sample-3', null, 'draft', 'system', 'Sample data', daysAgoIso(6, 0));
  ev('sample-3', 'draft', 'sent', 'citizen', 'Complaint approved and sent by citizen', daysAgoIso(6, -1));
  ev('sample-3', 'sent', 'acknowledged', 'official', 'Forwarded to lighting wing', daysAgoIso(5, 20));
  ev('sample-3', 'acknowledged', 'in_progress', 'official', 'Faulty wiring identified', daysAgoIso(3, 4));
  ev('sample-3', 'in_progress', 'resolved', 'official', 'Lights repaired and tested', daysAgoIso(1, 12));

  mk({
    id: 'sample-4', tid: 'DK-2026-5JB7VC', city: 'islamabad', area: 'Sector G-11/3',
    raw: 'G-11/3 ki main road par bara gaddha ban gaya hai, do din pehle ek bike slip ho gayi. Traffic slow chalti hai.',
    category: 'road', severity: 'medium', dept: 'cda', status: 'sent', anonymous: true,
    summary_en: 'Large pothole on the main road in G-11/3, Islamabad; a motorbike slipped and traffic is slowed.',
    summary_ur: 'اسلام آباد کے سیکٹر جی-11/3 کی مرکزی سڑک پر بڑا گڑھا بن گیا ہے۔',
    rationale: 'CDA handles roads in Islamabad.',
    created: daysAgoIso(0, 8), sent: daysAgoIso(0, 7),
    dispatch: [{ at: daysAgoIso(0, 7), to: 'info@cda.gov.pk', simulated: true, message_id: 'sim-sample-4', ok: true }],
  });
  ev('sample-4', null, 'draft', 'system', 'Sample data', daysAgoIso(0, 8));
  ev('sample-4', 'draft', 'sent', 'citizen', 'Complaint approved and sent by citizen', daysAgoIso(0, 7));

  return { complaints, events };
}
