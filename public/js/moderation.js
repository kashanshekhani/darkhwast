// Official moderation page: open comment reports from the community feed.
// Operator (admin) role only — viewers get the 403 explanation, not a crash.
// Uses the government portal session (dk_token), never the citizen token.

import { initLang, t } from './i18n.js';
import { api, bindLangToggle, esc, fmtDateTime, requireOfficial, toast, icon, mountCommunityNav } from './shared.js';

initLang();
if (!requireOfficial()) throw new Error('redirecting to login');
mountCommunityNav();
bindLangToggle(() => state.reports && render());

const root = document.getElementById('modRoot');
const errBox = document.getElementById('modError');

const state = { reports: [] };

async function load() {
  errBox.hidden = true;
  try {
    const data = await api('/api/official/comment-reports');
    state.reports = data.reports;
    render();
  } catch (e) {
    if (e.status === 401) { location.href = '/login.html'; return; }
    if (e.status === 403) {
      // viewer role — explain, offer the way back to the dashboard
      root.innerHTML = `
        <div class="acct-empty">
          ${icon('shield')}
          <h3>${esc(e.message)}</h3>
          <a class="btn btn-secondary" href="/dashboard.html" style="margin-top:var(--s4)">${esc(t('back_home'))}</a>
        </div>`;
      return;
    }
    errBox.textContent = e.message;
    errBox.hidden = false;
    root.innerHTML = '';
  }
}

function render() {
  if (!state.reports.length) {
    root.innerHTML = `
      <div class="acct-empty">
        ${icon('shield')}
        <h3>${esc(t('mod_empty'))}</h3>
      </div>`;
    return;
  }
  root.innerHTML = `<div class="mod-row">${state.reports.map(reportHtml).join('')}</div>`;

  root.querySelectorAll('.js-hide').forEach((b) =>
    b.addEventListener('click', () => setCommentStatus(b.dataset.cid, 'hidden')));
  root.querySelectorAll('.js-unhide').forEach((b) =>
    b.addEventListener('click', () => setCommentStatus(b.dataset.cid, 'visible')));
  root.querySelectorAll('.js-dismiss').forEach((b) =>
    b.addEventListener('click', () => dismissReport(b.dataset.rid)));
}

function reportHtml(r) {
  const m = r.comment;
  // a report can outlive its comment (author deleted it after being reported)
  if (!m) {
    return `
      <article class="mod-report">
        <div class="mod-report-head">
          <span class="reason-chip">${esc(t(`reason_${r.reason}`))}</span>
          <span>${esc(t('mod_reported_by', { name: r.reported_by }))}</span>
          <span>${fmtDateTime(r.created_at)}</span>
        </div>
        <div class="mod-actions">
          <button type="button" class="btn btn-secondary js-dismiss" data-rid="${esc(r.id)}">${esc(t('mod_dismiss'))}</button>
        </div>
      </article>`;
  }
  const hidden = m.status === 'hidden';
  return `
    <article class="mod-report">
      <div class="mod-report-head">
        <span class="reason-chip">${esc(t(`reason_${r.reason}`))}</span>
        <span>${esc(t('mod_reported_by', { name: r.reported_by }))}</span>
        <span>${fmtDateTime(r.created_at)}</span>
      </div>
      <blockquote class="mod-comment-quote ${hidden ? 'hidden-comment' : ''}">
        ${hidden ? `<span class="small">(${esc(t('mod_comment_hidden'))}) </span>` : ''}${esc(m.content)}
      </blockquote>
      <p class="mod-issue-link">
        ${esc(m.author?.name || '')} · ${esc(t('mod_on_issue'))}:
        ${m.issue ? `<a href="/issue.html?id=${encodeURIComponent(m.issue.id)}">${esc(m.issue.title || '')}</a> <span class="mono" lang="en">${esc(m.issue.tracking_id)}</span>` : '-'}
      </p>
      <div class="mod-actions">
        ${hidden
          ? `<button type="button" class="btn btn-secondary js-unhide" data-cid="${esc(m.id)}">${esc(t('mod_unhide'))}</button>`
          : `<button type="button" class="btn btn-primary js-hide" data-cid="${esc(m.id)}">${esc(t('mod_hide'))}</button>`}
        <button type="button" class="btn btn-secondary js-dismiss" data-rid="${esc(r.id)}">${esc(t('mod_dismiss'))}</button>
      </div>
    </article>`;
}

// hiding a comment auto-resolves its open reports — always refetch the list
async function setCommentStatus(cid, status) {
  try {
    await api(`/api/official/comments/${encodeURIComponent(cid)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await load();
  } catch (e) {
    if (e.status === 401) { location.href = '/login.html'; return; }
    toast(e.message, 'error');
  }
}

async function dismissReport(rid) {
  try {
    await api(`/api/official/comment-reports/${encodeURIComponent(rid)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'dismissed' }),
    });
    await load();
  } catch (e) {
    if (e.status === 401) { location.href = '/login.html'; return; }
    toast(e.message, 'error');
  }
}

load();
