import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import './InlineRenameInput.css';

interface InlineRenameInputProps {
  initialValue: string;
  onSubmit: (value: string) => void | Promise<void>;
  onCancel: () => void;
  autoFocus?: boolean;
  ariaLabel?: string;
}

export function InlineRenameInput({
  initialValue,
  onSubmit,
  onCancel,
  autoFocus = true,
  ariaLabel = 'Name',
}: InlineRenameInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState(initialValue);

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
  function handlePointerDown(event: React.PointerEvent) {
    // Don't prevent default - we want to allow blur to happen naturally
    // The onBlur handler will cancel if needed
  }

  return (
    <input
      ref={inputRef}
      className="inline-rename-input"
      type="text"
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={onCancel}
      onPointerDown={handlePointerDown}
      spellCheck={false}
    />
  );
}
