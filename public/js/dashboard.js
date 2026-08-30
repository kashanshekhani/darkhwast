// Dashboard queue (S7): sidebar navigation with counts, stat cards with icons,
// filters, "needs attention" preset, dense table with department column.

import { api, esc, icon, CATEGORY_ICON, mountIcons, requireOfficial, timeAgo, toast } from './shared.js';
import { CITIES, CATS, CAT_LABEL, CITY_LABEL } from './constants.js';

const OPEN = ['sent', 'acknowledged', 'in_progress', 'send_failed', 'needs_review', 'draft'];
const ATTENTION = ['needs_review', 'send_failed'];
const ALL_NAV_STATUSES = ['draft', 'needs_review', 'sent', 'send_failed', 'acknowledged', 'in_progress', 'resolved', 'rejected'];
const PAGE_SIZE = 25;

if (!requireOfficial()) throw new Error('redirecting to login');

let complaints = [];
let attention = false;
let visibleCount = PAGE_SIZE;
let loaded = false;

const official = JSON.parse(sessionStorage.getItem('dk_official') || '{}');
document.querySelectorAll('.js-who').forEach((el) => {
  const roleClass = official.role === 'viewer' ? ' role-badge viewer' : ' role-badge';
  el.innerHTML = `${esc(official.name || 'Official')}<span class="${roleClass.trim()}">${esc(official.role || 'official')}</span>`;
});

