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
import { escalate } from './lib/escalation.js';
import { assessImage } from './lib/vision.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const PUB = path.join(ROOT, 'public');

// .env loading without a dependency (NODE 22 also supports --env-file)
(function loadEnv() {
  const f = path.join(ROOT, '.env');
  if (!fs.existsSync(f)) return;
  for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    let val = m[2];
    // Strip a trailing inline comment (only when value is not fully quoted).
    const quote = val.trim()[0];
    if (quote !== '"' && quote !== "'") val = val.split(/\s+#/)[0];
    val = val.trim();
    // Strip one matching pair of surrounding quotes.
    if (val.length >= 2 && val[0] === val[val.length - 1] && (val[0] === '"' || val[0] === "'")) val = val.slice(1, -1);
    process.env[m[1]] = val;
  }
})();

const app = express();
app.disable('x-powered-by');
// Minimal security headers (no helmet dependency). CSP is intentionally omitted
// because the templates use inline SVG; add a strict CSP later if the SVGs move
// to external files.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});
// 5 evidence images x 5MB decoded leaves ~4.6MB of base64 headroom under this cap.
app.use(express.json({ limit: '30mb' }));
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

const createRL = new RateLimiter(Number(process.env.RATE_LIMIT_CREATE || 3), Number(process.env.RATE_LIMIT_CREATE_WINDOW_MS || 3600e3));   // complaints per IP
const sendRL = new RateLimiter(Number(process.env.RATE_LIMIT_SEND || 10), 3600e3);
const loginRL = new RateLimiter(Number(process.env.RATE_LIMIT_LOGIN || 20), 3600e3);
const readRL = new RateLimiter(Number(process.env.RATE_LIMIT_READ || 120), 3600e3);   // public complaint/tracking reads per IP
const editRL = new RateLimiter(Number(process.env.RATE_LIMIT_EDIT || 20), 3600e3);   // citizen category corrections per IP

// ---------------------------------------------------------------------------
// Server-Sent Events: push live updates to dashboard, queue, complaint detail,
// and citizen tracking pages. One-directional (server→client), auto-reconnect.
// ---------------------------------------------------------------------------
const sseClients = new Set();          // official dashboard/queue clients
const citizenSseClients = new Map();   // trackingId -> Set of clients

function broadcastEvent(type, payload) {
  if (!sseClients.size && !citizenSseClients.size) return;
  const data = `data: ${JSON.stringify({ type, ...payload })}\n\n`;
  for (const client of sseClients) {
    try { client.res.write(data); } catch { sseClients.delete(client); }
  }
  const tidClients = payload.trackingId && citizenSseClients.get(payload.trackingId);
  if (tidClients) {
    for (const client of tidClients) {
      try { client.res.write(data); } catch { tidClients.delete(client); }
    }
  }
}

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
    photo_assessment: c.photo_assessment || null,
  };
}

