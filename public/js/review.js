// Review & send (S3): classification strip with citizen correction, the letter
// artifact, anonymous/identified identity block, confirm modal, dispatch.

import { initLang, t, tv } from './i18n.js';
import { api, bindLangToggle, esc, icon, CATEGORY_ICON, initOfflineBanner, mountIcons, sealSvg, toast, qs, isPhoneLike, isEmailLike } from './shared.js';

initLang();
bindLangToggle(() => complaint && render(complaint));
initOfflineBanner();

const root = document.getElementById('reviewRoot');
let complaint = null;
let letterText = null;      // citizen-edited letter (null = use server draft)
let chipsOpen = false;
let sending = false;

const CATS = ['garbage', 'streetlight', 'water', 'sewage', 'road', 'other'];

function catLabel(c) { return tv('categories', c); }
function needsPick(c) {
  return c.status === 'needs_review' || c.ai_confidence < 0.6 || !c.category || c.category === 'other' && c.ai_confidence < 0.6;
}

async function load() {
  const id = qs('id');
  if (!id) { location.href = '/'; return; }
  try {
    const data = await api(`/api/complaints/${encodeURIComponent(id)}`);
    complaint = data.complaint;
    if (['sent', 'acknowledged', 'in_progress', 'resolved', 'rejected'].includes(complaint.status)) {
      location.href = `/sent.html?id=${encodeURIComponent(id)}`;
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

function render(c) {
  const noDept = !c.department;
  const blockSend = (chipsOpen && needsPick(c)) || noDept;
  root.innerHTML = `
    <p class="progress-label">${t('step2')}</p>

    ${noDept ? `<div class="banner banner-error">${icon('alert')}<div>${t('no_route')}</div></div>` : ''}
    ${needsPick(c) && !noDept ? `<div class="banner banner-warn">${icon('info')}<div>${t('not_sure')}</div></div>` : ''}

    <section class="card" aria-label="${t('classified_as')}">
      <div class="class-strip">
        <span class="cat">${icon(CATEGORY_ICON[c.category] || 'other')}<span>${catLabel(c.category)}</span></span>
        <span class="badge badge-${c.severity}">${icon(c.severity === 'high' ? 'alert' : 'info')}${tv('severities', c.severity)}</span>
        <button type="button" class="change-link" id="changeCatBtn">${t('not_right')}</button>
      </div>
      <p class="small muted lat" style="margin-top:12px; margin-bottom:0" lang="en">${esc(c.summary_en)}</p>
      ${chipsOpen ? `
        <div class="chip-row" role="group" aria-label="${t('pick_category')}">
          ${CATS.map((k) => `<button type="button" class="chip" data-cat="${k}" aria-pressed="${k === c.category}">${icon(CATEGORY_ICON[k])}<span>${catLabel(k)}</span></button>`).join('')}
        </div>` : ''}
    </section>

    <section class="card" aria-label="${t('summary_ur')}">
      <h3>${t('summary_ur')}</h3>
      <p lang="ur" style="margin:0">${esc(c.summary_ur)}</p>
    </section>

    <section class="letter-card" aria-label="${t('your_letter')}">
      <div class="letter-head">
        <div>
          <div class="lh-title lat" lang="en">DARKHWAST</div>
          <div class="small muted mono" style="direction:ltr; text-align:start">${esc(c.tracking_id)}</div>
        </div>
        ${sealSvg()}
      </div>
      <div class="letter-body lat" id="letterBody" lang="en">${esc(letterText ?? c.draft_english ?? '')}</div>
      <div class="letter-edit" id="letterEditWrap" hidden>
        <textarea id="letterEdit" class="lat" aria-label="${t('your_letter')}"></textarea>
      </div>
      <p class="small muted" style="margin-top:12px">${t('letter_note')}</p>
      ${c.department ? `
        <div class="spread" style="margin-top:8px">
          <span class="small"><strong>${t('routed_to')}:</strong></span>
          <span class="small lat" lang="en">${esc(c.department.name)}</span>
        </div>
        <div class="small muted mono" style="direction:ltr; text-align:end">${esc(c.department.email)}</div>` : ''}
      <button type="button" class="btn btn-ghost" id="editLetterBtn" style="margin-top:8px; min-height:40px">
        ${letterText !== null ? t('done_edit') : t('edit_letter')}
      </button>
    </section>

    <section class="card" aria-label="${t('anon_label')}">
      <div class="switch-row">
        <input type="checkbox" id="anonSwitch" ${c.is_anonymous !== false ? 'checked' : ''}>
        <div>
          <label for="anonSwitch" class="sw-label">${t('anon_label')}</label>
          <p class="sw-help" id="anonHelp">${t('anon_help')}</p>
        </div>
      </div>
      <div id="identityFields" hidden style="margin-top:16px">
        <p class="helper" style="margin-top:0">${t('identify_help')}</p>
        <div class="field"><label for="idName">${t('name_l')}</label>
          <input id="idName" class="control" type="text" placeholder="" data-i18n-ph="name_ph">
          <div class="field-error" id="nameErr" hidden></div></div>
        <div class="field"><label for="idPhone">${t('phone_l')}</label>
          <input id="idPhone" class="control" type="tel" placeholder="03xx-xxxxxxx" style="direction:ltr; text-align:start">
          <div class="field-error" id="contactErr" hidden></div></div>
        <div class="field"><label for="idEmail">${t('email_l')}</label>
          <input id="idEmail" class="control" type="email" placeholder="you@example.com" style="direction:ltr; text-align:start"></div>
      </div>
    </section>

    <button type="button" class="btn btn-primary btn-block" id="sendBtn" ${blockSend ? 'disabled' : ''}>
      ${t('send')}
    </button>
  `;
  mountIcons(root);
  wire(c);
}

function wire(c) {
  const changeBtn = document.getElementById('changeCatBtn');
  changeBtn?.addEventListener('click', () => { chipsOpen = !chipsOpen; render(complaint); });

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

  const editBtn = document.getElementById('editLetterBtn');
  const editWrap = document.getElementById('letterEditWrap');
  const body = document.getElementById('letterBody');
  const editTa = document.getElementById('letterEdit');
  editBtn?.addEventListener('click', () => {
    if (editWrap.hidden) {
      editTa.value = letterText ?? complaint.draft_english ?? '';
      editWrap.hidden = false;
      body.hidden = true;
      editBtn.textContent = t('done_edit');
    } else {
      letterText = editTa.value;
      editWrap.hidden = true;
      body.hidden = false;
      body.textContent = letterText;
      editBtn.textContent = t('edit_letter');
    }
  });

  const anon = document.getElementById('anonSwitch');
  const fields = document.getElementById('identityFields');
  anon?.addEventListener('change', () => {
    fields.hidden = anon.checked;
    document.getElementById('anonHelp').textContent = anon.checked ? t('anon_help') : t('identify_help');
  });

  document.getElementById('sendBtn')?.addEventListener('click', onSend);
}

async function onSend() {
  if (sending) return;
  const anon = document.getElementById('anonSwitch');
  const payload = { anonymous: anon.checked, name: '', phone: '', email: '', letter_text: letterText || undefined };

  if (!anon.checked) {
    const name = document.getElementById('idName').value.trim();
    const phone = document.getElementById('idPhone').value.trim();
    const email = document.getElementById('idEmail').value.trim();
    const nameErr = document.getElementById('nameErr');
    const contactErr = document.getElementById('contactErr');
    nameErr.hidden = true; contactErr.hidden = true;
    let bad = false;
    if (name.length < 2) { nameErr.textContent = t('name_l'); nameErr.hidden = false; bad = true; }
    if (!isPhoneLike(phone) && !isEmailLike(email)) { contactErr.textContent = t('identify_help'); contactErr.hidden = false; bad = true; }
    if (bad) return;
    payload.name = name; payload.phone = phone; payload.email = email;
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
      <div class="card" style="padding:12px 16px">
        <div class="small"><strong>${t('routed_to')}:</strong></div>
        <div class="lat" lang="en" style="font-weight:600">${esc(dept.name)}</div>
        <div class="small muted mono" style="direction:ltr; text-align:start">${esc(dept.email)}</div>
      </div>
      ${payload.anonymous ? `<p class="small" style="margin-top:12px">${t('confirm_anon')}</p>` : ''}
      <div class="actions">
        <button type="button" class="btn btn-secondary" id="mCancel">${t('cancel')}</button>
        <button type="button" class="btn btn-primary" id="mOk">${t('confirm_send')}</button>
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
