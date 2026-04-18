import { useEffect, useRef } from 'react';
import type { ShortcutAction } from './types';
import { ShortcutActionId } from './ShortcutRegistry';

/**
 * Modifier key pattern used for taskpane-scoped fallback shortcuts.
 * Matches Ctrl+Alt+<key> on Windows and Cmd+Option+<key> on Mac.
 */
const SHORTCUT_KEY_MAP: Record<string, string> = {
  [ShortcutActionId.TOGGLE_TASKPANE]: 'k',
  [ShortcutActionId.FOCUS_SEARCH]: 'f',
  [ShortcutActionId.CREATE_WORKSHEET]: 'n',
};

interface UseShortcutActionsOptions {
  /** The shortcut actions to register */
  actions: ShortcutAction[];
  /** When true, taskpane-scoped fallback shortcuts are suppressed */
  isSuppressed?: boolean;
}

/**
 * Registers shortcut action handlers with Office.actions.associate
 * and installs a taskpane-scoped fallback keydown listener.
 *
 * Office.actions.associate handles global shortcuts (from spreadsheet).
 * The fallback listener handles the same shortcuts when the taskpane has focus,
 * since global shortcuts may not fire inside the webview on all platforms.
 */
export function useShortcutActions({ actions, isSuppressed = false }: UseShortcutActionsOptions): void {
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const suppressedRef = useRef(isSuppressed);
  suppressedRef.current = isSuppressed;

  // Register Office.actions.associate — once per action, stable across renders.
  useEffect(() => {
    if (typeof Office === 'undefined' || !Office.actions?.associate) {
      return;
    }

    for (const action of actionsRef.current) {
      try {
        Office.actions.associate(action.id, () => {
          // Re-read from ref to get latest handler at call time.
          const currentAction = actionsRef.current.find((a) => a.id === action.id);
          if (currentAction && !suppressedRef.current) {
            void currentAction.handler();
          }
        });
      } catch {
        // Office.actions.associate may fail if the runtime doesn't support it.
        // This is expected on platforms without SharedRuntime support.
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentionally stable

  // Taskpane-scoped fallback: catch Ctrl+Alt+<key> / Cmd+Option+<key>
  // when the taskpane is focused. This covers platforms where global
  // shortcuts don't fire inside the webview.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (suppressedRef.current) {
        return;
      }

      // Only match Ctrl+Alt (or Cmd+Option) combos — no Shift.
      const hasModifier = (event.ctrlKey || event.metaKey) && event.altKey && !event.shiftKey;
      if (!hasModifier) {
        return;
      }

      // Don't intercept shortcuts when typing in inputs/textareas.
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        return;
      }

      const pressedKey = event.key.toLowerCase();

      for (const action of actionsRef.current) {
        const mappedKey = SHORTCUT_KEY_MAP[action.id];
        if (mappedKey && mappedKey === pressedKey) {
          event.preventDefault();
          event.stopPropagation();
          void action.handler();
          return;
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  return;
}
