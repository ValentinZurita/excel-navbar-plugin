import { useEffect, useId, useRef, useState } from 'react';
import './TextPromptDialog.css';

interface TextPromptDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  initialValue: string;
  placeholder?: string;
  submitLabel: string;
  cancelLabel?: string;
  onCancel: () => void;
  onSubmit: (value: string) => void | Promise<void>;
}

export function TextPromptDialog({
  isOpen,
  title,
  description,
  initialValue,
  placeholder,
  submitLabel,
  cancelLabel = 'Cancel',
  onCancel,
  onSubmit,
}: TextPromptDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setValue(initialValue);
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [initialValue, isOpen]);

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

  const trimmedValue = value.trim();

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

        <form
          className="prompt-dialog-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!trimmedValue) {
              return;
            }
            void onSubmit(trimmedValue);
          }}
        >
          <label className="prompt-dialog-field">
            <span className="prompt-dialog-label">Name</span>
            <input
              ref={inputRef}
              className="prompt-dialog-input"
              type="text"
              value={value}
              placeholder={placeholder}
              onChange={(event) => setValue(event.target.value)}
              spellCheck={false}
            />
          </label>

          <div className="prompt-dialog-actions">
            <button type="button" className="ghost-button" onClick={onCancel}>
              {cancelLabel}
            </button>
            <button type="submit" className="primary-button" disabled={!trimmedValue}>
              {submitLabel}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
