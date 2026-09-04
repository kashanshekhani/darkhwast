// Public issue detail: sanitized issue view + real status timeline (built from
// status_events, same logic as the tracking page) + support toggle + discussion
// with author-only delete and comment reporting. Guests browse freely; support
// and commenting ask for sign-in inline — never a silent redirect.

import { initLang, t, tv, lang } from './i18n.js';
import {
  api, bindLangToggle, esc, icon, statusPill, fmtDateTime, timeAgo,
  mountCommunityNav, citizenToken, clearCitizenSession, toast, CATEGORY_ICON,
} from './shared.js';

initLang();
mountCommunityNav();
bindLangToggle(() => state.issue && render());

const root = document.getElementById('issueRoot');
const issueId = new URLSearchParams(location.search).get('id') || '';
const REASONS = ['spam', 'abuse', 'harassment', 'misinformation', 'other'];
const ORDER = ['sent', 'acknowledged', 'in_progress', 'resolved'];

const state = {
  issue: null,
  events: [],
  comments: [],
  supported: false,
  imgIndex: 0,
  reported: new Set(), // comment ids this viewer already reported (or got a 409 for)
};

const ur = (en, urText) => (lang() === 'ur' ? urText : en);
const here = () => encodeURIComponent(location.pathname + location.search);

// close any open report menu on outside clicks
document.addEventListener('click', () => closeAllMenus());

async function load() {
  try {
    const [detail, commentsData] = await Promise.all([
      api(`/api/community/issues/${encodeURIComponent(issueId)}`),
      api(`/api/community/issues/${encodeURIComponent(issueId)}/comments`, { auth: 'citizen' }),
    ]);
    state.issue = detail.issue;
    state.events = detail.events;
    state.comments = commentsData.comments;
    document.title = `${state.issue.title || 'Issue'} - DarKhwast`;
    await loadSupportState();
    render();
  } catch {
    renderNotFound();
  }
}

// viewer's support state comes from their supports list (one small request,
// keeps the public detail endpoint identical for guests)
async function loadSupportState() {
  state.supported = false;
  if (!citizenToken()) return;
  try {
    const data = await api('/api/auth/me/supports', { auth: 'citizen' });
    state.supported = data.supports.some((s) => s.issue.id === issueId);
  } catch (e) {
    if (e.status === 401) clearCitizenSession();
    // other errors: leave as unsupported — the toggle POST 409s and re-syncs
  }
}

function renderNotFound() {
  root.innerHTML = `
    <div class="feed-empty">
      ${icon('search')}
      <h3>${esc(t('issue_not_found_t'))}</h3>
      <p>${esc(t('issue_not_found_sub'))}</p>
      <a class="btn btn-secondary" href="/community.html">${esc(t('issue_back_feed'))}</a>
    </div>`;
}

