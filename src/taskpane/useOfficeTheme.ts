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
  mediaQueryList: MediaQueryList | null,
  listener: (event: MediaQueryListEvent) => void,
) {
  if (!mediaQueryList) {
    return;
  }
  if (typeof mediaQueryList.addEventListener === 'function') {
    mediaQueryList.addEventListener('change', listener);
    return;
  }

  if (typeof mediaQueryList.addListener === 'function') {
    mediaQueryList.addListener(listener);
  }
}

function unsubscribePreferredColorSchemeChange(
  mediaQueryList: MediaQueryList | null,
  listener: (event: MediaQueryListEvent) => void,
) {
  if (!mediaQueryList) {
    return;
  }
  if (typeof mediaQueryList.removeEventListener === 'function') {
    mediaQueryList.removeEventListener('change', listener);
    return;
  }

  if (typeof mediaQueryList.removeListener === 'function') {
    mediaQueryList.removeListener(listener);
  }
}

function parseHexColorBrightness(color: string | undefined): 'dark' | 'light' | null {
  if (!color) {
    return null;
  }
  const hex = color.replace('#', '').trim();
  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      return luminance < 128 ? 'dark' : 'light';
    }
  }
  return null;
}

function getResolvedTheme() {
  const officeTheme = typeof Office !== 'undefined' ? Office.context?.officeTheme : undefined;
  const preferredDarkMode = getPreferredDarkMode();
  const detectedBrightness = parseHexColorBrightness(officeTheme?.bodyBackgroundColor);
  const officeDarkMode =
    detectedBrightness !== null
      ? detectedBrightness === 'dark'
      : (officeTheme?.isDarkTheme ?? preferredDarkMode);

  const isDarkTheme = officeTheme !== undefined ? officeDarkMode : preferredDarkMode;
  const fallbackTheme = isDarkTheme ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME;

  return {
    themeId: officeTheme?.themeId ?? null,
    preferredDarkMode,
    isDarkTheme,
    bodyBackgroundColor: officeTheme?.bodyBackgroundColor ?? fallbackTheme.bodyBackgroundColor,
    bodyForegroundColor: officeTheme?.bodyForegroundColor ?? fallbackTheme.bodyForegroundColor,
    controlBackgroundColor:
      officeTheme?.controlBackgroundColor ?? fallbackTheme.controlBackgroundColor,
    controlForegroundColor:
      officeTheme?.controlForegroundColor ?? fallbackTheme.controlForegroundColor,
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

    let isReady = false;

    const startPolling = () => {
      if (
        !isDisposed &&
        isReady &&
        refreshIntervalId === null &&
        (typeof document === 'undefined' || document.visibilityState === 'visible')
      ) {
        refreshIntervalId = setInterval(refreshIfThemeChanged, THEME_REFRESH_INTERVAL_MS);
      }
    };

    const stopPolling = () => {
      if (refreshIntervalId !== null) {
        clearInterval(refreshIntervalId);
        refreshIntervalId = null;
      }
    };

    const onWindowFocus = () => {
      refreshIfThemeChanged();
    };

    const onDocumentVisible = () => {
      if (document.visibilityState === 'visible') {
        refreshIfThemeChanged();
        startPolling();
      } else {
        stopPolling();
      }
    };
    const mediaQueryList =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-color-scheme: dark)')
        : null;
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
      isReady = true;
      setThemeVariables();
      previousThemeSignature = getThemeSignature();
      startPolling();
    });

    return () => {
      isDisposed = true;
      window.removeEventListener('focus', onWindowFocus);
      document.removeEventListener('visibilitychange', onDocumentVisible);
      unsubscribePreferredColorSchemeChange(mediaQueryList, onPreferredSchemeChanged);
      stopPolling();
    };
  }, []);
}
