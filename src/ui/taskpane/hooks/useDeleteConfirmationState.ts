import { useCallback, useState } from 'react';
import type { WorksheetEntity } from '../../../domain/navigation/types';

interface UseDeleteConfirmationStateOptions {
  onDelete: (worksheetId: string) => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

interface UseDeleteConfirmationStateReturn {
  isConfirming: boolean;
  worksheetToDelete: WorksheetEntity | null;
  isDeleting: boolean;
  error: string | null;
  startConfirmation: (worksheet: WorksheetEntity) => void;
  cancelConfirmation: () => void;
  confirmDeletion: () => Promise<void>;
  clearError: () => void;
}

export function useDeleteConfirmationState({
  onDelete,
  onSuccess,
  onError,
}: UseDeleteConfirmationStateOptions): UseDeleteConfirmationStateReturn {
  const [isConfirming, setIsConfirming] = useState(false);
  const [worksheetToDelete, setWorksheetToDelete] = useState<WorksheetEntity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startConfirmation = useCallback((worksheet: WorksheetEntity) => {
    setWorksheetToDelete(worksheet);
    setIsConfirming(true);
    setError(null);
  }, []);

  const cancelConfirmation = useCallback(() => {
    setIsConfirming(false);
    setWorksheetToDelete(null);
    setError(null);
    setIsDeleting(false);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const confirmDeletion = useCallback(async () => {
    if (!worksheetToDelete || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await onDelete(worksheetToDelete.worksheetId);
      setIsConfirming(false);
      setWorksheetToDelete(null);
      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete sheet';
      setError(errorMessage);
      onError?.(err instanceof Error ? err : new Error(errorMessage));
    } finally {
      setIsDeleting(false);
    }
  }, [worksheetToDelete, isDeleting, onDelete, onSuccess, onError]);

  return {
    isConfirming,
    worksheetToDelete,
    isDeleting,
    error,
    startConfirmation,
    cancelConfirmation,
    confirmDeletion,
    clearError,
  };
}
