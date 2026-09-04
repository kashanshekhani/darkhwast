// Shared client helpers: icons, API wrapper, toasts, searchable city select,
// offline banner, copy-with-announcement, date formatting, dashboard auth.

import { t, tv, lang, setLang } from './i18n.js';
import { CITIES } from './constants.js';

// language toggle (citizen pages); pages can register a re-render for
// dynamically built content.  Idempotent: calling it twice replaces the old
// listener instead of stacking a second one (which would toggle the language
// back to where it started).
export function bindLangToggle(rerender) {
  document.querySelectorAll('.lang-toggle').forEach((b) => {
    // Clone the node to remove all previously-attached event listeners
    const clone = b.cloneNode(true);
    b.parentNode.replaceChild(clone, b);
  });
  // Now bind fresh listeners to the cloned nodes
  document.querySelectorAll('.lang-toggle').forEach((b) => {
    b.addEventListener('click', () => {
      setLang(lang() === 'ur' ? 'en' : 'ur');
      rerender && rerender();
    });
  });
}

// ---------------------------------------------------------------------------
// icons (24x24 outline set per DESIGN.md; stroke = currentColor)
// ---------------------------------------------------------------------------
const P = (inner, extra = '') =>
  `<svg class="ic ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;

export const ICONS = {
  garbage: P('<path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M10 11v5M14 11v5"/>'),
  streetlight: P('<path d="M9 3h6l-1 5h-4L9 3z"/><path d="M12 8v13"/><path d="M8 21h8"/><path d="M4 5l2 1.5M20 5l-2 1.5M12 1v1"/>'),
  water: P('<path d="M12 3s-6 6.4-6 10.6A6 6 0 0 0 18 13.6C18 9.4 12 3 12 3z"/><path d="M9 14h6"/>'),
  sewage: P('<path d="M3 9c2-2.2 4-2.2 6 0s4 2.2 6 0 4-2.2 6 0"/><path d="M3 15c2-2.2 4-2.2 6 0s4 2.2 6 0 4-2.2 6 0"/><path d="M7 4c1-.8 2-.8 3 0"/>'),
  road: P('<path d="M8 3 4 21"/><path d="M16 3l4 18"/><path d="M12 5v2"/><path d="M12 10.5v2"/><path d="M12 16v2"/>'),
  other: P('<circle cx="12" cy="12" r="9"/><path d="M9.6 9.2a2.6 2.6 0 1 1 3.9 2.3c-.8.5-1.5 1-1.5 2"/><path d="M12 17h.01"/>'),
  copy: P('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>'),
  check: P('<path d="M4 12.5 10 18 20 6"/>'),
  x: P('<path d="M6 6l12 12M18 6 6 18"/>'),
  search: P('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/>'),
  back: P('<path d="M15 5l-7 7 7 7"/>'),
  alert: P('<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4"/><path d="M12 17.5h.01"/>'),
  info: P('<circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M12 11v5"/>'),
  send: P('<path d="M22 2 11 13"/><path d="M22 2 15 21l-4-8-8-4 19-7z"/>'),
  file: P('<path d="M6 2h8l4 4v16H6V2z"/><path d="M14 2v4h4"/>'),
  inbox: P('<path d="M3 12h5l2 3h4l2-3h5"/><path d="M5 5h14l2 7v7H3v-7l2-7z"/>'),
  shield: P('<path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3z"/>'),
  // community platform icons (stroke set, same 24x24 grid)
  support: P('<path d="M7 10v11"/><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7v-11l3.55-7.11A2.31 2.31 0 0 1 12 3a3.13 3.13 0 0 1 3 3.88Z"/>'),
  comment: P('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>'),
  pin: P('<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>'),
  photo: P('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>'),
};
export const icon = (name) => ICONS[name] || ICONS.other;

export const CATEGORY_ICON = { garbage: 'garbage', streetlight: 'streetlight', water: 'water', sewage: 'sewage', road: 'road', other: 'other' };

// seal: rubber-stamp mark for the letter header
export const sealSvg = () => `
<svg class="seal" viewBox="0 0 100 100" aria-hidden="true">
  <circle cx="50" cy="50" r="46" fill="none" stroke="#0E6B5C" stroke-width="3"/>
  <circle cx="50" cy="50" r="36" fill="none" stroke="#0E6B5C" stroke-width="1.5"/>
  <text x="50" y="47" text-anchor="middle" font-family="'IBM Plex Mono',monospace" font-size="17" font-weight="600" fill="#0E6B5C" letter-spacing="1">DK</text>
  <text x="50" y="64" text-anchor="middle" font-family="'Public Sans',sans-serif" font-size="8" fill="#0E6B5C" letter-spacing="1.6">DARKHWAST</text>
  <path d="M50 8l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6z" fill="#0E6B5C"/>
  <circle cx="15" cy="50" r="2" fill="#0E6B5C"/><circle cx="85" cy="50" r="2" fill="#0E6B5C"/>
