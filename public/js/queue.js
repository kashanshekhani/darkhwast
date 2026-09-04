// Queue page — Donezo skin: the full complaint queue with filters, sorting,
// and status navigation. Loaded independently from the analytics dashboard.

import { api, esc, icon, CATEGORY_ICON, mountIcons, requireOfficial, timeAgo, toast, statusIcon, statusLabel, dzStatusPill, sevDots } from './shared.js';
import { CAT_LABEL, CITY_LABEL } from './constants.js';

const ATTENTION = ['needs_review', 'send_failed', 'pending_approval'];
const ALL_NAV_STATUSES = ['draft', 'needs_review', 'pending_approval', 'sent', 'send_failed', 'acknowledged', 'in_progress', 'resolved', 'rejected'];
const PAGE_SIZE = 25;
const SEV_ORDER = { high: 3, medium: 2, low: 1 };

if (!requireOfficial()) throw new Error('redirecting to login');

let complaints = [];
let attention = false;
let visibleCount = PAGE_SIZE;
let currentSort = 'newest';

const official = JSON.parse(sessionStorage.getItem('dk_official') || '{}');
document.querySelectorAll('.js-who').forEach((el) => {
  const roleClass = official.role === 'viewer' ? ' role-badge viewer' : ' role-badge';
  el.innerHTML = `${esc(official.name || 'Official')}<span class="${roleClass.trim()}">${esc(official.role || 'official')}</span>`;
});

// Mobile sidebar toggle
function toggleSidebar(open) {
  const side = document.getElementById('dashSide');
  const backdrop = document.getElementById('sideBackdrop');
  const btn = document.getElementById('menuBtn');
  const isOpen = open ?? !side.classList.contains('open');
  side.classList.toggle('open', isOpen);
  backdrop.classList.toggle('open', isOpen);
  btn?.setAttribute('aria-expanded', String(isOpen));
}
document.getElementById('menuBtn')?.addEventListener('click', () => toggleSidebar());
document.getElementById('sideBackdrop')?.addEventListener('click', () => toggleSidebar(false));

// Filter toggle for mobile
const filterBar = document.getElementById('filterBar');
document.getElementById('filterToggle')?.addEventListener('click', (e) => {
  const collapsed = filterBar.classList.toggle('collapsed');
  e.currentTarget.setAttribute('aria-expanded', String(!collapsed));
});

// Offline banner
const offlineBanner = document.getElementById('offlineBanner');
function updateOffline() { offlineBanner.classList.toggle('show', !navigator.onLine); }
window.addEventListener('online', updateOffline);
window.addEventListener('offline', updateOffline);
updateOffline();

document.querySelectorAll('.js-logout').forEach((btn) =>
  btn.addEventListener('click', async () => {
    if (evtSource) { evtSource.close(); evtSource = null; }
    try { await api('/api/official/logout', { method: 'POST' }); } catch {}
    sessionStorage.removeItem('dk_token');
    sessionStorage.removeItem('dk_official');
    location.href = '/login.html';
  }));

let evtSource = null;
function connectSSE() {
  const token = sessionStorage.getItem('dk_token');
  if (!token) return;
  evtSource = new EventSource(`/api/official/events?token=${encodeURIComponent(token)}`);
  evtSource.addEventListener('message', (e) => {
    const evt = JSON.parse(e.data);
    if (evt.type === 'complaint:new') {
      toast(`New complaint filed: ${evt.trackingId}`);
      load(true);  // silent refresh — no skeleton flash
    } else if (evt.type === 'complaint:updated' || evt.type === 'complaint:escalated') {
      load(true);  // silent refresh
    }
  });
  evtSource.onerror = () => {
    if (evtSource && evtSource.readyState === EventSource.CLOSED) {
      if (sessionStorage.getItem('dk_token')) location.href = '/login.html';
    }
  };
}

function showSkeletonRows() {
  document.getElementById('queueList').innerHTML = Array.from({ length: 6 }, () =>
    '<div class="dz-skel-row"><div class="dz-skel-block" style="width:26px;height:26px;border-radius:50%"></div><div><div class="dz-skel-block" style="width:55%;margin-bottom:6px"></div><div class="dz-skel-block" style="width:40%"></div></div><div class="dz-skel-block" style="width:30px"></div></div>'
  ).join('');
}

async function load(silent = false) {
  if (!silent) showSkeletonRows();
  const errorBanner = document.getElementById('errorBanner');
  let data;
  try {
    data = await api('/api/official/complaints');
  } catch (e) {
    if (e.status === 401) { location.href = '/login.html'; return; }
    errorBanner.hidden = false;
    document.getElementById('errorMsg').textContent = e.message || 'Failed to load complaints.';
    if (!silent) document.getElementById('queueList').innerHTML = '';
    return;
  }
  errorBanner.hidden = true;
  complaints = data.complaints;
  if (!silent) {
    navCounts();
    applyUrlFilter();
  } else {
    navCounts();
    applyFilters();
  }
  document.getElementById('queueSub').textContent = `${complaints.length} complaints in the system`;
  if (!evtSource) connectSSE();
}

