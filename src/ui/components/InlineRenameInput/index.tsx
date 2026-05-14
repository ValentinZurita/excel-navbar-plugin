import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import './InlineRenameInput.css';

interface InlineRenameInputProps {
  initialValue: string;
  onSubmit: (value: string) => void | Promise<void>;
  onCancel: () => void;
  autoFocus?: boolean;
  ariaLabel?: string;
  maxLength?: number;
  isInvalid?: boolean;
  onValueChange?: (value: string) => void;
  onMaxLengthReached?: () => void;
}

export function InlineRenameInput({
  initialValue,
  onSubmit,
  onCancel,
  autoFocus = true,
  ariaLabel = 'Name',
  maxLength,
  isInvalid = false,
  onValueChange,
  onMaxLengthReached,
}: InlineRenameInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState(initialValue);
  const effectiveMaxLength = typeof maxLength === 'number' ? Math.max(0, maxLength) : undefined;

  useEffect(() => {
    if (autoFocus) {
      window.requestAnimationFrame(() => {
        const input = inputRef.current;
        if (input) {
          input.focus();
          // Select all text as visual indicator of edit mode
          input.select();
        }
      });
    }
  }, [autoFocus]);

  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    // Keep keystrokes inside inline rename so parent row shortcuts
    // (Space/Enter activation) do not fire while editing.
    event.stopPropagation();

    // Ignore Enter/Escape while the user is composing IME input.
    if (event.nativeEvent.isComposing) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
      return;
    }

    if (event.key === 'Enter') {
      const trimmed = value.trim();
      if (trimmed) {
        event.preventDefault();
        void onSubmit(trimmed);
      }
    }
  }

  // Handle click outside - cancel rename
  function handlePointerDown(_event: React.PointerEvent) {
    // Don't prevent default - we want to allow blur to happen naturally
    // The onBlur handler will cancel if needed
  }

  return (
    <input
      ref={inputRef}
      className={`inline-rename-input ${isInvalid ? 'inline-rename-input-invalid' : ''}`}
      type="text"
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => {
        const nextValue = event.target.value;
        if (effectiveMaxLength === undefined) {
          setValue(nextValue);
          onValueChange?.(nextValue);
          return;
        }

        const clampedValue = nextValue.slice(0, effectiveMaxLength);
        setValue(clampedValue);
        onValueChange?.(clampedValue);

        if (nextValue.length > effectiveMaxLength) {
          onMaxLengthReached?.();
        }
      }}
      onKeyDown={handleKeyDown}
      onBlur={onCancel}
      onPointerDown={handlePointerDown}
      spellCheck={false}
    />
  );
}
