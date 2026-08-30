// Complaint detail (S8): letter artifact, facts rail, dispatch log, contact,
// status control with note, full history.

import { api, esc, fmtDateTime, icon, CATEGORY_ICON, mountIcons, requireOfficial, sealSvg, toast, qs } from './shared.js';
import { CAT_LABEL, CITY_LABEL } from './constants.js';

if (!requireOfficial()) throw new Error('redirecting to login');

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
document.querySelectorAll('.js-logout').forEach((btn) =>
  btn.addEventListener('click', async () => {
    try { await api('/api/official/logout', { method: 'POST' }); } catch {}
    sessionStorage.removeItem('dk_token');
    sessionStorage.removeItem('dk_official');
    location.href = '/login.html';
  }));

const root = document.getElementById('detailRoot');
let complaint = null;

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
  const canResend = c.status === 'send_failed' && official.role !== 'viewer';
  const images = c.images || [];
  const dept = c.department;

  root.innerHTML = `
    <div class="detail-head">
      <span class="dh-id">${esc(c.tracking_id)}</span>
      <span class="status-chip ${esc(c.status)}"><span class="dot"></span>${esc(c.status).replace('_', ' ')}</span>
      <div class="sev-heat"><div class="sev-heat-bar"><div class="sev-heat-fill ${c.severity}"></div></div><span class="sev-heat-label" style="color:var(--sev-${c.severity === 'high' ? 'high' : c.severity === 'medium' ? 'med' : 'low'})">${c.severity} severity</span></div>
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

        ${images.length ? `
        <section class="card" style="margin-top:16px" aria-label="Evidence images">
          <h3>Evidence (${images.length})</h3>
          <div class="evidence-gallery">
            ${images.map((src) => `<div class="evidence-thumb" data-src="${esc(src)}"><img src="${esc(src)}" alt="Evidence photo" loading="lazy" /></div>`).join('')}
          </div>
        </section>` : ''}

        <section class="card" style="margin-top:16px">
          <details class="raw">
            <summary>Original citizen text</summary>
            <div class="raw-text">${esc(c.raw_text)}</div>
          </details>
        </section>

        <section class="card" style="margin-top:16px" aria-label="History">
          <h3>History</h3>
          <ul class="timeline">
            ${[...c.events].reverse().map((e, i, arr) => {
              const isCurrent = i === 0;
              const isDone = !isCurrent;
              return `
              <li class="${isCurrent ? 'tl-current' : isDone ? 'tl-done' : ''}">
                <div class="tl-mark"><span class="dot"></span></div>
                <div class="tl-title">${esc(e.to_status).replace('_', ' ')}</div>
                <div class="tl-when lat">${fmtDateTime(e.at)}</div>
                ${e.note ? `<div class="tl-note">${esc(e.note)}</div>` : ''}
                ${e.actor ? `<div class="tl-actor">by ${esc(e.actor)}</div>` : ''}
              </li>`;
            }).join('')}
          </ul>
        </section>
      </div>

      <aside class="stack">
        <section class="card" aria-label="Complaint facts">
          <h3>Facts</h3>
          <div class="fact-list">
            <div class="f"><span class="k">Category</span><span class="v">${CAT_LABEL[c.category] || esc(c.category)}</span></div>
            <div class="f"><span class="k">Severity</span><span class="v"><span class="sev-dot ${c.severity}"><span class="dot"></span>${c.severity}</span></span></div>
            <div class="f"><span class="k">AI confidence</span><span class="v mono">${Math.round((c.ai_confidence || 0) * 100)}%</span></div>
            <div class="f"><span class="k">City</span><span class="v">${CITY_LABEL[c.city] || esc(c.city)}</span></div>
            <div class="f"><span class="k">Area</span><span class="v">${esc(c.area || '-')}</span></div>
            <div class="f"><span class="k">Department</span><span class="v">${esc(dept?.name || '-')}</span></div>
          </div>
          ${dept ? `<div class="dept-detail"><span class="dept-email">${esc(dept.email || '')}</span>${dept.jurisdiction_notes ? `<br>${esc(dept.jurisdiction_notes)}` : ''}</div>` : ''}
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
          ${canResend ? `<button type="button" class="btn btn-primary btn-block resend-btn" id="resendBtn">${icon('send')} Re-send complaint</button>` : ''}
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
          <div id="statusError"></div>
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

  // Lightbox for evidence images
  root.querySelectorAll('.evidence-thumb')?.forEach((thumb) => {
    thumb.addEventListener('click', () => {
      const lb = document.createElement('div');
      lb.className = 'lightbox';
      lb.innerHTML = `<button class="lightbox-close" aria-label="Close">&times;</button><img src="${esc(thumb.dataset.src)}" alt="Evidence photo" />`;
      document.body.appendChild(lb);
      const close = () => lb.remove();
      lb.querySelector('.lightbox-close').addEventListener('click', close);
      lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
      document.addEventListener('keydown', function onEsc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onEsc); } });
    });
  });

  // Re-send button
  document.getElementById('resendBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('resendBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span>Sending...';
    try {
      const data = await api(`/api/official/complaints/${encodeURIComponent(c.id)}/resend`, { method: 'POST' });
      complaint = data.complaint;
      toast('Complaint re-sent');
      render();
    } catch (e) {
      btn.disabled = false;
      btn.innerHTML = `${icon('send')} Re-send complaint`;
      mountIcons(btn.parentElement);
      const errEl = document.getElementById('statusError');
      errEl.innerHTML = `<div class="status-update-error">${icon('alert')} ${esc(e.message)}</div>`;
      mountIcons(errEl);
    }
  });

  document.getElementById('updateBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('updateBtn');
    const newStatus = document.getElementById('statusSelect').value;
    const note = document.getElementById('statusNote').value;
    const errEl = document.getElementById('statusError');
    errEl.innerHTML = '';

    // Confirm destructive status changes
    if (newStatus === 'rejected') {
      const confirmed = await showConfirmModal({
        title: 'Reject this complaint?',
        body: `<p>Are you sure you want to mark complaint <strong>${esc(c.tracking_id)}</strong> as <span class="status-preview">Rejected</span>? This will be visible to the citizen on their tracking page.</p>`,
        confirmLabel: 'Reject',
        confirmClass: 'btn-primary',
      });
      if (!confirmed) return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span>Updating...';
    try {
      const data = await api(`/api/official/complaints/${encodeURIComponent(c.id)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ to_status: newStatus, note }),
      });
      complaint = data.complaint;
      toast('Status updated');
      render();
    } catch (e) {
      btn.disabled = false;
      btn.textContent = 'Update status';
      errEl.innerHTML = `<div class="status-update-error">${icon('alert')} ${esc(e.message)}</div>`;
      mountIcons(errEl);
    }
  });
}

function showConfirmModal({ title, body, confirmLabel, confirmClass }) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal confirm-status-modal" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
        <h2 id="confirmTitle">${esc(title)}</h2>
        <div class="modal-body">${body}</div>
        <div class="actions">
          <button type="button" class="btn btn-secondary" id="confirmCancel">Cancel</button>
          <button type="button" class="btn ${confirmClass || 'btn-primary'}" id="confirmOk">${esc(confirmLabel || 'Confirm')}</button>
        </div>
      </div>`;
    document.body.appendChild(backdrop);
    const close = (val) => { backdrop.remove(); resolve(val); };
    backdrop.querySelector('#confirmCancel').addEventListener('click', () => close(false));
    backdrop.querySelector('#confirmOk').addEventListener('click', () => close(true));
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(false); });
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') { close(false); document.removeEventListener('keydown', onEsc); }
    });
    backdrop.querySelector('#confirmOk')?.focus();
  });
}

load();