// --------------------------------------------------------------------------
// render
// --------------------------------------------------------------------------
function render() {
  const c = state.issue;
  const failed = c.status === 'send_failed';
  const rejected = c.status === 'rejected';
  const pending = c.status === 'pending_approval';
  const idx = ORDER.indexOf(c.status);
  const reached = failed ? 0 : (rejected ? 4 : (idx === -1 ? 0 : idx + 1));

  const noteFor = (status) => {
    const ev = [...state.events].reverse().find((e) => e.to_status === status);
    return ev ? { note: ev.note, at: ev.at } : null;
  };
  const whenFor = (key) => {
    if (key === 'filed') return c.created_at;
    if (key === 'sent') return c.sent_at || noteFor('sent')?.at || null;
    if (key === 'resolved') return noteFor('resolved')?.at || noteFor('rejected')?.at || c.resolved_at;
    return noteFor(key)?.at;
  };
  const steps = [
    { key: 'filed', label: tv('steps', 'filed'), note: null },
    { key: 'sent', label: pending ? t('pending_approval_step') : (failed ? t('pending') : tv('steps', 'sent')), note: noteFor('sent')?.note },
    { key: 'acknowledged', label: tv('steps', 'acknowledged'), note: noteFor('acknowledged')?.note },
    { key: 'in_progress', label: tv('steps', 'in_progress'), note: noteFor('in_progress')?.note },
    { key: 'resolved', label: rejected ? tv('statuses', 'rejected') : tv('steps', 'resolved'), note: noteFor('resolved')?.note || noteFor('rejected')?.note },
  ];

  const loc = c.area ? `${tv('cities', c.city)}, ${c.area}` : tv('cities', c.city);

  root.innerHTML = `
    <a class="back-link" href="/community.html">${icon('back')}${esc(t('issue_back_feed'))}</a>

    <div class="issue-page-head">
      <h1>${esc(c.title || '')}</h1>
      ${statusPill(c.status)}
    </div>
    ${c.summary_ur ? `<p class="issue-urdu-summary" lang="ur">${esc(c.summary_ur)}</p>` : ''}
    ${c.is_sample ? `<p class="small muted">${esc(t('issue_sample_tag'))} · <span class="mono" lang="en">${esc(c.tracking_id)}</span></p>` : ''}

    <div class="issue-body-grid">
      <div class="issue-main">
        ${galleryHtml()}
        <section class="card">
          <p class="progress-label">${esc(t('issue_details'))}</p>
          <p class="issue-desc" style="margin:0">${esc(c.description || '')}</p>
        </section>
        ${discussionHtml()}
      </div>

      <aside class="issue-side">
        ${supportHtml()}
        <section class="card">
          <dl class="kv">
            <dt>${esc(t('loc_l'))}</dt><dd>${esc(loc)}</dd>
            <dt>${esc(t('ex_cat_label'))}</dt><dd>${esc(tv('categories', c.category))}</dd>
            <dt>${esc(t('dept_l'))}</dt><dd class="lat" lang="en">${esc(c.department?.name || t('dept_pending'))}</dd>
            <dt>${esc(t('filed_l'))}</dt><dd class="small">${fmtDateTime(c.created_at)}</dd>
          </dl>
        </section>
        <section class="card">
          <p class="progress-label">${esc(t('issue_timeline'))}</p>
          <ol class="stepper">
            ${steps.map((s, i) => {
              const stateCls = i < reached ? 'done' : i === reached ? 'current' : 'future';
              const when = whenFor(s.key);
              return `
              <li class="${stateCls}" ${i === reached && !failed ? 'aria-current="step"' : ''}>
                <span class="mark">${i < reached ? icon('check') : ''}</span>
                <div class="st-title">${esc(s.label)}</div>
                ${when && i <= reached ? `<div class="st-when lat" lang="en">${fmtDateTime(when)}</div>` : ''}
                ${s.note && i <= reached ? `<div class="st-note">${esc(s.note)}</div>` : ''}
              </li>`;
            }).join('')}
          </ol>
        </section>
      </aside>
    </div>`;

  bindGallery();
  bindSupport();
  bindDiscussion();
}

// --------------------------------------------------------------------------
// gallery + lightbox
// --------------------------------------------------------------------------
function galleryHtml() {
  const c = state.issue;
  const imgs = c.images || [];
  if (!imgs.length) {
    return `
      <div class="issue-gallery">
        <div class="main-img"><div class="media-fallback">${icon(CATEGORY_ICON[c.category] || 'other')}</div></div>
      </div>`;
  }
  return `
    <div class="issue-gallery">
      <div class="main-img" id="mainImg" role="button" tabindex="0" aria-label="${esc(t('issue_details'))}">
        <img src="${esc(imgs[state.imgIndex])}" alt="">
      </div>
      ${imgs.length > 1 ? `
      <div class="thumbs">
        ${imgs.map((src, i) => `
        <button type="button" class="${i === state.imgIndex ? 'active' : ''}" data-img="${i}" aria-label="Image ${i + 1}">
          <img src="${esc(src)}" alt="">
        </button>`).join('')}
      </div>` : ''}
    </div>`;
}

function bindGallery() {
  const mainImg = document.getElementById('mainImg');
  if (mainImg) {
    mainImg.addEventListener('click', () => openLightbox(state.imgIndex));
    mainImg.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(state.imgIndex); }
    });
  }
  root.querySelectorAll('.thumbs button').forEach((b) => {
    b.addEventListener('click', () => {
      state.imgIndex = Number(b.dataset.img);
      const img = root.querySelector('.main-img img');
      if (img) img.src = state.issue.images[state.imgIndex];
      root.querySelectorAll('.thumbs button').forEach((x) => x.classList.toggle('active', x === b));
    });
  });
}

