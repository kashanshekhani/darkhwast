// Complaint detail — Donezo skin: identity header, 60/40 grid,
// status shape timeline, AI confidence bar, sticky action dock.

import { api, esc, fmtDateTime, icon, CATEGORY_ICON, mountIcons, requireOfficial, toast, qs, statusIcon, dzStatusPill, statusLabel, sevDots, copyText } from './shared.js';
import { CAT_LABEL, CITY_LABEL } from './constants.js';

if (!requireOfficial()) throw new Error('redirecting to login');

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
document.querySelectorAll('.js-logout').forEach((btn) =>
  btn.addEventListener('click', async () => {
    if (evtSource) { evtSource.close(); evtSource = null; }
    try { await api('/api/official/logout', { method: 'POST' }); } catch {}
    sessionStorage.removeItem('dk_token');
    sessionStorage.removeItem('dk_official');
    location.href = '/login.html';
  }));

const root = document.getElementById('detailRoot');
let complaint = null;
let evtSource = null;

function connectSSE() {
  if (!complaint) return;
  // Use the public tracking SSE endpoint — it only broadcasts { type, trackingId, status },
  // no PII. The client then re-fetches the full official data via the authenticated API.
  evtSource = new EventSource(`/api/track/${encodeURIComponent(complaint.tracking_id)}/events`);
  evtSource.addEventListener('message', (e) => {
    const evt = JSON.parse(e.data);
    if (evt.type === 'complaint:updated' && evt.trackingId === complaint.tracking_id) {
      load();  // re-fetch and re-render
    }
  });
  evtSource.onerror = () => console.warn('[sse] reconnecting...');
}

async function load() {
  const id = qs('id');
  if (!id) { location.href = '/queue.html'; return; }
  try {
    const data = await api(`/api/official/complaints/${encodeURIComponent(id)}`);
    complaint = data.complaint;
    render();
    if (!evtSource) connectSSE();
  } catch (e) {
    if (e.status === 401) { location.href = '/login.html'; return; }
    root.innerHTML = `<div class="dz-queue-empty">${icon('alert')}<h2>${esc(e.message)}</h2>
      <a class="dz-btn" href="/queue.html">Back to queue</a></div>`;
    mountIcons(root);
  }
}

