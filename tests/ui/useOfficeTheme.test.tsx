import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOfficeTheme } from '../../src/taskpane/useOfficeTheme';

type MutableOfficeTheme = {
  themeId: number;
  isDarkTheme: boolean;
  bodyBackgroundColor: string;
  bodyForegroundColor: string;
  controlBackgroundColor: string;
  controlForegroundColor: string;
};

function ThemeHookHarness() {
  useOfficeTheme();
  return null;
}

describe('useOfficeTheme', () => {
  let officeTheme: MutableOfficeTheme;
  let onReadyCallback: (() => void) | null;

  beforeEach(() => {
    vi.useFakeTimers();

    officeTheme = {
      themeId: 1,
      isDarkTheme: false,
      bodyBackgroundColor: '#f3f2f1',
      bodyForegroundColor: '#201f1e',
      controlBackgroundColor: '#ffffff',
      controlForegroundColor: '#201f1e',
    };

    onReadyCallback = null;
    (globalThis as any).Office = {
      context: { officeTheme },
      onReady: (callback: () => void) => {
        onReadyCallback = callback;
      },
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    delete (globalThis as any).Office;
    document.documentElement.removeAttribute('data-office-theme');
    document.documentElement.removeAttribute('data-office-theme-mode');
    document.documentElement.style.removeProperty('--excel-body-bg');
    document.documentElement.style.removeProperty('--excel-body-fg');
    document.documentElement.style.removeProperty('--excel-control-bg');
    document.documentElement.style.removeProperty('--excel-control-fg');
    document.documentElement.style.removeProperty('--excel-border');
    document.documentElement.style.removeProperty('--excel-muted');
    document.documentElement.style.removeProperty('color-scheme');
  });

  it('updates DOM theme tokens when Office theme changes at runtime', () => {
    render(<ThemeHookHarness />);

    expect(onReadyCallback).not.toBeNull();
    act(() => {
      onReadyCallback?.();
    });

    expect(document.documentElement.dataset.officeThemeMode).toBe('light');
    expect(document.documentElement.style.getPropertyValue('color-scheme')).toBe('light');

    officeTheme.themeId = 2;
    officeTheme.isDarkTheme = true;
    officeTheme.bodyBackgroundColor = '#1f1f1f';
    officeTheme.bodyForegroundColor = '#f8f8f8';
    officeTheme.controlBackgroundColor = '#2c2c2c';
    officeTheme.controlForegroundColor = '#f8f8f8';

    act(() => {
      vi.advanceTimersByTime(1300);
    });

    expect(document.documentElement.dataset.officeThemeMode).toBe('dark');
    expect(document.documentElement.style.getPropertyValue('color-scheme')).toBe('dark');
    expect(document.documentElement.style.getPropertyValue('--excel-body-bg')).toBe('#1f1f1f');
  });
});
