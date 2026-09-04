// Community issues feed: search + filters (facet-driven) + sort, responsive
// card grid, load-more pagination. Public data only — the API never returns
// private complaints or PII.

import { initLang, t, tv } from './i18n.js';
import {
  api, bindLangToggle, esc, icon, mountIcons, statusPill, timeAgo,
  mountCommunityNav, CATEGORY_ICON,
} from './shared.js';

initLang();
mountCommunityNav('community');
mountIcons();

const grid = document.getElementById('issueGrid');
const errBox = document.getElementById('feedError');
const countEl = document.getElementById('resultsCount');
const loadMoreWrap = document.getElementById('loadMoreWrap');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const cityFilter = document.getElementById('cityFilter');
const catFilter = document.getElementById('catFilter');
const statusFilter = document.getElementById('statusFilter');
const deptFilter = document.getElementById('deptFilter');
const areaFilter = document.getElementById('areaFilter');
const clearBtn = document.getElementById('clearFilters');
const filterToggle = document.getElementById('filterToggle');
const filterbar = document.getElementById('filterbar');
const catChipsBar = document.getElementById('catChipsBar');

// All categories for the quick-filter chips (always visible, even if empty)
const ALL_CATEGORIES = ['garbage', 'streetlight', 'water', 'sewage', 'road', 'other'];

const PUBLIC_STATUSES = ['pending_approval', 'sent', 'send_failed', 'acknowledged', 'in_progress', 'resolved', 'rejected'];

const state = {
  q: '', city: '', category: '', status: '', dept: '', area: '', sort: 'newest',
  page: 1, total: -1, items: [],
  facets: { cities: [], categories: [], departments: [] },
};

// initial state from the URL so other pages can link pre-filtered
const params = new URLSearchParams(location.search);
state.q = params.get('q') || '';
state.city = params.get('city') || '';
state.category = params.get('category') || '';
state.status = PUBLIC_STATUSES.includes(params.get('status')) ? params.get('status') : '';
state.dept = params.get('dept') || '';
state.area = params.get('area') || '';
state.sort = params.get('sort') || 'newest';
searchInput.value = state.q;
areaFilter.value = state.area;
sortSelect.value = state.sort;

bindLangToggle(() => {
  renderFilterOptions();
  updateFilterToggle();
  renderFeed();
});

function updateFilterToggle() {
  filterToggle.setAttribute('aria-expanded', String(!filterbar.hidden));
  filterToggle.textContent = filterbar.hidden ? t('community_filters_open') : t('community_filters_close');
}

filterToggle.addEventListener('click', () => {
  filterbar.hidden = !filterbar.hidden;
  updateFilterToggle();
});

// facet-driven filter selects (city/category/department exist in the feed;
// statuses are the fixed public lifecycle)
function fillSelect(sel, value, options) {
  sel.innerHTML = options.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
  if (options.some((o) => o.value === value)) sel.value = value;
}

function renderFilterOptions() {
  const f = state.facets;
  fillSelect(cityFilter, state.city, [
    { value: '', label: t('community_all_cities') },
    ...[...f.cities].sort().map((c) => ({ value: c, label: tv('cities', c) })),
  ]);
  fillSelect(catFilter, state.category, [
    { value: '', label: t('community_all_cats') },
    ...[...f.categories].sort().map((c) => ({ value: c, label: tv('categories', c) })),
  ]);
  fillSelect(statusFilter, state.status, [
    { value: '', label: t('community_all_statuses') },
    ...PUBLIC_STATUSES.map((s) => ({ value: s, label: tv('statuses', s) })),
  ]);
  fillSelect(deptFilter, state.dept, [
    { value: '', label: t('community_all_depts') },
    ...[...f.departments].sort((a, b) => a.name.localeCompare(b.name)).map((d) => ({ value: d.id, label: d.name })),
  ]);
  renderCatChips();
}

// Quick-filter category chips — always visible at the top of the page
function renderCatChips() {
  const activeCat = state.category;
  const chips = [
    { value: '', label: t('community_all_cats'), icon: 'inbox' },
    ...ALL_CATEGORIES.map((c) => ({ value: c, label: tv('categories', c), icon: CATEGORY_ICON[c] || 'other' })),
  ];
  catChipsBar.innerHTML = chips.map((ch) => `
    <button type="button" class="cat-chip-btn ${ch.value === activeCat ? 'active' : ''}" data-cat="${esc(ch.value)}" aria-pressed="${ch.value === activeCat}">
      ${icon(ch.icon)}<span>${esc(ch.label)}</span>
    </button>`).join('');
  mountIcons(catChipsBar);
  catChipsBar.querySelectorAll('.cat-chip-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.category = btn.dataset.cat;
      catFilter.value = state.category; // keep dropdown in sync
      reload();
    });
  });
}

