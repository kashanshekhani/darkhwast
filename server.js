// DarKhwast - AI Complaint Router for Local Government, Pakistan
// Hackathon prototype server. See PRD.md (functional requirements) and
// DESIGN.md (screens/components) for the specs this implements.

import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getDb, saveDb } from './lib/db.js';
import { CITIES } from './lib/seed.js';
import { CATEGORIES, SEVERITIES, CONFIDENCE_THRESHOLD, resolveDepartment, CATEGORY_PHRASE, classifyAndRoute } from './lib/classify.js';
import { buildLetter, buildSubject } from './lib/letter.js';
import { dispatchComplaintEmail, dispatchCitizenConfirmationEmail, mailMode } from './lib/mail.js';
import {
  genId, genTrackingId, verifyPassword, nowIso, RateLimiter,
  hasProfanity, isPhone, isEmail, ipOf, OFFICIAL_STATUSES, PUBLIC_STATUSES,
} from './lib/util.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const PUB = path.join(ROOT, 'public');

// .env loading without a dependency (NODE 22 also supports --env-file)
(function loadEnv() {
  const f = path.join(ROOT, '.env');
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
})();

const app = express();
app.disable('x-powered-by');
// 5 evidence images x 2MB decoded leaves ~13.4MB of base64 headroom under this cap.
app.use(express.json({ limit: '20mb' }));
app.use(express.static(PUB, { extensions: ['html'] }));

const UPLOADS_DIR = path.join(ROOT, 'data', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Uploaded evidence images. Only ever serve flat `<uuid>-<n>.<ext>` names from
// UPLOADS_DIR: URL-decoded params like `..%2F..%2Fdb.json` must never escape it.
app.get('/api/media/:filename', (req, res) => {
  const filename = path.basename(String(req.params.filename));
  if (!/^[A-Za-z0-9-]+\.(jpg|png)$/.test(filename)) return res.status(404).send('Not found');
  const file = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(file)) res.sendFile(file);
  else res.status(404).send('Not found');
});

const db = getDb();

const createRL = new RateLimiter(3, 3600e3);   // 3 complaints/hour per IP
const sendRL = new RateLimiter(10, 3600e3);
const loginRL = new RateLimiter(20, 3600e3);
const readRL = new RateLimiter(120, 3600e3);   // public complaint/tracking reads per IP

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
// Tracking IDs appear on letters and receipts, so anything a stranger could
// know must go through trackView (zero PII). Citizen screens use the
// unguessable record id; authed officials may look up by either.
const findComplaint = (id) => db.complaints.find((c) => c.id === id || c.tracking_id === String(id).toUpperCase().trim());
const findByRecordId = (id) => db.complaints.find((c) => c.id === id);
const deptOf = (c) => {
  const d = db.departments.find((x) => x.id === c.department_id);
  if (!d) return null;
  return { id: d.id, name: d.name, city: d.city, coverage: d.coverage, jurisdiction_notes: d.jurisdiction_notes, email: d.email, verified: d.verified };
};

function addEvent(complaintId, from, to, actor, note) {
  db.status_events.push({ id: genId(), complaint_id: complaintId, from_status: from, to_status: to, actor, note: String(note || '').slice(0, 500), created_at: nowIso() });
}
const eventsOf = (cid) => db.status_events.filter((e) => e.complaint_id === cid).sort((a, b) => a.created_at.localeCompare(b.created_at));

// citizen-safe view (review/sent screens): own draft + department, no officials-only data
function publicView(c) {
  return {
    id: c.id, tracking_id: c.tracking_id, raw_text: c.raw_text, city: c.city, area: c.area,
    category: c.category, severity: c.severity, summary_en: c.summary_en, summary_ur: c.summary_ur,
    location_description: c.location_description, ai_confidence: c.ai_confidence,
    classification_source: c.classification_source, routing_rationale: c.routing_rationale,
    department: deptOf(c), status: c.status, is_anonymous: c.is_anonymous,
    images: c.images || [], location: c.location || null,
    created_at: c.created_at, sent_at: c.sent_at, resolved_at: c.resolved_at,
    draft_english: c.draft_english, letter_final: c.letter_final,
    last_dispatch: c.dispatch_log?.length ? { at: c.dispatch_log.at(-1).at, simulated: c.dispatch_log.at(-1).simulated, ok: c.dispatch_log.at(-1).ok } : null,
  };
}

