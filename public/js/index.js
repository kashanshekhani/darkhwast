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

// hide the error again as soon as the citizen edits the ID
document.getElementById('tidInput').addEventListener('input', () => {
  document.getElementById('tidError').hidden = true;
  document.getElementById('tidInput').removeAttribute('aria-invalid');
});

// close the mobile menu after choosing a destination
const mobileMenu = document.getElementById('mobileMenu');
mobileMenu?.querySelectorAll('a').forEach((a) => {
  a.addEventListener('click', () => {
    mobileMenu.hidden = true;
    document.getElementById('hamburgerBtn')?.setAttribute('aria-expanded', 'false');
  });
});

// subtle entrance animation; CSS disables it under prefers-reduced-motion
const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('in'));
}
