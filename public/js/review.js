// Review & send (S3): structured 5-section layout:
//   1. Complaint Summary  2. Complaint Letter  3. Evidence  4. Submission Info  5. Actions
// Category correction chips, edit-letter mode, anonymous toggle, confirm modal.

import { initLang, t, tv } from './i18n.js';
<<<<<<< HEAD
import { api, bindLangToggle, esc, icon, CATEGORY_ICON, initOfflineBanner, mountIcons, mountCommunityNav, sealSvg, toast, qs, isPhoneLike, isEmailLike } from './shared.js';
=======
import { api, bindLangToggle, esc, icon, CATEGORY_ICON, initOfflineBanner, mountIcons, sealSvg, toast, qs, isPhoneLike, isEmailLike, copyText } from './shared.js';
>>>>>>> 67583db5db746687a3b6b971ef473217ce80b7af

initLang();
mountCommunityNav();
bindLangToggle(() => complaint && render(complaint));
initOfflineBanner();

const root = document.getElementById('reviewRoot');
let complaint = null;
let letterText = null;      // citizen-edited letter (null = use server draft)
let chipsOpen = false;
let sending = false;
let anonState = true;       // tracked independently so re-renders don't reset it

const CATS = ['garbage', 'streetlight', 'water', 'sewage', 'road', 'other'];

function catLabel(c) { return tv('categories', c); }
function needsPick(c) {
  return c.status === 'needs_review' || c.ai_confidence < 0.6 || !c.category;
}

async function load() {
  const id = qs('id');
  if (!id) { location.href = '/'; return; }
  try {
    const data = await api(`/api/complaints/${encodeURIComponent(id)}`);
    complaint = data.complaint;
    anonState = complaint.is_anonymous !== false;
    // Auto-sent (high severity) or already processed → go to receipt page
    if (['sent', 'send_failed', 'acknowledged', 'in_progress', 'resolved', 'rejected'].includes(complaint.status)) {
      location.href = `/sent.html?id=${encodeURIComponent(id)}`;
      return;
    }
    // Pending admin approval → show pending message
    if (complaint.status === 'pending_approval') {
      root.innerHTML = `
        <section class="receipt" aria-live="polite">
          <span class="stamp-mark" style="border-color:#7C3AED; color:#7C3AED">PENDING</span>
          <h1>Submitted for Review</h1>
          <p style="color:var(--ink-muted); max-width:480px; margin:0 auto 24px">
            Your complaint has been submitted and is awaiting review by our team.
            Once approved, it will be sent to the responsible department.
            You can track its status using your tracking ID.
          </p>
          <div class="tid-box">
            <div style="text-align:start">
              <div class="small muted" style="margin-bottom:4px">Your tracking ID</div>
              <div class="tid" lang="en" style="direction:ltr">${esc(complaint.tracking_id)}</div>
            </div>
            <button type="button" class="copy-btn" id="copyBtn">${icon('copy')}Copy</button>
          </div>
          <div class="card dest-card" style="text-align:start">
            <dl class="kv">
              <dt>Department</dt>
              <dd class="lat" lang="en">${esc(complaint.department?.name || '-')}</dd>
              <dt>Severity</dt>
              <dd><span class="sev-dot ${complaint.severity}"><span class="dot"></span>${complaint.severity}</span></dd>
            </dl>
          </div>
          <div class="row" style="margin-top:16px">
            <a class="btn btn-primary btn-block" href="/track.html?tid=${encodeURIComponent(complaint.tracking_id)}">Track complaint</a>
            <a class="btn btn-secondary btn-block" href="/">Back to home</a>
          </div>
        </section>`;
      mountIcons(root);
      document.getElementById('copyBtn')?.addEventListener('click', () => copyText(complaint.tracking_id));
      return;
    }
    chipsOpen = needsPick(complaint);
    render(complaint);
  } catch (e) {
    root.innerHTML = `<div class="empty-state">${icon('alert')}<h2>${esc(e.message)}</h2>
      <a class="btn btn-secondary" href="/">${t('back_home')}</a></div>`;
    mountIcons(root);
  }
}