// public tracking view: zero PII, status trail only (FR-6)
function trackView(c) {
  return {
    tracking_id: c.tracking_id, category: c.category, severity: c.severity,
    summary_en: c.summary_en, summary_ur: c.summary_ur, city: c.city, area: c.area,
    status: c.status, department: deptOf(c) ? { name: deptOf(c).name } : null,
    created_at: c.created_at, sent_at: c.sent_at, resolved_at: c.resolved_at,
    events: eventsOf(c.id).map((e) => ({ from_status: e.from_status, to_status: e.to_status, actor: e.actor, note: e.note, at: e.created_at })),
  };
}

function officialView(c) {
  return {
    ...publicView(c),
    is_sample: c.is_sample,
    citizen_name: c.citizen_name, citizen_phone: c.citizen_phone, citizen_email: c.citizen_email,
    classification_raw: c.classification_raw,
    dispatch_log: c.dispatch_log || [],
  };
}

const SESSION_TTL_MS = Number(process.env.SESSION_TTL_HOURS || 168) * 3600e3;
const sessionExpired = (s) => Date.now() - Date.parse(s.createdAt) > SESSION_TTL_MS;

const auth = (req, res, next) => {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : null;
  const session = token && db.sessions[token];
  if (!session) return res.status(401).json({ error: 'Not signed in.' });
  if (sessionExpired(session)) {
    delete db.sessions[token];
    saveDb();
    return res.status(401).json({ error: 'Session expired. Please sign in again.' });
  }
  req.official = db.officials.find((o) => o.id === session.officialId);
  req.token = token;
  if (!req.official) return res.status(401).json({ error: 'Session expired.' });
  next();
};

// ---------------------------------------------------------------------------
// public: meta
// ---------------------------------------------------------------------------
app.get('/api/health', (req, res) => res.json({ ok: true, mail: mailMode(), complaints: db.complaints.length }));

app.get('/api/meta/cities', (req, res) => res.json({
  cities: Object.values(CITIES),
  departments_per_city: Object.values(CITIES).map((c) => ({
    city: c.id,
    departments: db.departments.filter((d) => d.city === c.id).map((d) => ({ id: d.id, name: d.name, handles: d.categories_covered })),
  })),
}));

