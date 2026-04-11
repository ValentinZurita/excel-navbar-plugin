import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import './InlineGroupCreator.css';

interface InlineGroupCreatorProps {
  onCreate: (name: string) => void;
  onCancel: () => void;
  onCloseMenu: () => void;
  autoFocus?: boolean;
}

export function InlineGroupCreator({ onCreate, onCancel, onCloseMenu, autoFocus = true }: InlineGroupCreatorProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState('');
  const inputId = useId();
  const labelId = useId();

  useEffect(() => {
    if (autoFocus) {
      window.requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [autoFocus]);

  function handleInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    // Ignore Enter/Escape while the user is composing IME input.
    if (event.nativeEvent.isComposing) {
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
      onCloseMenu();
      return;
    }

    if (event.key === 'Enter') {
      const trimmed = name.trim();
      if (trimmed) {
        event.preventDefault();
        onCreate(trimmed);
      }
    }
  }

  const hasContent = name.trim().length > 0;

  return (
    <div className="inline-group-creator">
      <label className="inline-group-creator-field" htmlFor={inputId}>
        <span id={labelId} className="inline-group-creator-label">Name</span>
        <input
          ref={inputRef}
          id={inputId}
          className="inline-group-creator-input"
          type="text"
          value={name}
          placeholder="Group name"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={handleInputKeyDown}
          autoFocus={autoFocus}
          aria-labelledby={labelId}
          spellCheck={false}
        />
      </label>

      <div className="inline-group-creator-colors" aria-label="Color options (coming soon)">
        <span className="inline-group-creator-color-placeholder" />
        <span className="inline-group-creator-color-placeholder" />
        <span className="inline-group-creator-color-placeholder" />
      </div>

      {hasContent && (
        <span className="inline-group-creator-hint">Press Enter to create</span>
      )}
    </div>
  );
}