// ---------------------------------------------------------------------------
// Parse a flat letter string into named sections for document-style rendering.
// The letter format from letter.js is well-structured with blank-line separators.
// ---------------------------------------------------------------------------
function parseLetter(text) {
  const lines = String(text || '').split('\n');
  const sections = {
    date: '', ref: '',
    to: [], subject: '', salutation: '',
    body: [], request: '',
    divider: false,
    identity: [], closing: [], signature: [], tracking: '',
  };

  let phase = 'header';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (phase === 'header') {
      if (line.startsWith('Date:')) { sections.date = line.replace('Date:', '').trim(); continue; }
      if (line.startsWith('Reference:')) { sections.ref = line.replace('Reference:', '').trim(); continue; }
      if (line === 'To,') { phase = 'to'; continue; }
    }
    if (phase === 'to') {
      if (line.startsWith('Subject:')) {
        sections.subject = line.replace('Subject:', '').trim();
        phase = 'body';
        continue;
      }
      sections.to.push(line);
      continue;
    }
    if (phase === 'body') {
      if (line.startsWith('Respected')) { sections.salutation = line; continue; }
      if (line === '---') { sections.divider = true; phase = 'identity'; continue; }
      if (line.startsWith('I kindly request') || line.startsWith('I request that') || line.startsWith('Yours sincerely')) {
        if (line.startsWith('Yours sincerely')) { phase = 'closing'; sections.closing.push(line); continue; }
        sections.request = line;
        continue;
      }
      if (line.startsWith('Location:')) { sections.location = line; continue; }
      sections.body.push(line);
      continue;
    }
    if (phase === 'identity') {
      if (line.startsWith('Yours sincerely')) { phase = 'closing'; sections.closing.push(line); continue; }
      sections.identity.push(line);
      continue;
    }
    if (phase === 'closing') {
      if (line.startsWith('Track this complaint')) { sections.tracking = line; continue; }
      sections.signature.push(line);
      continue;
    }
  }
  return sections;
}

function renderLetterDoc(text, tracking_id) {
  const s = parseLetter(text);

  // Unrecognised format (heavily edited letter or future letter.js changes):
  // render the full text as-is instead of silently dropping lines.
  if (!s.to.length && !s.subject && !s.divider && !s.tracking) {
    return `<div class="letter-doc"><div class="ld-body">${esc(String(text || '').trim())}</div></div>`;
  }

  const toHtml = s.to.map(l => esc(l)).join('<br>');
  const bodyText = s.body.join('\n').trim();
  const sigHtml = s.signature.filter(l => !l.includes('Track this')).map(l => esc(l)).join('<br>');

  return `
    <div class="letter-doc">
      ${s.to.length ? `
        <div class="ld-block">
          <div class="ld-label">To</div>
          <address class="ld-to">${toHtml}</address>
        </div>` : ''}

      ${s.subject ? `
        <div class="ld-block">
          <div class="ld-label">Subject</div>
          <div class="ld-subject">${esc(s.subject)}</div>
        </div>` : ''}

      ${s.salutation ? `<div class="ld-salutation">${esc(s.salutation)}</div>` : ''}

      ${bodyText ? `<div class="ld-body">${esc(bodyText)}</div>` : ''}

      ${s.location ? `<div class="ld-body" style="margin-top:8px">${esc(s.location)}</div>` : ''}

      ${s.request ? `<p style="margin-top:16px">${esc(s.request)}</p>` : ''}

      ${sigHtml || s.tracking ? `
        <div class="ld-close">
          <hr class="ld-divider">
          ${s.identity.length ? `<div style="font-size:13px; color:var(--ink-muted); margin-bottom:12px">${s.identity.map(l => esc(l)).join('<br>')}</div>` : ''}
          ${s.closing.length ? `<div>${s.closing.map(l => esc(l)).join('<br>')}</div>` : ''}
          ${sigHtml ? `<div class="ld-sig" style="margin-top:6px">${sigHtml}</div>` : ''}
          ${tracking_id ? `<div class="ld-ref" style="margin-top:12px">Reference: ${esc(tracking_id)}</div>` : ''}
        </div>` : ''}
    </div>`;
}

