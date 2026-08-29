// Tiny JSON-file datastore. Zero native dependencies (no SQLite build pain on
// Windows), perfectly adequate for a hackathon prototype and a live demo.
// All mutations go through saveDb() which writes atomically (tmp + rename).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEPARTMENTS, OFFICIALS, buildSamples } from './seed.js';
import { hashPassword } from './util.js';

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
    status_events: samples.events,
    sessions: {},
  };
}

let db;

export function getDb() {
  if (db) return db;
  try {
    if (fs.existsSync(DB_FILE)) {
      db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      for (const k of ['complaints', 'departments', 'officials', 'status_events', 'sessions']) {
        if (!Array.isArray(db[k]) && k !== 'sessions') db[k] = [];
      }
      if (!db.sessions || typeof db.sessions !== 'object') db.sessions = {};
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
