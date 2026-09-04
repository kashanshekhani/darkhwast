// Citizen account page — two modes:
//  1. Dashboard (default, ?view=details absent): "Home" — my complaints +
//     supported issues, the citizen's personal dashboard.
//  2. Details (?view=details): "My Account" — profile info, account stats,
//     edit display name, and delete-account with confirmation.
// Guarded by requireCitizen() — a separate session from the officials' portal.

import { initLang, t, tv, lang } from './i18n.js';
import {
  api, bindLangToggle, esc, statusPill, fmtDateTime,
  requireCitizen, citizenToken, citizenUser, setCitizenSession, clearCitizenSession,
  toast, mountCommunityNav, icon,
} from './shared.js';

initLang();
if (!requireCitizen()) throw new Error('redirecting to signin');

const isDetailsView = new URLSearchParams(location.search).get('view') === 'details';
mountCommunityNav(isDetailsView ? 'details' : 'home');
bindLangToggle(() => render());

const root = document.getElementById('accountRoot');

const state = {
  user: citizenUser(),
  tab: 'complaints',
  complaints: [],
  supports: [],
  stats: null,
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
    // Fetch stats if in details view
    if (isDetailsView) {
      try {
        const st = await api('/api/auth/me/stats', { auth: 'citizen' });
        state.stats = st;
      } catch { /* stats are nice-to-have */ }
    }
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
  if (isDetailsView) {
    renderDetails();
  } else {
    renderDashboard();
  }
}