</svg>`;

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
export async function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  // official pages send dk_token (default); community pages pass auth:'citizen'
  // to send the citizen token instead — the two auth systems stay separate.
  const token = opts.auth === 'citizen'
    ? sessionStorage.getItem('dk_user_token')
    : sessionStorage.getItem('dk_token');
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { ...opts, headers });
  let data = null;
  try { data = await res.json(); } catch { /* non-json */ }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.field_errors = data?.field_errors;
    throw err;
  }
  return data;
}

// ---------------------------------------------------------------------------
// toast + copy
// ---------------------------------------------------------------------------
export function toast(msg, kind = 'ok') {
  let box = document.getElementById('toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; document.body.appendChild(box); }
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  el.textContent = msg;
  box.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

export async function copyText(text) {
  try { await navigator.clipboard.writeText(text); }
  catch {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); ta.remove();
  }
  toast(t('copied'));
}

// ---------------------------------------------------------------------------
// formatting
// ---------------------------------------------------------------------------
const LOCALES = { en: 'en-GB', ur: 'ur-PK' };
export const fmtDateTime = (iso) => iso
  ? new Date(iso).toLocaleString(LOCALES[lang()], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '-';
export function timeAgo(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

// ---------------------------------------------------------------------------
// searchable city select (keyboard navigable per DESIGN.md)
// ---------------------------------------------------------------------------
export function citySelect(container, { onChange } = {}) {
  const state = { value: null, other: false };
  container.classList.add('select-search');
  container.innerHTML = `
    <input type="text" class="control" role="combobox" aria-expanded="false" aria-autocomplete="list"
      autocomplete="off" spellcheck="false" data-i18n-ph="city_ph" />
    <ul role="listbox" hidden></ul>`;
  const input = container.querySelector('input');
  const list = container.querySelector('ul');
  let items = [];
  let active = -1;

  const label = (c) => (lang() === 'ur' ? `${c.ur} <span class="lat">(${c.en})</span>` : c.en);

  function renderList(q = '') {
    const query = q.trim().toLowerCase();
    items = CITIES.filter((c) => !query || c.en.toLowerCase().includes(query) || c.ur.includes(q));
    const otherOpt = !query || 'other'.includes(query) || t('city_unsupported').toLowerCase().includes(query);
    let html = items.map((c, i) => `<li role="option" data-id="${c.id}" aria-selected="${state.value === c.id}">${label(c)}</li>`).join('');
    if (otherOpt) html += `<li role="option" data-id="other" aria-selected="${state.other}">${t('city_unsupported')}</li>`;
    if (!html) html = `<li class="none">${t('city_unsupported')}</li>`;
    list.innerHTML = html;
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    active = -1;
    list.querySelectorAll('li[data-id]').forEach((li) => {
      li.addEventListener('mousedown', (e) => { e.preventDefault(); pick(li.dataset.id); });
    });
  }

  function pick(id) {
    if (id === 'other') {
      state.other = true; state.value = null;
      input.value = t('city_unsupported');
    } else {
      state.other = false; state.value = id;
      const c = CITIES.find((x) => x.id === id);
      input.value = lang() === 'ur' ? c.ur : c.en;
    }
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-invalid');
    hideErr();
    onChange && onChange(state);
  }

  function hideErr() {
    const err = container.parentElement.querySelector('.field-error:not([id])');
    if (err) err.remove();
  }

  input.addEventListener('focus', () => renderList(input.value === t('city_unsupported') ? '' : input.value));
  input.addEventListener('input', () => { state.value = null; state.other = false; renderList(input.value); });
  input.addEventListener('blur', () => setTimeout(() => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); }, 150));
  input.addEventListener('keydown', (e) => {
    const opts = [...list.querySelectorAll('li[data-id]')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (list.hidden) renderList(input.value);
      active = e.key === 'ArrowDown' ? (active + 1) % opts.length : (active - 1 + opts.length) % opts.length;
      opts.forEach((o, i) => o.style.background = i === active ? 'var(--stamp-tint)' : '');
      opts[active]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && active >= 0 && opts[active]) {
      e.preventDefault();
      pick(opts[active].dataset.id);
    } else if (e.key === 'Escape') {
      list.hidden = true; input.setAttribute('aria-expanded', 'false');
    }
  });

  return {
    state,
    setError(msg) {
      hideErr();
      input.setAttribute('aria-invalid', 'true');
      const err = document.createElement('div');
      err.className = 'field-error'; err.textContent = msg;
      container.parentElement.appendChild(err);
    },
  };
}

// ---------------------------------------------------------------------------
// offline banner
// ---------------------------------------------------------------------------
export function initOfflineBanner() {
  const el = document.createElement('div');
  el.id = 'offline-banner';
  el.className = 'banner banner-offline';
  el.setAttribute('role', 'status');
  el.hidden = true;
  el.innerHTML = `${icon('alert')}<div>${t('offline')}</div>`;
  const shell = document.querySelector('.shell, .shell-track');
  shell && shell.prepend(el);
  const upd = () => { el.hidden = navigator.onLine; };
  window.addEventListener('online', upd);
  window.addEventListener('offline', upd);
  upd();
}

// ---------------------------------------------------------------------------
// dashboard auth guard
// ---------------------------------------------------------------------------
export function requireOfficial() {
  const token = sessionStorage.getItem('dk_token');
  if (!token) { location.href = '/login.html'; return null; }
  return token;
}

// citizen (community platform) auth guard — separate session key dk_user_token
export function requireCitizen() {
  const token = sessionStorage.getItem('dk_user_token');
  if (!token) { location.href = '/signin.html'; return null; }
  return token;
}

export const citizenToken = () => sessionStorage.getItem('dk_user_token');

export const citizenUser = () => {
  try { return JSON.parse(sessionStorage.getItem('dk_user') || 'null'); } catch { return null; }
};

export function setCitizenSession(token, user) {
  sessionStorage.setItem('dk_user_token', token);
  sessionStorage.setItem('dk_user', JSON.stringify(user));
}

export function clearCitizenSession() {
  sessionStorage.removeItem('dk_user_token');
  sessionStorage.removeItem('dk_user');
}

// Renders the new premium sidebar for the user portal
export function mountCommunityNav(active) {
  const container = document.getElementById('userSidebarContainer');
  if (!container) return;
  const authed = Boolean(sessionStorage.getItem('dk_user_token'));

  // Define icons
  const iconHome = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
  const iconCommunity = ICONS.other; // Generic groups/community icon
  const iconFile = ICONS.file;
  const iconTrack = ICONS.search;
  const iconAuth = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;

  container.innerHTML = `
    <aside class="sidebar" id="dashSide">
      <div class="sb-brand-row">
        <a class="sb-brand-link" href="/" aria-label="DarKhwast Home">
          <span class="sb-logo-tile" aria-hidden="true">
            <img src="/assets/Logo.png" alt="" width="20" height="20" style="filter: brightness(0) invert(1);">
          </span>
          <span class="sb-brand-text">
            <span class="sb-brand-name">DarKhwast</span>
            <span class="sb-brand-sub" data-i18n="nav_citizen">Citizen Portal</span>
          </span>
        </a>
        <button type="button" class="sb-collapse-btn" id="sideCollapseBtn" aria-label="Collapse sidebar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
      </div>
      <div class="sb-divider"></div>

      <div class="sb-scroll">
        <nav class="sb-nav" aria-label="Main navigation">
          <a class="sb-link ${active === 'home' ? 'active' : ''}" href="/account.html">
            <span class="sb-nav-icon" aria-hidden="true">${iconHome}</span>
            <span class="sb-nav-label" data-i18n="nav_home">Home</span>
          </a>
          <a class="sb-link ${active === 'community' ? 'active' : ''}" href="/community.html">
            <span class="sb-nav-icon" aria-hidden="true">${iconCommunity}</span>
            <span class="sb-nav-label" data-i18n="nav_community">Community</span>
          </a>
          <a class="sb-link ${active === 'file' ? 'active' : ''}" href="/file.html">
            <span class="sb-nav-icon" aria-hidden="true">${iconFile}</span>
            <span class="sb-nav-label" data-i18n="cta_file_short">File Complaint</span>
          </a>
          <a class="sb-link ${active === 'track' ? 'active' : ''}" href="/track.html">
            <span class="sb-nav-icon" aria-hidden="true">${iconTrack}</span>
            <span class="sb-nav-label" data-i18n="nav_track">Track</span>
          </a>
        </nav>
      </div>

      <div class="sb-foot">
        <button type="button" class="sb-foot-signout lang-toggle" style="margin-bottom: 8px;">
          <span class="sb-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span>
          <span class="sb-nav-label" data-i18n="lang_name">English</span>
        </button>
        ${authed
          ? `<a href="/account.html?view=details" class="sb-foot-signout" style="text-decoration:none; color:var(--sb-muted)">
               <span class="sb-nav-icon" aria-hidden="true">${iconAuth}</span>
               <span class="sb-nav-label" data-i18n="nav_my_account">My Account</span>
             </a>`
          : `<a href="/signin.html" class="sb-foot-signout" style="text-decoration:none; color:var(--sb-muted)">
               <span class="sb-nav-icon" aria-hidden="true">${iconAuth}</span>
               <span class="sb-nav-label" data-i18n="nav_signin">Sign in</span>
             </a>`
        }
      </div>
    </aside>
  `;

  // NOTE: bindLangToggle is NOT called here. The page script calls it after
  // mountCommunityNav, and setLang() → applyI18n() already updates all
  // [data-i18n] elements in the sidebar. Calling bindLangToggle twice would
  // add two click listeners that toggle the language twice (ur→en→ur).

  // Attach toggle logic
  const side = document.getElementById('dashSide');
  const layout = side && side.closest('.dash-layout');
  const btn = document.getElementById('sideCollapseBtn');
  const backdrop = document.getElementById('sideBackdrop');
  
  if (btn && side) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var collapsed = side.classList.toggle('collapsed');
      layout && layout.classList.toggle('sidebar-collapsed', collapsed);
    });
  }

  // Mobile menu toggle via a topbar button if present
  const mobileBtn = document.getElementById('menuBtn');
  if (mobileBtn && side && backdrop) {
    mobileBtn.addEventListener('click', () => {
      side.classList.add('open');
      backdrop.classList.add('show');
      document.body.style.overflow = 'hidden';
    });
    backdrop.addEventListener('click', () => {
      side.classList.remove('open');
      backdrop.classList.remove('show');
      document.body.style.overflow = '';
    });
  }
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// fill [data-icon] slots after static or dynamic render
export function mountIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    if (el.dataset.iconDone) return;
    el.innerHTML = icon(el.dataset.icon);
    el.dataset.iconDone = '1';
  });
}

export const qs = (name) => new URLSearchParams(location.search).get(name);

export const isPhoneLike = (s) => /^[0-9+\-\s()]{7,20}$/.test(String(s || '').trim());
export const isEmailLike = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());

// ---------------------------------------------------------------------------
// Status shape system — shape + color encoding for all 8 statuses.
// Each status has a distinct SVG shape so it's recognizable without color.
// ---------------------------------------------------------------------------
const STATUS_SHAPES = {
  draft: (s) => `<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/>`,
  needs_review: (s) => `<path d="M12 4 L20 19 L4 19 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>`,
  pending_approval: (s) => `<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8 L12 12 L15 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
  sent: (s) => `<rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor"/>`,
  send_failed: (s) => `<path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`,
  acknowledged: (s) => `<path d="M12 3 A9 9 0 0 1 12 21 Z" fill="currentColor"/><path d="M12 3 A9 9 0 0 0 12 21 Z" fill="none" stroke="currentColor" stroke-width="2"/>`,
  in_progress: (s) => `<path d="M12 3 A9 9 0 0 1 21 12 L12 12 Z" fill="currentColor"/><path d="M12 3 A9 9 0 1 0 21 12 L12 12 Z" fill="none" stroke="currentColor" stroke-width="2"/>`,
  resolved: (s) => `<path d="M4 12.5 L10 18 L20 6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`,
  rejected: (s) => `<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M6 6 L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>`,
};

