import { useEffect } from 'react';

function setThemeVariables() {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  const officeTheme = typeof Office !== 'undefined' ? Office.context?.officeTheme : undefined;
  const controlBackgroundColor = officeTheme?.controlBackgroundColor ?? officeTheme?.bodyBackgroundColor;
  const isDarkTheme = Boolean(officeTheme?.isDarkTheme);

  root.style.setProperty('--excel-body-bg', officeTheme?.bodyBackgroundColor ?? '#f3f2f1');
  root.style.setProperty('--excel-body-fg', officeTheme?.bodyForegroundColor ?? '#201f1e');
  root.style.setProperty('--excel-control-bg', controlBackgroundColor ?? '#ffffff');
  root.style.setProperty('--excel-control-fg', officeTheme?.controlForegroundColor ?? '#201f1e');
  root.style.setProperty('--excel-border', isDarkTheme ? 'rgba(255,255,255,0.12)' : '#e1dfdd');
  root.style.setProperty('--excel-muted', isDarkTheme ? 'rgba(255,255,255,0.7)' : '#605e5c');
  root.style.setProperty('color-scheme', isDarkTheme ? 'dark' : 'light');
  root.dataset.officeTheme = officeTheme?.themeId ? String(officeTheme.themeId) : 'unknown';
  root.dataset.officeThemeMode = isDarkTheme ? 'dark' : 'light';
}

export function useOfficeTheme() {
  useEffect(() => {
    setThemeVariables();

    if (typeof Office === 'undefined') {
      return;
    }

    Office.onReady(() => {
      setThemeVariables();
    });
  }, []);
}
