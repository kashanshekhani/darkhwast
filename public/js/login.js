import { api } from './shared.js';

const form = document.getElementById('loginForm');
const errBox = document.getElementById('loginError');
const btn = document.getElementById('loginBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errBox.hidden = true;
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email || !password) {
    errBox.textContent = 'Enter your email and password.';
    errBox.hidden = false;
    return;
  }
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span>Signing in...';
  try {
    const data = await api('/api/official/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    sessionStorage.setItem('dk_token', data.token);
    sessionStorage.setItem('dk_official', JSON.stringify(data.official));
    location.href = '/dashboard.html';
  } catch (err) {
    errBox.textContent = err.message;
    errBox.hidden = false;
    btn.disabled = false;
    btn.textContent = 'Sign in';
  }
});