const STATUS_COLORS = {
  draft: '#475569', needs_review: '#B45309', pending_approval: '#7C3AED', sent: '#1D4ED8',
  send_failed: '#B91C1C', acknowledged: '#0E6B5C', in_progress: '#6D28D9',
  resolved: '#15803D', rejected: '#B91C1C',
};

const STATUS_LABELS = {
  draft: 'Draft', needs_review: 'Needs review', pending_approval: 'Pending approval', sent: 'Sent',
  send_failed: 'Send failed', acknowledged: 'Acknowledged', in_progress: 'In progress',
  resolved: 'Resolved', rejected: 'Rejected',
};

export function statusIcon(status, size = 24) {
  const shape = STATUS_SHAPES[status] || STATUS_SHAPES.draft;
  const color = STATUS_COLORS[status] || '#475569';
  return `<span class="status-shape" style="color:${color}"><svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">${shape(size)}</svg></span>`;
}

export function statusPill(status) {
  // tv() falls back to the English VOCAB label until initLang() runs, so the
  // English-only official pages keep their exact current output.
  const label = tv('statuses', status) || (STATUS_LABELS[status] || status).replace(/_/g, ' ');
  return `<span class="status-pill ${status}">${statusIcon(status, 12)}${label}</span>`;
}

export function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

