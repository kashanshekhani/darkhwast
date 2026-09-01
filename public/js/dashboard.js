// Dashboard — Donezo skin: analytics only (greeting, KPIs, 7-day bar chart,
// donut progress, category bars, activity feed). Queue list moved to queue.js.

import { api, esc, icon, CATEGORY_ICON, mountIcons, requireOfficial, timeAgo, toast, statusIcon, statusColor, donutProgress, barChart7d } from './shared.js';
import { CATS, CAT_LABEL, CITY_LABEL } from './constants.js';

const OPEN = ['sent', 'acknowledged', 'in_progress', 'send_failed', 'needs_review', 'draft'];

if (!requireOfficial()) throw new Error('redirecting to login');

let complaints = [];

const official = JSON.parse(sessionStorage.getItem('dk_official') || '{}');
document.querySelectorAll('.js-who').forEach((el) => {
  const roleClass = official.role === 'viewer' ? ' role-badge viewer' : ' role-badge';
  el.innerHTML = `${esc(official.name || 'Official')}<span class="${roleClass.trim()}">${esc(official.role || 'official')}</span>`;
});

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
      load();
    } else if (evt.type === 'complaint:updated' || evt.type === 'complaint:escalated') {
      load();
    }
  });
  evtSource.onerror = () => {
    if (evtSource && evtSource.readyState === EventSource.CLOSED) {
      // Auth likely expired — redirect to login
      if (sessionStorage.getItem('dk_token')) location.href = '/login.html';
    }
  };
}

async function load() {
  const errorBanner = document.getElementById('errorBanner');
  let data;
  try {
    data = await api('/api/official/complaints');
  } catch (e) {
    if (e.status === 401) { location.href = '/login.html'; return; }
    errorBanner.hidden = false;
    document.getElementById('errorMsg').textContent = e.message || 'Failed to load complaints.';
    return;
  }
  errorBanner.hidden = true;
  complaints = data.complaints;
  if (data.mail_mode === 'simulated') {
    const html = `${icon('info')}<div><strong>Demo mode:</strong> email dispatch is simulated. Configure SMTP in <code>.env</code> for real delivery.</div><button class="demo-dismiss" aria-label="Dismiss">&times;</button>`;
    const banner = document.getElementById('mailBanner');
    banner.innerHTML = html;
    banner.hidden = false;
    mountIcons(banner);
    banner.querySelector('.demo-dismiss')?.addEventListener('click', () => { banner.hidden = true; });
  }
  navCounts();
  renderGreeting();
  renderKPIs();
  renderCharts();
  renderActivityFeed();
  renderMap();
  if (!evtSource) connectSSE();
}

document.getElementById('retryBtn')?.addEventListener('click', load);

function navCounts() {
  document.getElementById('cnt-all').textContent = complaints.length;
  for (const s of ['draft', 'needs_review', 'sent', 'send_failed', 'acknowledged', 'in_progress', 'resolved', 'rejected']) {
    const el = document.getElementById(`cnt-${s}`);
    if (el) el.textContent = complaints.filter((c) => c.status === s).length;
  }
}

function renderGreeting() {
  const hour = new Date().getHours();
  const part = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  document.getElementById('greetingTitle').textContent = `Good ${part}, ${official.name?.split(' ')[0] || 'Official'}`;
  const open = complaints.filter((c) => OPEN.includes(c.status)).length;
  const att = complaints.filter((c) => ['needs_review', 'send_failed'].includes(c.status)).length;
  document.getElementById('greetingSub').textContent = att > 0
    ? `${att} complaint${att !== 1 ? 's' : ''} need attention · ${open} open total`
    : `${open} complaint${open !== 1 ? 's' : ''} open · all clear`;
}

