// Citizen account page: my complaints (with live status), supported issues
// (with remove-support), and profile settings (display name, logout).
// Guarded by requireCitizen() — a separate session from the officials' portal.

import { initLang, t, tv, lang } from './i18n.js';
import {
  api, bindLangToggle, esc, statusPill, fmtDateTime,
  requireCitizen, citizenToken, citizenUser, setCitizenSession, clearCitizenSession,
  toast, mountCommunityNav, icon,
} from './shared.js';

initLang();
if (!requireCitizen()) throw new Error('redirecting to signin');
mountCommunityNav('account');
bindLangToggle(() => render());

const root = document.getElementById('accountRoot');

const state = {
  user: citizenUser(),
  tab: 'complaints',
  complaints: [],
  supports: [],
};

const ur = (en, urText) => (lang() === 'ur' ? urText : en);

async function loadAll() {
  try {
    const me = await api('/api/auth/me', { auth: 'citizen' });
    state.user = me.user;
    setCitizenSession(citizenToken(), me.user); // refresh the cached copy
    const [c, s] = await Promise.all([
      api('/api/auth/me/complaints', { auth: 'citizen' }),
      api('/api/auth/me/supports', { auth: 'citizen' }),
    ]);
    state.complaints = c.complaints;
    state.supports = s.supports;
    render();
  } catch (e) {
    if (e.status === 401) {
      clearCitizenSession();
      location.href = '/signin.html';
      return;
    }
    root.innerHTML = `<div class="banner banner-error" role="alert">${esc(e.message)}</div>`;
  }
}

function render() {
  const u = state.user || {};
  root.innerHTML = `
    <div class="account-head">
      <h1>${esc(t('account_welcome', { name: u.name || '' }))}</h1>
      <button type="button" class="btn btn-secondary" id="logoutBtn">${esc(t('account_logout'))}</button>
    </div>

    <div class="account-tabs" role="tablist">
      <button type="button" role="tab" data-tab="complaints" aria-selected="${state.tab === 'complaints'}" class="${state.tab === 'complaints' ? 'active' : ''}">
        ${esc(t('account_tab_complaints'))} (${state.complaints.length})
      </button>
      <button type="button" role="tab" data-tab="supports" aria-selected="${state.tab === 'supports'}" class="${state.tab === 'supports' ? 'active' : ''}">
        ${esc(t('account_tab_supports'))} (${state.supports.length})
      </button>
      <button type="button" role="tab" data-tab="settings" aria-selected="${state.tab === 'settings'}" class="${state.tab === 'settings' ? 'active' : ''}">
        ${esc(t('account_tab_settings'))}
      </button>
    </div>

    <div id="tabBody">${tabHtml()}</div>`;

  root.querySelectorAll('.account-tabs button').forEach((b) => {
    b.addEventListener('click', () => {
      state.tab = b.dataset.tab;
      render();
    });
  });
  document.getElementById('logoutBtn').addEventListener('click', logout);
  bindTab();
}

function tabHtml() {
  if (state.tab === 'complaints') return complaintsHtml();
  if (state.tab === 'supports') return supportsHtml();
  return settingsHtml();
}

function emptyHtml(title, sub, ctaHref, ctaKey) {
  return `
    <div class="acct-empty">
      ${icon('inbox')}
      <h3>${esc(title)}</h3>
      <p>${esc(sub)}</p>
      <a class="btn btn-primary" href="${ctaHref}">${esc(t(ctaKey))}</a>
    </div>`;
}

// ---------------------------------------------------------------------------
// tab: my complaints → click through to the tracking page (works for every
// status, public or private — it is the citizen's own complaint)
// ---------------------------------------------------------------------------
function complaintsHtml() {
  if (!state.complaints.length) {
    return emptyHtml(t('account_empty_complaints'), t('account_empty_complaints_sub'), '/file.html', 'account_file_cta');
  }
  return `
    <div class="acct-list">
      ${state.complaints.map((c) => `
        <a class="acct-row" href="/track.html?tid=${encodeURIComponent(c.tracking_id)}">
          <div class="grow">
            <h3>${esc(c.summary_en || '')}</h3>
            <div class="acct-meta">
              <span class="mono" lang="en">${esc(c.tracking_id)}</span>
              <span>${esc(tv('categories', c.category))}</span>
              <span>${esc(tv('cities', c.city))}${c.area ? `, ${esc(c.area)}` : ''}</span>
              <span>${fmtDateTime(c.created_at)}</span>
            </div>
          </div>
          ${statusPill(c.status)}
        </a>`).join('')}
    </div>`;
}

