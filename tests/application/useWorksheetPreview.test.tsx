import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  useWorksheetPreview,
  MAX_PREVIEW_CACHE_ENTRIES,
  WORKSHEET_PREVIEW_CACHE_TTL_MS,
  WORKSHEET_PREVIEW_HOVER_DELAY_MS,
  WORKSHEET_PREVIEW_KEYBOARD_AUTO_DISMISS_MS,
} from '../../src/application/navigation/useWorksheetPreview';
import type { WorksheetPreviewResult } from '../../src/infrastructure/office/WorkbookAdapter';

function createAnchor() {
  const anchor = document.createElement('button');
  document.body.appendChild(anchor);
  return anchor;
}

function createDeferred<T>() {
  let resolvePromise!: (value: T | PromiseLike<T>) => void;
  let rejectPromise!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return {
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
  };
}

const readyPreview: WorksheetPreviewResult = {
  status: 'ready',
  imageSrc: 'data:image/png;base64,preview',
  generatedAt: 1,
};
const pointerPosition = { clientX: 40, clientY: 60 };

describe('useWorksheetPreview', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('does not request a preview before the hover delay', () => {
    vi.useFakeTimers();
    const getPreview = vi.fn(() => new Promise<WorksheetPreviewResult>(() => undefined));
    const anchor = createAnchor();
    const { result } = renderHook(() => useWorksheetPreview({ getPreview }));

    act(() => {
      result.current.requestPreview({
        worksheetId: 'sheet-1',
        worksheetName: 'Revenue',
        anchorElement: anchor,
        pointerPosition,
      });
      vi.advanceTimersByTime(WORKSHEET_PREVIEW_HOVER_DELAY_MS - 1);
    });

    expect(getPreview).not.toHaveBeenCalled();
    expect(result.current.previewState.status).toBe('idle');
  });

  it('cancels a pending preview when hover leaves before the delay', () => {
    vi.useFakeTimers();
    const getPreview = vi.fn(() => new Promise<WorksheetPreviewResult>(() => undefined));
    const anchor = createAnchor();
    const { result } = renderHook(() => useWorksheetPreview({ getPreview }));

    act(() => {
      result.current.requestPreview({
        worksheetId: 'sheet-1',
        worksheetName: 'Revenue',
        anchorElement: anchor,
        pointerPosition,
      });
      result.current.cancelPreview();
      vi.advanceTimersByTime(WORKSHEET_PREVIEW_HOVER_DELAY_MS);
    });

    expect(getPreview).not.toHaveBeenCalled();
    expect(result.current.previewState.status).toBe('idle');
  });

  it('shows loading and then a ready image result', async () => {
    vi.useFakeTimers();
    const deferred = createDeferred<WorksheetPreviewResult>();
    const getPreview = vi.fn(() => deferred.promise);
    const anchor = createAnchor();
    const { result } = renderHook(() => useWorksheetPreview({ getPreview }));

    act(() => {
      result.current.requestPreview({
        worksheetId: 'sheet-1',
        worksheetName: 'Revenue',
        anchorElement: anchor,
        pointerPosition,
      });
      vi.advanceTimersByTime(WORKSHEET_PREVIEW_HOVER_DELAY_MS);
    });

    expect(result.current.previewState).toMatchObject({
      status: 'loading',
      worksheetId: 'sheet-1',
      worksheetName: 'Revenue',
      pointerPosition,
    });

    await act(async () => {
      deferred.resolve(readyPreview);
      await deferred.promise;
    });

    expect(result.current.previewState).toMatchObject({
      status: 'ready',
      worksheetId: 'sheet-1',
      worksheetName: 'Revenue',
      imageSrc: readyPreview.imageSrc,
      pointerPosition,
    });
  });

  it('restarts the hover delay when the pointer settles in a new position', () => {
    vi.useFakeTimers();
    const getPreview = vi.fn(() => new Promise<WorksheetPreviewResult>(() => undefined));
    const anchor = createAnchor();
    const latestPointerPosition = { clientX: 120, clientY: 140 };
    const { result } = renderHook(() => useWorksheetPreview({ getPreview }));

    act(() => {
      result.current.requestPreview({
        worksheetId: 'sheet-1',
        worksheetName: 'Revenue',
        anchorElement: anchor,
        pointerPosition,
      });
      vi.advanceTimersByTime(300);
      result.current.requestPreview({
        worksheetId: 'sheet-1',
        worksheetName: 'Revenue',
        anchorElement: anchor,
        pointerPosition: latestPointerPosition,
      });
      vi.advanceTimersByTime(WORKSHEET_PREVIEW_HOVER_DELAY_MS - 300);
    });

    expect(getPreview).not.toHaveBeenCalled();
    expect(result.current.previewState.status).toBe('idle');

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(getPreview).toHaveBeenCalledTimes(1);
    expect(result.current.previewState).toMatchObject({
      status: 'loading',
      pointerPosition: latestPointerPosition,
    });
  });

  it('reuses cached preview results within the cache TTL', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const getPreview = vi.fn().mockResolvedValue(readyPreview);
    const anchor = createAnchor();
    const { result } = renderHook(() => useWorksheetPreview({ getPreview }));

    act(() => {
      result.current.requestPreview({
        worksheetId: 'sheet-1',
        worksheetName: 'Revenue',
        anchorElement: anchor,
        pointerPosition,
      });
      vi.advanceTimersByTime(WORKSHEET_PREVIEW_HOVER_DELAY_MS);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.previewState.status).toBe('ready');

    act(() => {
      result.current.cancelPreview();
      result.current.requestPreview({
        worksheetId: 'sheet-1',
        worksheetName: 'Revenue',
        anchorElement: anchor,
        pointerPosition,
      });
      vi.advanceTimersByTime(WORKSHEET_PREVIEW_HOVER_DELAY_MS);
    });

    expect(getPreview).toHaveBeenCalledTimes(1);
    expect(result.current.previewState.status).toBe('ready');

    act(() => {
      vi.advanceTimersByTime(WORKSHEET_PREVIEW_CACHE_TTL_MS + 1);
      result.current.cancelPreview();
      result.current.requestPreview({
        worksheetId: 'sheet-1',
        worksheetName: 'Revenue',
        anchorElement: anchor,
        pointerPosition,
      });
      vi.advanceTimersByTime(WORKSHEET_PREVIEW_HOVER_DELAY_MS);
    });

    expect(getPreview).toHaveBeenCalledTimes(2);

    await act(async () => {
      await Promise.resolve();
    });
  });

  it('reuses an in-flight preview request for the same worksheet', async () => {
    vi.useFakeTimers();
    const deferred = createDeferred<WorksheetPreviewResult>();
    const getPreview = vi.fn(() => deferred.promise);
    const anchor = createAnchor();
    const latestPointerPosition = { clientX: 120, clientY: 140 };
    const { result } = renderHook(() => useWorksheetPreview({ getPreview }));

    act(() => {
      result.current.requestPreview({
        worksheetId: 'sheet-1',
        worksheetName: 'Revenue',
        anchorElement: anchor,
        pointerPosition,
      });
      vi.advanceTimersByTime(WORKSHEET_PREVIEW_HOVER_DELAY_MS);
    });

    expect(getPreview).toHaveBeenCalledTimes(1);
    expect(result.current.previewState).toMatchObject({
      status: 'loading',
      pointerPosition,
    });

    act(() => {
      result.current.requestPreview({
        worksheetId: 'sheet-1',
        worksheetName: 'Revenue',
        anchorElement: anchor,
        pointerPosition: latestPointerPosition,
      });
      vi.advanceTimersByTime(WORKSHEET_PREVIEW_HOVER_DELAY_MS);
    });

    expect(getPreview).toHaveBeenCalledTimes(1);
    expect(result.current.previewState).toMatchObject({
      status: 'loading',
      pointerPosition: latestPointerPosition,
    });

    await act(async () => {
      deferred.resolve(readyPreview);
      await deferred.promise;
    });

    expect(result.current.previewState).toMatchObject({
      status: 'ready',
      worksheetId: 'sheet-1',
      imageSrc: readyPreview.imageSrc,
      pointerPosition: latestPointerPosition,
    });
  });

  it('auto dismisses previews when the request opts into a timeout', async () => {
    vi.useFakeTimers();
    const getPreview = vi.fn().mockResolvedValue(readyPreview);
    const anchor = createAnchor();
    const { result } = renderHook(() => useWorksheetPreview({ getPreview }));

    act(() => {
      result.current.requestPreview({
        worksheetId: 'sheet-1',
        worksheetName: 'Revenue',
        anchorElement: anchor,
        pointerPosition,
        autoDismissMs: WORKSHEET_PREVIEW_KEYBOARD_AUTO_DISMISS_MS,
      });
      vi.advanceTimersByTime(WORKSHEET_PREVIEW_HOVER_DELAY_MS);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.previewState.status).toBe('ready');

    act(() => {
      vi.advanceTimersByTime(WORKSHEET_PREVIEW_KEYBOARD_AUTO_DISMISS_MS - 1);
    });

    expect(result.current.previewState.status).toBe('ready');

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current.previewState.status).toBe('idle');
  });

  it('does not request previews while suppressed', () => {
    vi.useFakeTimers();
    const getPreview = vi.fn().mockResolvedValue(readyPreview);
    const anchor = createAnchor();
    const { result } = renderHook(() => useWorksheetPreview({ getPreview, isSuppressed: true }));

    act(() => {
      result.current.requestPreview({
        worksheetId: 'sheet-1',
        worksheetName: 'Revenue',
        anchorElement: anchor,
        pointerPosition,
      });
      vi.advanceTimersByTime(WORKSHEET_PREVIEW_HOVER_DELAY_MS);
    });

    expect(getPreview).not.toHaveBeenCalled();
    expect(result.current.previewState.status).toBe('idle');
  });

  it('clears the cache when cacheInvalidationToken changes', async () => {
    vi.useFakeTimers();
    const getPreview = vi.fn().mockResolvedValue(readyPreview);
    const anchor = createAnchor();

    const { result, rerender } = renderHook(
      ({ token }: { token?: number }) =>
        useWorksheetPreview({ getPreview, cacheInvalidationToken: token }),
      { initialProps: { token: 0 } },
    );

    // First hover - caches the preview
    await act(async () => {
      result.current.requestPreview({
        worksheetId: 'sheet-1',
        worksheetName: 'Revenue',
        anchorElement: anchor,
        pointerPosition,
      });
      vi.advanceTimersByTime(WORKSHEET_PREVIEW_HOVER_DELAY_MS);
      await Promise.resolve();
    });

    expect(getPreview).toHaveBeenCalledTimes(1);

    // Token changes to 1 - cache should be cleared
    await act(async () => {
      rerender({ token: 1 });
    });

    act(() => {
      result.current.requestPreview({
        worksheetId: 'sheet-1',
        worksheetName: 'Revenue',
        anchorElement: anchor,
        pointerPosition,
      });
      vi.advanceTimersByTime(WORKSHEET_PREVIEW_HOVER_DELAY_MS);
    });

    // getPreview should be called again because cache was invalidated
    expect(getPreview).toHaveBeenCalledTimes(2);
  });

  it('drops in-flight preview result when cacheInvalidationToken changes before promise resolves', async () => {
    vi.useFakeTimers();
    const deferred = createDeferred<WorksheetPreviewResult>();
    const getPreview = vi.fn(() => deferred.promise);
    const anchor = createAnchor();

    const { result, rerender } = renderHook(
      ({ token }: { token?: number }) =>
        useWorksheetPreview({ getPreview, cacheInvalidationToken: token }),
      { initialProps: { token: 0 } },
    );

    // Start preview request
    act(() => {
      result.current.requestPreview({
        worksheetId: 'sheet-1',
        worksheetName: 'Revenue',
        anchorElement: anchor,
        pointerPosition,
      });
      vi.advanceTimersByTime(WORKSHEET_PREVIEW_HOVER_DELAY_MS);
    });

    expect(getPreview).toHaveBeenCalledTimes(1);
    expect(result.current.previewState).toMatchObject({ status: 'loading' });

    // Token changes before promise resolves - in-flight should be dropped
    act(() => {
      rerender({ token: 1 });
    });

    act(() => {
      vi.advanceTimersByTime(WORKSHEET_PREVIEW_HOVER_DELAY_MS);
    });

    // Resolve the original promise after token already changed
    await act(async () => {
      deferred.resolve(readyPreview);
      await deferred.promise;
    });

    // Status should still be 'loading' (or idle) because the result was dropped
    expect(result.current.previewState.status).not.toBe('ready');
  });

  it('bounds preview cache with true LRU eviction policy', async () => {
    vi.useFakeTimers();
    const getPreview = vi.fn(async (sheetId: string) => ({
      status: 'ready' as const,
      imageSrc: `data:image/png;base64,${sheetId}`,
      generatedAt: Date.now(),
    }));

    const anchor = createAnchor();
    const { result } = renderHook(() => useWorksheetPreview({ getPreview }));

    // Request previews for MAX_PREVIEW_CACHE_ENTRIES sheets (sheet-0 through sheet-19)
    for (let i = 0; i < MAX_PREVIEW_CACHE_ENTRIES; i += 1) {
      await act(async () => {
        result.current.requestPreview({
          worksheetId: `sheet-${i}`,
          worksheetName: `Sheet ${i}`,
          anchorElement: anchor,
          pointerPosition,
        });
        await vi.advanceTimersByTimeAsync(WORKSHEET_PREVIEW_HOVER_DELAY_MS);
      });
    }

    expect(getPreview).toHaveBeenCalledTimes(MAX_PREVIEW_CACHE_ENTRIES);

    // Touch sheet-0 (reading from cache refreshes its LRU position to most recently used)
    await act(async () => {
      result.current.requestPreview({
        worksheetId: 'sheet-0',
        worksheetName: 'Sheet 0',
        anchorElement: anchor,
        pointerPosition,
      });
      await vi.advanceTimersByTimeAsync(WORKSHEET_PREVIEW_HOVER_DELAY_MS);
    });

    // Should NOT have fetched sheet-0 again (cache hit)
    expect(getPreview).toHaveBeenCalledTimes(MAX_PREVIEW_CACHE_ENTRIES);

    // Request sheet-20 (overflows capacity of 20).
    // The oldest entry is sheet-1 because sheet-0 was accessed and moved to MRU.
    await act(async () => {
      result.current.requestPreview({
        worksheetId: 'sheet-20',
        worksheetName: 'Sheet 20',
        anchorElement: anchor,
        pointerPosition,
      });
      await vi.advanceTimersByTimeAsync(WORKSHEET_PREVIEW_HOVER_DELAY_MS);
    });

    expect(getPreview).toHaveBeenCalledTimes(MAX_PREVIEW_CACHE_ENTRIES + 1);

    // Request sheet-0 again -> should STILL be cached!
    await act(async () => {
      result.current.requestPreview({
        worksheetId: 'sheet-0',
        worksheetName: 'Sheet 0',
        anchorElement: anchor,
        pointerPosition,
      });
      await vi.advanceTimersByTimeAsync(WORKSHEET_PREVIEW_HOVER_DELAY_MS);
    });

    // getPreview count should NOT increment (sheet-0 was retained by LRU refresh)
    expect(getPreview).toHaveBeenCalledTimes(MAX_PREVIEW_CACHE_ENTRIES + 1);

    // Request sheet-1 -> was evicted, should trigger getPreview!
    await act(async () => {
      result.current.requestPreview({
        worksheetId: 'sheet-1',
        worksheetName: 'Sheet 1',
        anchorElement: anchor,
        pointerPosition,
      });
      await vi.advanceTimersByTimeAsync(WORKSHEET_PREVIEW_HOVER_DELAY_MS);
    });

    expect(getPreview).toHaveBeenCalledTimes(MAX_PREVIEW_CACHE_ENTRIES + 2);
  });
});
