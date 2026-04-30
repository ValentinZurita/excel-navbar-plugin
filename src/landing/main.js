/**
 * Sheet Navigator — Landing Page Scripts
 * Dark mode toggle only. No auto-animations.
 */

(function () {
  'use strict';

  const THEME_KEY = 'sn-theme';

  function initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;

    // Restore saved preference or detect system
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem(THEME_KEY, next);
    });
  }

  document.addEventListener('DOMContentLoaded', initThemeToggle);
})();
