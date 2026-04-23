import { useEffect, useCallback, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import './InlineDeleteConfirmation.css';

interface InlineDeleteConfirmationProps {
  worksheetName?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmAriaLabel?: string;
  cancelAriaLabel?: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  onCloseMenu: () => void;
  isDeleting?: boolean;
  error?: string | null;
}

export function InlineDeleteConfirmation({
  worksheetName,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  confirmAriaLabel,
  cancelAriaLabel = 'Cancel deletion',
  onConfirm,
  onCancel,
  onCloseMenu,
  isDeleting = false,
  error = null,
}: InlineDeleteConfirmationProps) {
  const deletingLabel = confirmLabel === 'Delete' ? 'Deleting...' : `${confirmLabel}...`;
  // Handle keyboard interactions
  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      // Ignore while IME composing
      if (event.nativeEvent.isComposing) {
        return;
      }

      if (event.key === 'Escape') {
        if (isDeleting) {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        onCancel();
        onCloseMenu();
        return;
      }

      if (event.key === 'Enter' && !isDeleting) {
        event.preventDefault();
        void onConfirm();
      }
    },
    [isDeleting, onCancel, onCloseMenu, onConfirm],
  );

  // Auto-focus the confirm button on mount
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const confirmButton = document.querySelector(
        '.inline-delete-confirm',
      ) as HTMLButtonElement | null;
      confirmButton?.focus();
    }, 10);

    return () => window.clearTimeout(timer);
  }, []);

  const handleCancelClick = () => {
    onCancel();
  };

  const handleConfirmClick = () => {
    void onConfirm();
  };

  return (
    <div
      className="inline-delete-confirmation"
      onKeyDown={handleKeyDown}
      role="alertdialog"
      aria-live="polite"
    >
      <p className="inline-delete-message">{message ?? `Delete '${worksheetName ?? ''}'?`}</p>

      {error && <p className="inline-delete-error">{error}</p>}

      <div className="inline-delete-actions">
        <button
          type="button"
          className="inline-delete-button inline-delete-cancel"
          onClick={handleCancelClick}
          disabled={isDeleting}
          aria-label={cancelAriaLabel}
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          className="inline-delete-button inline-delete-confirm"
          onClick={handleConfirmClick}
          disabled={isDeleting}
          aria-label={confirmAriaLabel ?? `Confirm deletion of ${worksheetName ?? 'item'}`}
          autoFocus
        >
          {isDeleting ? deletingLabel : confirmLabel}
        </button>
      </div>
    </div>
  );
}
