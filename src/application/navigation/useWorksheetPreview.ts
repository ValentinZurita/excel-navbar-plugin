import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  WorksheetPreviewResult,
  WorksheetPreviewUnavailableReason,
} from '../../infrastructure/office/WorkbookAdapter';

export const WORKSHEET_PREVIEW_HOVER_DELAY_MS = 800;
export const WORKSHEET_PREVIEW_CACHE_TTL_MS = 30_000;
export const WORKSHEET_PREVIEW_KEYBOARD_AUTO_DISMISS_MS = 4_500;
export const MAX_PREVIEW_CACHE_ENTRIES = 20;

export interface WorksheetPreviewPointerPosition {
  clientX: number;
  clientY: number;
}

export type WorksheetPreviewState =
  | { status: 'idle' }
  | {
      status: 'loading';
      worksheetId: string;
      worksheetName: string;
      anchorElement: HTMLElement;
      pointerPosition: WorksheetPreviewPointerPosition;
    }
  | {
      status: 'ready';
      worksheetId: string;
      worksheetName: string;
      anchorElement: HTMLElement;
      pointerPosition: WorksheetPreviewPointerPosition;
      imageSrc: string;
    }
  | {
      status: 'unavailable';
      worksheetId: string;
      worksheetName: string;
      anchorElement: HTMLElement;
      pointerPosition: WorksheetPreviewPointerPosition;
      reason: WorksheetPreviewUnavailableReason;
      message: string;
    };

interface WorksheetPreviewRequest {
  worksheetId: string;
  worksheetName: string;
  anchorElement: HTMLElement;
  pointerPosition: WorksheetPreviewPointerPosition;
  autoDismissMs?: number;
}

interface CachedWorksheetPreview {
  result: WorksheetPreviewResult;
  cachedAt: number;
}

interface InFlightWorksheetPreview {
  promise: Promise<WorksheetPreviewResult>;
}

interface UseWorksheetPreviewOptions {
  getPreview: (worksheetId: string) => Promise<WorksheetPreviewResult>;
  isSuppressed?: boolean;
  delayMs?: number;
  cacheTtlMs?: number;
  cacheInvalidationToken?: number;
}

function toPreviewState(
  request: WorksheetPreviewRequest,
  result: WorksheetPreviewResult,
): WorksheetPreviewState {
  if (result.status === 'ready') {
    return {
      status: 'ready',
      worksheetId: request.worksheetId,
      worksheetName: request.worksheetName,
      anchorElement: request.anchorElement,
      pointerPosition: request.pointerPosition,
      imageSrc: result.imageSrc,
    };
  }

  return {
    status: 'unavailable',
    worksheetId: request.worksheetId,
    worksheetName: request.worksheetName,
    anchorElement: request.anchorElement,
    pointerPosition: request.pointerPosition,
    reason: result.reason,
    message: result.message,
  };
}

