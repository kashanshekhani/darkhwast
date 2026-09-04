// Pure logic for the Community Issues platform: the sanitized public view
// (never any PII, coordinates or internal fields) and the feed builder with
// search / filters / sort / pagination. No express, no fs — unit-testable.

import { PUBLIC_STATUSES } from './util.js';

export const FEED_PAGE_SIZE = 24;
export const FEED_SORTS = ['newest', 'oldest', 'most_supported', 'most_discussed'];

// ---------------------------------------------------------------------------
// reporter identity — the one display-name decision in the public API:
// - anonymous complaints → "Reported anonymously"
// - complaints filed from a citizen account → that account's display name
//   (community members knowingly publish under their name)
// - everyone else → "Reported by a DarKhwast citizen" — guest submitters gave
//   their name for the department letter, never for a public feed.
// ---------------------------------------------------------------------------
export function reporterOf(c, users) {
  if (c.is_anonymous) return { anonymous: true, name: null };
  const user = c.created_by_user_id
    ? (Array.isArray(users) ? users : []).find((u) => u.id === c.created_by_user_id)
    : null;
  return { anonymous: false, name: user ? user.name : null };
}

// English label for server-side consumers/tests; the frontend re-labels via
// i18n from the structured reporter object.
export function reporterLabel(reporter) {
  if (!reporter || reporter.anonymous) return 'Reported anonymously';
  if (reporter.name) return `Reported by ${reporter.name}`;
  return 'Reported by a DarKhwast citizen';
}

// ---------------------------------------------------------------------------
// communityView — the ONLY shape the public community API ever returns for a
// complaint. Allowed fields, exactly: id, tracking_id, title, summary_ur,
// description, city, area, category, severity, status, department {name},
// images, support_count, comment_count, reporter, is_sample, created_at,
// sent_at, resolved_at. Never: email, phone, citizen_name, location coords,
// created_by_user_id, dispatch_log, classification_raw, drafts/letters.
// ---------------------------------------------------------------------------
export function communityView(c, { supportCount = 0, commentCount = 0, reporter = { anonymous: true, name: null }, deptName = null } = {}) {
  return {
    id: c.id,
    tracking_id: c.tracking_id,
    title: c.summary_en,
    summary_ur: c.summary_ur,
    description: c.raw_text,
    city: c.city,
    area: c.area,
    category: c.category,
    severity: c.severity,
    status: c.status,
    department: deptName ? { name: deptName } : null,
    images: Array.isArray(c.images) ? c.images : [],
    support_count: supportCount,
    comment_count: commentCount,
    reporter,
    is_sample: Boolean(c.is_sample),
    created_at: c.created_at,
    sent_at: c.sent_at || null,
    resolved_at: c.resolved_at || null,
  };
}

// ---------------------------------------------------------------------------
// buildFeed — public + PUBLIC_STATUSES complaints only. Private complaints and
// pre-send drafts can never appear, not even via search.
// ---------------------------------------------------------------------------
export function buildFeed(db, { q = '', city = '', area = '', category = '', status = '', dept = '', sort = 'newest', page = 1 } = {}) {
  const base = db.complaints.filter((c) => c.visibility === 'public' && PUBLIC_STATUSES.includes(c.status));

  // facets: what actually exists in the public feed (for the filter selects)
  const cities = [...new Set(base.map((c) => c.city))];
  const categories = [...new Set(base.map((c) => c.category))];
  const departments = [];
  for (const c of base) {
    if (!c.department_id) continue;
    const d = db.departments.find((x) => x.id === c.department_id);
    if (d && !departments.some((x) => x.id === d.id)) departments.push({ id: d.id, name: d.name });
  }

  let list = base;
  const query = String(q || '').trim().toLowerCase();
  if (query) {
    list = list.filter((c) => [c.summary_en, c.summary_ur, c.raw_text, c.area, c.tracking_id]
      .some((v) => String(v || '').toLowerCase().includes(query)));
  }
  if (city) list = list.filter((c) => c.city === city);
  if (area) {
    const a = String(area).trim().toLowerCase();
    list = list.filter((c) => String(c.area || '').toLowerCase().includes(a));
  }
  if (category) list = list.filter((c) => c.category === category);
  if (status && PUBLIC_STATUSES.includes(status)) list = list.filter((c) => c.status === status);
  if (dept) list = list.filter((c) => c.department_id === dept);

  // engagement counts (hidden comments don't count toward the discussion total)
  const supports = {};
  for (const s of db.supports || []) supports[s.complaint_id] = (supports[s.complaint_id] || 0) + 1;
  const comments = {};
  for (const m of db.comments || []) {
    if (m.status !== 'hidden') comments[m.complaint_id] = (comments[m.complaint_id] || 0) + 1;
  }

  list = list.slice();
  if (sort === 'oldest') list.sort((a, b) => a.created_at.localeCompare(b.created_at));
  else if (sort === 'most_supported') list.sort((a, b) => (supports[b.id] || 0) - (supports[a.id] || 0) || b.created_at.localeCompare(a.created_at));
  else if (sort === 'most_discussed') list.sort((a, b) => (comments[b.id] || 0) - (comments[a.id] || 0) || b.created_at.localeCompare(a.created_at));
  else list.sort((a, b) => b.created_at.localeCompare(a.created_at)); // newest

  const total = list.length;
  const pageNum = Math.max(1, Number(page) || 1);
  const start = (pageNum - 1) * FEED_PAGE_SIZE;
  const items = list.slice(start, start + FEED_PAGE_SIZE).map((c) => communityView(c, {
    supportCount: supports[c.id] || 0,
    commentCount: comments[c.id] || 0,
    reporter: reporterOf(c, db.users),
    deptName: c.department_id ? db.departments.find((d) => d.id === c.department_id)?.name : null,
  }));

  return { items, total, page: pageNum, page_size: FEED_PAGE_SIZE, facets: { cities, categories, departments } };
}

// counts for a single issue detail view (same rules as the feed)
export function engagementOf(db, complaintId) {
  return {
    supportCount: (db.supports || []).filter((s) => s.complaint_id === complaintId).length,
    commentCount: (db.comments || []).filter((m) => m.complaint_id === complaintId && m.status !== 'hidden').length,
  };
}
