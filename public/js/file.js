// Intake (S2): describe the problem. Draft autosaved locally (offline safety),
// staged progress messages during classification, error-summary validation.

import { initLang, t } from './i18n.js';
import { api, bindLangToggle, citySelect, initOfflineBanner, mountIcons } from './shared.js';

initLang();
bindLangToggle(() => updateSubmit());
mountIcons();
initOfflineBanner();

const DRAFT_KEY = 'dk_draft';
const form = document.getElementById('fileForm');
const rawText = document.getElementById('rawText');
const areaInput = document.getElementById('areaInput');
const submitBtn = document.getElementById('submitBtn');
const submitHint = document.getElementById('submitHint');
const rawCount = document.getElementById('rawCount');
const rawError = document.getElementById('rawError');
const cityError = document.getElementById('cityError');
const unsupportedNote = document.getElementById('unsupportedNote');
const errorSummary = document.getElementById('errorSummary');
const errorList = document.getElementById('errorList');
const progressPanel = document.getElementById('progressPanel');
const progressMsg = document.getElementById('progressMsg');

const city = citySelect(document.getElementById('cityBox'), { onChange: () => {
  unsupportedNote.hidden = !city.state.other;
  updateSubmit();
}});

// restore locally saved draft (nothing typed is ever lost)
try {
  const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
  if (saved) {
    rawText.value = saved.raw_text || '';
    areaInput.value = saved.area || '';
  }
} catch {}

function saveDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ raw_text: rawText.value, area: areaInput.value }));
}

function updateSubmit() {
  const ok = rawText.value.trim().length >= 20 && city.state.value && !city.state.other;
  submitBtn.disabled = !ok;
  submitHint.style.display = ok ? 'none' : 'block';
  const n = 20 - rawText.value.trim().length;
  if (n > 0) rawCount.textContent = `${n} ${t('char_left')}`;
  else rawCount.textContent = '';
}

rawText.addEventListener('input', () => { saveDraft(); updateSubmit(); rawError.hidden = true; });
areaInput.addEventListener('input', saveDraft);
updateSubmit();

function showErrors(message, fieldErrors) {
  errorList.innerHTML = '';
  const items = [];
  if (fieldErrors?.raw_text) {
    items.push([fieldErrors.raw_text, rawText, rawError]);
  }
  if (fieldErrors?.city) {
    items.push([fieldErrors.city, null, cityError]);
  }
  if (!items.length && message) {
    const li = document.createElement('li');
    li.textContent = message;
    errorList.appendChild(li);
  }
  for (const [msg, focusEl, errEl] of items) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#';
    a.textContent = msg;
    a.addEventListener('click', (e) => { e.preventDefault(); (focusEl || document.getElementById('cityBox')).focus(); });
    li.appendChild(a);
    errorList.appendChild(li);
    if (errEl) { errEl.textContent = msg; errEl.hidden = false; }
    if (focusEl) focusEl.setAttribute('aria-invalid', 'true');
  }
  errorSummary.hidden = false;
  errorSummary.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (fieldErrors?.city) city.setError(fieldErrors.city);
}

let progressTimer = null;
function startProgress() {
  form.closest('section').hidden = true;
  errorSummary.hidden = true;
  progressPanel.hidden = false;
  const msgs = [t('loading1'), t('loading2'), t('loading3')];
  let i = 0;
  progressMsg.textContent = msgs[0];
  progressTimer = setInterval(() => { i = Math.min(i + 1, msgs.length - 1); progressMsg.textContent = msgs[i]; }, 2600);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function stopProgress() {
  clearInterval(progressTimer);
  progressPanel.hidden = true;
  document.getElementById('fileSection').hidden = false;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (city.state.other || !city.state.value) { showErrors(null, { city: t('city_label') + '?' }); return; }

  startProgress();
  try {
    const data = await api('/api/complaints', {
      method: 'POST',
      body: JSON.stringify({ raw_text: rawText.value.trim(), city: city.state.value, area: areaInput.value.trim() }),
    });
    localStorage.removeItem(DRAFT_KEY);
    location.href = `/review.html?id=${encodeURIComponent(data.complaint.id)}`;
  } catch (err) {
    stopProgress();
    showErrors(err.message, err.field_errors);
  }
});
