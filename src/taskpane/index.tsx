import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ShortcutActionId } from '../application/shortcuts/ShortcutRegistry';
import './styles.css';
import '../ui/styles/taskpaneUtilities.css';

/**
 * Register the toggleTaskpane action for global keyboard shortcut.
 *
 * With shared runtime, the code keeps running even when the taskpane is hidden.
 * We track visibility state via Office.addin.onVisibilityModeChanged so the
 * toggle shortcut can correctly show or hide the taskpane from the spreadsheet.
 */
function registerRibbonActions(): void {
  if (typeof Office === 'undefined' || !Office.actions?.associate) {
    return;
  }

  // Track taskpane visibility state for toggle logic.
  let isTaskpaneVisible = true; // Assume visible on first load

  try {
    Office.addin.onVisibilityModeChanged((args) => {
      isTaskpaneVisible = args.visibilityMode === Office.VisibilityMode.taskpane;
    });
  } catch {
    // onVisibilityModeChanged not available on this platform — toggle may not work.
  }

  const showTaskpane = async () => {
    try {
      await Office.addin.showAsTaskpane();
      isTaskpaneVisible = true;
    } catch {
      // Platform doesn't support programmatic show.
    }
  };

  Office.actions.associate(ShortcutActionId.TOGGLE_TASKPANE, async () => {
    try {
      if (isTaskpaneVisible) {
        await Office.addin.hide();
        isTaskpaneVisible = false;
      } else {
        await showTaskpane();
      }
    } catch {
      // Fallback: always try to show if toggle fails.
      await showTaskpane();
    }
  });

  // Fallback registrations for actions that are fully handled inside taskpane React layer.
  // When taskpane runtime already registered richer handlers, those take precedence.
  Office.actions.associate(ShortcutActionId.FOCUS_SEARCH, async () => {
    await showTaskpane();
  });

  Office.actions.associate(ShortcutActionId.CREATE_WORKSHEET, async () => {
    await showTaskpane();
  });
}

Office.onReady(() => {
  registerRibbonActions();
});

const container = document.getElementById('root');

if (!container) {
  throw new Error('Task pane root container was not found.');
}

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