// public tracking view: zero PII, status trail only (FR-6)
function trackView(c) {
  const dept = deptOf(c);
  return {
    tracking_id: c.tracking_id, category: c.category, severity: c.severity,
    summary_en: c.summary_en, summary_ur: c.summary_ur, city: c.city, area: c.area,
    status: c.status, department: dept ? { name: dept.name } : null,
    created_at: c.created_at, sent_at: c.sent_at, resolved_at: c.resolved_at,
    escalation_level: c.escalation_level || 0,
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
    department: c.department_id ? deptOf(c) : null,
    escalation_level: c.escalation_level || 0, escalated_at: c.escalated_at || null,
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
  if (!req.official) {
    delete db.sessions[token];
    saveDb();
    return res.status(401).json({ error: 'Session expired.' });
  }
  next();
};

// ---------------------------------------------------------------------------
// Server-Sent Events endpoints
// ---------------------------------------------------------------------------
// Official SSE stream (dashboard + queue + complaint detail pages).
// Auth via query param because EventSource cannot set custom headers.
app.get('/api/official/events', (req, res) => {
  const token = req.query.token;
  const session = token && db.sessions[token];
  if (!session || sessionExpired(session)) return res.status(401).json({ error: 'Not signed in.' });
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('data: {"type":"connected"}\n\n');
  const client = { res, officialId: session.officialId };
  sseClients.add(client);
  req.on('close', () => sseClients.delete(client));
});

// Citizen tracking SSE stream (no auth, keyed by tracking ID).
// Only broadcasts { type, trackingId, status } — no PII.
app.get('/api/track/:tid/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('data: {"type":"connected"}\n\n');
  const tid = String(req.params.tid).toUpperCase().trim();
  if (!citizenSseClients.has(tid)) citizenSseClients.set(tid, new Set());
  const client = { res };
  citizenSseClients.get(tid).add(client);
  req.on('close', () => {
    const set = citizenSseClients.get(tid);
    if (set) { set.delete(client); if (!set.size) citizenSseClients.delete(tid); }
  });
});

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
    let imagesDropped = 0;
    if (Array.isArray(images)) {
      for (let i = 0; i < Math.min(images.length, 5); i++) {
        const b64 = images[i];
        if (typeof b64 === 'string' && b64.startsWith('data:image/')) {
          const match = b64.match(/^data:image\/(png|jpeg);base64,(.+)$/);
          if (match) {
            const buf = Buffer.from(match[2], 'base64');
            // Server-side cap matches the client cap: 5MB per decoded image.
            if (buf.length > 5 * 1024 * 1024) { imagesDropped++; continue; }
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
    const latNum = lat != null ? Number(lat) : null;
    const lngNum = lng != null ? Number(lng) : null;
    const hasValidGps = latNum != null && lngNum != null
      && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180;

    // AI photo assessment (Qwen-VL): analyze first uploaded image. Non-blocking
    // on failure — the complaint still gets filed; the assessment is just absent.
    let photoAssessment = null;
    if (savedImages.length && Array.isArray(images) && typeof images[0] === 'string') {
      try {
        photoAssessment = await assessImage({
          imageDataUrl: images[0],
          complaintText: String(raw_text).trim(),
          category: result.category,
        });
      } catch (e) {
        console.error('[vision] assessment failed:', e.message);
      }
    }

    const c = {
      id: complaintId, tracking_id: genTrackingId(),
      raw_text: String(raw_text).trim(), language_detected: null,
      city, area: String(area || '').trim(),
      images: savedImages,
      location: hasValidGps ? { lat: latNum, lng: lngNum } : null,
      category: result.category, severity: result.severity,
      summary_en: result.summary_en, summary_ur: result.summary_ur,
      location_description: result.location_description,
      ai_confidence: result.confidence, classification_source: result.source, classification_raw: result.raw,
      department_id: dept ? dept.id : null, routing_rationale: result.routing_rationale,
      status: 'needs_review',
      is_anonymous: anonymous !== false, citizen_name: null,
      citizen_phone: String(phone).trim() || null,
      citizen_email: String(email).trim() || null,
      created_at: now, sent_at: null, resolved_at: null,
      dispatch_log: [], letter_final: null, is_sample: false,
      escalation_level: 0, escalated_at: null,
      photo_assessment: photoAssessment,
    };

    // Severity-based dispatch policy:
    // - HIGH severity + dept found + confidence OK → auto-send email immediately
    // - LOW/MEDIUM severity + dept found + confidence OK → pending_approval (admin reviews)
    // - No dept or low confidence → needs_review (citizen corrects category on review page)
    const canRoute = dept && result.confidence >= CONFIDENCE_THRESHOLD;
    if (canRoute && result.severity === 'high') {
      c.status = 'draft';  // briefly draft, then auto-send below
    } else if (canRoute) {
      c.status = 'pending_approval';
    } else {
      c.status = 'needs_review';
    }

    c.draft_english = buildLetter({ complaint: c, dept, identity: null });
    db.complaints.push(c);
    addEvent(c.id, null, c.status, 'system', `Complaint created and classified (${result.source})`);
    if (!dept) addEvent(c.id, null, c.status, 'system', 'No authority found in knowledge base for this city and category; operator review required');

    // Auto-dispatch for high severity: send the email immediately so the
    // department is notified without waiting for citizen/admin action.
    if (canRoute && result.severity === 'high') {
      const identity = { anonymous: anonymous !== false, name: '', phone: c.citizen_phone, email: c.citizen_email };
      const letter = buildLetter({ complaint: c, dept, identity });
      const subject = buildSubject(c);
      let dispatch = { ok: false, simulated: mailMode() !== 'smtp', message_id: null, error: 'not attempted' };
      for (let attempt = 1; attempt <= 2 && !dispatch.ok; attempt++) {
        try {
          dispatch = await dispatchComplaintEmail({ to: dept.email, subject, text: letter });
        } catch (e) {
          console.error(`[mail] auto-dispatch attempt ${attempt} failed:`, e.message);
          dispatch = { ok: false, simulated: mailMode() !== 'smtp', message_id: null, error: e.message };
        }
      }
      const prevStatus = c.status;
      c.letter_final = letter;
      c.is_anonymous = identity.anonymous;
      if (identity.anonymous) { c.citizen_phone = null; c.citizen_email = null; }
      c.dispatch_log = [{ at: nowIso(), to: dept.email, subject, simulated: dispatch.simulated, message_id: dispatch.message_id, ok: dispatch.ok }];
      c.status = dispatch.ok ? 'sent' : 'send_failed';
      if (dispatch.ok) {
        c.sent_at = nowIso();
        if (c.citizen_email) {
          dispatchCitizenConfirmationEmail({
            to: c.citizen_email,
            complaint: { tracking_id: c.tracking_id, category: c.category, created_at: c.created_at, department: dept },
          }).catch(console.error);
        }
      }
      addEvent(c.id, prevStatus, c.status, 'system', dispatch.ok
        ? 'Auto-dispatched to department due to HIGH severity — no admin approval needed'
        : `Auto-dispatch failed: ${dispatch.error}`);
    }

    saveDb();
    broadcastEvent('complaint:new', { complaintId: c.id, trackingId: c.tracking_id, status: c.status });
    const resp = { complaint: publicView(c) };
    if (imagesDropped > 0) resp.images_dropped = imagesDropped;
    res.status(201).json(resp);
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
  if (!editRL.check(ipOf(req))) return res.status(429).json({ error: 'Too many edits from this device. Please try again later.' });
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
  broadcastEvent('complaint:updated', { complaintId: c.id, trackingId: c.tracking_id, status: c.status });
  res.json({ complaint: publicView(c) });
});

// citizen: send (FR-5) — severity-based routing:
//   HIGH severity → dispatch email immediately (status → sent/send_failed)
//   LOW/MEDIUM    → submit for admin approval (status → pending_approval)
app.post('/api/complaints/:id/send', async (req, res) => {
  try {
    if (!sendRL.check(ipOf(req))) return res.status(429).json({ error: 'Too many send attempts. Please try again later.' });
    const c = findByRecordId(req.params.id);
    if (!c) return res.status(404).json({ error: 'Complaint not found.' });
    if (!['draft', 'needs_review', 'send_failed'].includes(c.status)) return res.status(409).json({ error: 'This complaint has already been sent.' });
    const dept = deptOf(c);
    if (!dept) return res.status(409).json({ error: 'No department could be routed for this complaint yet.' });

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

    // LOW/MEDIUM severity: don't send email, route to admin for approval
    if (c.severity !== 'high') {
      const prevStatus = c.status;
      c.is_anonymous = identity.anonymous;
      c.citizen_name = identity.anonymous ? null : identity.name;
      if (identity.anonymous) { c.citizen_phone = null; c.citizen_email = null; }
      c.letter_final = letter;
      c.status = 'pending_approval';
      addEvent(c.id, prevStatus, c.status, 'citizen', 'Submitted for admin approval (low/medium severity)');
      saveDb();
      broadcastEvent('complaint:updated', { complaintId: c.id, trackingId: c.tracking_id, status: c.status });
      return res.json({ complaint: publicView(c) });
    }

    // HIGH severity: dispatch email immediately
    const subject = buildSubject(c);
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
    if (identity.anonymous) { c.citizen_phone = null; c.citizen_email = null; }
    c.letter_final = letter;
    c.dispatch_log = [...(c.dispatch_log || []), { at: nowIso(), to: dept.email, subject, simulated: dispatch.simulated, message_id: dispatch.message_id, ok: dispatch.ok }];
    c.status = dispatch.ok ? 'sent' : 'send_failed';
    if (dispatch.ok) {
      c.sent_at = nowIso();
      if (c.citizen_email) {
        dispatchCitizenConfirmationEmail({
          to: c.citizen_email,
          complaint: { tracking_id: c.tracking_id, category: c.category, created_at: c.created_at, department: dept },
        }).catch(console.error);
      }
    }
    addEvent(c.id, prevStatus, c.status, 'citizen', dispatch.ok ? 'Complaint approved and sent by citizen (high severity)' : 'Delivery failed; system will keep the complaint and retry via operator');
    saveDb();
    broadcastEvent('complaint:updated', { complaintId: c.id, trackingId: c.tracking_id, status: c.status });
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
  // send_failed must be re-sent (which moves it to 'sent'); it cannot jump
  // straight to acknowledged/in_progress/resolved/rejected, since the
  // department never received it.
  if (!['sent', 'acknowledged', 'in_progress'].includes(c.status)) {
    return res.status(409).json({ error: `Cannot move a complaint in status "${c.status}".` });
  }
  if (to_status === c.status) return res.status(409).json({ error: `Complaint is already in status "${to_status}".` });
  const prev = c.status;
  c.status = to_status;
  if (to_status === 'resolved') c.resolved_at = nowIso();
  addEvent(c.id, prev, to_status, 'official', note || `${req.official.name} set status to ${to_status}`);
  saveDb();
  broadcastEvent('complaint:updated', { complaintId: c.id, trackingId: c.tracking_id, status: c.status, toStatus: to_status });
  res.json({ complaint: { ...officialView(c), events: eventsOf(c.id) } });
});

// official: approve & send a pending_approval complaint (one-click dispatch)
app.post('/api/official/complaints/:id/approve', auth, async (req, res) => {
  try {
    if (req.official.role === 'viewer') return res.status(403).json({ error: 'Viewer accounts cannot approve. Sign in as an operator.' });
    const c = findComplaint(req.params.id);
    if (!c) return res.status(404).json({ error: 'Complaint not found.' });
    if (c.status !== 'pending_approval') return res.status(409).json({ error: 'Only complaints pending approval can be approved.' });
    const dept = deptOf(c);
    if (!dept) return res.status(409).json({ error: 'No department routed for this complaint.' });

    const { anonymous = c.is_anonymous, name = c.citizen_name || '', letter_text = '' } = req.body || {};
    const identity = { anonymous: Boolean(anonymous), name: String(name || '').trim(), phone: c.citizen_phone, email: c.citizen_email };
    let letter;
    if (letter_text) {
      if (String(letter_text).length > 8000) return res.status(400).json({ error: 'The edited letter is too long.' });
      if (!String(letter_text).includes(c.tracking_id)) return res.status(400).json({ error: 'The letter must keep its tracking reference.' });
      letter = String(letter_text);
    } else {
      letter = buildLetter({ complaint: c, dept, identity });
    }

    const subject = buildSubject(c);
    let dispatch = { ok: false, simulated: mailMode() !== 'smtp', message_id: null, error: 'not attempted' };
    for (let attempt = 1; attempt <= 2 && !dispatch.ok; attempt++) {
      try {
        dispatch = await dispatchComplaintEmail({ to: dept.email, subject, text: letter });
      } catch (e) {
        console.error(`[mail] approve dispatch attempt ${attempt} failed:`, e.message);
        dispatch = { ok: false, simulated: mailMode() !== 'smtp', message_id: null, error: e.message };
      }
    }

    const prevStatus = c.status;
    c.is_anonymous = identity.anonymous;
    c.citizen_name = identity.anonymous ? null : identity.name;
    if (identity.anonymous) { c.citizen_phone = null; c.citizen_email = null; }
    c.letter_final = letter;
    c.dispatch_log = [...(c.dispatch_log || []), { at: nowIso(), to: dept.email, subject, simulated: dispatch.simulated, message_id: dispatch.message_id, ok: dispatch.ok }];
    c.status = dispatch.ok ? 'sent' : 'send_failed';
    if (dispatch.ok) {
      c.sent_at = nowIso();
      if (c.citizen_email) {
        dispatchCitizenConfirmationEmail({
          to: c.citizen_email,
          complaint: { tracking_id: c.tracking_id, category: c.category, created_at: c.created_at, department: dept },
        }).catch(console.error);
      }
    }
    addEvent(c.id, prevStatus, c.status, 'official', dispatch.ok
      ? `Approved and sent by ${req.official.name}`
      : `Approval dispatch failed: ${dispatch.error}`);
    saveDb();
    broadcastEvent('complaint:updated', { complaintId: c.id, trackingId: c.tracking_id, status: c.status });
    res.json({ complaint: { ...officialView(c), events: eventsOf(c.id) } });
  } catch (e) {
    console.error('[api] approve failed:', e);
    res.status(500).json({ error: 'Something went wrong while approving.' });
  }
});

// official: re-send a send_failed complaint (FR-5, Flow F)
app.post('/api/official/complaints/:id/resend', auth, async (req, res) => {
  try {
    if (req.official.role === 'viewer') return res.status(403).json({ error: 'Viewer accounts cannot re-send. Sign in as an operator.' });
    const c = findComplaint(req.params.id);
    if (!c) return res.status(404).json({ error: 'Complaint not found.' });
    if (c.status !== 'send_failed') return res.status(409).json({ error: 'Only failed dispatches can be re-sent.' });
    const dept = deptOf(c);
    if (!dept) return res.status(409).json({ error: 'No department routed for this complaint.' });

    const letter = c.letter_final || c.draft_english || '';
    const subject = buildSubject(c);
    let dispatch = { ok: false, simulated: mailMode() !== 'smtp', message_id: null, error: 'not attempted' };
    for (let attempt = 1; attempt <= 2 && !dispatch.ok; attempt++) {
      try {
        dispatch = await dispatchComplaintEmail({ to: dept.email, subject, text: letter });
      } catch (e) {
        console.error(`[mail] re-send attempt ${attempt} failed:`, e.message);
        dispatch = { ok: false, simulated: mailMode() !== 'smtp', message_id: null, error: e.message };
      }
    }

    const prevStatus = c.status;
    c.dispatch_log = [...(c.dispatch_log || []), { at: nowIso(), to: dept.email, subject, simulated: dispatch.simulated, message_id: dispatch.message_id, ok: dispatch.ok }];
    if (dispatch.ok) {
      c.status = 'sent';
      c.sent_at = nowIso();
    }
    addEvent(c.id, prevStatus, c.status, 'official', dispatch.ok ? `Re-sent by ${req.official.name}` : `Re-send attempt failed: ${dispatch.error}`);
    saveDb();
    broadcastEvent('complaint:updated', { complaintId: c.id, trackingId: c.tracking_id, status: c.status });
    res.json({ complaint: { ...officialView(c), events: eventsOf(c.id) } });
  } catch (e) {
    console.error('[api] resend failed:', e);
    res.status(500).json({ error: 'Something went wrong while re-sending.' });
  }
});

// ---------------------------------------------------------------------------
// fallbacks
// ---------------------------------------------------------------------------
app.use('/api', (req, res) => res.status(404).json({ error: 'Unknown API endpoint.' }));
app.use((req, res) => res.status(404).send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DarKhwast — Page not found</title><style>body{font-family:system-ui,sans-serif;background:#FAF7F1;color:#1B2B44;display:flex;min-height:100vh;margin:0;align-items:center;justify-content:center;text-align:center;padding:24px}h1{font-size:64px;margin:0;color:#0E6B5C}p{margin:8px 0 24px}a{color:#fff;background:#0E6B5C;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600}</style></head><body><div><h1>404</h1><p>The page you were looking for does not exist.</p><a href="/">Back to DarKhwast</a></div></body></html>`));

// ---------------------------------------------------------------------------
// Auto-escalation: run on startup and every hour. Flags complaints that haven't
// been acknowledged within ESCALATION_DAYS (default 3) as escalated.
// ---------------------------------------------------------------------------
function runEscalation() {
  const count = escalate(db, addEvent, broadcastEvent);
  if (count > 0) {
    console.log(`[escalation] ${count} complaint(s) escalated`);
    saveDb();
  }
}
runEscalation();
setInterval(runEscalation, 3600e3);

const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`DarKhwast running at http://localhost:${PORT}`);
  console.log(`Mail mode: ${mailMode().toUpperCase()}  |  AI: ${process.env.DASHSCOPE_API_KEY ? 'Qwen via DashScope' : 'offline rules fallback'}`);
  console.log(`Demo official: demo@darkhwast.pk / darkhwast2026`);
});