function openLightbox(index) {
  const src = state.issue.images?.[index];
  if (!src) return;
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  const close = () => { lb.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  lb.innerHTML = `
    <button type="button" class="lightbox-close">${icon('x')}</button>
    <img src="${esc(src)}" alt="">`;
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
  lb.querySelector('.lightbox-close').addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.appendChild(lb);
  lb.querySelector('.lightbox-close').focus();
}

// --------------------------------------------------------------------------
// support (one per citizen, toggleable)
// --------------------------------------------------------------------------
function supportHtml() {
  const c = state.issue;
  if (!citizenToken()) {
    return `
      <div class="support-box">
        <p class="support-count-line">${c.support_count} ${esc(t('issue_supporters'))}</p>
        <p class="support-signin-note"><a href="/signin.html?next=${here()}">${esc(t('issue_signin_support'))}</a></p>
      </div>`;
  }
  return `
    <div class="support-box">
      <button type="button" class="btn btn-primary btn-support ${state.supported ? 'supported' : ''}" id="supportBtn">
        ${state.supported ? `✓ ${esc(t('issue_supported_btn'))}` : esc(t('issue_support_btn'))}
      </button>
      <p class="support-count-line" id="supportCountLine">${c.support_count} ${esc(t('issue_supporters'))}</p>
    </div>`;
}

function bindSupport() {
  document.getElementById('supportBtn')?.addEventListener('click', toggleSupport);
}

async function toggleSupport() {
  const btn = document.getElementById('supportBtn');
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  const method = state.supported ? 'DELETE' : 'POST';
  try {
    const r = await api(`/api/community/issues/${encodeURIComponent(issueId)}/support`, { method, auth: 'citizen' });
    state.supported = r.supported;
    state.issue.support_count = r.support_count;
    btn.classList.toggle('supported', state.supported);
    btn.textContent = state.supported ? `✓ ${t('issue_supported_btn')}` : t('issue_support_btn');
    const line = document.getElementById('supportCountLine');
    if (line) line.textContent = `${r.support_count} ${t('issue_supporters')}`;
  } catch (e) {
    if (e.status === 401) {
      clearCitizenSession();
      render();
      toast(e.message, 'error');
      return;
    }
    if (e.status === 409) {
      // server truth wins — resync the local flag
      state.supported = method === 'POST';
      render();
    }
    toast(e.message, 'error');
  }
  btn.disabled = false;
}

// --------------------------------------------------------------------------
// discussion
// --------------------------------------------------------------------------
function discussionHtml() {
  const list = state.comments.map(commentHtml).join('');
  const form = citizenToken() ? `
    <form class="comment-form" id="commentForm" novalidate>
      <textarea id="commentText" maxlength="1000" data-i18n-ph="issue_comment_ph"></textarea>
      <div class="comment-form-row">
        <span class="char-hint" id="commentHint">0/1000</span>
        <button type="submit" class="btn btn-primary" id="commentBtn">${esc(t('issue_comment_btn'))}</button>
      </div>
      <div class="field-error" id="commentError" hidden></div>
    </form>` : `
    <p class="support-signin-note"><a href="/signin.html?next=${here()}">${esc(t('issue_comment_signin'))}</a></p>`;

  return `
    <section class="card" id="discussion">
      <p class="progress-label">${esc(t('issue_discussion'))} (${state.comments.length})</p>
      ${state.comments.length ? `<div class="comment-list">${list}</div>`
        : `<p class="muted" style="margin:0 0 var(--s4)">${esc(t('issue_comment_empty'))}</p>`}
      ${form}
    </section>`;
}

function commentHtml(m) {
  const initial = String(m.user?.name || 'C').trim().charAt(0).toUpperCase();
  const reported = state.reported.has(m.id);
  return `
    <article class="comment-item" data-cid="${esc(m.id)}">
      <div class="comment-head">
        <span class="comment-avatar">${esc(initial)}</span>
        <span class="comment-author">${esc(m.user?.name || '')}</span>
        <span class="comment-time">${timeAgo(m.created_at)}</span>
        <span class="comment-actions">
          ${m.mine ? `
          <button type="button" class="js-del">${esc(t('issue_comment_delete'))}</button>` : `
          <span class="report-menu">
            <button type="button" class="js-report ${reported ? 'reported' : ''}" ${reported ? 'disabled' : ''}>${esc(reported ? t('issue_reported') : t('issue_report'))}</button>
            ${reported ? '' : `
            <div class="report-menu-items" hidden>
              <span class="rm-title">${esc(t('issue_report_reason'))}</span>
              ${REASONS.map((r) => `<button type="button" data-reason="${r}">${esc(t(`reason_${r}`))}</button>`).join('')}
              <button type="button" class="js-cancel">${esc(t('issue_report_cancel'))}</button>
            </div>`}
          </span>`}
        </span>
      </div>
      <p class="comment-content">${esc(m.content)}</p>
    </article>`;
}

function closeAllMenus() {
  root.querySelectorAll('.report-menu-items').forEach((m) => { m.hidden = true; });
}

function bindDiscussion() {
  root.querySelectorAll('.js-del').forEach((b) => b.addEventListener('click', onDeleteComment));

  root.querySelectorAll('.js-report').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = b.parentElement.querySelector('.report-menu-items');
    if (!menu) return;
    const show = menu.hidden;
    closeAllMenus();
    menu.hidden = !show;
  }));

  root.querySelectorAll('.report-menu-items button[data-reason]').forEach((b) => {
    b.addEventListener('click', () => {
      const cid = b.closest('.comment-item').dataset.cid;
      submitReport(b.dataset.reason, cid);
    });
  });
  root.querySelectorAll('.js-cancel').forEach((b) => b.addEventListener('click', closeAllMenus));

  const form = document.getElementById('commentForm');
  if (form) form.addEventListener('submit', onPostComment);
  const ta = document.getElementById('commentText');
  if (ta) ta.addEventListener('input', () => {
    const hint = document.getElementById('commentHint');
    if (hint) hint.textContent = `${ta.value.length}/1000`;
  });
}

