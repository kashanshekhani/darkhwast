// Intake (S2): describe the problem. Draft autosaved locally (offline safety),
// staged progress messages during classification, error-summary validation.

import { initLang, t } from './i18n.js';
import { api, bindLangToggle, citySelect, initOfflineBanner, mountIcons, isPhoneLike, isEmailLike, icon } from './shared.js';

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

const micBtnWrap = document.getElementById('micBtnWrap');
const micBtn = document.getElementById('micBtn');
const micLabel = document.getElementById('micLabel');
const imageInput = document.getElementById('imageInput');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const imageError = document.getElementById('imageError');
const gpsBtn = document.getElementById('gpsBtn');
const locationInput = document.getElementById('locationInput');
const idEmail = document.getElementById('idEmail');
const idPhone = document.getElementById('idPhone');
const emailError = document.getElementById('emailError');
const phoneError = document.getElementById('phoneError');
const anonCheck = document.getElementById('anonCheck');
const gpsStatus = document.getElementById('gpsStatus');
const dropzone = document.getElementById('dropzone');

let selectedImages = [];
let detectedLat = null;
let detectedLng = null;

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

// ---------------------------------------------------------------------------
// Voice input — a single recognition instance; the textarea is always rebuilt
// as: existing text + committed finals + current interim. The transcript is
// NEVER appended on each onresult event (that duplicated every word, because
// the browser refires onresult while the result grows in place).
// ---------------------------------------------------------------------------
const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;      // the one instance, or null when unsupported
let recognizing = false;
let discardResults = false;  // user typed mid-dictation: ignore trailing results
let voiceBase = '';          // textarea content when this session started
let voiceFinal = '';         // committed final transcript (this session)
let voiceInterim = '';       // live interim transcript (replaced, not appended)

if (SpeechRec && micBtnWrap) {
  micBtnWrap.hidden = false;
  recognition = new SpeechRec();
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = () => {
    recognizing = true;
    micBtn.classList.add('recording');
    micBtn.setAttribute('aria-label', t('mic_stop'));
    if (micLabel) micLabel.textContent = t('mic_listening');
  };

  recognition.onend = () => {
    recognizing = false;
    discardResults = false;
    micBtn.classList.remove('recording');
    micBtn.setAttribute('aria-label', t('mic_aria'));
    if (micLabel) micLabel.textContent = t('mic_label');
    saveDraft();
    updateSubmit();
  };

  recognition.onerror = (e) => {
    recognizing = false;
    micBtn.classList.remove('recording');
    micBtn.setAttribute('aria-label', t('mic_aria'));
    if (micLabel) micLabel.textContent = (e.error === 'not-allowed' || e.error === 'service-not-allowed') ? t('mic_blocked') : t('mic_label');
  };

  recognition.onresult = (e) => {
    if (discardResults) return;
    // Rebuild from the event's full accumulated results: a result that turns
    // final replaces its interim twin instead of being added twice, and
    // repeated firings of the same growing result never duplicate anything.
    voiceFinal = '';
    voiceInterim = '';
    for (let i = 0; i < e.results.length; i++) {
      if (e.results[i].isFinal) voiceFinal += e.results[i][0].transcript;
      else voiceInterim += e.results[i][0].transcript;
    }
    const speech = `${voiceFinal} ${voiceInterim}`.replace(/\s+/g, ' ').trim();
    rawText.value = speech ? (voiceBase ? `${voiceBase} ${speech}` : speech) : voiceBase;
    updateSubmit();
  };

  micBtn.addEventListener('click', () => {
    if (recognizing) { recognition.stop(); return; }  // toggle off — never a second instance
    voiceBase = rawText.value.trim();
    voiceFinal = '';
    voiceInterim = '';
    discardResults = false;
    recognition.lang = document.documentElement.lang === 'ur' ? 'ur-PK' : 'en-US';
    try { recognition.start(); } catch {} // already running — ignore
  });
}