export function statusColor(status) {
  return STATUS_COLORS[status] || '#475569';
}

// ---------------------------------------------------------------------------
// Severity meter — 4-segment bar (shape + fill, not color alone)
// ---------------------------------------------------------------------------
export function severityMeter(level, withLabel = false) {
  const segs = level === 'high' ? 4 : level === 'medium' ? 3 : 1;
  let html = '<span class="sev-meter">';
  for (let i = 0; i < 4; i++) html += `<span class="seg${i < segs ? ` on ${level}` : ''}"></span>`;
  html += '</span>';
  if (withLabel) html += `<span class="sev-meter-label" style="color:var(--sev-${level === 'high' ? 'high' : level === 'medium' ? 'med' : 'low'})">${level}</span>`;
  return html;
}

// ---------------------------------------------------------------------------
// Chart primitives — pure SVG, no library. Each returns an SVG string.
// ---------------------------------------------------------------------------

// Donut chart: data = [{ label, value, color }], returns SVG + legend HTML
export function donutChart(data, { size = 140, thickness = 22, centerLabel = '', centerValue = '' } = {}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return `<div class="donut-wrap"><svg width="${size}" height="${size}"><circle cx="${size/2}" cy="${size/2}" r="${(size-thickness)/2}" fill="none" stroke="var(--border-light)" stroke-width="${thickness}"/></svg></div>`;
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const segments = data.filter((d) => d.value > 0).map((d) => {
    const frac = d.value / total;
    const len = frac * circumference;
    const dash = `${len} ${circumference - len}`;
    const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${d.color}" stroke-width="${thickness}" stroke-dasharray="${dash}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" style="transition: stroke-dasharray .4s ease"/>`;
    offset += len;
    return seg;
  }).join('');
  const legend = data.filter((d) => d.value > 0).map((d) =>
    `<span class="chart-legend-item" data-status="${d.status || ''}"><span class="chart-legend-sq" style="background:${d.color}"></span>${d.label}<span class="chart-legend-val">${d.value}</span></span>`
  ).join('');
  return `<div class="donut-wrap"><svg width="${size}" height="${size}" role="img" aria-label="Status distribution: ${data.map(d => `${d.label} ${d.value}`).join(', ')}">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--border-light)" stroke-width="${thickness}"/>
    ${segments}
    ${centerValue ? `<text class="donut-center" x="${cx}" y="${cy - 8}">${centerValue}</text>` : ''}
    ${centerLabel ? `<text class="donut-center-label" x="${cx}" y="${cy + 12}">${centerLabel}</text>` : ''}
  </svg></div><div class="chart-legend">${legend}</div>`;
}

