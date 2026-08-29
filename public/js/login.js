import { api } from './shared.js';

const form = document.getElementById('loginForm');
const errBox = document.getElementById('loginError');
const btn = document.getElementById('loginBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errBox.hidden = true;
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errBox.textContent = 'Please enter a valid email address.';
    errBox.hidden = false;
    return;
  }
  
  if (!password) {
    errBox.textContent = 'Please enter your password.';
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
    errBox.textContent = err.message === 'Failed to fetch' ? 'Unable to connect to the server. Please try again.' : err.message;
    errBox.hidden = false;
    btn.disabled = false;
    btn.innerHTML = 'Sign In &rarr;';
  }
});
