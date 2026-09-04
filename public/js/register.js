// Citizen registration: name/email/password/confirm with inline field errors.
// Mirrors signin.js — success stores the citizen token under `dk_user_token`
// (separate from the government portal's `dk_token`).

import { initLang, t, lang } from './i18n.js';
import { api, bindLangToggle, mountCommunityNav, setCitizenSession, qs } from './shared.js';

initLang();
mountCommunityNav();
bindLangToggle();

const errBox = document.getElementById('authError');
const form = document.getElementById('registerForm');
const btn = document.getElementById('registerBtn');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmInput = document.getElementById('confirm');
const fieldErrors = {
  name: document.getElementById('nameError'),
  email: document.getElementById('emailError'),
  password: document.getElementById('passwordError'),
  confirm: document.getElementById('confirmError'),
};
const inputs = { name: nameInput, email: emailInput, password: passwordInput, confirm: confirmInput };

// only same-site path redirects (never external URLs)
const nextUrl = () => {
  const n = qs('next');
  return n && n.startsWith('/') && !n.startsWith('//') ? n : '/account.html';
};

function showBanner(msg) {
  errBox.textContent = msg;
  errBox.hidden = false;
}

function clearFieldErrors() {
  for (const el of Object.values(fieldErrors)) el.hidden = true;
  for (const el of Object.values(inputs)) el.removeAttribute('aria-invalid');
}

function fieldError(key, msg) {
  fieldErrors[key].textContent = msg;
  fieldErrors[key].hidden = false;
  inputs[key].setAttribute('aria-invalid', 'true');
}

const ur = (en, urText) => (lang() === 'ur' ? urText : en);

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
  } catch { /* meta fetch failed — stay hidden, email registration still works */ }
})();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errBox.hidden = true;
  clearFieldErrors();

  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  const confirm = confirmInput.value;

  let valid = true;
  if (name.length < 2 || name.length > 80) {
    fieldError('name', ur('Please enter your full name (2-80 characters).', 'براہ کرم اپنا مکمل نام لکھیں (2 تا 80 حروف)۔'));
    valid = false;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    fieldError('email', ur('Please enter a valid email address.', 'براہ کرم درست ای میل لکھیں۔'));
    valid = false;
  }
  if (password.length < 8) {
    fieldError('password', ur('Password must be at least 8 characters.', 'پاس ورڈ کم از کم 8 حروف کا ہونا چاہیے۔'));
    valid = false;
  }
  if (confirm !== password || !confirm) {
    fieldError('confirm', ur('Passwords do not match.', 'پاس ورڈ ایک جیسے نہیں ہیں۔'));
    valid = false;
  }
  if (!valid) return;

  btn.disabled = true;
  const original = btn.textContent;
  btn.textContent = t('register_busy');
  try {
    const data = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, confirm }),
    });
    setCitizenSession(data.token, data.user);
    location.href = nextUrl();
  } catch (err) {
    showBanner(err.message === 'Failed to fetch'
      ? ur('Unable to connect to the server. Please try again.', 'سرور سے رابطہ نہیں ہو سکا۔ دوبارہ کوشش کریں۔')
      : err.message);
    // server-side per-field messages win over the generic banner
    if (err.field_errors) {
      for (const [key, msg] of Object.entries(err.field_errors)) {
        if (fieldErrors[key]) fieldError(key, msg);
      }
    }
    btn.disabled = false;
    btn.textContent = original;
  }
});
