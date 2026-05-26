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

  function initBentoGifTriggers() {
    const triggers = document.querySelectorAll('.bento-gif-trigger');
    if (!triggers.length) return;

    const triggerStates = new WeakMap();

    // Preload all GIFs so they are decoded and ready before any transition
    triggers.forEach((trigger) => {
      trigger.querySelectorAll('.bento-gif-player').forEach((img) => {
        const src = img.getAttribute('src');
        if (src) {
          const preloadImg = new Image();
          preloadImg.src = src;
        }
      });
    });

    triggers.forEach((trigger) => {
      const delay = parseInt(trigger.dataset.gifDelay, 10) || 500;
      const transitionMs = parseInt(trigger.dataset.gifTransition, 10) || 500;
      const duration = parseInt(trigger.dataset.gifDuration, 10) || 3000;

      trigger.dataset.gifState = 'idle';
      triggerStates.set(trigger, {
        waitTimer: null,
        transitionTimer: null,
        durationTimer: null,
        activePlayer: null,
      });

      const getActivePlayer = () => {
        const theme = document.documentElement.getAttribute('data-theme') || 'light';
        return (
          trigger.querySelector(`.bento-gif-player[data-gif-theme="${theme}"]`) ||
          trigger.querySelector('.bento-gif-player')
        );
      };

      /**
       * Clone-swap restart: prevents the empty-frame flash by working on a
       * detached clone. The visible img is only replaced once the clone's
       * first frame is fully decoded. A unique query param forces the browser
       * to reload the GIF so the animation always starts from frame 0.
       */
      const restartGif = (img, callback) => {
        if (!img) {
          callback(null);
          return;
        }
        const src = img.getAttribute('src');
        if (!src) {
          callback(null);
          return;
        }

        // Bust cache so the GIF restarts from frame 0
        const cacheBustedSrc = src + (src.includes('?') ? '&' : '?') + '_t=' + Date.now();

        let resolved = false;
        const resolve = (clone) => {
          if (resolved) return;
          resolved = true;
          callback(clone);
        };

        const clone = img.cloneNode(true);
        clone.removeAttribute('src');

        const onCloneLoad = () => {
          clone.removeEventListener('load', onCloneLoad);
          img.replaceWith(clone);
          resolve(clone);
        };

        clone.addEventListener('load', onCloneLoad);
        clone.setAttribute('src', cacheBustedSrc);

        // Fallback for cached images where load may not fire
        setTimeout(() => {
          clone.removeEventListener('load', onCloneLoad);
          if (img.parentNode) {
            img.replaceWith(clone);
          }
          resolve(clone);
        }, 200);
      };

      const clearAllTimers = (state) => {
        if (state.waitTimer) {
          clearTimeout(state.waitTimer);
          state.waitTimer = null;
        }
        if (state.transitionTimer) {
          clearTimeout(state.transitionTimer);
          state.transitionTimer = null;
        }
        if (state.durationTimer) {
          clearTimeout(state.durationTimer);
          state.durationTimer = null;
        }
      };

      const startCycle = () => {
        const state = triggerStates.get(trigger);
        if (!state) return;

        // Only start from idle; prevents auto-restart if mouse never left
        if (trigger.dataset.gifState !== 'idle') return;

        clearAllTimers(state);
        state.activePlayer = getActivePlayer();

        if (!state.activePlayer) {
          trigger.dataset.gifState = 'idle';
          return;
        }

        // Mark which theme player is active so CSS only shows the right one
        trigger.dataset.activeGifTheme = state.activePlayer.dataset.gifTheme || '';

        // 1. Waiting phase (mock visible, user waits)
        trigger.dataset.gifState = 'waiting';
        state.waitTimer = setTimeout(() => {
          state.waitTimer = null;

          // 2. Restart GIF via clone swap (no empty-frame flash)
          restartGif(state.activePlayer, (newImg) => {
            if (newImg) {
              state.activePlayer = newImg;
            }

            // Ensure the first decoded frame has been painted before revealing
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                // 3. Transitioning in (mock fades out, GIF fades in)
                trigger.dataset.gifState = 'transitioning';

                state.transitionTimer = setTimeout(() => {
                  state.transitionTimer = null;

                  // 4. Playing phase (GIF visible and running)
                  trigger.dataset.gifState = 'playing';

                  state.durationTimer = setTimeout(() => {
                    state.durationTimer = null;

                    // 5. Back to idle (GIF fades out, mock fades in)
                    trigger.dataset.gifState = 'idle';
                    trigger.removeAttribute('data-active-gif-theme');
                  }, duration);
                }, transitionMs);
              });
            });
          });
        }, delay);
      };

      const endCycle = () => {
        const state = triggerStates.get(trigger);
        if (!state) return;
        clearAllTimers(state);
        trigger.dataset.gifState = 'idle';
        trigger.removeAttribute('data-active-gif-theme');
      };

      const handleFocusIn = (event) => {
        if (trigger.contains(event.relatedTarget)) return;
        startCycle();
      };

      const handleFocusOut = (event) => {
        if (trigger.contains(event.relatedTarget)) return;
        endCycle();
      };

      trigger.addEventListener('mouseenter', startCycle);
      trigger.addEventListener('mouseleave', endCycle);
      trigger.addEventListener('focusin', handleFocusIn);
      trigger.addEventListener('focusout', handleFocusOut);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initInstallSelector();
    initShortcutsSelector();
    initBentoGifTriggers();
  });
})();
