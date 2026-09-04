// Sent / receipt (S4): the screenshot artifact. Tracking ID in a dashed box,
// destination card, next steps, failure variant when send_failed.

import { initLang, t } from './i18n.js';
import { api, bindLangToggle, copyText, esc, fmtDateTime, icon, mountIcons, mountCommunityNav, qs, toast } from './shared.js';

initLang();
mountCommunityNav();
bindLangToggle(() => complaint && render(complaint));

const root = document.getElementById('sentRoot');
let complaint = null;

async function load() {
  const id = qs('id');
  if (!id) { location.href = '/'; return; }
  try {
    const data = await api(`/api/complaints/${encodeURIComponent(id)}`);
    complaint = data.complaint;
    render(complaint);
  } catch (e) {
    root.innerHTML = `<div class="empty-state">${icon('alert')}<h2>${esc(e.message)}</h2>
      <a class="btn btn-secondary" href="/">${t('back_home')}</a></div>`;
    mountIcons(root);
  }
}

function render(c) {
  const failed = c.status === 'send_failed';
  const sim = c.last_dispatch?.simulated;
  root.innerHTML = `
    <section class="receipt" aria-live="polite">
      ${failed
        ? `<span class="stamp-mark" style="border-color:var(--sev-med); color:var(--sev-med)">${t('pending')}</span>`
        : `<span class="stamp-mark">SENT</span>`}
      <h1>${t('sent_t')}</h1>
      ${failed ? `<div class="banner banner-error" style="text-align:start">${icon('alert')}<div>${t('fail_banner')}</div></div>` : ''}

      <div class="tid-box">
        <div style="text-align:start">
          <div class="small muted" style="margin-bottom:4px">${t('your_id')}</div>
          <div class="tid" lang="en" style="direction:ltr">${esc(c.tracking_id)}</div>
        </div>
        <button type="button" class="copy-btn" id="copyBtn">${icon('copy')}${t('copy')}</button>
      </div>

      <div class="card dest-card">
        <dl class="kv">
          <dt>${t('sent_to')}</dt>
          <dd class="lat" lang="en">${esc(c.department?.name || '-')}</dd>
          <dt>Email</dt>
          <dd class="mono small" style="direction:ltr; text-align:end">${esc(c.department?.email || '-')}</dd>
          <dt>${t('at_time')}</dt>
          <dd class="small">${c.sent_at || c.created_at ? fmtDateTime(c.sent_at || c.created_at) : '-'}</dd>
        </dl>
        ${sim ? `<p class="small muted" style="margin-top:12px; margin-bottom:0">${t('simulated_note')}</p>` : ''}
        ${failed ? `<p class="small" style="color:var(--sev-med); font-weight:600; margin-top:12px; margin-bottom:0">${t('pending')}</p>` : ''}
      </div>

      <div class="card dest-card" style="text-align:start">
        <h3>${t('next_t')}</h3>
        <ol class="mini-timeline">
          <li><span class="n lat">1</span><span>${t('next1')}</span></li>
          <li><span class="n lat">2</span><span>${t('next2')}</span></li>
          <li><span class="n lat">3</span><span>${t('next3')}</span></li>
        </ol>
      </div>

      <div class="row" style="margin-top:16px">
        <a class="btn btn-primary btn-block" href="/track.html?tid=${encodeURIComponent(c.tracking_id)}">${t('view_track')}</a>
        <a class="btn btn-secondary btn-block" href="/file.html">${t('file_another')}</a>
      </div>
    </section>`;
  mountIcons(root);
  document.getElementById('copyBtn').addEventListener('click', () => copyText(c.tracking_id));
}

load();
