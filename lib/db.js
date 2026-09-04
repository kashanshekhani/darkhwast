// Tiny JSON-file datastore. Zero native dependencies (no SQLite build pain on
// Windows), perfectly adequate for a hackathon prototype and a live demo.
// All mutations go through saveDb() which writes atomically (tmp + rename).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEPARTMENTS, OFFICIALS, CITIZENS, buildSamples } from './seed.js';
import { hashPassword, daysAgoIso } from './util.js';
import { buildLetter } from './letter.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

function seedDb() {
  const withSamples = (process.env.SEED_SAMPLES ?? 'true') !== 'false';
  const samples = withSamples ? buildSamples() : { complaints: [], events: [] };
  return {
    complaints: samples.complaints,
    departments: DEPARTMENTS,
    officials: OFFICIALS.map(({ password, ...o }) => ({ ...o, password_hash: hashPassword(password) })),
    users: CITIZENS.map(({ password, ...u }) => ({ ...u, password_hash: hashPassword(password), created_at: daysAgoIso(30), updated_at: daysAgoIso(30) })),
    status_events: samples.events,
    sessions: {},
    citizen_sessions: {},
    supports: [],
    comments: [],
    comment_reports: [],
  };
}

let db;

export function getDb() {
  if (db) return db;
  try {
    if (fs.existsSync(DB_FILE)) {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      for (const k of ['complaints', 'departments', 'officials', 'status_events', 'users', 'supports', 'comments', 'comment_reports']) {
        if (!Array.isArray(db[k])) db[k] = [];
      }
      if (!db.sessions || typeof db.sessions !== 'object' || Array.isArray(db.sessions)) db.sessions = {};
      if (!db.citizen_sessions || typeof db.citizen_sessions !== 'object' || Array.isArray(db.citizen_sessions)) db.citizen_sessions = {};
      migrateComplaintLetters();
      migrateCommunity();
      return db;
    }
  } catch (e) {
    console.error('[db] failed to read db.json, reseeding:', e.message);
  }
  db = seedDb();
  saveDb();
  return db;
}

export function saveDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
  fs.renameSync(tmp, DB_FILE);
}

export function resetDb() {
  fs.rmSync(DB_FILE, { force: true });
  db = null;
  getDb();
  console.log('[db] reset complete, fresh seed written');
}

function migrateComplaintLetters() {
  if (!Array.isArray(db.complaints)) return;
  let changed = false;
  for (const c of db.complaints) {
    if (c.draft_english === null || c.draft_english === undefined) {
      const dept = (db.departments || DEPARTMENTS).find((d) => d.id === c.department_id) || null;
      const identity = c.is_anonymous ? null : { anonymous: false, name: c.citizen_name || '', phone: c.citizen_phone || '', email: c.citizen_email || '' };
      try {
        c.draft_english = buildLetter({ complaint: c, dept, identity });
        changed = true;
      } catch (e) {
        console.error(`[db] migration: failed to build letter for ${c.id}:`, e.message);
      }
    }
    if ((c.letter_final === null || c.letter_final === undefined) && c.draft_english) {
      if (['sent', 'acknowledged', 'in_progress', 'resolved', 'rejected'].includes(c.status)) {
        c.letter_final = c.draft_english;
        changed = true;
      }
    }
    // Escalation fields (added after initial build; default to 0/null)
    if (c.escalation_level === null || c.escalation_level === undefined) {
      c.escalation_level = 0;
      changed = true;
    }
    if (c.escalated_at === undefined) {
      c.escalated_at = null;
      changed = true;
    }
    // Photo assessment field (added after initial build; default to null)
    if (c.photo_assessment === undefined) {
      c.photo_assessment = null;
      changed = true;
    }
  }
  if (changed) saveDb();
}

// Community platform (citizen accounts + public feed): backfill the
// complaint visibility field and make sure the demo citizen exists. Existing
// complaints were never opted into publicity, so they stay private; seeded
// demo samples become public so the community feed is not empty on first run.
function migrateCommunity() {
  let changed = false;
  if (Array.isArray(db.complaints)) {
    for (const c of db.complaints) {
      if (c.visibility === undefined) {
        c.visibility = c.is_sample ? 'public' : 'private';
        changed = true;
      }
      if (c.created_by_user_id === undefined) {
        c.created_by_user_id = null;
        changed = true;
      }
    }
  }
  // Demo citizen account (like the demo official): add once, never overwrite.
  if (Array.isArray(db.users) && !db.users.some((u) => u.email === CITIZENS[0].email)) {
    const { password, ...rest } = CITIZENS[0];
    db.users.push({ ...rest, password_hash: hashPassword(password), created_at: daysAgoIso(30), updated_at: daysAgoIso(30) });
    changed = true;
  }
  if (changed) saveDb();
}
