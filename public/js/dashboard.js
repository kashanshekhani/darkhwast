// Dashboard queue (S7): sidebar navigation with counts, stat cards with icons,
// filters, "needs attention" preset, dense table with department column.

import { api, esc, icon, CATEGORY_ICON, mountIcons, requireOfficial, timeAgo, toast } from './shared.js';

const OPEN = ['sent', 'acknowledged', 'in_progress', 'send_failed', 'needs_review'];
const ATTENTION = ['needs_review', 'send_failed'];
const CATS = ['garbage', 'streetlight', 'water', 'sewage', 'road', 'other'];
const CITIES = ['karachi', 'lahore', 'islamabad', 'faisalabad'];
const CAT_LABEL = { garbage: 'Garbage', streetlight: 'Streetlight', water: 'Water', sewage: 'Sewage', road: 'Road', other: 'Other' };
const CITY_LABEL = { karachi: 'Karachi', lahore: 'Lahore', islamabad: 'Islamabad', faisalabad: 'Faisalabad' };
const NAV_STATUSES = ['sent', 'acknowledged', 'in_progress', 'resolved'];

if (!requireOfficial()) throw new Error('redirecting to login');

let complaints = [];
let attention = false;

const official = JSON.parse(sessionStorage.getItem('dk_official') || '{}');
document.querySelectorAll('.js-who').forEach((el) => (el.textContent = official.name || 'Official'));

document.querySelectorAll('.js-logout').forEach((btn) =>
  btn.addEventListener('click', async () => {
    try { await api('/api/official/logout', { method: 'POST' }); } catch {}
    sessionStorage.removeItem('dk_token');
    sessionStorage.removeItem('dk_official');
    location.href = '/login.html';
  }));