// ---------------------------------------------------------------------------
// Main render
// ---------------------------------------------------------------------------
function render(c) {
  const noDept = !c.department;
  const blockSend = (chipsOpen && needsPick(c)) || noDept;
  const currentLetter = letterText ?? c.draft_english ?? '';

  root.innerHTML = `
    <p class="progress-label">${t('step2')}</p>

    ${noDept ? `<div class="banner banner-error">${icon('alert')}<div>${t('no_route')}</div></div>` : ''}
    ${needsPick(c) && !noDept ? `<div class="banner banner-warn">${icon('info')}<div>${t('not_sure')}</div></div>` : ''}

    <!-- ① Complaint Summary -->
    <section class="card" aria-label="Complaint Summary" style="margin-bottom: 16px">
      <span class="review-section-label">① Complaint Summary</span>

      <div class="class-strip">
        <span class="cat">${icon(CATEGORY_ICON[c.category] || 'other')}<span>${catLabel(c.category)}</span></span>
        <span class="sev-dot ${c.severity}"><span class="dot"></span>${tv('severities', c.severity)}</span>
        <button type="button" class="change-link" id="changeCatBtn">${t('not_right')}</button>
      </div>

      ${chipsOpen ? `
        <div class="chip-row" role="group" aria-label="${t('pick_category')}" style="margin-top:12px">
          ${CATS.map((k) => `<button type="button" class="chip" data-cat="${k}" aria-pressed="${k === c.category}">${icon(CATEGORY_ICON[k])}<span>${catLabel(k)}</span></button>`).join('')}
        </div>` : ''}

      <div class="review-meta-grid" style="margin-top:16px">
        ${c.area ? `<span class="rmk">Location</span><span class="rmv">${esc(c.area)}, ${esc(tv('cities', c.city))}</span>` : `<span class="rmk">City</span><span class="rmv">${esc(tv('cities', c.city))}</span>`}
        <span class="rmk">Severity</span><span class="rmv"><span class="sev-dot ${c.severity}"><span class="dot"></span>${tv('severities', c.severity)}</span></span>
        <span class="rmk">Reference</span><span class="rmv"><span class="mono small">${esc(c.tracking_id)}</span></span>
      </div>

      ${c.summary_en ? `
        <div style="margin-top:16px; padding:12px 16px; background:var(--paper); border-radius:var(--r-sm); font-size:14px; color:var(--ink-muted);">
          <strong style="font-size:11px; letter-spacing:.06em; text-transform:uppercase; display:block; margin-bottom:4px; color:var(--ink-muted);">AI Summary</strong>
          <span class="lat" lang="en">${esc(c.summary_en)}</span>
        </div>` : ''}

      ${c.summary_ur ? `
        <p lang="ur" style="margin-top:8px; font-size:14px; color:var(--ink-muted)">${esc(c.summary_ur)}</p>` : ''}
    </section>

    <!-- ② Complaint Letter -->
    <section class="letter-card" aria-label="${t('your_letter')}" style="margin-bottom: 16px">
      <span class="review-section-label" style="display:block; margin-bottom:12px">② Complaint Letter</span>

      <div class="letter-head">
        <div>
          <div class="lh-brand">DarKhwast — Citizen Complaint</div>
          <div class="lh-ref">${esc(c.tracking_id)}</div>
        </div>
        ${sealSvg()}
      </div>

      <div id="letterDocView">${renderLetterDoc(currentLetter, c.tracking_id)}</div>

      <div class="letter-edit" id="letterEditWrap" hidden>
        <textarea id="letterEdit" class="lat" aria-label="${t('your_letter')}" style="width:100%; min-height:420px; font-family:var(--font-letter); font-size:14px; line-height:1.75; padding:16px; border:1.5px solid var(--border-strong); border-radius:var(--r-sm); resize:vertical"></textarea>
      </div>

      <p class="small muted" style="margin-top:12px">${t('letter_note')}</p>

      <button type="button" class="btn btn-ghost" id="editLetterBtn" style="margin-top:8px">
        ${letterText !== null ? t('done_edit') : t('edit_letter')}
      </button>
    </section>

    <!-- ③ Evidence -->
    ${c.images && c.images.length > 0 ? `
    <section class="card" aria-label="Evidence" style="margin-bottom: 16px">
      <span class="review-section-label">③ Evidence</span>
      <p class="small muted" style="margin-top:4px; margin-bottom:0">The images below will be attached as references to this complaint.</p>
      <div class="evidence-grid">
        ${c.images.map((src, i) => `<img src="${esc(src)}" alt="Evidence image ${i + 1}" loading="lazy">`).join('')}
      </div>
    </section>` : ''}

    ${c.location ? `
    <section class="card" aria-label="GPS Location" style="margin-bottom: 16px">
      <span class="review-section-label">GPS Location</span>
      <p class="small mono" style="direction:ltr; text-align:start; margin:4px 0 0">${c.location.lat.toFixed(5)}, ${c.location.lng.toFixed(5)}</p>
    </section>` : ''}

    <!-- ④ Submission Information -->
    <section class="card" aria-label="Submission Information" style="margin-bottom: 16px">
      <span class="review-section-label">④ Submission Information</span>

      ${c.department ? `
        <div>
          <strong style="font-size:13px; color:var(--ink-muted); text-transform:uppercase; letter-spacing:.06em">Responsible Department</strong>
          <div class="dept-info-card">
            <div class="di-name">${esc(c.department.name)}</div>
            ${c.department.email ? `<div class="di-email"><a href="mailto:${esc(c.department.email)}">${esc(c.department.email)}</a></div>` : ''}
            <div class="di-note">This complaint will be submitted to the department above on your behalf.</div>
          </div>
        </div>` : ''}

      <!-- Anonymous toggle -->
      <div style="margin-top:20px">
        <strong style="font-size:13px; color:var(--ink-muted); text-transform:uppercase; letter-spacing:.06em">Privacy</strong>
        <div class="switch-row" style="margin-top:10px">
          <input type="checkbox" id="anonSwitch" ${anonState ? 'checked' : ''}>
          <div>
            <label for="anonSwitch" class="sw-label">${t('anon_label')}</label>
            <p class="sw-help" id="anonHelp">${anonState ? t('anon_help') : t('identify_help')}</p>
          </div>
        </div>

        <!-- Anonymous indicator -->
        <div id="anonIndicator" style="margin-top:10px">
          ${anonState
            ? `<span class="anon-badge">🔒 Anonymous Complaint</span>
               <p class="small muted" style="margin-top:8px">Your name, phone and email will not be shared with the government department. No contact details are attached to the letter.</p>`
            : `<span class="anon-badge identified">👤 Identified Complaint</span>
               <p class="small muted" style="margin-top:8px">Your name will be included in the letter sent to the department.</p>`}
        </div>

        <div id="identityFields" ${anonState ? 'hidden' : ''} style="margin-top:16px">
          <p class="helper" style="margin-top:0">Provide your name to be included in the formal letter.</p>
          <div class="field">
            <label for="idName">${t('name_l')}</label>
            <input id="idName" class="control" type="text" placeholder="" data-i18n-ph="name_ph">
            <div class="field-error" id="nameErr" hidden></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ⑤ Final Action -->
    <div class="review-actions">
      <a href="/" class="btn btn-secondary">${icon('back')} Back</a>
      <button type="button" class="btn btn-primary" id="sendBtn" ${blockSend ? 'disabled' : ''}>
        ${icon('send')} ${c.severity === 'high' ? t('send') : 'Submit for review'}
      </button>
    </div>
    ${c.severity !== 'high' ? `<p class="small muted" style="text-align:center; margin-top:12px">This complaint will be reviewed by our team before being sent to the department.</p>` : ''}
  `;

  mountIcons(root);
  wire(c);
}

