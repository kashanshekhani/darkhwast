// Shared client helpers: icons, API wrapper, toasts, searchable city select,
// offline banner, copy-with-announcement, date formatting, dashboard auth.

import { t, lang, setLang } from './i18n.js';

// language toggle (citizen pages); pages can register a re-render for
// dynamically built content
export function bindLangToggle(rerender) {
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
  const token = sessionStorage.getItem('dk_token');
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
const LOCALES = { en: 'en-GB', ur: 'en-GB' };
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
  const CITIES = [
    { id: 'karachi', en: 'Karachi', ur: 'کراچی' },
    { id: 'lahore', en: 'Lahore', ur: 'لاہور' },
    { id: 'islamabad', en: 'Islamabad', ur: 'اسلام آباد' },
    { id: 'faisalabad', en: 'Faisalabad', ur: 'فیصل آباد' },
  ];
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