function render() {
  const c = complaint;
  const letter = c.letter_final || c.draft_english || '';
  const canUpdate = ['sent', 'acknowledged', 'in_progress'].includes(c.status) && official.role !== 'viewer';
  const canResend = c.status === 'send_failed' && official.role !== 'viewer';
  const canApprove = c.status === 'pending_approval' && official.role !== 'viewer';
  const images = c.images || [];
  const dept = c.department;
  const confPct = Math.round((c.ai_confidence || 0) * 100);
  const lowConf = (c.ai_confidence || 0) < 0.6;

  root.innerHTML = `
    <!-- Sticky identity header -->
    <div class="dz-detail-identity">
      <div class="dz-detail-id-icon">${statusIcon(c.status, 32)}</div>
      <div class="dz-detail-id-body">
        <span class="dz-detail-id-tid mono">${esc(c.tracking_id)}</span>
        ${dzStatusPill(c.status)}
        ${sevDots(c.severity)}
        ${c.escalation_level >= 1 ? '<span class="dz-escalation-badge">escalated</span>' : ''}
        <span class="dz-detail-id-cat">${icon(CATEGORY_ICON[c.category] || 'other')}${CAT_LABEL[c.category] || esc(c.category)}</span>
        ${c.is_sample ? '<span class="sample-tag">sample</span>' : ''}
      </div>
      <div class="dz-detail-id-meta">
        <span>${CITY_LABEL[c.city] || esc(c.city)}${c.area ? ' · ' + esc(c.area) : ''}</span>
        <span class="sep">·</span>
        <span>Filed ${fmtDateTime(c.created_at)}</span>
      </div>
    </div>

    <!-- 60/40 grid -->
    <div class="dz-detail-grid">
      <!-- Left column: the artifact -->
      <div class="dz-detail-col-main">
        <section class="dz-letter-card" aria-label="Formal complaint letter">
          <button type="button" class="letter-copy-btn" id="copyLetterBtn">${icon('copy')} Copy letter</button>
          <div class="dz-letter-head">
            <div>
              <div class="lh-title">DarKhwast</div>
              <div class="lh-ref mono">${esc(c.tracking_id)}</div>
            </div>
            <div style="text-align:end">
              <div class="dz-status-pill ${c.status}" style="margin-bottom:4px">${statusIcon(c.status, 12)}${statusLabel(c.status)}</div>
              <div style="font-size:12px;color:var(--dz-ink-muted);font-family:var(--dz-mono)">${fmtDateTime(c.created_at)}</div>
            </div>
          </div>
          <div class="dz-letter-body">${esc(letter)}</div>
        </section>

        ${images.length ? `
        <section class="dz-card dz-evidence-card" aria-label="Evidence images">
          <div class="dz-card-head"><h3 class="dz-card-title">Evidence (${images.length})</h3></div>
          <div class="dz-card-body">
            <div class="evidence-gallery">
              ${images.map((src) => `<div class="evidence-thumb" data-src="${esc(src)}"><img src="${esc(src)}" alt="Evidence photo" loading="lazy" /></div>`).join('')}
            </div>
          </div>
        </section>` : ''}

        ${c.photo_assessment ? `
        <section class="dz-card" aria-label="AI photo assessment">
          <div class="dz-card-head">
            <div>
              <h3 class="dz-card-title">AI photo assessment</h3>
              <p class="dz-card-sub">Qwen-VL analysis of the first evidence image</p>
            </div>
          </div>
          <div class="dz-card-body">
            <p style="margin:0 0 12px">${esc(c.photo_assessment.description || '')}</p>
            ${c.photo_assessment.visible_issues?.length ? `
            <div style="margin-bottom:12px">
              <strong style="font-size:12px;color:var(--dz-ink-muted);text-transform:uppercase;letter-spacing:.05em">Visible issues</strong>
              <ul style="margin:6px 0 0;padding-left:20px">
                ${c.photo_assessment.visible_issues.map((issue) => `<li>${esc(issue)}</li>`).join('')}
              </ul>
            </div>` : ''}
            <div style="display:flex;gap:16px;flex-wrap:wrap">
              <div>
                <strong style="font-size:12px;color:var(--dz-ink-muted);text-transform:uppercase;letter-spacing:.05em">Severity</strong>
                <div>${esc(c.photo_assessment.severity_assessment || '-')}</div>
              </div>
              <div>
                <strong style="font-size:12px;color:var(--dz-ink-muted);text-transform:uppercase;letter-spacing:.05em">Supports complaint</strong>
                <div>${c.photo_assessment.supports_complaint ? 'Yes' : 'No'}</div>
              </div>
            </div>
          </div>
        </section>` : ''}

        <section class="dz-card">
          <div class="dz-card-head"><h3 class="dz-card-title">Original citizen text</h3></div>
          <div class="dz-card-body">
            <details class="dz-raw">
              <summary>Show raw text</summary>
              <div class="raw-text">${esc(c.raw_text)}</div>
            </details>
          </div>
        </section>

        <section class="dz-card" aria-label="History">
          <div class="dz-card-head"><h3 class="dz-card-title">History</h3></div>
          <div class="dz-card-body">
            <ul class="dz-timeline">
              ${[...c.events].reverse().map((e, i) => {
                const isCurrent = i === 0;
                return `
                <li class="${isCurrent ? 'tl-current' : 'tl-done'}">
                  <div class="tl-mark"><span class="tl-shape">${statusIcon(e.to_status, 16)}</span></div>
                  <div class="tl-title">${esc(statusLabel(e.to_status))}</div>
                  <div class="tl-when">${fmtDateTime(e.at)}</div>
                  ${e.note ? `<div class="tl-note">${esc(e.note)}</div>` : ''}
                  ${e.actor ? `<div class="tl-actor">by ${esc(e.actor)}</div>` : ''}
                </li>`;
              }).join('')}
            </ul>
          </div>
        </section>
      </div>

      <!-- Right column: context -->
      <div class="dz-detail-col-side">
        <section class="dz-card dz-facts" aria-label="Complaint facts">
          <div class="dz-card-head"><h3 class="dz-card-title">Facts</h3></div>
          <div class="dz-card-body">
            <div class="fact-list">
              <div class="f"><span class="k">Category</span><span class="v">${CAT_LABEL[c.category] || esc(c.category)}</span></div>
              <div class="f"><span class="k">Severity</span><span class="v">${sevDots(c.severity)}</span></div>
              <div class="f"><span class="k">AI confidence</span><span class="v mono">${confPct}%${lowConf ? '<span class="dz-ai-conf-tag">low</span>' : ''}</span></div>
              <div class="f"><span class="k">City</span><span class="v">${CITY_LABEL[c.city] || esc(c.city)}</span></div>
              <div class="f"><span class="k">Area</span><span class="v">${esc(c.area || '-')}</span></div>
              <div class="f"><span class="k">Department</span><span class="v">${esc(dept?.name || '-')}</span></div>
            </div>
            <div class="dz-ai-conf-bar"><div class="dz-ai-conf-fill ${lowConf ? 'low' : ''}" style="width:${confPct}%"></div></div>
            ${dept ? `<div style="font-size:13px;color:var(--dz-ink-muted);margin-top:12px"><span class="mono" style="font-size:12px">${esc(dept.email || '')}</span>${dept.jurisdiction_notes ? `<br>${esc(dept.jurisdiction_notes)}` : ''}</div>` : ''}
            ${c.routing_rationale ? `<p style="font-size:13px;color:var(--dz-ink-muted);margin-top:12px;margin-bottom:0">${esc(c.routing_rationale)}</p>` : ''}
          </div>
        </section>

        <section class="dz-card dz-contact" aria-label="Citizen contact">
          <div class="dz-card-head"><h3 class="dz-card-title">Contact</h3></div>
          <div class="dz-card-body">
            ${c.is_anonymous
              ? `<p style="margin:0;font-size:13px;color:var(--dz-ink-muted);display:flex;align-items:center;gap:8px">${icon('shield')} Filed anonymously. Reply via the tracking reference.</p>`
              : `<div class="fact-list">
                  <div class="f"><span class="k">Name</span><span class="v">${esc(c.citizen_name || '-')}</span></div>
                  ${c.citizen_phone ? `<div class="f"><span class="k">Phone</span><span class="v mono"><a href="tel:${esc(c.citizen_phone)}">${esc(c.citizen_phone)}</a></span></div>` : ''}
                  ${c.citizen_email ? `<div class="f"><span class="k">Email</span><span class="v mono"><a href="mailto:${esc(c.citizen_email)}">${esc(c.citizen_email)}</a></span></div>` : ''}
                </div>
                <button type="button" class="contact-copy-btn" id="copyContactBtn">${icon('copy')} Copy contact</button>`}
          </div>
        </section>

        <section class="dz-card dz-dispatch" aria-label="Dispatch log">
          <div class="dz-card-head"><h3 class="dz-card-title">Dispatch log</h3></div>
          <div class="dz-card-body">
            ${c.dispatch_log?.length ? c.dispatch_log.map((d) => `
              <div class="dl-row">
                <div class="mono" style="font-size:12px">${esc(d.message_id || '-')}${d.simulated ? ' <span class="sample-tag">simulated</span>' : ''}</div>
                <div style="font-size:12px;color:var(--dz-ink-muted);margin-top:2px">${esc(d.to)} · ${fmtDateTime(d.at)} ${d.ok ? '' : ' · <strong style="color:var(--dz-rose)">failed</strong>'}</div>
              </div>`).join('')
            : '<p style="margin:0;font-size:13px;color:var(--dz-ink-muted)">Not dispatched yet.</p>'}
          </div>
        </section>
        ${c.location && c.location.lat != null ? `
        <section class="dz-card" aria-label="Location map">
          <div class="dz-card-head"><h3 class="dz-card-title">Location</h3></div>
          <div class="dz-card-body">
            <div id="detailMap" style="height:240px; border-radius:12px; overflow:hidden"></div>
          </div>
        </section>` : ''}
      </div>
    </div>

    <!-- Sticky action dock -->
    <div class="dz-action-dock" id="actionDock">
      <div id="dockError" class="dz-action-dock-error"></div>
      ${canApprove ? `
        <div style="display:flex; align-items:center; gap:12px; width:100%">
          <div style="flex:1">
            <strong style="font-size:14px">Pending admin approval</strong>
            <p style="margin:2px 0 0; font-size:12px; color:var(--dz-ink-muted)">Review and click Approve &amp; Send to dispatch the email to ${esc(dept?.name || 'the department')}.</p>
          </div>
          <button type="button" class="btn btn-primary" id="approveBtn">${icon('send')} Approve &amp; Send</button>
        </div>
      ` : canUpdate || canResend ? `
        <span class="dz-action-dock-label">Status</span>
        ${canUpdate ? `<select class="control dock-status" id="statusSelect" aria-label="New status">
          <option value="acknowledged" ${c.status === 'acknowledged' ? 'selected' : ''}>Acknowledged</option>
          <option value="in_progress" ${c.status === 'in_progress' ? 'selected' : ''}>In progress</option>
          <option value="resolved" ${c.status === 'resolved' ? 'selected' : ''}>Resolved</option>
          <option value="rejected" ${c.status === 'rejected' ? 'selected' : ''}>Rejected</option>
        </select>` : ''}
        <input type="text" class="control dock-note" id="statusNote" placeholder="Note (visible to citizen on the tracking page)">
        ${canResend ? `<button type="button" class="btn" id="resendBtn">${icon('send')} Re-send</button>` : ''}
        <div class="dock-spacer"></div>
        ${canUpdate ? `<button type="button" class="btn btn-primary" id="updateBtn">Update status</button>` : ''}
      ` : `<div class="dock-viewer-msg">${official.role === 'viewer'
          ? 'Viewer accounts cannot update status. Sign in as an operator.'
          : 'This complaint is not in a state that can be updated.'}</div>`}
    </div>`;
  mountIcons(root);

  // Inline map for GPS-tagged complaints
  if (c.location && c.location.lat != null && document.getElementById('detailMap')) {
    if (typeof L !== 'undefined') {
      const m = L.map('detailMap').setView([c.location.lat, c.location.lng], 15);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(m);
      L.marker([c.location.lat, c.location.lng]).addTo(m);
    } else {
      document.getElementById('detailMap').innerHTML = '<p style="text-align:center;padding:60px 0;color:var(--dz-ink-muted)">Map unavailable (offline)</p>';
    }
  }

  // Copy letter
  document.getElementById('copyLetterBtn')?.addEventListener('click', () => copyText(letter));

  // Copy contact
  document.getElementById('copyContactBtn')?.addEventListener('click', () => {
    const parts = [c.citizen_name, c.citizen_phone, c.citizen_email].filter(Boolean);
    copyText(parts.join('\n'));
  });

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
      btn.innerHTML = `${icon('send')} Re-send`;
      document.getElementById('dockError').innerHTML = `<div class="dz-status-update-error">${icon('alert')} ${esc(e.message)}</div>`;
      mountIcons(document.getElementById('dockError'));
    }
  });

  // Approve & Send button (pending_approval complaints)
  document.getElementById('approveBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('approveBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spin"></span>Sending...';
    try {
      const data = await api(`/api/official/complaints/${encodeURIComponent(c.id)}/approve`, { method: 'POST' });
      complaint = data.complaint;
      toast('Complaint approved and sent');
      render();
    } catch (e) {
      btn.disabled = false;
      btn.innerHTML = `${icon('send')} Approve & Send`;
      document.getElementById('dockError').innerHTML = `<div class="dz-status-update-error">${icon('alert')} ${esc(e.message)}</div>`;
      mountIcons(document.getElementById('dockError'));
    }
  });

  // Update status
  document.getElementById('updateBtn')?.addEventListener('click', async () => {
    const btn = document.getElementById('updateBtn');
    const newStatus = document.getElementById('statusSelect').value;
    const note = document.getElementById('statusNote').value;
    const errEl = document.getElementById('dockError');
    errEl.innerHTML = '';

    if (newStatus === 'rejected') {
      const confirmed = await showConfirmModal({
        title: 'Reject this complaint?',
        body: `<p>Are you sure you want to mark complaint <strong>${esc(c.tracking_id)}</strong> as <strong>Rejected</strong>? This will be visible to the citizen on their tracking page.</p>`,
        confirmLabel: 'Reject',
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
      errEl.innerHTML = `<div class="dz-status-update-error">${icon('alert')} ${esc(e.message)}</div>`;
      mountIcons(errEl);
    }
  });
}

function showConfirmModal({ title, body, confirmLabel }) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="confirmTitle">
        <h2 id="confirmTitle">${esc(title)}</h2>
        <div class="modal-body">${body}</div>
        <div class="actions">
          <button type="button" class="btn" id="confirmCancel">Cancel</button>
          <button type="button" class="btn btn-primary" id="confirmOk">${esc(confirmLabel || 'Confirm')}</button>
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