// ---------------------------------------------------------------------------
// Wire events after render
// ---------------------------------------------------------------------------
function wire(c) {
  // Category correction chips
  document.getElementById('changeCatBtn')?.addEventListener('click', () => {
    chipsOpen = !chipsOpen;
    render(complaint);
  });

  root.querySelectorAll('.chip[data-cat]').forEach((chip) => {
    chip.addEventListener('click', async () => {
      const cat = chip.dataset.cat;
      if (cat === complaint.category && !needsPick(complaint)) { chipsOpen = false; render(complaint); return; }
      chip.setAttribute('aria-pressed', 'true');
      chip.textContent = t('updating');
      try {
        const data = await api(`/api/complaints/${encodeURIComponent(complaint.id)}/category`, {
          method: 'PATCH',
          body: JSON.stringify({ category: cat }),
        });
        complaint = data.complaint;
        letterText = null;
        chipsOpen = false;
        render(complaint);
      } catch (e) {
        toast(e.message, 'error');
        render(complaint);
      }
    });
  });

  // Edit letter toggle
  const editBtn = document.getElementById('editLetterBtn');
  const editWrap = document.getElementById('letterEditWrap');
  const docView = document.getElementById('letterDocView');
  const editTa = document.getElementById('letterEdit');

  editBtn?.addEventListener('click', () => {
    if (editWrap.hidden) {
      // Enter edit mode
      editTa.value = letterText ?? complaint.draft_english ?? '';
      editWrap.hidden = false;
      docView.hidden = true;
      editBtn.textContent = t('done_edit');
      editTa.focus();
    } else {
      // Save edits
      letterText = editTa.value;
      editWrap.hidden = true;
      docView.hidden = false;
      docView.innerHTML = renderLetterDoc(letterText, complaint.tracking_id);
      editBtn.textContent = t('edit_letter');
    }
  });

  // Anonymous toggle
  const anonSwitch = document.getElementById('anonSwitch');
  const identityFields = document.getElementById('identityFields');
  const anonIndicator = document.getElementById('anonIndicator');

  anonSwitch?.addEventListener('change', () => {
    anonState = anonSwitch.checked;
    identityFields.hidden = anonState;
    document.getElementById('anonHelp').textContent = anonState ? t('anon_help') : t('identify_help');
    // Update indicator
    if (anonIndicator) {
      anonIndicator.innerHTML = anonState
        ? `<span class="anon-badge">🔒 Anonymous Complaint</span>
           <p class="small muted" style="margin-top:8px">Your name, phone and email will not be shared with the government department. No contact details are attached to the letter.</p>`
        : `<span class="anon-badge identified">👤 Identified Complaint</span>
           <p class="small muted" style="margin-top:8px">Your name will be included in the letter sent to the department.</p>`;
    }
  });

  // Send button
  document.getElementById('sendBtn')?.addEventListener('click', onSend);
}

