import { useEffect } from 'react';

const THEME_REFRESH_INTERVAL_MS = 1200;
const DEFAULT_LIGHT_THEME = {
  bodyBackgroundColor: '#f3f2f1',
  bodyForegroundColor: '#201f1e',
  controlBackgroundColor: '#ffffff',
  controlForegroundColor: '#201f1e',
};
const DEFAULT_DARK_THEME = {
  bodyBackgroundColor: '#1f1f1f',
  bodyForegroundColor: '#f3f2f1',
  controlBackgroundColor: '#2b2b2b',
  controlForegroundColor: '#f3f2f1',
};

function getPreferredDarkMode() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function subscribePreferredColorSchemeChange(
  mediaQueryList: MediaQueryList,
  listener: (event: MediaQueryListEvent) => void,
) {
  if (typeof mediaQueryList.addEventListener === 'function') {
    mediaQueryList.addEventListener('change', listener);
    return;
  }

  // Legacy WebView API surface (e.g. older EdgeHTML-based hosts).
  if (typeof mediaQueryList.addListener === 'function') {
    mediaQueryList.addListener(listener);
  }
}

function unsubscribePreferredColorSchemeChange(
  mediaQueryList: MediaQueryList,
  listener: (event: MediaQueryListEvent) => void,
) {
  if (typeof mediaQueryList.removeEventListener === 'function') {
    mediaQueryList.removeEventListener('change', listener);
    return;
  }

  if (typeof mediaQueryList.removeListener === 'function') {
    mediaQueryList.removeListener(listener);
  }
}

function getResolvedTheme() {
  const officeTheme = typeof Office !== 'undefined' ? Office.context?.officeTheme : undefined;
  const preferredDarkMode = getPreferredDarkMode();
  const officeDarkMode = Boolean(officeTheme?.isDarkTheme);
  const modeMismatch = officeTheme !== undefined && preferredDarkMode !== officeDarkMode;
  const isDarkTheme = modeMismatch ? preferredDarkMode : officeDarkMode;
  const fallbackTheme = isDarkTheme ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME;

  return {
    themeId: officeTheme?.themeId ?? null,
    preferredDarkMode,
    isDarkTheme,
    bodyBackgroundColor: modeMismatch
      ? fallbackTheme.bodyBackgroundColor
      : (officeTheme?.bodyBackgroundColor ?? fallbackTheme.bodyBackgroundColor),
    bodyForegroundColor: modeMismatch
      ? fallbackTheme.bodyForegroundColor
      : (officeTheme?.bodyForegroundColor ?? fallbackTheme.bodyForegroundColor),
    controlBackgroundColor: modeMismatch
      ? fallbackTheme.controlBackgroundColor
      : (officeTheme?.controlBackgroundColor ?? fallbackTheme.controlBackgroundColor),
    controlForegroundColor: modeMismatch
      ? fallbackTheme.controlForegroundColor
      : (officeTheme?.controlForegroundColor ?? fallbackTheme.controlForegroundColor),
  };
}

function getThemeSignature() {
  const resolvedTheme = getResolvedTheme();
  return JSON.stringify({
    themeId: resolvedTheme.themeId,
    preferredDarkMode: resolvedTheme.preferredDarkMode,
    isDarkTheme: resolvedTheme.isDarkTheme,
    bodyBackgroundColor: resolvedTheme.bodyBackgroundColor,
    bodyForegroundColor: resolvedTheme.bodyForegroundColor,
    controlBackgroundColor: resolvedTheme.controlBackgroundColor,
    controlForegroundColor: resolvedTheme.controlForegroundColor,
  });
}

function setThemeVariables() {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  const resolvedTheme = getResolvedTheme();
  const controlBackgroundColor =
    resolvedTheme.controlBackgroundColor ?? resolvedTheme.bodyBackgroundColor;

  root.style.setProperty('--excel-body-bg', resolvedTheme.bodyBackgroundColor);
  root.style.setProperty('--excel-body-fg', resolvedTheme.bodyForegroundColor);
  root.style.setProperty('--excel-control-bg', controlBackgroundColor);
  root.style.setProperty('--excel-control-fg', resolvedTheme.controlForegroundColor);
  root.style.setProperty(
    '--excel-border',
    resolvedTheme.isDarkTheme ? 'rgba(255,255,255,0.12)' : '#e1dfdd',
  );
  root.style.setProperty(
    '--excel-muted',
    resolvedTheme.isDarkTheme ? 'rgba(255,255,255,0.7)' : '#605e5c',
  );
  root.style.setProperty('color-scheme', resolvedTheme.isDarkTheme ? 'dark' : 'light');
  root.dataset.officeTheme = resolvedTheme.themeId ? String(resolvedTheme.themeId) : 'unknown';
  root.dataset.officeThemeMode = resolvedTheme.isDarkTheme ? 'dark' : 'light';
}

export function useOfficeTheme() {
  useEffect(() => {
    setThemeVariables();
    let previousThemeSignature = getThemeSignature();
    let refreshIntervalId: ReturnType<typeof setInterval> | null = null;
    let isDisposed = false;

    const refreshIfThemeChanged = () => {
      const nextThemeSignature = getThemeSignature();
      if (nextThemeSignature === previousThemeSignature) {
        return;
      }
      previousThemeSignature = nextThemeSignature;
      setThemeVariables();
    };

    if (typeof Office === 'undefined') {
      return;
    }

    const onWindowFocus = () => {
      refreshIfThemeChanged();
    };

    const onDocumentVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshIfThemeChanged();
      }
    };
    const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');
    const onPreferredSchemeChanged = () => {
      refreshIfThemeChanged();
    };

    window.addEventListener('focus', onWindowFocus);
    document.addEventListener('visibilitychange', onDocumentVisible);
    subscribePreferredColorSchemeChange(mediaQueryList, onPreferredSchemeChanged);

    Office.onReady(() => {
      if (isDisposed) {
        return;
      }
      setThemeVariables();
      previousThemeSignature = getThemeSignature();
      refreshIntervalId = setInterval(refreshIfThemeChanged, THEME_REFRESH_INTERVAL_MS);
    });

    return () => {
      isDisposed = true;
      window.removeEventListener('focus', onWindowFocus);
      document.removeEventListener('visibilitychange', onDocumentVisible);
      unsubscribePreferredColorSchemeChange(mediaQueryList, onPreferredSchemeChanged);
      if (refreshIntervalId !== null) {
        clearInterval(refreshIntervalId);
      }
    };
  }, []);
}