function renderKPIs() {
  const open = complaints.filter((c) => OPEN.includes(c.status)).length;
  const attCount = complaints.filter((c) => ['needs_review', 'send_failed'].includes(c.status)).length;
  const resolved = complaints.filter((c) => c.status === 'resolved').length;
  const total = complaints.length;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

  const ackTimes = complaints
    .filter((c) => c.events?.some((e) => e.to_status === 'acknowledged'))
    .map((c) => {
      const ev = c.events.find((e) => e.to_status === 'acknowledged');
      return (new Date(ev.at).getTime() - new Date(c.created_at).getTime()) / 86400000;
    });
  const avgAck = ackTimes.length ? (ackTimes.reduce((a, b) => a + b, 0) / ackTimes.length).toFixed(1) + 'd' : '—';

  const now = new Date();
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const thisWeek = complaints.filter((c) => {
    const ev = c.events?.find((e) => e.to_status === 'resolved');
    return ev && new Date(ev.at) >= weekAgo;
  }).length;
  const lastWeek = complaints.filter((c) => {
    const ev = c.events?.find((e) => e.to_status === 'resolved');
    return ev && new Date(ev.at) >= twoWeeksAgo && new Date(ev.at) < weekAgo;
  }).length;
  const trend = thisWeek > lastWeek ? 'up' : thisWeek < lastWeek ? 'down' : 'flat';
  const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  const trendText = trend === 'flat' ? 'same' : `${Math.abs(thisWeek - lastWeek)} vs last week`;

  document.getElementById('kpiRow').innerHTML = `
    <div class="dz-kpi-card feature">
      <div class="dz-kpi-card-top">
        <div class="dz-kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div>
        <span class="dz-kpi-trend">${trendArrow} ${trendText}</span>
      </div>
      <div class="dz-kpi-num">${resolved}</div>
      <div class="dz-kpi-label">Resolved total</div>
      <div class="dz-kpi-sub">${resolutionRate}% resolution rate</div>
    </div>
    <div class="dz-kpi-card">
      <div class="dz-kpi-card-top">
        <div class="dz-kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>
      </div>
      <div class="dz-kpi-num">${open}</div>
      <div class="dz-kpi-label">Open complaints</div>
      <div class="dz-kpi-sub">across all departments</div>
    </div>
    <div class="dz-kpi-card ${attCount > 0 ? 'warn' : ''}">
      <div class="dz-kpi-card-top">
        <div class="dz-kpi-icon" style="${attCount > 0 ? 'background:var(--dz-amber-tint);color:var(--dz-amber)' : ''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01"/><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg></div>
      </div>
      <div class="dz-kpi-num">${attCount}</div>
      <div class="dz-kpi-label">Needs attention</div>
      <div class="dz-kpi-sub">${complaints.filter((c) => c.status === 'send_failed').length} failed deliveries</div>
    </div>
    <div class="dz-kpi-card">
      <div class="dz-kpi-card-top">
        <div class="dz-kpi-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
      </div>
      <div class="dz-kpi-num">${avgAck}</div>
      <div class="dz-kpi-label">Avg. ack time</div>
      <div class="dz-kpi-sub">target &lt; 2 days</div>
    </div>`;
}

function buildDailyData(days) {
  const out = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const next = new Date(d);
    next.setDate(d.getDate() + 1);
    const filed = complaints.filter((c) => {
      const t = new Date(c.created_at).getTime();
      return t >= d.getTime() && t < next.getTime();
    }).length;
    const resolved = complaints.filter((c) => {
      const ev = c.events?.find((e) => e.to_status === 'resolved');
      if (!ev) return false;
      const t = new Date(ev.at).getTime();
      return t >= d.getTime() && t < next.getTime();
    }).length;
    out.push({ day: dayNames[d.getDay()], date: d.toISOString(), filed, resolved });
  }
  return out;
}

function renderCharts() {
  document.getElementById('barChart').innerHTML = barChart7d(buildDailyData(7));

  const total = complaints.length;
  const resolved = complaints.filter((c) => c.status === 'resolved').length;
  const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;
  document.getElementById('donutProgress').innerHTML = `
    <div class="dz-donut-wrap">
      ${donutProgress(rate, { centerValue: `${rate}%`, centerLabel: 'resolved' })}
    </div>
    <div class="dz-donut-legend">
      <div class="dz-donut-legend-item"><span class="dz-donut-legend-sq" style="background:var(--dz-accent)"></span><span class="dz-donut-legend-label">Resolved</span><span class="dz-donut-legend-val">${resolved}</span></div>
      <div class="dz-donut-legend-item"><span class="dz-donut-legend-sq" style="background:var(--dz-surface-2)"></span><span class="dz-donut-legend-label">Unresolved</span><span class="dz-donut-legend-val">${total - resolved}</span></div>
    </div>`;

  const open = complaints.filter((c) => OPEN.includes(c.status));
  const catColors = {
    garbage: 'var(--dz-accent)', streetlight: 'var(--dz-violet)', water: 'var(--dz-sky)',
    sewage: 'var(--dz-amber)', road: '#475569', other: 'var(--dz-rose)',
  };
  const catData = CATS.map((k) => ({
    cat: k, label: CAT_LABEL[k],
    value: open.filter((c) => c.category === k).length,
    color: catColors[k],
  })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);

  if (!catData.length) {
    document.getElementById('catChart').innerHTML = '<p style="text-align:center;padding:20px 0;color:var(--dz-ink-muted)">No open complaints</p>';
  } else {
    const max = Math.max(1, ...catData.map((d) => d.value));
    document.getElementById('catChart').innerHTML = `<div class="dz-hbar-list">${catData.map((d) => `
      <a class="dz-hbar-item" href="/queue.html?category=${d.cat}" data-cat="${d.cat}">
        <span class="dz-hbar-label">${icon(CATEGORY_ICON[d.cat] || 'other')}${d.label}</span>
        <span class="dz-hbar-track"><span class="dz-hbar-fill" style="width:${Math.round((d.value / max) * 100)}%;background:${d.color}"></span></span>
        <span class="dz-hbar-val">${d.value}</span>
      </a>`).join('')}</div>`;
    mountIcons(document.getElementById('catChart'));
  }
}

