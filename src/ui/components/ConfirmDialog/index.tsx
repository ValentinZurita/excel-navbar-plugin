import { useEffect, useId } from 'react';
import './promptDialog.css';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCancel();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="prompt-dialog-layer"
      onClick={onCancel}
      onContextMenu={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <section
        className="prompt-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onClick={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.stopPropagation()}
      >
        <header className="prompt-dialog-header">
          <h2 id={titleId} className="prompt-dialog-title">{title}</h2>
          {description ? (
            <p id={descriptionId} className="prompt-dialog-description">{description}</p>
          ) : null}
        </header>

        <div className="prompt-dialog-actions">
          <button type="button" className="ghost-button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              void onConfirm();
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