// Horizontal bar chart: data = [{ label, value, color }]
export function hbarChart(data, { maxVal } = {}) {
  const max = maxVal || Math.max(1, ...data.map((d) => d.value));
  if (!data.length) return '<p class="small muted" style="text-align:center;padding:20px 0">No data</p>';
  const bars = data.map((d) => `
    <div class="hbar-item" data-cat="${d.cat || ''}">
      <span class="hbar-label">${d.label}</span>
      <span class="hbar-track"><span class="hbar-fill" style="width:${Math.round((d.value / max) * 100)}%;background:${d.color}"></span></span>
      <span class="hbar-val">${d.value}</span>
    </div>`).join('');
  return `<div class="hbar-list">${bars}</div>`;
}

// Area chart: data = [{ date, filed, resolved }], 14-day window
export function areaChart(data, { width = 280, height = 100 } = {}) {
  if (!data.length) return '<p class="small muted" style="text-align:center;padding:20px 0">No data</p>';
  const max = Math.max(1, ...data.map((d) => Math.max(d.filed, d.resolved)));
  const pad = 8;
  const w = width - pad * 2, h = height - pad * 2;
  const stepX = data.length > 1 ? w / (data.length - 1) : 0;
  const y = (v) => pad + h - (v / max) * h;
  const x = (i) => pad + i * stepX;
  const filedPts = data.map((d, i) => `${x(i)},${y(d.filed)}`).join(' ');
  const resolvedPts = data.map((d, i) => `${x(i)},${y(d.resolved)}`).join(' ');
  const filedArea = `${pad},${pad + h} ${filedPts} ${pad + w},${pad + h}`;
  return `<div class="area-chart-wrap"><svg width="${width}" height="${height}" role="img" aria-label="Filed vs resolved, last 14 days">
    <polygon points="${filedArea}" fill="rgba(27,43,68,.08)"/>
    <polyline points="${filedPts}" fill="none" stroke="var(--chart-2)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="${resolvedPts}" fill="none" stroke="var(--chart-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg></div>`;
}

