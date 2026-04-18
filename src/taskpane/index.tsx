import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
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

  Office.actions.associate('toggleTaskpane', async () => {
    try {
      if (isTaskpaneVisible) {
        await Office.addin.hide();
        isTaskpaneVisible = false;
      } else {
        await Office.addin.showAsTaskpane();
        isTaskpaneVisible = true;
      }
    } catch {
      // Fallback: always try to show if toggle fails.
      try {
        await Office.addin.showAsTaskpane();
        isTaskpaneVisible = true;
      } catch {
        // Platform doesn't support programmatic show/hide.
      }
    }
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