// ---------------------------------------------------------------------------
// Image previews
// ---------------------------------------------------------------------------
function renderPreviews() {
  imagePreviewContainer.innerHTML = '';
  selectedImages.forEach((imgObj, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'img-thumb-wrap';

    const img = document.createElement('img');
    img.src = imgObj.data;
    img.alt = `Uploaded image ${idx + 1}`;
    img.className = 'img-thumb';

    // X remove button — uses its own CSS class, NOT .btn
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'img-remove-btn';
    removeBtn.setAttribute('aria-label', `Remove image ${idx + 1}`);
    removeBtn.dataset.idx = idx;
    // inline X SVG at exactly 11×11 — never distorted
    removeBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>`;

    wrap.appendChild(img);
    wrap.appendChild(removeBtn);
    imagePreviewContainer.appendChild(wrap);
  });

  imagePreviewContainer.querySelectorAll('.img-remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      selectedImages.splice(Number(e.currentTarget.dataset.idx), 1);
      renderPreviews();
    });
  });
}

function resizeImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width, h = img.height;
        const max = 1200;
        if (w > max || h > max) { if (w > h) { h = Math.round((h * max) / w); w = max; } else { w = Math.round((w * max) / h); h = max; } }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

imageInput.addEventListener('change', async () => {
  imageError.hidden = true;
  const files = Array.from(imageInput.files);
  imageInput.value = '';
  const room = 5 - selectedImages.length;
  if (room <= 0) {
    imageError.textContent = t('img_max');
    imageError.hidden = false;
    return;
  }
  // Add as many as fit; warn (non-blocking) about the rest instead of rejecting all.
  let added = 0;
  for (const f of files) {
    if (added >= room) { imageError.textContent = t('img_max'); imageError.hidden = false; break; }
    if (f.size > 5 * 1024 * 1024) { imageError.textContent = t('img_too_large'); imageError.hidden = false; continue; }
    const base64 = await resizeImage(f);
    selectedImages.push({ name: f.name, data: base64 });
    added++;
  }
  renderPreviews();
});

// ---------------------------------------------------------------------------
// GPS — one-shot position on an explicit click, then reverse geocoding so the
// citizen sees a place name next to the coordinates. If geocoding fails the
// detection still succeeds: coordinates are kept either way.
// ---------------------------------------------------------------------------
const gpsResult = document.getElementById('gpsResult');
const gpsPlaceName = document.getElementById('gpsPlaceName');
const gpsCoords = document.getElementById('gpsCoords');

function reverseGeocode(lat, lng) {
  const lang = document.documentElement.lang === 'ur' ? 'ur' : 'en';
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&accept-language=${lang}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  return fetch(url, { signal: ctrl.signal })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`geocode ${r.status}`))))
    .then((j) => {
      const a = j.address || {};
      // Locality → city → province, deduped, capped to a concise 3 parts.
      const parts = [
        a.neighbourhood || a.suburb || a.quarter || a.city_district || a.town || a.village,
        a.city || a.town || a.county,
        a.state || a.province,
      ];
      const uniq = [];
      for (const p of parts) if (p && !uniq.includes(p)) uniq.push(p);
      return uniq.slice(0, 3).join(', ');
    })
    .finally(() => clearTimeout(timer));
}

gpsBtn.addEventListener('click', () => {
  if (!navigator.geolocation) {
    locationInput.value = t('gps_unsupported');
    if (gpsStatus) { gpsStatus.textContent = t('gps_unsupported'); gpsStatus.className = 'helper'; }
    return;
  }
  gpsBtn.querySelector('span').textContent = t('gps_locating');
  gpsBtn.disabled = true;
  if (gpsResult) gpsResult.hidden = true;
  navigator.geolocation.getCurrentPosition(async (pos) => {
    detectedLat = pos.coords.latitude;
    detectedLng = pos.coords.longitude;
    locationInput.value = `${detectedLat.toFixed(5)}, ${detectedLng.toFixed(5)}`;
    let place = '';
    try { place = await reverseGeocode(detectedLat, detectedLng); } catch { place = ''; }
    if (gpsResult && gpsPlaceName && gpsCoords) {
      gpsPlaceName.textContent = place || t('gps_name_unavailable');
      gpsPlaceName.classList.toggle('gps-no-name', !place);
      gpsCoords.textContent = `${detectedLat.toFixed(5)}, ${detectedLng.toFixed(5)}`;
      gpsResult.hidden = false;
    }
    if (gpsStatus) {
      gpsStatus.textContent = place ? t('gps_ok') : t('gps_area_unknown');
      gpsStatus.className = place ? 'helper gps-status-ok' : 'helper';
    }
    gpsBtn.querySelector('span').textContent = t('gps_use');
    gpsBtn.disabled = false;
  }, () => {
    detectedLat = null;  // failed detection must not submit stale coordinates
    detectedLng = null;
    locationInput.value = t('gps_fail');
    gpsBtn.querySelector('span').textContent = t('gps_use');
    gpsBtn.disabled = false;
    if (gpsStatus) { gpsStatus.textContent = t('gps_retry'); gpsStatus.className = 'helper'; }
  });
});

// ---------------------------------------------------------------------------
// Drag & drop for upload dropzone
// ---------------------------------------------------------------------------
if (dropzone) {
  ['dragenter', 'dragover'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); dropzone.classList.add('drag-over'); });
  });
  ['dragleave', 'drop'].forEach(evt => {
    dropzone.addEventListener(evt, (e) => { e.preventDefault(); e.stopPropagation(); dropzone.classList.remove('drag-over'); });
  });
  dropzone.addEventListener('drop', async (e) => {
    const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'image/jpeg' || f.type === 'image/png');
    if (!files.length) return;
    imageError.hidden = true;
    const room = 5 - selectedImages.length;
    if (room <= 0) {
      imageError.textContent = t('img_max');
      imageError.hidden = false;
      return;
    }
    let added = 0;
    for (const f of files) {
      if (added >= room) { imageError.textContent = t('img_max'); imageError.hidden = false; break; }
      if (f.size > 5 * 1024 * 1024) { imageError.textContent = t('img_too_large'); imageError.hidden = false; continue; }
      const base64 = await resizeImage(f);
      selectedImages.push({ name: f.name, data: base64 });
      added++;
    }
    renderPreviews();
  });
}

// ---------------------------------------------------------------------------
// Submit button state
// ---------------------------------------------------------------------------
function updateSubmit() {
  const ok = rawText.value.trim().length >= 20 && city.state.value && !city.state.other;
  submitBtn.disabled = !ok;
  submitHint.style.display = ok ? 'none' : 'block';
  const n = 20 - rawText.value.trim().length;
  if (n > 0) rawCount.textContent = `${n} ${t('char_left')}`;
  else rawCount.textContent = '';
}

rawText.addEventListener('input', () => {
  // Typing mid-dictation: keep the manual text and drop whatever the mic
  // still had in flight, so a late final can neither duplicate nor clobber it.
  if (recognizing) {
    voiceBase = rawText.value;
    voiceFinal = '';
    voiceInterim = '';
    discardResults = true;
    try { if (recognition) recognition.stop(); } catch {}
  }
  saveDraft(); updateSubmit(); rawError.hidden = true;
});
areaInput.addEventListener('input', saveDraft);
updateSubmit();

// ---------------------------------------------------------------------------
// Error display
// ---------------------------------------------------------------------------
function clearFieldErrors() {
  emailError.hidden = true;
  phoneError.hidden = true;
  rawError.hidden = true;
  cityError.hidden = true;
  idEmail.removeAttribute('aria-invalid');
  idPhone.removeAttribute('aria-invalid');
  rawText.removeAttribute('aria-invalid');
}

function showErrors(message, fieldErrors) {
  clearFieldErrors();
  errorList.innerHTML = '';
  const items = [];

  if (fieldErrors?.raw_text) items.push([fieldErrors.raw_text, rawText, rawError]);
  if (fieldErrors?.city) items.push([fieldErrors.city, null, cityError]);
  if (fieldErrors?.email) {
    emailError.textContent = fieldErrors.email;
    emailError.hidden = false;
    idEmail.setAttribute('aria-invalid', 'true');
    items.push([fieldErrors.email, idEmail, null]);
  }
  if (fieldErrors?.phone) {
    phoneError.textContent = fieldErrors.phone;
    phoneError.hidden = false;
    idPhone.setAttribute('aria-invalid', 'true');
    items.push([fieldErrors.phone, idPhone, null]);
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

  errorSummary.hidden = !errorList.children.length;
  if (!errorSummary.hidden) {
    errorSummary.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  if (fieldErrors?.city) city.setError(fieldErrors.city);
}

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearFieldErrors();

  if (city.state.other || !city.state.value) { showErrors(null, { city: t('city_required') }); return; }

  const email = idEmail.value.trim();
  const phone = idPhone.value.trim();
  const fieldErrors = {};

  // Client-side validation (mirrors server-side, prevents wasted round-trip)
  if (email && !isEmailLike(email)) fieldErrors.email = 'Please enter a valid email address.';
  if (phone && !isPhoneLike(phone)) fieldErrors.phone = 'Please enter a valid phone number (e.g. 0300-1234567).';
  if (Object.keys(fieldErrors).length) { showErrors('Please fix the highlighted fields.', fieldErrors); return; }

  startProgress();
  try {
    const data = await api('/api/complaints', {
      method: 'POST',
      body: JSON.stringify({
        raw_text: rawText.value.trim(),
        city: city.state.value,
        area: areaInput.value.trim(),
        images: selectedImages.map(i => i.data),
        lat: detectedLat,
        lng: detectedLng,
        email,
        phone,
        anonymous: anonCheck ? anonCheck.checked : false,
      }),
    });
    localStorage.removeItem(DRAFT_KEY);
    if (data.images_dropped) {
      // Server dropped oversized decoded images the client's pre-check missed.
      // Surface it before navigating so the citizen isn't surprised on review.
      import('./shared.js').then(({ toast }) => toast(`${data.images_dropped} image(s) were too large and were not attached.`, 'error'));
    }
    location.href = `/review.html?id=${encodeURIComponent(data.complaint.id)}`;
  } catch (err) {
    stopProgress();
    // Only show server/network errors here; field_errors from server override
    if (err.field_errors) {
      showErrors(err.message, err.field_errors);
    } else {
      // True network/server error
      showErrors(err.message || 'A network error occurred. Please check your connection and try again.', null);
    }
  }
});