let searchTimer = null;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.q = searchInput.value.trim();
    reload();
  }, 350);
});

sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; reload(); });
cityFilter.addEventListener('change', () => { state.city = cityFilter.value; reload(); });
catFilter.addEventListener('change', () => { state.category = catFilter.value; reload(); });
statusFilter.addEventListener('change', () => { state.status = statusFilter.value; reload(); });
deptFilter.addEventListener('change', () => { state.dept = deptFilter.value; reload(); });
areaFilter.addEventListener('change', () => { state.area = areaFilter.value.trim(); reload(); });

clearBtn.addEventListener('click', () => {
  state.q = ''; state.city = ''; state.category = ''; state.status = ''; state.dept = ''; state.area = '';
  searchInput.value = ''; areaFilter.value = '';
  renderFilterOptions(); // also re-renders cat chips
  history.replaceState(null, '', '/community.html');
  reload();
});

function reload() {
  state.page = 1;
  load(false);
}

loadMoreBtn.addEventListener('click', () => {
  state.page += 1;
  load(true);
});

async function load(append) {
  errBox.hidden = true;
  loadMoreBtn.disabled = true;
  loadMoreBtn.textContent = t('community_loading');
  try {
    const p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.city) p.set('city', state.city);
    if (state.area) p.set('area', state.area);
    if (state.category) p.set('category', state.category);
    if (state.status) p.set('status', state.status);
    if (state.dept) p.set('dept', state.dept);
    p.set('sort', state.sort);
    p.set('page', String(state.page));
    const data = await api(`/api/community/issues?${p.toString()}`);
    state.total = data.total;
    state.facets = data.facets;
    state.items = append ? state.items.concat(data.items) : data.items;
    renderFilterOptions();
    renderFeed();
  } catch (e) {
    errBox.textContent = e.message;
    errBox.hidden = false;
    if (!append) { state.items = []; state.total = 0; renderFeed(); }
  } finally {
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = t('community_load_more');
  }
}

function cardHtml(c) {
  const loc = c.area ? `${tv('cities', c.city)}, ${c.area}` : tv('cities', c.city);
  const catIcon = CATEGORY_ICON[c.category] || 'other';
  return `
    <a class="issue-card" href="/issue.html?id=${encodeURIComponent(c.id)}">
      <div class="issue-card-media">
        ${c.images?.length ? `<img src="${esc(c.images[0])}" alt="" loading="lazy">` : ''}
        <div class="media-fallback">${icon(catIcon)}</div>
        ${c.is_sample ? `<span class="sample-badge">${esc(t('issue_sample_tag'))}</span>` : ''}
        ${c.images?.length > 1 ? `<span class="count-badge">${icon('photo')}${c.images.length}</span>` : ''}
      </div>
      <div class="issue-card-body">
        <h3 class="issue-card-title">${esc(c.title || '')}</h3>
        <p class="issue-card-desc">${esc(c.description || '')}</p>
        <div class="issue-card-loc">${icon('pin')}<span>${esc(loc)}</span></div>
        <div class="issue-card-meta">
          <span class="cat-chip">${icon(catIcon)}${esc(tv('categories', c.category))}</span>
          <span class="dept-note">${esc(c.department?.name || t('dept_pending'))}</span>
          ${statusPill(c.status)}
        </div>
      </div>
      <div class="issue-card-foot">
        <span class="eng">
          <span>${icon('support')}${c.support_count}</span>
          <span>${icon('comment')}${c.comment_count}</span>
        </span>
        <span>${timeAgo(c.created_at)}</span>
      </div>
    </a>`;
}

function renderFeed() {
  if (!state.items.length) {
    grid.innerHTML = `
      <div class="feed-empty">
        ${icon('search')}
        <h3>${esc(t('community_empty_t'))}</h3>
        <p>${esc(t('community_empty_sub'))}</p>
      </div>`;
  } else {
    grid.innerHTML = state.items.map(cardHtml).join('');
    // broken image → remove so the category fallback underneath shows through
    grid.querySelectorAll('img').forEach((img) => {
      img.addEventListener('error', () => img.remove(), { once: true });
    });
  }
  countEl.textContent = t('community_results', { n: Math.max(0, state.total) });
  loadMoreWrap.hidden = state.items.length >= Math.max(0, state.total);
}

updateFilterToggle();
load(false);