// Sparkline: data = [number, ...], tiny line for KPI tiles
export function sparkline(data, { width = 80, height = 24, color = 'var(--chart-1)' } = {}) {
  if (!data.length) return '';
  const max = Math.max(1, ...data), min = Math.min(0, ...data);
  const range = max - min || 1;
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;
  const pts = data.map((v, i) => `${i * stepX},${height - ((v - min) / range) * height}`).join(' ');
  return `<div class="kpi-spark"><svg width="${width}" height="${height}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>`;
}

// ---------------------------------------------------------------------------
// Donezo-style chart helpers
// ---------------------------------------------------------------------------

// Donut progress chart: single value (0-100) with a label in the center
export function donutProgress(percent, { size = 140, thickness = 16, color = 'var(--dz-accent)', trackColor = 'var(--dz-surface-2)', centerValue, centerLabel } = {}) {
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const fill = Math.min(100, Math.max(0, percent));
  const dash = (fill / 100) * circumference;
  return `<svg class="dz-donut-svg" width="${size}" height="${size}" role="img" aria-label="${centerLabel || 'progress'}: ${percent}%">
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${trackColor}" stroke-width="${thickness}"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${thickness}"
      stroke-dasharray="${dash} ${circumference - dash}"
      stroke-linecap="round"
      transform="rotate(-90 ${cx} ${cy})"
      style="transition: stroke-dasharray .5s ease"/>
    ${centerValue ? `<text class="dz-donut-center-val" x="${cx}" y="${cy - 6}">${centerValue}</text>` : ''}
    ${centerLabel ? `<text class="dz-donut-center-label" x="${cx}" y="${cy + 14}">${centerLabel}</text>` : ''}
  </svg>`;
}