async function load() {
  let data;
  try {
    data = await api('/api/official/complaints');
  } catch (e) {
    if (e.status === 401) { location.href = '/login.html'; return; }
    toast(e.message, 'error');
    return;
  }
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

// deep links: dashboard.html?status=sent | ?attention=1
function applyUrlFilter() {
  const p = new URLSearchParams(location.search);
  if (p.get('attention') === '1') {
    attention = true;
    document.getElementById('attentionChip').setAttribute('aria-pressed', 'true');
    syncNav('attention');
  } else if (p.get('status')) {
    document.getElementById('fStatus').value = p.get('status');
    syncNav(NAV_STATUSES.includes(p.get('status')) ? p.get('status') : null);
  }
}

function navCounts() {
  document.getElementById('cnt-all').textContent = complaints.length;
  document.getElementById('cnt-attention').textContent = complaints.filter((c) => ATTENTION.includes(c.status)).length;
}

function syncNav(active) {
  document.querySelectorAll('#sideNav .side-link').forEach((b) =>
    b.classList.toggle('active', b.dataset.nav === (active || 'all')));
}

function renderStats() {
  navCounts();
  const open = complaints.filter((c) => OPEN.includes(c.status));
  const attentionCount = complaints.filter((c) => ATTENTION.includes(c.status)).length;
  const resolved = complaints.filter((c) => c.status === 'resolved').length;
  const byCat = CATS.map((k) => ({ k, n: open.filter((c) => c.category === k).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 4);
  const byCity = CITIES.map((k) => ({ k, n: open.filter((c) => c.city === k).length })).filter((x) => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 4);
  const maxCat = Math.max(1, ...byCat.map((x) => x.n));
  const maxCity = Math.max(1, ...byCity.map((x) => x.n));

  document.getElementById('statsRoot').innerHTML = `
    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-top"><div class="lbl">Total complaints</div><span class="stat-ic">${icon('file')}</span></div>
        <div class="num">${complaints.length}</div>
      </div>
      <div class="stat-card">
        <div class="stat-top"><div class="lbl">Open</div><span class="stat-ic">${icon('send')}</span></div>
        <div class="num">${open.length}</div>
      </div>
      <div class="stat-card warn">
        <div class="stat-top"><div class="lbl">Needs attention</div><span class="stat-ic">${icon('alert')}</span></div>
        <div class="num">${attentionCount}</div>
      </div>
      <div class="stat-card ok">
        <div class="stat-top"><div class="lbl">Resolved</div><span class="stat-ic">${icon('check')}</span></div>
        <div class="num">${resolved}</div>
      </div>
      <div class="stat-card">
        <div class="lbl" style="margin-bottom:8px">Open by category</div>
        <div class="bars">
          ${byCat.length ? byCat.map((x) => `
            <div class="bar-row"><span>${CAT_LABEL[x.k]}</span><span class="track"><span class="fill" style="width:${Math.round((x.n / maxCat) * 100)}%; display:block"></span></span><span class="cnt">${x.n}</span></div>`).join('')
          : '<span class="small muted">-</span>'}
        </div>
      </div>
      <div class="stat-card">
        <div class="lbl" style="margin-bottom:8px">Open by city</div>
        <div class="bars">
          ${byCity.length ? byCity.map((x) => `
            <div class="bar-row"><span>${CITY_LABEL[x.k]}</span><span class="track"><span class="fill" style="width:${Math.round((x.n / maxCity) * 100)}%; display:block"></span></span><span class="cnt">${x.n}</span></div>`).join('')
          : '<span class="small muted">-</span>'}
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

function applyFilters() {
  const { q, city, cat, sev, status } = currentFilters();

  const rows = complaints.filter((c) => {
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

  const tbody = document.getElementById('tbody');
  const empty = document.getElementById('emptyState');
  if (!rows.length) {
    tbody.innerHTML = '';
    empty.hidden = false;
    empty.innerHTML = complaints.length
      ? `${icon('search')}<h2>No complaints match these filters</h2><button type="button" class="btn btn-secondary" id="clearBtn">Clear filters</button>`
      : `${icon('inbox')}<h2>No complaints yet</h2><p class="muted">Complaints filed by citizens will appear here.</p>`;
    mountIcons(empty);
    document.getElementById('clearBtn')?.addEventListener('click', () => {
      ['fSearch', 'fCity', 'fCat', 'fSev', 'fStatus'].forEach((id) => (document.getElementById(id).value = ''));
      attention = false;
      document.getElementById('attentionChip').setAttribute('aria-pressed', 'false');
      syncNav('all');
      applyFilters();
    });
    return;
  }
  empty.hidden = true;

  tbody.innerHTML = rows.map((c) => `
    <tr tabindex="0" data-id="${esc(c.id)}" aria-label="Complaint ${esc(c.tracking_id)}">
      <td data-label="ID"><span class="mono small">${esc(c.tracking_id)}</span>${c.is_sample ? '<span class="sample-tag lat" title="Seeded demo data, not a real citizen complaint">sample</span>' : ''}</td>
      <td data-label="Category"><span class="cat-cell">${icon(CATEGORY_ICON[c.category] || 'other')}${CAT_LABEL[c.category] || c.category}</span></td>
      <td data-label="Location">${esc(c.area ? c.area + ', ' : '')}${CITY_LABEL[c.city] || esc(c.city)}</td>
      <td data-label="Department"><span class="dept-cell" title="${esc(c.department?.name || '')}">${esc(c.department?.name || '-')}</span></td>
      <td data-label="Severity"><span class="badge badge-${c.severity}">${c.severity}</span></td>
      <td data-label="Status"><span class="status-chip st-${esc(c.status)}">${esc(c.status).replace('_', ' ')}</span></td>
      <td data-label="Age"><span class="small muted">${timeAgo(c.created_at)}</span></td>
      <td aria-hidden="true"><span class="go-cell">&#8250;</span></td>
    </tr>`).join('');

  tbody.querySelectorAll('tr').forEach((tr) => {
    tr.addEventListener('click', () => (location.href = `/complaint.html?id=${encodeURIComponent(tr.dataset.id)}`));
    tr.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); location.href = `/complaint.html?id=${encodeURIComponent(tr.dataset.id)}`; }
    });
  });
}

['fSearch', 'fCity', 'fCat', 'fSev', 'fStatus'].forEach((id) =>
  document.getElementById(id).addEventListener('input', () => {
    if (document.getElementById('fStatus').value) syncNav(NAV_STATUSES.includes(document.getElementById('fStatus').value) ? document.getElementById('fStatus').value : null);
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
    applyFilters();
  });
});

load();
