// Public tracking page (S5): read-only status stepper, zero PII.

import { initLang, t, tv } from './i18n.js';
import { api, bindLangToggle, esc, fmtDateTime, icon, mountIcons, qs } from './shared.js';

initLang();
bindLangToggle(() => state && render(state));

const root = document.getElementById('trackRoot');
let state = null;
let evtSource = null;

const ORDER = ['sent', 'acknowledged', 'in_progress', 'resolved'];

function connectSSE() {
  const tid = (qs('tid') || '').toUpperCase().trim();
  if (!tid) return;
  evtSource = new EventSource(`/api/track/${encodeURIComponent(tid)}/events`);
  evtSource.addEventListener('message', (e) => {
    const evt = JSON.parse(e.data);
    if (evt.type === 'complaint:updated') {
      load();  // re-fetch and re-render the tracking page
    }
  });
  evtSource.onerror = () => console.warn('[sse] reconnecting...');
}

async function load() {
  const tid = (qs('tid') || '').toUpperCase().trim();
  if (!tid) { location.href = '/'; return; }
  try {
    const data = await api(`/api/track/${encodeURIComponent(tid)}`);
    state = data.complaint;
    render(state);
    if (!evtSource) connectSSE();
  } catch (e) {
    root.innerHTML = `
      <div class="empty-state">
        ${icon('inbox')}
        <h2>${t('invalid_title')}</h2>
        <p class="muted">${t('invalid_help')}</p>
        <a class="btn btn-secondary" href="/">${t('back_home')}</a>
      </div>`;
    mountIcons(root);
  }
}

function render(c) {
  const failed = c.status === 'send_failed';
  const rejected = c.status === 'rejected';
  const idx = ORDER.indexOf(c.status);
  // send_failed never reached "sent": only the "filed" step is done, and the
  // current step is a distinct "send pending" marker (not "sent to department").
  const reached = failed ? 0 : (rejected ? 4 : (idx === -1 ? 1 : idx + 1));

  // latest event note per target status
  const noteFor = (status) => {
    const ev = [...c.events].reverse().find((e) => e.to_status === status);
    return ev ? { note: ev.note, at: ev.at } : null;
  };
  const whenFor = (key, fallbackIso) => {
    if (key === 'filed') return c.created_at;
    if (key === 'sent') return c.sent_at || noteFor('sent')?.at || fallbackIso;
    return noteFor(key)?.at || null;
  };

  const steps = [
    { key: 'filed', label: tv('steps', 'filed'), note: null, iso: c.created_at },
    { key: 'sent', label: failed ? t('pending') : tv('steps', 'sent'), note: noteFor('sent')?.note, iso: whenFor('sent') },
    { key: 'acknowledged', label: tv('steps', 'acknowledged'), note: noteFor('acknowledged')?.note, iso: noteFor('acknowledged')?.at },
    { key: 'in_progress', label: tv('steps', 'in_progress'), note: noteFor('in_progress')?.note, iso: noteFor('in_progress')?.at },
    { key: 'resolved', label: rejected ? tv('statuses', 'rejected') : tv('steps', 'resolved'), note: noteFor('resolved')?.note || noteFor('rejected')?.note, iso: noteFor('resolved')?.at || noteFor('rejected')?.at || c.resolved_at },
  ];

  const lastEvent = c.events[c.events.length - 1];

  root.innerHTML = `
    <p class="progress-label">${t('track_title')}</p>
    <div class="spread" style="margin-bottom:16px">
      <h1 class="mono" style="font-size:20px; margin:0; direction:ltr" lang="en">${esc(c.tracking_id)}</h1>
      <span class="status-chip ${esc(c.status)}"><span class="dot"></span>${tv('statuses', c.status)}</span>
    </div>

    ${failed ? `<div class="banner banner-warn">${icon('alert')}<div>${t('pending')}</div></div>` : ''}

    <section class="card">
      <ol class="stepper">
        ${steps.map((s, i) => {
          const stateCls = i < reached ? 'done' : i === reached ? 'current' : 'future';
          const when = whenFor(s.key, s.iso);
          return `
          <li class="${stateCls}" ${i === reached && !failed ? 'aria-current="step"' : ''}>
            <span class="mark">${i < reached ? icon('check') : ''}</span>
            <div class="st-title">${s.label}</div>
            ${when && i <= reached ? `<div class="st-when lat" lang="en">${fmtDateTime(when)}</div>` : ''}
            ${s.note && i <= reached ? `<div class="st-note">${esc(s.note)}</div>` : ''}
          </li>`;
        }).join('')}
      </ol>
    </section>

    <section class="card">
      <dl class="kv">
        <dt>${t('dept_l')}</dt><dd class="lat" lang="en">${esc(c.department?.name || '-')}</dd>
        <dt>${t('loc_l')}</dt><dd>${esc(c.area ? c.area + ', ' : '')}${esc(tv('cities', c.city))}</dd>
        <dt>${t('filed_l')}</dt><dd class="small">${fmtDateTime(c.created_at)}</dd>
      </dl>
    </section>

    <section class="card">
      <h3>${t('summary_ur')}</h3>
      <p lang="ur" style="margin:0">${esc(c.summary_ur)}</p>
      <p class="small muted lat" lang="en" style="margin-top:10px; margin-bottom:0">${esc(c.summary_en)}</p>
    </section>

    <p class="small muted">${t('last_updated')}: ${lastEvent ? fmtDateTime(lastEvent.at) : '-'}</p>`;

  mountIcons(root);
}

load();