// ---------------------------------------------------------------------------
// citizen: create complaint (FR-1 + FR-2 + FR-4 + draft FR-3)
// ---------------------------------------------------------------------------
app.post('/api/complaints', async (req, res) => {
  try {
    if (!createRL.check(ipOf(req))) return res.status(429).json({ error: 'Too many complaints from this device. Please try again later.' });
    const { raw_text = '', city = '', area = '', images = [], email = '', phone = '', lat, lng, anonymous = true } = req.body || {};
    const field_errors = {};
    if (String(raw_text).trim().length < 20) field_errors.raw_text = 'Please describe the problem in at least 20 characters.';
    else if (hasProfanity(raw_text)) field_errors.raw_text = 'Please describe the issue without abusive language.';
    if (!CITIES[city]) field_errors.city = 'Please choose a supported city.';
    const emailStr = String(email || '').trim();
    const phoneStr = String(phone || '').trim();
    if (emailStr && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) field_errors.email = 'Please enter a valid email address.';
    if (phoneStr && !/^[0-9+\-\s()]{7,20}$/.test(phoneStr)) field_errors.phone = 'Please enter a valid phone number (e.g. 0300-1234567).';
    if (Object.keys(field_errors).length) return res.status(400).json({ error: 'Please fix the highlighted fields.', field_errors });

    const complaintId = genId();
    const savedImages = [];
    if (Array.isArray(images)) {
      for (let i = 0; i < Math.min(images.length, 5); i++) {
        const b64 = images[i];
        if (typeof b64 === 'string' && b64.startsWith('data:image/')) {
          const match = b64.match(/^data:image\/(png|jpeg);base64,(.+)$/);
          if (match) {
            const buf = Buffer.from(match[2], 'base64');
            if (buf.length > 2 * 1024 * 1024) continue; // server-side cap: 2MB per image
            const ext = match[1] === 'jpeg' ? 'jpg' : 'png';
            const filename = `${complaintId}-${i}.${ext}`;
            fs.writeFileSync(path.join(UPLOADS_DIR, filename), buf);
            savedImages.push(`/api/media/${filename}`);
          }
        }
      }
    }

    const result = await classifyAndRoute({ rawText: String(raw_text).trim(), city, area: String(area || '').trim(), departments: db.departments });
    const dept = result.department;
    const now = nowIso();
    const c = {
      id: complaintId, tracking_id: genTrackingId(),
      raw_text: String(raw_text).trim(), language_detected: null,
      city, area: String(area || '').trim(),
      images: savedImages,
      location: lat != null && lng != null ? { lat: Number(lat), lng: Number(lng) } : null,
      category: result.category, severity: result.severity,
      summary_en: result.summary_en, summary_ur: result.summary_ur,
      location_description: result.location_description,
      ai_confidence: result.confidence, classification_source: result.source, classification_raw: result.raw,
      department_id: dept ? dept.id : null, routing_rationale: result.routing_rationale,
      status: dept && result.confidence >= CONFIDENCE_THRESHOLD ? 'draft' : 'needs_review',
      is_anonymous: anonymous !== false, citizen_name: null,
      citizen_phone: String(phone).trim() || null, 
      citizen_email: String(email).trim() || null,
      created_at: now, sent_at: null, resolved_at: null,
      dispatch_log: [], letter_final: null, is_sample: false,
    };
    c.draft_english = buildLetter({ complaint: c, dept, identity: null });
    db.complaints.push(c);
    addEvent(c.id, null, c.status, 'system', `Complaint created and classified (${result.source})`);
    if (!dept) addEvent(c.id, null, c.status, 'system', 'No authority found in knowledge base for this city and category; operator review required');
    saveDb();
    res.status(201).json({ complaint: publicView(c) });
  } catch (e) {
    console.error('[api] create complaint failed:', e);
    res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
  }
});

app.get('/api/complaints/:id', (req, res) => {
  if (!readRL.check(ipOf(req))) return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  const c = findByRecordId(req.params.id);
  if (!c) return res.status(404).json({ error: 'Complaint not found.' });
  res.json({ complaint: publicView(c) });
});

// citizen: category correction (FR-2 low-confidence human-in-the-loop)
app.patch('/api/complaints/:id/category', (req, res) => {
  const c = findByRecordId(req.params.id);
  if (!c) return res.status(404).json({ error: 'Complaint not found.' });
  if (!['draft', 'needs_review'].includes(c.status)) return res.status(409).json({ error: 'This complaint has already been sent.' });
  const { category } = req.body || {};
  if (!CATEGORIES.includes(category)) return res.status(400).json({ error: 'Unknown category.' });

  const dept = resolveDepartment(db.departments, c.city, category);
  const prevStatus = c.status;
  c.category = category;
  c.ai_confidence = 0.95;
  c.classification_source = 'citizen';
  c.department_id = dept ? dept.id : null;
  c.routing_rationale = dept
    ? `${dept.name} handles ${CATEGORY_PHRASE[category].toLowerCase()} in ${CITIES[dept.city === 'national' ? c.city : dept.city]?.en || 'its jurisdiction'}.`
    : `No authority in the knowledge base covers this issue for ${CITIES[c.city].en}.`;
  c.status = dept ? 'draft' : 'needs_review';
  c.draft_english = buildLetter({ complaint: c, dept, identity: null });
  addEvent(c.id, prevStatus, c.status, 'citizen', `Citizen corrected category to "${CATEGORY_PHRASE[category]}"`);
  saveDb();
  res.json({ complaint: publicView(c) });
});

