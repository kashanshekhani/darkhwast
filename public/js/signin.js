// Citizen sign-in: email/password + Google Sign-In handoff (?google=1&h=...).
// On success the citizen token lives in sessionStorage under `dk_user_token`
// — completely separate from the government portal's `dk_token`.

import { initLang, t, lang } from './i18n.js';
import { api, bindLangToggle, setCitizenSession, citizenUser, qs } from './shared.js';

initLang();
bindLangToggle(() => showGoogleStatus());

const errBox = document.getElementById('authError');
const noteBox = document.getElementById('authNote');
const form = document.getElementById('signinForm');
const btn = document.getElementById('signinBtn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const emailError = document.getElementById('emailError');
const passwordError = document.getElementById('passwordError');

// only same-site path redirects (never external URLs)
const nextUrl = () => {
  const n = qs('next');
  return n && n.startsWith('/') && !n.startsWith('//') ? n : '/account.html';
};

function showBanner(box, msg) {
  box.textContent = msg;
  box.hidden = false;
}

function clearFieldErrors() {
  emailError.hidden = true;
  passwordError.hidden = true;
  emailInput.removeAttribute('aria-invalid');
  passwordInput.removeAttribute('aria-invalid');
}

// Google button only when the server actually has OAuth configured
(async () => {
  try {
    const meta = await api('/api/meta/auth');
    if (meta.google_configured) {
      const gBtn = document.getElementById('googleBtn');
      gBtn.hidden = false;
      document.getElementById('googleDivider').hidden = false;
      gBtn.addEventListener('click', () => {
        location.href = `/auth/google`;
      });
    }
  } catch { /* meta fetch failed — stay hidden, email login still works */ }
})();

// ?google=... result handling: 1&h= → exchange; otherwise a mapped error
let googleStatusKey = null;
async function handleGoogleResult() {
  const g = qs('google');
  const h = qs('h');
  if (!g) return;
  history.replaceState(null, '', '/signin.html');
  if (g === '1' && h) {
    try {
      const data = await api('/api/auth/google/exchange', {
        method: 'POST',
        body: JSON.stringify({ h }),
      });
      setCitizenSession(data.token, data.user);
      location.href = nextUrl();
      return;
    } catch {
      googleStatusKey = 'google_err_expired';
    }
  } else if (['state', 'denied', 'email', 'error', 'unconfigured'].includes(g)) {
    googleStatusKey = `google_err_${g}`;
  } else {
    googleStatusKey = 'google_err_unknown';
  }
  showGoogleStatus();
}

function showGoogleStatus() {
  if (!googleStatusKey) return;
  showBanner(errBox, t(googleStatusKey));
}

// already signed in? gentle note, no forced redirect (avoids loops)
const existing = citizenUser();
if (existing) {
  const strong = document.createElement('strong');
  strong.textContent = `${t('nav_my_account')}: ${existing.name} — `;
  const a = document.createElement('a');
  a.href = '/account.html';
  a.textContent = t('nav_my_account');
  noteBox.replaceChildren(strong, a);
  noteBox.hidden = false;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errBox.hidden = true;
  clearFieldErrors();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  let valid = true;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    emailError.textContent = lang() === 'ur' ? 'براہ کرم درست ای میل لکھیں۔' : 'Please enter a valid email address.';
    emailError.hidden = false;
    emailInput.setAttribute('aria-invalid', 'true');
    valid = false;
  }
  if (!password) {
    passwordError.textContent = lang() === 'ur' ? 'پاس ورڈ لکھیں۔' : 'Please enter your password.';
    passwordError.hidden = false;
    passwordInput.setAttribute('aria-invalid', 'true');
    valid = false;
  }
  if (!valid) return;

  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = t('signin_busy');
  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setCitizenSession(data.token, data.user);
    location.href = nextUrl();
  } catch (err) {
    showBanner(errBox, err.message === 'Failed to fetch'
      ? (lang() === 'ur' ? 'سرور سے رابطہ نہیں ہو سکا۔ دوبارہ کوشش کریں۔' : 'Unable to connect to the server. Please try again.')
      : err.message);
    if (err.field_errors?.email) {
      emailError.textContent = err.field_errors.email;
      emailError.hidden = false;
      emailInput.setAttribute('aria-invalid', 'true');
    }
    if (err.field_errors?.password) {
      passwordError.textContent = err.field_errors.password;
      passwordError.hidden = false;
      passwordInput.setAttribute('aria-invalid', 'true');
    }
    btn.disabled = false;
    btn.textContent = original;
  }
});

handleGoogleResult();