export function useWorksheetPreview({
  getPreview,
  isSuppressed = false,
  delayMs = WORKSHEET_PREVIEW_HOVER_DELAY_MS,
  cacheTtlMs = WORKSHEET_PREVIEW_CACHE_TTL_MS,
  cacheInvalidationToken,
}: UseWorksheetPreviewOptions) {
  const [previewState, setPreviewState] = useState<WorksheetPreviewState>({ status: 'idle' });
  const cacheRef = useRef(new Map<string, CachedWorksheetPreview>());
  const inFlightPreviewRef = useRef(new Map<string, InFlightWorksheetPreview>());
  const delayTimerRef = useRef<number | null>(null);
  const autoDismissTimerRef = useRef<number | null>(null);
  const requestSequenceRef = useRef(0);
  const prevTokenRef = useRef(cacheInvalidationToken);

  const clearDelayTimer = useCallback(() => {
    if (delayTimerRef.current === null) {
      return;
    }

    window.clearTimeout(delayTimerRef.current);
    delayTimerRef.current = null;
  }, []);

  const clearAutoDismissTimer = useCallback(() => {
    if (autoDismissTimerRef.current === null) {
      return;
    }

    window.clearTimeout(autoDismissTimerRef.current);
    autoDismissTimerRef.current = null;
  }, []);

  const cancelPreview = useCallback(() => {
    requestSequenceRef.current += 1;
    clearDelayTimer();
    clearAutoDismissTimer();
    setPreviewState({ status: 'idle' });
  }, [clearAutoDismissTimer, clearDelayTimer]);

  const scheduleAutoDismiss = useCallback(
    (sequence: number, autoDismissMs?: number) => {
      clearAutoDismissTimer();

      if (!autoDismissMs) {
        return;
      }

      autoDismissTimerRef.current = window.setTimeout(() => {
        autoDismissTimerRef.current = null;

        if (sequence !== requestSequenceRef.current) {
          return;
        }

        requestSequenceRef.current += 1;
        clearDelayTimer();
        setPreviewState({ status: 'idle' });
      }, autoDismissMs);
    },
    [clearAutoDismissTimer, clearDelayTimer],
  );

  const requestPreview = useCallback(
    (request: WorksheetPreviewRequest) => {
      if (isSuppressed || !request.anchorElement.isConnected) {
        cancelPreview();
        return;
      }

      clearDelayTimer();
      clearAutoDismissTimer();
      const sequence = requestSequenceRef.current + 1;
      requestSequenceRef.current = sequence;
      setPreviewState({ status: 'idle' });

      delayTimerRef.current = window.setTimeout(() => {
        delayTimerRef.current = null;

        if (sequence !== requestSequenceRef.current || !request.anchorElement.isConnected) {
          return;
        }

        const cached = cacheRef.current.get(request.worksheetId);
        if (cached && Date.now() - cached.cachedAt <= cacheTtlMs) {
          // True LRU: refresh entry position to most recently accessed
          cacheRef.current.delete(request.worksheetId);
          cacheRef.current.set(request.worksheetId, cached);

          setPreviewState(toPreviewState(request, cached.result));
          scheduleAutoDismiss(sequence, request.autoDismissMs);
          return;
        }

        setPreviewState({
          status: 'loading',
          worksheetId: request.worksheetId,
          worksheetName: request.worksheetName,
          anchorElement: request.anchorElement,
          pointerPosition: request.pointerPosition,
        });
        scheduleAutoDismiss(sequence, request.autoDismissMs);

        const inFlightPreview = inFlightPreviewRef.current.get(request.worksheetId);
        const previewPromise =
          inFlightPreview?.promise ??
          getPreview(request.worksheetId).finally(() => {
            inFlightPreviewRef.current.delete(request.worksheetId);
          });

        if (!inFlightPreview) {
          inFlightPreviewRef.current.set(request.worksheetId, { promise: previewPromise });
        }

        void previewPromise
          .then((result) => {
            const cache = cacheRef.current;
            if (cache.has(request.worksheetId)) {
              cache.delete(request.worksheetId);
            } else if (cache.size >= MAX_PREVIEW_CACHE_ENTRIES) {
              const oldestKey = cache.keys().next().value;
              if (oldestKey !== undefined) {
                cache.delete(oldestKey);
              }
            }
            cache.set(request.worksheetId, {
              result,
              cachedAt: Date.now(),
            });

            if (sequence !== requestSequenceRef.current || !request.anchorElement.isConnected) {
              return;
            }

            setPreviewState(toPreviewState(request, result));
          })
          .catch(() => {
            if (sequence !== requestSequenceRef.current || !request.anchorElement.isConnected) {
              return;
            }

            setPreviewState({
              status: 'unavailable',
              worksheetId: request.worksheetId,
              worksheetName: request.worksheetName,
              anchorElement: request.anchorElement,
              pointerPosition: request.pointerPosition,
              reason: 'preview-failed',
              message: 'Could not be generated.',
            });
          });
      }, delayMs);
    },
    [
      cacheTtlMs,
      cancelPreview,
      clearAutoDismissTimer,
      clearDelayTimer,
      delayMs,
      getPreview,
      isSuppressed,
      scheduleAutoDismiss,
    ],
  );

  useEffect(() => {
    if (isSuppressed) {
      cancelPreview();
    }
  }, [cancelPreview, isSuppressed]);

  // Invalidate cache when cacheInvalidationToken changes.
  // This ensures structural workbook changes (rename, add, delete) clear stale previews.
  useEffect(() => {
    if (prevTokenRef.current !== undefined && cacheInvalidationToken !== prevTokenRef.current) {
      cancelPreview();
      cacheRef.current.clear();
      inFlightPreviewRef.current.clear();
    }
    prevTokenRef.current = cacheInvalidationToken;
  }, [cacheInvalidationToken, cancelPreview]);

  useEffect(() => {
    return () => {
      requestSequenceRef.current += 1;
      clearDelayTimer();
      clearAutoDismissTimer();
    };
  }, [clearAutoDismissTimer, clearDelayTimer]);

  return {
    previewState,
    requestPreview,
    cancelPreview,
  };
}
