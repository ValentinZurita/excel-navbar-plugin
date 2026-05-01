/**
 * Sheet Navigator — Landing Page Scripts
 * Dark mode + install platform selector.
 */

(function () {
  'use strict';

  function initThemeToggle() {
    const btn = document.getElementById('theme-toggle');
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const applySystemTheme = () => {
      document.documentElement.setAttribute('data-theme', media.matches ? 'dark' : 'light');
    };

    // Initial OS theme sync
    applySystemTheme();

    // React to OS theme changes automatically
    media.addEventListener('change', applySystemTheme);

    if (!btn) return;

    // Manual toggle (session-only). Next OS theme change will re-sync.
    btn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
    });
  }

  function initInstallSelector() {
    const buttons = Array.from(document.querySelectorAll('.install-platform-btn'));
    const panels = Array.from(document.querySelectorAll('.install-panel'));
    if (!buttons.length || !panels.length) return;

    const activate = (target) => {
      if (!target) return;

      buttons.forEach((button) => {
        const isActive = button.dataset.installTarget === target;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-selected', String(isActive));
        button.setAttribute('tabindex', isActive ? '0' : '-1');
      });

      panels.forEach((panel) => {
        const isActive = panel.dataset.installTarget === target;
        panel.classList.toggle('is-active', isActive);
        panel.hidden = !isActive;
      });
    };

    buttons.forEach((button, index) => {
      button.addEventListener('click', () => {
        activate(button.dataset.installTarget);
      });

      button.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        event.preventDefault();
        const offset = event.key === 'ArrowRight' ? 1 : -1;
        const nextIndex = (index + offset + buttons.length) % buttons.length;
        const nextButton = buttons[nextIndex];
        nextButton.focus();
        activate(nextButton.dataset.installTarget);
      });
    });

    const activeButton =
      buttons.find((button) => button.classList.contains('is-active')) || buttons[0];
    activate(activeButton.dataset.installTarget);
  }

  function initShortcutsSelector() {
    const buttons = Array.from(document.querySelectorAll('.shortcuts-platform-btn'));
    const panels = Array.from(document.querySelectorAll('.shortcuts-panel'));
    if (!buttons.length || !panels.length) return;

    const activate = (target) => {
      if (!target) return;

      buttons.forEach((button) => {
        const isActive = button.dataset.shortcutsTarget === target;
        button.classList.toggle('is-active', isActive);
        button.setAttribute('aria-selected', String(isActive));
        button.setAttribute('tabindex', isActive ? '0' : '-1');
      });

      panels.forEach((panel) => {
        const isActive = panel.dataset.shortcutsTarget === target;
        panel.classList.toggle('is-active', isActive);
        panel.hidden = !isActive;
      });
    };

    buttons.forEach((button, index) => {
      button.addEventListener('click', () => {
        activate(button.dataset.shortcutsTarget);
      });

      button.addEventListener('keydown', (event) => {
        if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
        event.preventDefault();
        const offset = event.key === 'ArrowRight' ? 1 : -1;
        const nextIndex = (index + offset + buttons.length) % buttons.length;
        const nextButton = buttons[nextIndex];
        nextButton.focus();
        activate(nextButton.dataset.shortcutsTarget);
      });
    });

    const activeButton =
      buttons.find((button) => button.classList.contains('is-active')) || buttons[0];
    activate(activeButton.dataset.shortcutsTarget);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initInstallSelector();
    initShortcutsSelector();
  });
})();