// 7-day bar chart (Donezo style): data = [{ day, filed, resolved }]
export function barChart7d(data) {
  if (!data.length) return '<p style="text-align:center;padding:20px 0;color:var(--dz-ink-muted)">No data</p>';
  const max = Math.max(1, ...data.map((d) => Math.max(d.filed, d.resolved)));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cols = data.map((d) => {
    const filedH = (d.filed / max) * 100;
    const resolvedH = (d.resolved / max) * 100;
    const isToday = d.date && new Date(d.date).toDateString() === today.toDateString();
    const isZero = d.filed === 0 && d.resolved === 0;
    return `
    <div class="dz-bar-col ${isToday ? 'today' : ''} ${isZero ? 'zero' : ''}">
      <div class="dz-bar-stack">
        <div class="dz-bar-tooltip">${d.filed} filed · ${d.resolved} resolved</div>
        ${d.filed > 0 ? `<div class="dz-bar-fill filed" style="height:${filedH}%"></div>` : ''}
        ${d.resolved > 0 ? `<div class="dz-bar-fill resolved" style="height:${resolvedH}%"></div>` : ''}
      </div>
      <div class="dz-bar-label">${d.day}</div>
    </div>`;
  }).join('');
  return `<div class="dz-bar-chart">${cols}</div>
    <div class="dz-chart-legend">
      <span class="dz-chart-legend-item"><span class="dz-chart-legend-sq filed"></span>Filed</span>
      <span class="dz-chart-legend-item"><span class="dz-chart-legend-sq resolved"></span>Resolved</span>
    </div>`;
}

// Donezo severity meter (4 dots)
export function sevDots(level) {
  const segs = level === 'high' ? 4 : level === 'medium' ? 3 : 1;
  let html = '<span class="dz-sev-meter">';
  for (let i = 0; i < 4; i++) html += `<span class="seg${i < segs ? ` on ${level}` : ''}"></span>`;
  html += '</span>';
  return html;
}

// Donezo status pill
export function dzStatusPill(status) {
  const label = (STATUS_LABELS[status] || status).replace(/_/g, ' ');
  return `<span class="dz-status-pill ${status}">${statusIcon(status, 12)}${label}</span>`;
}
