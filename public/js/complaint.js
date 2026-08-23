// Complaint detail (S8): letter artifact, facts rail, dispatch log, contact,
// status control with note, full history.

import { api, esc, fmtDateTime, icon, CATEGORY_ICON, mountIcons, requireOfficial, sealSvg, toast, qs } from './shared.js';

if (!requireOfficial()) throw new Error('redirecting to login');

const official = JSON.parse(sessionStorage.getItem('dk_official') || '{}');
document.querySelectorAll('.js-who').forEach((el) => (el.textContent = official.name || 'Official'));
document.querySelectorAll('.js-logout').forEach((btn) =>
  btn.addEventListener('click', async () => {
    try { await api('/api/official/logout', { method: 'POST' }); } catch {}
    sessionStorage.removeItem('dk_token');
    sessionStorage.removeItem('dk_official');
    location.href = '/login.html';
  }));

const root = document.getElementById('detailRoot');
let complaint = null;
const CAT_LABEL = { garbage: 'Garbage & waste', streetlight: 'Streetlight', water: 'Water supply', sewage: 'Sewage & drainage', road: 'Road damage', other: 'Other' };
const CITY_LABEL = { karachi: 'Karachi', lahore: 'Lahore', islamabad: 'Islamabad', faisalabad: 'Faisalabad' };

async function load() {
  const id = qs('id');
  if (!id) { location.href = '/dashboard.html'; return; }
  try {
    const data = await api(`/api/official/complaints/${encodeURIComponent(id)}`);
    complaint = data.complaint;
    render();
  } catch (e) {
    if (e.status === 401) { location.href = '/login.html'; return; }
    root.innerHTML = `<div class="empty-state">${icon('alert')}<h2>${esc(e.message)}</h2>
      <a class="btn btn-secondary" href="/dashboard.html">Back to queue</a></div>`;
    mountIcons(root);
  }
}