// ---------------------------------------------------------------------------
// tab: supported issues → click through to the public issue, remove support
// ---------------------------------------------------------------------------
function supportsHtml() {
  if (!state.supports.length) {
    return emptyHtml(t('account_empty_supports'), t('account_empty_supports_sub'), '/community.html', 'account_browse_cta');
  }
  return `
    <div class="acct-list">
      ${state.supports.map((s) => {
        const issue = s.issue;
        return `
        <div class="acct-row">
          <a class="grow" href="/issue.html?id=${encodeURIComponent(issue.id)}">
            <h3>${esc(issue.title || '')}</h3>
            <div class="acct-meta">
              <span>${esc(tv('cities', issue.city))}${issue.area ? `, ${esc(issue.area)}` : ''}</span>
              <span>${issue.support_count} ${esc(t('supports_count'))}</span>
              <span>${fmtDateTime(s.supported_at)}</span>
            </div>
          </a>
          <div class="acct-actions">
            ${statusPill(issue.status)}
            <button type="button" class="btn btn-secondary js-remove" data-id="${esc(issue.id)}">${esc(t('account_remove_support'))}</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

// ---------------------------------------------------------------------------
// tab: settings (display name only — email is the account identity)
// ---------------------------------------------------------------------------
function settingsHtml() {
  const u = state.user || {};
  const provider = u.auth_provider === 'google' ? t('account_provider_google') : t('account_provider_password');
  return `
    <section class="card settings-card">
      <dl class="kv">
        <dt>${esc(t('signin_email_l'))}</dt><dd class="lat" lang="en">${esc(u.email || '')}</dd>
        <dt>${esc(t('account_tab_settings'))}</dt><dd>${esc(provider)}</dd>
        <dt>${esc(t('account_member_since', { date: '' }).replace(/\s*$/, ''))}</dt>
        <dd class="small">${fmtDateTime(u.created_at)}</dd>
      </dl>
      <form id="nameForm" novalidate style="margin-top:var(--s5)">
        <div class="field">
          <label for="displayName">${esc(t('account_name_l'))}</label>
          <input id="displayName" class="control" type="text" maxlength="80" value="${esc(u.name || '')}">
          <div class="field-error" id="nameError" hidden></div>
        </div>
        <button type="submit" class="btn btn-primary" id="saveBtn">${esc(t('account_save'))}</button>
      </form>
    </section>`;
}

function bindTab() {
  const form = document.getElementById('nameForm');
  if (form) form.addEventListener('submit', saveName);
  root.querySelectorAll('.js-remove').forEach((b) => b.addEventListener('click', () => removeSupport(b.dataset.id)));
}

async function saveName(e) {
  e.preventDefault();
  const input = document.getElementById('displayName');
  const errEl = document.getElementById('nameError');
  const btn = document.getElementById('saveBtn');
  errEl.hidden = true;
  const name = input.value.trim();
  if (name.length < 2 || name.length > 80) {
    errEl.textContent = ur('Please enter your name (2–80 characters).', 'براہ کرم اپنا نام لکھیں (2 تا 80 حروف)۔');
    errEl.hidden = false;
    return;
  }
  btn.disabled = true;
  btn.textContent = t('account_saving');
  try {
    const data = await api('/api/auth/me', {
      method: 'PATCH',
      auth: 'citizen',
      body: JSON.stringify({ name }),
    });
    state.user = data.user;
    setCitizenSession(citizenToken(), data.user);
    toast(t('account_saved'));
    render();
  } catch (err) {
    if (err.field_errors?.name) {
      errEl.textContent = err.field_errors.name;
      errEl.hidden = false;
    } else if (err.status === 401) {
      clearCitizenSession();
      location.href = '/signin.html';
      return;
    } else {
      toast(err.message, 'error');
    }
    btn.disabled = false;
    btn.textContent = t('account_save');
  }
}

async function removeSupport(issueId) {
  try {
    await api(`/api/community/issues/${encodeURIComponent(issueId)}/support`, {
      method: 'DELETE',
      auth: 'citizen',
    });
    state.supports = state.supports.filter((s) => s.issue.id !== issueId);
    render();
  } catch (e) {
    if (e.status === 401) {
      clearCitizenSession();
      location.href = '/signin.html';
      return;
    }
    toast(e.message, 'error');
  }
}

async function logout() {
  try { await api('/api/auth/logout', { method: 'POST', auth: 'citizen' }); } catch { /* session already gone */ }
  clearCitizenSession();
  location.href = '/';
}

loadAll();