document.getElementById('retryBtn')?.addEventListener('click', load);

function navCounts() {
  document.getElementById('cnt-all').textContent = complaints.length;
  const attCount = complaints.filter((c) => ATTENTION.includes(c.status)).length;
  document.getElementById('cnt-attention').textContent = attCount;
  // Toggle attention dot on the "Needs attention" sidebar link
  document.querySelector('.sb-link.attention-dot')?.classList.toggle('attention-dot', attCount > 0);
  for (const s of ALL_NAV_STATUSES) {
    const el = document.getElementById(`cnt-${s}`);
    if (el) el.textContent = complaints.filter((c) => c.status === s).length;
  }
}

function syncNav(active) {
  // Premium sidebar uses .sb-nav .sb-link with data-nav / data-status attributes
  document.querySelectorAll('.sb-nav .sb-link').forEach((b) => {
    const isActive = b.dataset.nav === 'queue' || (b.dataset.status && b.dataset.status === active);
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-selected', String(isActive));
  });
}

function currentFilters() {
  return {
    q: document.getElementById('fSearch').value.trim().toLowerCase(),
    city: document.getElementById('fCity').value,
    cat: document.getElementById('fCat').value,
    sev: document.getElementById('fSev').value,
    status: document.getElementById('fStatus').value,
  };
}

