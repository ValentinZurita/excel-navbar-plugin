import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  WorksheetPreviewResult,
  WorksheetPreviewUnavailableReason,
} from '../../infrastructure/office/WorkbookAdapter';

export const WORKSHEET_PREVIEW_HOVER_DELAY_MS = 650;
export const WORKSHEET_PREVIEW_CACHE_TTL_MS = 30_000;

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
}

interface CachedWorksheetPreview {
  result: WorksheetPreviewResult;
  cachedAt: number;
}

interface UseWorksheetPreviewOptions {
  getPreview: (worksheetId: string) => Promise<WorksheetPreviewResult>;
  isSuppressed?: boolean;
  delayMs?: number;
  cacheTtlMs?: number;
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
}: UseWorksheetPreviewOptions) {
  const [previewState, setPreviewState] = useState<WorksheetPreviewState>({ status: 'idle' });
  const cacheRef = useRef(new Map<string, CachedWorksheetPreview>());
  const delayTimerRef = useRef<number | null>(null);
  const requestSequenceRef = useRef(0);

  const clearDelayTimer = useCallback(() => {
    if (delayTimerRef.current === null) {
      return;
    }

    window.clearTimeout(delayTimerRef.current);
    delayTimerRef.current = null;
  }, []);

  const cancelPreview = useCallback(() => {
    requestSequenceRef.current += 1;
    clearDelayTimer();
    setPreviewState({ status: 'idle' });
  }, [clearDelayTimer]);

  const requestPreview = useCallback(
    (request: WorksheetPreviewRequest) => {
      if (isSuppressed || !request.anchorElement.isConnected) {
        cancelPreview();
        return;
      }

      clearDelayTimer();
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
          setPreviewState(toPreviewState(request, cached.result));
          return;
        }

        setPreviewState({
          status: 'loading',
          worksheetId: request.worksheetId,
          worksheetName: request.worksheetName,
          anchorElement: request.anchorElement,
          pointerPosition: request.pointerPosition,
        });

        void getPreview(request.worksheetId)
          .then((result) => {
            if (sequence !== requestSequenceRef.current || !request.anchorElement.isConnected) {
              return;
            }

            cacheRef.current.set(request.worksheetId, {
              result,
              cachedAt: Date.now(),
            });
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
    [cacheTtlMs, cancelPreview, clearDelayTimer, delayMs, getPreview, isSuppressed],
  );

  useEffect(() => {
    if (isSuppressed) {
      cancelPreview();
    }
  }, [cancelPreview, isSuppressed]);

  useEffect(() => {
    return () => {
      requestSequenceRef.current += 1;
      clearDelayTimer();
    };
  }, [clearDelayTimer]);

  return {
    previewState,
    requestPreview,
    cancelPreview,
  };
}