async function onPostComment(e) {
  e.preventDefault();
  const ta = document.getElementById('commentText');
  const errEl = document.getElementById('commentError');
  const btn = document.getElementById('commentBtn');
  errEl.hidden = true;
  const content = ta.value.trim();
  if (content.length < 2 || content.length > 1000) {
    errEl.textContent = ur('Comments must be 2–1000 characters.', 'تبصرہ 2 تا 1000 حروف کا ہونا چاہیے۔');
    errEl.hidden = false;
    return;
  }
  btn.disabled = true;
  btn.textContent = t('community_loading');
  try {
    const data = await api(`/api/community/issues/${encodeURIComponent(issueId)}/comments`, {
      method: 'POST',
      auth: 'citizen',
      body: JSON.stringify({ content }),
    });
    state.comments.push(data.comment);
    state.issue.comment_count += 1;
    render();
    document.getElementById('discussion')?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  } catch (err) {
    if (err.status === 401) {
      clearCitizenSession();
      render();
      return;
    }
    if (err.field_errors?.content) {
      errEl.textContent = err.field_errors.content;
      errEl.hidden = false;
    } else {
      toast(err.message, 'error');
    }
    btn.disabled = false;
    btn.textContent = t('issue_comment_btn');
  }
}

async function onDeleteComment(e) {
  const cid = e.currentTarget.closest('.comment-item').dataset.cid;
  if (!confirm(t('issue_comment_confirm'))) return;
  try {
    await api(`/api/community/comments/${encodeURIComponent(cid)}`, { method: 'DELETE', auth: 'citizen' });
    state.comments = state.comments.filter((m) => m.id !== cid);
    state.issue.comment_count = Math.max(0, state.issue.comment_count - 1);
    render();
  } catch (err) {
    if (err.status === 401) {
      clearCitizenSession();
      render();
      return;
    }
    toast(err.message, 'error');
  }
}

async function submitReport(reason, cid) {
  closeAllMenus();
  try {
    await api(`/api/community/comments/${encodeURIComponent(cid)}/report`, {
      method: 'POST',
      auth: 'citizen',
      body: JSON.stringify({ reason }),
    });
    state.reported.add(cid);
    toast(t('issue_reported'));
  } catch (e) {
    if (e.status === 401) {
      clearCitizenSession();
      render();
      return;
    }
    if (e.status === 409) state.reported.add(cid);
    toast(e.message, 'error');
  }
  render();
}

if (!issueId) renderNotFound();
else load();