function getFilteredRows() {
  const { q, city, cat, sev, status } = currentFilters();
  let rows = complaints.filter((c) => {
    if (city && c.city !== city) return false;
    if (cat && c.category !== cat) return false;
    if (sev && c.severity !== sev) return false;
    if (attention && !ATTENTION.includes(c.status)) return false;
    if (!attention && status && c.status !== status) return false;
    if (q) {
      const hay = `${c.tracking_id} ${c.area || ''} ${c.city} ${c.raw_text || ''} ${c.department?.name || ''} ${c.summary_en || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
  switch (currentSort) {
    case 'oldest': rows.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); break;
    case 'severity': rows.sort((a, b) => (SEV_ORDER[b.severity] || 0) - (SEV_ORDER[a.severity] || 0)); break;
    case 'waiting': rows.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); break;
    default: rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }
  return rows;
}

function updateFilterCount() {
  const { q, city, cat, sev, status } = currentFilters();
  let count = 0;
  if (q) count++; if (city) count++; if (cat) count++; if (sev) count++; if (status) count++; if (attention) count++;
  const el = document.getElementById('filterCount');
  el.hidden = count === 0;
  el.textContent = count;
  document.getElementById('clearBtn').hidden = count === 0 && !attention;
}

function applyFilters() {
  updateFilterCount();
  const rows = getFilteredRows();
  const visible = rows.slice(0, visibleCount);

  const list = document.getElementById('queueList');
  const empty = document.getElementById('emptyState');
  const loadMoreWrap = document.getElementById('loadMoreWrap');
  const queueCount = document.getElementById('queueCount');

  document.querySelector('.dz-queue-title').textContent = attention ? 'Needs attention' : (document.getElementById('fStatus').value ? statusLabel(document.getElementById('fStatus').value) : 'All complaints');
  queueCount.textContent = `${rows.length} complaint${rows.length !== 1 ? 's' : ''}`;

  if (!rows.length) {
    list.innerHTML = '';
    empty.hidden = false;
    empty.innerHTML = complaints.length
      ? `${icon('search')}<h2>No complaints match these filters</h2><button type="button" class="dz-btn" id="emptyClearBtn">Clear filters</button>`
      : `${icon('inbox')}<h2>No complaints yet</h2><p>Complaints filed by citizens will appear here.</p>`;
    mountIcons(empty);
    loadMoreWrap.hidden = true;
    document.getElementById('emptyClearBtn')?.addEventListener('click', clearAllFilters);
    return;
  }
  empty.hidden = true;

  list.innerHTML = visible.map((c) => {
    const age = timeAgo(c.created_at);
    const ageDays = (Date.now() - new Date(c.created_at).getTime()) / 86400000;
    const stale = ageDays > 7;
    return `
    <div class="dz-queue-row" tabindex="0" data-id="${esc(c.id)}" aria-label="Complaint ${esc(c.tracking_id)}, ${esc(c.status).replace('_', ' ')}, ${esc(CAT_LABEL[c.category] || c.category)}">
      <div class="dz-queue-row-icon">${statusIcon(c.status, 26)}</div>
      <div class="dz-queue-row-body">
        <div class="dz-queue-row-line1">
          <span class="dz-queue-row-id mono">${esc(c.tracking_id)}</span>
          ${c.is_sample ? '<span class="sample-tag">sample</span>' : ''}
          ${dzStatusPill(c.status)}
          ${c.escalation_level >= 1 ? '<span class="dz-escalation-badge">escalated</span>' : ''}
          <span class="dz-queue-row-loc">${esc(c.area || CITY_LABEL[c.city] || c.city)}</span>
        </div>
        <div class="dz-queue-row-line2">
          <span class="dz-queue-row-cat">${icon(CATEGORY_ICON[c.category] || 'other')}${CAT_LABEL[c.category] || c.category}</span>
          <span class="dz-queue-row-dept">${esc(c.department?.name || '-')}</span>
          <span>${CITY_LABEL[c.city] || esc(c.city)}</span>
        </div>
      </div>
      <div class="dz-queue-row-end">
        <span class="dz-queue-row-age ${stale ? 'stale' : ''}">${age}</span>
        ${sevDots(c.severity)}
      </div>
    </div>`;
  }).join('');

  mountIcons(list);

  list.querySelectorAll('.dz-queue-row').forEach((row) => {
    row.addEventListener('click', () => (location.href = `/complaint.html?id=${encodeURIComponent(row.dataset.id)}`));
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); location.href = `/complaint.html?id=${encodeURIComponent(row.dataset.id)}`; }
    });
  });

  if (rows.length > visibleCount) {
    loadMoreWrap.hidden = false;
    document.getElementById('rowCount').textContent = `Showing ${visibleCount} of ${rows.length}`;
  } else {
    loadMoreWrap.hidden = true;
  }
}

function clearAllFilters() {
  ['fSearch', 'fCity', 'fCat', 'fSev', 'fStatus'].forEach((id) => (document.getElementById(id).value = ''));
  document.getElementById('fSort').value = 'newest';
  currentSort = 'newest';
  attention = false;
  visibleCount = PAGE_SIZE;
  document.getElementById('attentionChip').setAttribute('aria-pressed', 'false');
  syncNav(null);
  applyFilters();
}

document.getElementById('loadMoreBtn')?.addEventListener('click', () => {
  visibleCount += PAGE_SIZE;
  applyFilters();
});

document.getElementById('clearBtn')?.addEventListener('click', clearAllFilters);

['fSearch', 'fCity', 'fCat', 'fSev', 'fStatus'].forEach((id) =>
  document.getElementById(id).addEventListener('input', () => {
    visibleCount = PAGE_SIZE;
    syncNav(document.getElementById('fStatus').value || null);
    applyFilters();
  }));

document.getElementById('fSort')?.addEventListener('change', (e) => {
  currentSort = e.target.value;
  visibleCount = PAGE_SIZE;
  applyFilters();
});

document.getElementById('attentionChip').addEventListener('click', (e) => {
  attention = !attention;
  e.currentTarget.setAttribute('aria-pressed', String(attention));
  syncNav(attention ? null : document.getElementById('fStatus').value || null);
  visibleCount = PAGE_SIZE;
  applyFilters();
});

function applyUrlFilter() {
  const p = new URLSearchParams(location.search);
  if (p.get('attention') === '1') {
    attention = true;
    document.getElementById('attentionChip').setAttribute('aria-pressed', 'true');
    document.getElementById('fStatus').value = '';
  } else if (p.get('status')) {
    document.getElementById('fStatus').value = p.get('status');
    attention = false;
    document.getElementById('attentionChip').setAttribute('aria-pressed', 'false');
  } else {
    attention = false;
    document.getElementById('fStatus').value = '';
    document.getElementById('attentionChip').setAttribute('aria-pressed', 'false');
  }
  if (p.get('category')) {
    document.getElementById('fCat').value = p.get('category');
  }
  if (p.get('city')) {
    document.getElementById('fCity').value = p.get('city');
  }
  syncNav(document.getElementById('fStatus').value || null);
  applyFilters();
}

// CSV Export
document.getElementById('exportBtn')?.addEventListener('click', () => {
  const rows = getFilteredRows();
  if (!rows.length) { toast('No complaints to export', 'error'); return; }
  const headers = ['Tracking ID', 'Status', 'Category', 'Severity', 'City', 'Area', 'Department', 'Anonymous', 'Citizen Name', 'Citizen Phone', 'Citizen Email', 'Created At', 'Sent At', 'Summary'];
  const csvRows = [headers.join(',')];
  for (const c of rows) {
    const vals = [
      c.tracking_id, c.status, c.category, c.severity, c.city, c.area || '',
      c.department?.name || '', c.is_anonymous ? 'Yes' : 'No',
      c.citizen_name || '', c.citizen_phone || '', c.citizen_email || '',
      c.created_at || '', c.sent_at || '', (c.summary_en || '').replace(/,/g, ';'),
    ];
    csvRows.push(vals.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
  }
  const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `darkhwast-complaints-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('CSV exported');
});

load();