// ---------------------------------------------------------------------------
// DASHBOARD VIEW — my complaints + supported issues (the citizen's "Home")
// ---------------------------------------------------------------------------
function renderDashboard() {
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
  return supportsHtml();
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

function bindTab() {
  root.querySelectorAll('.js-remove').forEach((b) => b.addEventListener('click', () => removeSupport(b.dataset.id)));
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

// ---------------------------------------------------------------------------
// DETAILS VIEW — "My Account": profile, stats, edit name, delete account
// ---------------------------------------------------------------------------
function renderDetails() {
  const u = state.user || {};
  const s = state.stats || {};
  const provider = u.auth_provider === 'google' ? t('account_provider_google') : t('account_provider_password');

  // Status breakdown chips
  const statusBreakdown = s.by_status && Object.keys(s.by_status).length > 0
    ? Object.entries(s.by_status).map(([status, count]) =>
        `<span class="stat-chip stat-chip-${esc(status)}">${esc(tv('statuses', status))}: ${count}</span>`
      ).join('')
    : `<span class="muted small">${esc(t('account_no_complaints_yet'))}</span>`;

  root.innerHTML = `
    <div class="account-head">
      <h1>${esc(t('account_details_title'))}</h1>
      <a href="/account.html" class="btn btn-secondary">${esc(t('account_back_dashboard'))}</a>
    </div>

    <!-- Profile card -->
    <section class="card details-card">
      <div class="details-profile">
        <div class="details-avatar">${esc((u.name || u.email || '?').charAt(0).toUpperCase())}</div>
        <div class="details-profile-info">
          <h2>${esc(u.name || t('account_no_name'))}</h2>
          <p class="muted lat" lang="en">${esc(u.email || '')}</p>
          <span class="details-provider">${esc(provider)}</span>
        </div>
      </div>
      <dl class="kv details-kv">
        <dt>${esc(t('account_member_since', { date: '' }).replace(/\s*$/, ''))}</dt>
        <dd class="small">${fmtDateTime(u.created_at)}</dd>
        <dt>${esc(t('account_user_id'))}</dt>
        <dd class="mono small" lang="en">${esc(u.id || '')}</dd>
      </dl>
    </section>

    <!-- Stats grid -->
    <section class="details-stats-section">
      <h3 class="details-section-title">${esc(t('account_stats_title'))}</h3>
      <div class="details-stats-grid">
        <div class="stat-card">
          <div class="stat-card-icon">${icon('file')}</div>
          <div class="stat-card-value">${s.total_complaints ?? 0}</div>
          <div class="stat-card-label">${esc(t('account_stat_complaints'))}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon">${icon('other')}</div>
          <div class="stat-card-value">${s.total_supports ?? 0}</div>
          <div class="stat-card-label">${esc(t('account_stat_supports'))}</div>
        </div>
        <div class="stat-card">
          <div class="stat-card-icon">${icon('inbox')}</div>
          <div class="stat-card-value">${s.total_comments ?? 0}</div>
          <div class="stat-card-label">${esc(t('account_stat_comments'))}</div>
        </div>
        <div class="stat-card stat-card-highlight">
          <div class="stat-card-icon">${icon('check')}</div>
          <div class="stat-card-value">${s.resolution_rate ?? 0}%</div>
          <div class="stat-card-label">${esc(t('account_stat_resolution'))}</div>
        </div>
      </div>
      <div class="stat-breakdown">${statusBreakdown}</div>
    </section>

    <!-- Edit name -->
    <section class="card details-card">
      <h3 class="details-section-title">${esc(t('account_edit_name'))}</h3>
      <form id="nameForm" novalidate>
        <div class="field">
          <label for="displayName">${esc(t('account_name_l'))}</label>
          <input id="displayName" class="control" type="text" maxlength="80" value="${esc(u.name || '')}">
          <div class="field-error" id="nameError" hidden></div>
        </div>
        <button type="submit" class="btn btn-primary" id="saveBtn">${esc(t('account_save'))}</button>
      </form>
    </section>

    <!-- Danger zone -->
    <section class="card details-danger-zone">
      <h3 class="details-section-title danger">${esc(t('account_danger_title'))}</h3>
      <p class="muted small" style="margin-bottom: var(--s5)">${esc(t('account_danger_desc'))}</p>
      <button type="button" class="btn btn-danger" id="deleteBtn">${esc(t('account_delete_btn'))}</button>
    </section>

    <!-- Logout -->
    <div class="details-logout">
      <button type="button" class="btn btn-secondary" id="logoutBtn">${esc(t('account_logout'))}</button>
    </div>

    <!-- Delete confirmation modal -->
    <div class="modal-overlay" id="deleteModal" hidden>
      <div class="modal-box">
        <h3>${esc(t('account_delete_confirm_title'))}</h3>
        <p class="muted">${esc(t('account_delete_confirm_desc'))}</p>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" id="cancelDeleteBtn">${esc(t('account_delete_cancel'))}</button>
          <button type="button" class="btn btn-danger" id="confirmDeleteBtn">${esc(t('account_delete_confirm'))}</button>
        </div>
      </div>
    </div>`;

  // Bind events
  const form = document.getElementById('nameForm');
  if (form) form.addEventListener('submit', saveName);
  document.getElementById('logoutBtn').addEventListener('click', logout);
  document.getElementById('deleteBtn').addEventListener('click', () => {
    document.getElementById('deleteModal').hidden = false;
  });
  document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
    document.getElementById('deleteModal').hidden = true;
  });
  document.getElementById('confirmDeleteBtn').addEventListener('click', deleteAccount);
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

async function deleteAccount() {
  const btn = document.getElementById('confirmDeleteBtn');
  btn.disabled = true;
  btn.textContent = t('account_deleting');
  try {
    await api('/api/auth/me', { method: 'DELETE', auth: 'citizen' });
    clearCitizenSession();
    toast(t('account_deleted'));
    location.href = '/';
  } catch (err) {
    if (err.status === 401) {
      clearCitizenSession();
      location.href = '/signin.html';
      return;
    }
    toast(err.message, 'error');
    btn.disabled = false;
    btn.textContent = t('account_delete_confirm');
    document.getElementById('deleteModal').hidden = true;
  }
}

async function logout() {
  try { await api('/api/auth/logout', { method: 'POST', auth: 'citizen' }); } catch { /* session already gone */ }
  clearCitizenSession();
  location.href = '/';
}

loadAll();