// Hero meta: current date
const meta = document.getElementById('dashMeta');
if (meta) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  meta.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> ${dateStr}`;
}

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
    try { await api('/api/official/logout', { method: 'POST' }); } catch {}
    sessionStorage.removeItem('dk_token');
    sessionStorage.removeItem('dk_official');
    location.href = '/login.html';
  }));

function showSkeletonRows() {
  const tbody = document.getElementById('tbody');
  tbody.innerHTML = Array.from({ length: 6 }, () =>
    '<tr class="skel-row"><td><div class="skel-cell" style="width:90px"></div></td><td><div class="skel-cell" style="width:80px"></div></td><td><div class="skel-cell" style="width:120px"></div></td><td><div class="skel-cell" style="width:100px"></div></td><td><div class="skel-cell" style="width:50px"></div></td><td><div class="skel-cell" style="width:70px"></div></td><td><div class="skel-cell" style="width:30px"></div></td><td></td></tr>'
  ).join('');
}

async function load() {
  showSkeletonRows();
  const errorBanner = document.getElementById('errorBanner');
  let data;
  try {
    data = await api('/api/official/complaints');
  } catch (e) {
    if (e.status === 401) { location.href = '/login.html'; return; }
    errorBanner.hidden = false;
    document.getElementById('errorMsg').textContent = e.message || 'Failed to load complaints.';
    document.getElementById('tbody').innerHTML = '';
    return;
  }
  errorBanner.hidden = true;
  loaded = true;
  complaints = data.complaints;
  if (data.mail_mode === 'simulated') {
    const html = `${icon('info')}<div><strong>Demo mode:</strong> email dispatch is simulated on this server. Configure SMTP in <code>.env</code> for real delivery.</div>`;
    document.getElementById('mailBanner').innerHTML = html;
    document.getElementById('mailBanner').hidden = false;
    document.getElementById('sideNote').innerHTML = '<strong>Demo mode.</strong> Email dispatch is simulated on this server. Configure SMTP in <code>.env</code> for real delivery.';
    mountIcons(document.getElementById('mailBanner'));
  }
  renderStats();
  applyUrlFilter();
  applyFilters();
}

document.getElementById('retryBtn')?.addEventListener('click', load);

// deep links: dashboard.html?status=sent | ?attention=1
function applyUrlFilter() {
  const p = new URLSearchParams(location.search);
  if (p.get('attention') === '1') {
    attention = true;
    document.getElementById('attentionChip').setAttribute('aria-pressed', 'true');
    syncNav('attention');
  } else if (p.get('status')) {
    document.getElementById('fStatus').value = p.get('status');
    syncNav(ALL_NAV_STATUSES.includes(p.get('status')) ? p.get('status') : null);
  } else {
    syncNav(null);
  }
}

function navCounts() {
  document.getElementById('cnt-all').textContent = complaints.length;
  document.getElementById('cnt-attention').textContent = complaints.filter((c) => ATTENTION.includes(c.status)).length;
  for (const s of ALL_NAV_STATUSES) {
    const el = document.getElementById(`cnt-${s}`);
    if (el) el.textContent = complaints.filter((c) => c.status === s).length;
  }
}

function syncNav(active) {
  document.querySelectorAll('#sideNav .side-link').forEach((b) => {
    const isActive = b.dataset.nav === (active || 'all');
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-selected', String(isActive));
  });
}

function renderStats() {
  navCounts();
  const open = complaints.filter((c) => OPEN.includes(c.status));
  const attentionCount = complaints.filter((c) => ATTENTION.includes(c.status)).length;
  const resolved = complaints.filter((c) => c.status === 'resolved').length;
  const byCat = CATS.map((k) => ({ k, n: open.filter((c) => c.category === k).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 4);
  const byCity = CITIES.map((c) => ({ k: c.id, n: open.filter((x) => x.city === c.id).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 4);
  const maxCat = Math.max(1, ...byCat.map((x) => x.n));
  const maxCity = Math.max(1, ...byCity.map((x) => x.n));

  document.getElementById('statsRoot').innerHTML = `
    <div class="stat-grid">
      <div class="stat-card">
        <span class="stat-ic">${icon('file')}</span>
        <div class="stat-body">
          <div class="num">${complaints.length}</div>
          <div class="lbl">Total complaints</div>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-ic">${icon('send')}</span>
        <div class="stat-body">
          <div class="num">${open.length}</div>
          <div class="lbl">Open</div>
        </div>
      </div>
      <div class="stat-card warn">
        <span class="stat-ic">${icon('alert')}</span>
        <div class="stat-body">
          <div class="num">${attentionCount}</div>
          <div class="lbl">Needs attention</div>
        </div>
      </div>
      <div class="stat-card ok">
        <span class="stat-ic">${icon('check')}</span>
        <div class="stat-body">
          <div class="num">${resolved}</div>
          <div class="lbl">Resolved</div>
        </div>
      </div>
      <div class="stat-card full">
        <div class="stat-body">
          <div class="lbl" style="margin-bottom:10px">Open by category</div>
          <div class="bars">
            ${byCat.length ? byCat.map((x) => `
              <div class="bar-row"><span>${CAT_LABEL[x.k]}</span><span class="track"><span class="fill" style="width:${Math.round((x.n / maxCat) * 100)}%; display:block"></span></span><span class="cnt">${x.n}</span></div>`).join('')
            : '<span class="small muted">-</span>'}
          </div>
        </div>
      </div>
      <div class="stat-card full">
        <div class="stat-body">
          <div class="lbl" style="margin-bottom:10px">Open by city</div>
          <div class="bars">
            ${byCity.length ? byCity.map((x) => `
              <div class="bar-row"><span>${CITY_LABEL[x.k]}</span><span class="track"><span class="fill" style="width:${Math.round((x.n / maxCity) * 100)}%; display:block"></span></span><span class="cnt">${x.n}</span></div>`).join('')
            : '<span class="small muted">-</span>'}
          </div>
        </div>
      </div>
    </div>`;
  mountIcons(document.getElementById('statsRoot'));
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
  return complaints.filter((c) => {
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
}

function updateFilterCount() {
  const { q, city, cat, sev, status } = currentFilters();
  let count = 0;
  if (q) count++;
  if (city) count++;
  if (cat) count++;
  if (sev) count++;
  if (status) count++;
  if (attention) count++;
  const el = document.getElementById('filterCount');
  el.hidden = count === 0;
  el.textContent = count;
}

function applyFilters() {
  updateFilterCount();
  const rows = getFilteredRows();
  const visible = rows.slice(0, visibleCount);

  const tbody = document.getElementById('tbody');
  const empty = document.getElementById('emptyState');
  const loadMoreWrap = document.getElementById('loadMoreWrap');

  if (!rows.length) {
    tbody.innerHTML = '';
    empty.hidden = false;
    empty.innerHTML = complaints.length
      ? `${icon('search')}<h2>No complaints match these filters</h2><button type="button" class="btn btn-secondary" id="clearBtn">Clear filters</button>`
      : `${icon('inbox')}<h2>No complaints yet</h2><p class="muted">Complaints filed by citizens will appear here.</p>`;
    mountIcons(empty);
    loadMoreWrap.hidden = true;
    document.getElementById('clearBtn')?.addEventListener('click', () => {
      ['fSearch', 'fCity', 'fCat', 'fSev', 'fStatus'].forEach((id) => (document.getElementById(id).value = ''));
      attention = false;
      visibleCount = PAGE_SIZE;
      document.getElementById('attentionChip').setAttribute('aria-pressed', 'false');
      syncNav('all');
      applyFilters();
    });
    return;
  }
  empty.hidden = true;

  tbody.innerHTML = visible.map((c) => `
    <tr tabindex="0" data-id="${esc(c.id)}" aria-label="Complaint ${esc(c.tracking_id)}">
      <td class="id-cell" data-label="ID"><span class="mono small">${esc(c.tracking_id)}</span>${c.is_sample ? '<span class="sample-tag lat" title="Seeded demo data, not a real citizen complaint">sample</span>' : ''}</td>
      <td data-label="Category"><span class="cat-cell">${icon(CATEGORY_ICON[c.category] || 'other')}${CAT_LABEL[c.category] || c.category}</span></td>
      <td class="location-cell" data-label="Location">${esc(c.area ? c.area + ', ' : '')}${CITY_LABEL[c.city] || esc(c.city)}</td>
      <td data-label="Department"><span class="dept-cell" title="${esc(c.department?.name || '')}">${esc(c.department?.name || '-')}</span></td>
      <td data-label="Severity"><span class="sev-dot ${c.severity}"><span class="dot"></span>${c.severity}</span></td>
      <td data-label="Status"><span class="status-chip ${esc(c.status)}"><span class="dot"></span>${esc(c.status).replace('_', ' ')}</span></td>
      <td data-label="Age"><span class="small muted">${timeAgo(c.created_at)}</span></td>
      <td aria-hidden="true"><span class="go-cell">&#8250;</span></td>
    </tr>`).join('');

  tbody.querySelectorAll('tr').forEach((tr) => {
    tr.addEventListener('click', () => (location.href = `/complaint.html?id=${encodeURIComponent(tr.dataset.id)}`));
    tr.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); location.href = `/complaint.html?id=${encodeURIComponent(tr.dataset.id)}`; }
    });
  });

  // Pagination / load more
  if (rows.length > visibleCount) {
    loadMoreWrap.hidden = false;
    document.getElementById('rowCount').textContent = `Showing ${visibleCount} of ${rows.length}`;
  } else {
    loadMoreWrap.hidden = true;
  }
}

document.getElementById('loadMoreBtn')?.addEventListener('click', () => {
  visibleCount += PAGE_SIZE;
  applyFilters();
});

['fSearch', 'fCity', 'fCat', 'fSev', 'fStatus'].forEach((id) =>
  document.getElementById(id).addEventListener('input', () => {
    visibleCount = PAGE_SIZE;
    if (document.getElementById('fStatus').value) syncNav(ALL_NAV_STATUSES.includes(document.getElementById('fStatus').value) ? document.getElementById('fStatus').value : null);
    else syncNav(null);
    applyFilters();
  }));

document.getElementById('attentionChip').addEventListener('click', (e) => {
  attention = !attention;
  e.currentTarget.setAttribute('aria-pressed', String(attention));
  syncNav(attention ? 'attention' : null);
  applyFilters();
});

document.querySelectorAll('#sideNav .side-link').forEach((btn) => {
  btn.addEventListener('click', () => {
    const nav = btn.dataset.nav;
    if (nav === 'all') {
      attention = false;
      document.getElementById('fStatus').value = '';
      document.getElementById('attentionChip').setAttribute('aria-pressed', 'false');
    } else if (nav === 'attention') {
      attention = true;
      document.getElementById('fStatus').value = '';
      document.getElementById('attentionChip').setAttribute('aria-pressed', 'true');
    } else {
      attention = false;
      document.getElementById('fStatus').value = nav;
      document.getElementById('attentionChip').setAttribute('aria-pressed', 'false');
    }
    syncNav(nav);
    visibleCount = PAGE_SIZE;
    applyFilters();
    toggleSidebar(false);
  });
});

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