// ---------------------------------------------------------------------------
// Send flow
// ---------------------------------------------------------------------------
async function onSend() {
  if (sending) return;
  const anon = document.getElementById('anonSwitch');
  const payload = { anonymous: anon.checked, name: '', letter_text: letterText || undefined };

  if (!anon.checked) {
    const name = document.getElementById('idName').value.trim();
    const nameErr = document.getElementById('nameErr');
    nameErr.hidden = true;
    if (name.length < 2) {
      nameErr.textContent = 'Please enter your full name.';
      nameErr.hidden = false;
      document.getElementById('idName').focus();
      return;
    }
    payload.name = name;
  }

  openConfirm(payload);
}

function openConfirm(payload) {
  const dept = complaint.department;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal" role="dialog" aria-modal="true" aria-labelledby="mTitle" style="position:relative">
      <button type="button" class="modal-x" aria-label="${t('cancel')}">${icon('x')}</button>
      <h2 id="mTitle">${t('confirm_t')}</h2>
      <p>${t('confirm_b')}</p>
      <div class="dept-info-card" style="margin:0">
        <div class="di-name">${esc(dept.name)}</div>
        ${dept.email ? `<div class="di-email">${esc(dept.email)}</div>` : ''}
      </div>
      ${payload.anonymous
        ? `<div style="margin-top:14px"><span class="anon-badge">🔒 Anonymous</span> <span class="small muted">No contact details will be attached.</span></div>`
        : `<div style="margin-top:14px"><span class="anon-badge identified">👤 ${esc(payload.name)}</span> <span class="small muted">Your name will appear in the letter.</span></div>`}
      <div class="actions">
        <button type="button" class="btn btn-secondary" id="mCancel">${t('cancel')}</button>
        <button type="button" class="btn btn-primary" id="mOk">${icon('send')} ${t('confirm_send')}</button>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  mountIcons(backdrop);

  const okBtn = backdrop.querySelector('#mOk');
  okBtn.focus();

  const close = () => { backdrop.remove(); document.getElementById('sendBtn')?.focus(); };
  backdrop.querySelector('#mCancel').addEventListener('click', close);
  backdrop.querySelector('.modal-x').addEventListener('click', close);
  backdrop.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  okBtn.addEventListener('click', async () => {
    sending = true;
    okBtn.disabled = true;
    okBtn.innerHTML = `<span class="spin"></span>${t('send')}`;
    try {
      const data = await api(`/api/complaints/${encodeURIComponent(complaint.id)}/send`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      location.href = `/sent.html?id=${encodeURIComponent(data.complaint.id)}`;
    } catch (e) {
      sending = false;
      close();
      toast(e.message, 'error');
    }
  });
}

load();
