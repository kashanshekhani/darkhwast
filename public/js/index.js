import { initLang, t } from './i18n.js';
import { bindLangToggle, mountIcons } from './shared.js';

initLang();
bindLangToggle();
mountIcons();

document.getElementById('trackForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('tidInput');
  const err = document.getElementById('tidError');
  const tid = input.value.trim().toUpperCase();
  if (!/^DK-2026-[A-Z0-9]{4,10}$/.test(tid)) {
    err.hidden = false;
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    return;
  }
  location.href = `/track.html?tid=${encodeURIComponent(tid)}`;
});