function render() {
  const c = complaint;
  const letter = c.letter_final || c.draft_english || '';
  const canUpdate = ['sent', 'acknowledged', 'in_progress', 'send_failed'].includes(c.status) && official.role !== 'viewer';

  root.innerHTML = `
    <div class="detail-head">
      <span class="dh-id">${esc(c.tracking_id)}</span>
      <span class="status-chip st-${esc(c.status)}">${esc(c.status).replace('_', ' ')}</span>
      <span class="badge badge-${c.severity}">${c.severity} severity</span>
      <span class="cat-cell">${icon(CATEGORY_ICON[c.category] || 'other')}${CAT_LABEL[c.category] || esc(c.category)}</span>
      <div class="dh-meta">
        <span>${CITY_LABEL[c.city] || esc(c.city)}${c.area ? ' · ' + esc(c.area) : ''}</span>
        <span>Filed ${fmtDateTime(c.created_at)}</span>
        ${c.is_sample ? '<span class="sample-tag" title="Seeded demo data, not a real citizen complaint">sample</span>' : ''}
      </div>
    </div>

    <div class="detail-grid">
      <div>
        <section class="letter-card" aria-label="Formal complaint letter">
          <div class="letter-head">
            <div>
              <div class="lh-title">DARKHWAST</div>
              <div class="small muted mono">${esc(c.tracking_id)}</div>
            </div>
            ${sealSvg()}
          </div>
          <div class="letter-body">${esc(letter)}</div>
        </section>

        <section class="card" style="margin-top:16px">
          <details class="raw">
            <summary>Original citizen text</summary>
            <div class="raw-text">${esc(c.raw_text)}</div>
          </details>
        </section>

        <section class="card" style="margin-top:16px" aria-label="History">
          <h3>History</h3>
          <ul class="history">
            ${[...c.events].reverse().map((e) => `
              <li>
                <span class="status-chip st-${esc(e.to_status)}">${esc(e.to_status).replace('_', ' ')}</span>
                <span class="when lat">${fmtDateTime(e.at)}</span>
                ${e.note ? `<span class="muted small">${esc(e.note)}</span>` : ''}
              </li>`).join('')}
          </ul>
        </section>
      </div>

      <aside class="stack">
        <section class="card" aria-label="Complaint facts">
          <h3>Facts</h3>
          <div class="fact-list">
            <div class="f"><span class="k">Category</span><span class="v">${CAT_LABEL[c.category] || esc(c.category)}</span></div>
            <div class="f"><span class="k">Severity</span><span class="v"><span class="badge badge-${c.severity}">${c.severity}</span></span></div>
            <div class="f"><span class="k">AI confidence</span><span class="v mono">${Math.round((c.ai_confidence || 0) * 100)}%</span></div>
            <div class="f"><span class="k">City</span><span class="v">${CITY_LABEL[c.city] || esc(c.city)}</span></div>
            <div class="f"><span class="k">Area</span><span class="v">${esc(c.area || '-')}</span></div>
            <div class="f"><span class="k">Department</span><span class="v">${esc(c.department?.name || '-')}</span></div>
          </div>
          ${c.routing_rationale ? `<p class="small muted" style="margin-top:12px; margin-bottom:0">${esc(c.routing_rationale)}</p>` : ''}
        </section>

        <section class="card" aria-label="Citizen contact">
          <h3>Contact</h3>
          ${c.is_anonymous
            ? `<p class="small muted" style="margin:0">${icon('shield')} Filed anonymously. Reply via the tracking reference.</p>`
            : `<div class="fact-list">
                <div class="f"><span class="k">Name</span><span class="v">${esc(c.citizen_name || '-')}</span></div>
                ${c.citizen_phone ? `<div class="f"><span class="k">Phone</span><span class="v mono">${esc(c.citizen_phone)}</span></div>` : ''}
                ${c.citizen_email ? `<div class="f"><span class="k">Email</span><span class="v mono">${esc(c.citizen_email)}</span></div>` : ''}
              </div>`}
        </section>

        <section class="card" aria-label="Dispatch log">
          <h3>Dispatch log</h3>
          <div class="dispatch-log">
            ${c.dispatch_log?.length ? c.dispatch_log.map((d) => `
              <div class="dl-row">
                <div class="mono small">${esc(d.message_id || '-')}${d.simulated ? ' <span class="sample-tag">simulated</span>' : ''}</div>
                <div class="small">${esc(d.to)} &middot; ${fmtDateTime(d.at)} ${d.ok ? '' : ' &middot; <strong style="color:var(--sev-high)">failed</strong>'}</div>
              </div>`).join('')
            : '<p class="small muted" style="margin:0">Not dispatched yet.</p>'}
          </div>
        </section>

        <section class="card" aria-label="Status control">
          <h3>Set status</h3>
          ${canUpdate ? `
            <div class="field" style="margin-bottom:12px">
              <select class="control" id="statusSelect" aria-label="New status">
                <option value="acknowledged" ${c.status === 'acknowledged' ? 'selected' : ''}>Acknowledged</option>
                <option value="in_progress" ${c.status === 'in_progress' ? 'selected' : ''}>In progress</option>
                <option value="resolved" ${c.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                <option value="rejected" ${c.status === 'rejected' ? 'selected' : ''}>Rejected</option>
              </select>
            </div>
            <div class="field" style="margin-bottom:12px">
              <textarea class="control" id="statusNote" rows="2" placeholder="Note (visible to citizen on the tracking page)"></textarea>
            </div>
            <button type="button" class="btn btn-primary btn-block" id="updateBtn">Update status</button>`
          : `<p class="small muted" style="margin:0">${official.role === 'viewer'
              ? 'Viewer accounts cannot update status. Sign in as an operator.'
              : 'This complaint is not in a state that can be updated.'}</p>`}
        </section>
      </aside>
    </div>`;
  mountIcons(root);

  document.getElementById('updateBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('updateBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span>Updating...';
    try {
      const data = await api(`/api/official/complaints/${encodeURIComponent(c.id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          to_status: document.getElementById('statusSelect').value,
          note: document.getElementById('statusNote').value,
        }),
      });
      complaint = data.complaint;
      toast('Status updated');
      render();
    } catch (e) {
      btn.disabled = false;
      btn.textContent = 'Update status';
      toast(e.message, 'error');
    }
  });
}

load();