function renderActivityFeed() {
  const events = [];
  for (const c of complaints) {
    if (!c.events) continue;
    for (const e of c.events) events.push({ ...e, complaint: c });
  }
  events.sort((a, b) => new Date(b.at) - new Date(a.at));
  const recent = events.slice(0, 6);

  if (!recent.length) {
    document.getElementById('activityFeed').innerHTML = '<p style="text-align:center;padding:20px 0;color:var(--dz-ink-muted)">No activity yet</p>';
    return;
  }

  const feedHtml = recent.map((e) => {
    const c = e.complaint;
    const age = timeAgo(e.at);
    const ageDays = (Date.now() - new Date(e.at).getTime()) / 86400000;
    return `
    <a class="dz-feed-item" href="/complaint.html?id=${esc(c.id)}">
      <div class="dz-feed-avatar" style="background:${statusColor(e.to_status)}20;color:${statusColor(e.to_status)}">
        ${statusIcon(e.to_status, 20)}
      </div>
      <div class="dz-feed-body">
        <div class="dz-feed-line1">${esc(c.tracking_id)} → ${esc(e.to_status.replace(/_/g, ' '))}</div>
        <div class="dz-feed-line2">
          <span>${CAT_LABEL[c.category] || c.category}</span>
          <span>·</span>
          <span>${CITY_LABEL[c.city] || c.city}</span>
          ${e.actor ? `<span>·</span><span>by ${esc(e.actor)}</span>` : ''}
        </div>
      </div>
      <div class="dz-feed-time ${ageDays > 7 ? 'stale' : ''}">${age}</div>
    </a>`;
  }).join('');

  const feed = document.getElementById('activityFeed');
  feed.innerHTML = `<div class="dz-feed">${feedHtml}</div>`;
  mountIcons(feed);
}

// ---- Complaint map (Leaflet + OpenStreetMap) ----
let mapInstance = null;
let markerLayer = null;

function renderMap() {
  const container = document.getElementById('complaintMap');
  if (!container) return;
  if (typeof L === 'undefined') {
    container.innerHTML = '<p style="text-align:center;padding:40px 0;color:var(--dz-ink-muted)">Map unavailable (offline)</p>';
    return;
  }
  const geoComplaints = complaints.filter((c) => c.location && c.location.lat != null);
  if (!geoComplaints.length) {
    container.innerHTML = '<p style="text-align:center;padding:40px 0;color:var(--dz-ink-muted)">No GPS-tagged complaints yet</p>';
    return;
  }
  if (!mapInstance) {
    mapInstance = L.map('complaintMap').setView([31.5, 74.3], 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap', maxZoom: 19,
    }).addTo(mapInstance);
    markerLayer = L.layerGroup().addTo(mapInstance);
  }
  markerLayer.clearLayers();
  for (const c of geoComplaints) {
    const marker = L.circleMarker([c.location.lat, c.location.lng], {
      radius: 8, fillColor: statusColor(c.status), color: '#fff', weight: 2, fillOpacity: 0.85,
    });
    marker.bindPopup(`<strong>${esc(c.tracking_id)}</strong><br>${esc(CAT_LABEL[c.category] || c.category)}<br>${esc(c.area || '')}, ${esc(CITY_LABEL[c.city] || c.city)}<br><a href="/complaint.html?id=${encodeURIComponent(c.id)}">View detail</a>`);
    markerLayer.addLayer(marker);
  }
}

// CSV Export (current full dataset for dashboard)
document.getElementById('exportBtn')?.addEventListener('click', () => {
  if (!complaints.length) { toast('No complaints to export', 'error'); return; }
  const headers = ['Tracking ID', 'Status', 'Category', 'Severity', 'City', 'Area', 'Department', 'Anonymous', 'Citizen Name', 'Citizen Phone', 'Citizen Email', 'Created At', 'Sent At', 'Summary'];
  const csvRows = [headers.join(',')];
  for (const c of complaints) {
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