// citizen: send (FR-5)
app.post('/api/complaints/:id/send', async (req, res) => {
  try {
    const c = findByRecordId(req.params.id);
    if (!c) return res.status(404).json({ error: 'Complaint not found.' });
    if (!['draft', 'needs_review', 'send_failed'].includes(c.status)) return res.status(409).json({ error: 'This complaint has already been sent.' });
    const dept = deptOf(c);
    if (!dept) return res.status(409).json({ error: 'No department could be routed for this complaint yet.' });
    if (!sendRL.check(ipOf(req))) return res.status(429).json({ error: 'Too many send attempts. Please try again later.' });

    const { anonymous = true, name = '', letter_text = '' } = req.body || {};
    const identity = { anonymous: Boolean(anonymous), name: String(name || '').trim(), phone: c.citizen_phone, email: c.citizen_email };
    if (!identity.anonymous && identity.name.length < 2) {
      return res.status(400).json({ error: 'Please fix the highlighted fields.', field_errors: { name: 'Please enter your name.' } });
    }

    let letter;
    if (letter_text) {
      if (String(letter_text).length > 8000) return res.status(400).json({ error: 'The edited letter is too long.' });
      if (hasProfanity(letter_text)) return res.status(400).json({ error: 'Please remove abusive language from the letter before sending.' });
      if (!String(letter_text).includes(c.tracking_id)) return res.status(400).json({ error: 'The letter must keep its tracking reference.' });
      letter = String(letter_text);
    } else {
      letter = buildLetter({ complaint: c, dept, identity });
    }

    const subject = buildSubject(c);
    // FR-5: on failure, retry once before surfacing send_failed to operators.
    let dispatch = { ok: false, simulated: mailMode() !== 'smtp', message_id: null, error: 'not attempted' };
    for (let attempt = 1; attempt <= 2 && !dispatch.ok; attempt++) {
      try {
        dispatch = await dispatchComplaintEmail({ to: dept.email, subject, text: letter });
      } catch (e) {
        console.error(`[mail] dispatch attempt ${attempt} failed:`, e.message);
        dispatch = { ok: false, simulated: mailMode() !== 'smtp', message_id: null, error: e.message };
      }
    }

    const prevStatus = c.status;
    c.is_anonymous = identity.anonymous;
    c.citizen_name = identity.anonymous ? null : identity.name;
    // citizen_email and citizen_phone are already stored; they remain intact for internal use.
    c.letter_final = letter;
    c.dispatch_log = [...(c.dispatch_log || []), { at: nowIso(), to: dept.email, subject, simulated: dispatch.simulated, message_id: dispatch.message_id, ok: dispatch.ok }];
    c.status = dispatch.ok ? 'sent' : 'send_failed';
    if (dispatch.ok) {
      c.sent_at = nowIso();
      if (c.citizen_email) {
        // fire and forget citizen confirmation (department is not stored on the
        // raw record, so attach it for the email template)
        dispatchCitizenConfirmationEmail({ to: c.citizen_email, complaint: { ...c, department: dept } }).catch(console.error);
      }
    }
    addEvent(c.id, prevStatus, c.status, 'citizen', dispatch.ok ? 'Complaint approved and sent by citizen' : 'Delivery failed; system will keep the complaint and retry via operator');
    saveDb();
    res.json({ complaint: publicView(c) });
  } catch (e) {
    console.error('[api] send failed:', e);
    res.status(500).json({ error: 'Something went wrong while sending. Please try again.' });
  }
});

// citizen: public tracking (FR-6)
app.get('/api/track/:tid', (req, res) => {
  if (!readRL.check(ipOf(req))) return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  const c = findComplaint(req.params.tid);
  if (!c || !PUBLIC_STATUSES.includes(c.status)) return res.status(404).json({ error: 'No complaint found for this ID.' });
  res.json({ complaint: trackView(c) });
});

// pretty tracking URLs from the outbound letter
app.get('/track/:tid', (req, res) => res.redirect(302, `/track.html?tid=${encodeURIComponent(req.params.tid)}`));

// ---------------------------------------------------------------------------
// official: auth + dashboard (FR-7)
// ---------------------------------------------------------------------------
app.post('/api/official/login', (req, res) => {
  if (!loginRL.check(ipOf(req))) return res.status(429).json({ error: 'Too many attempts. Try later.' });
  const { email = '', password = '' } = req.body || {};
  const official = db.officials.find((o) => o.email.toLowerCase() === String(email).toLowerCase().trim());
  if (!official || !verifyPassword(password, official.password_hash)) {
    return res.status(401).json({ error: 'Sign-in failed. Check your email and password.' });
  }
  for (const [tk, s] of Object.entries(db.sessions)) {
    if (sessionExpired(s)) delete db.sessions[tk];
  }
  const token = genId() + genId().replace(/-/g, '');
  db.sessions[token] = { officialId: official.id, createdAt: nowIso() };
  saveDb();
  res.json({ token, official: { id: official.id, name: official.name, email: official.email, role: official.role, department_id: official.department_id } });
});

app.post('/api/official/logout', auth, (req, res) => {
  delete db.sessions[req.token];
  saveDb();
  res.json({ ok: true });
});

app.get('/api/official/me', auth, (req, res) => {
  const { id, name, email, role, department_id } = req.official;
  res.json({ official: { id, name, email, role, department_id } });
});

app.get('/api/official/complaints', auth, (req, res) => {
  const list = db.complaints
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map(officialView);
  res.json({ complaints: list, mail_mode: mailMode() });
});

app.get('/api/official/complaints/:id', auth, (req, res) => {
  const c = findComplaint(req.params.id);
  if (!c) return res.status(404).json({ error: 'Complaint not found.' });
  res.json({ complaint: { ...officialView(c), events: eventsOf(c.id), raw_text: c.raw_text } });
});

app.patch('/api/official/complaints/:id/status', auth, (req, res) => {
  const c = findComplaint(req.params.id);
  if (!c) return res.status(404).json({ error: 'Complaint not found.' });
  if (req.official.role === 'viewer') return res.status(403).json({ error: 'Viewer accounts cannot update status. Sign in as an operator.' });
  const { to_status, note = '' } = req.body || {};
  if (!OFFICIAL_STATUSES.includes(to_status)) return res.status(400).json({ error: 'Invalid status.' });
  if (!['sent', 'acknowledged', 'in_progress', 'send_failed'].includes(c.status)) {
    return res.status(409).json({ error: `Cannot move a complaint in status "${c.status}".` });
  }
  const prev = c.status;
  c.status = to_status;
  if (to_status === 'resolved') c.resolved_at = nowIso();
  addEvent(c.id, prev, to_status, 'official', note || `${req.official.name} set status to ${to_status}`);
  saveDb();
  res.json({ complaint: { ...officialView(c), events: eventsOf(c.id) } });
});

// ---------------------------------------------------------------------------
// fallbacks
// ---------------------------------------------------------------------------
app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown API endpoint.' }));
app.use((req, res) => res.status(404).sendFile(path.join(PUB, 'index.html')));

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`DarKhwast running at http://localhost:${PORT}`);
  console.log(`Mail mode: ${mailMode().toUpperCase()}  |  AI: ${process.env.DASHSCOPE_API_KEY ? 'Qwen via DashScope' : 'offline rules fallback'}`);
  console.log(`Demo official: demo@darkhwast.pk / darkhwast2026`);
});
