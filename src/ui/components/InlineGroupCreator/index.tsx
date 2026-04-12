import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import './InlineGroupCreator.css';

interface InlineGroupCreatorProps {
  onCreate: (name: string) => void;
  onCancel: () => void;
  onCloseMenu: () => void;
  autoFocus?: boolean;
}

// Inline group creation UI shown inside the sheet navigator.
// Handles focus, keyboard submit, and cancel behavior while typing a new group name.
export function InlineGroupCreator({ onCreate, onCancel, onCloseMenu, autoFocus = true }: InlineGroupCreatorProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState('');
  const inputId = useId();

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
      <input
        ref={inputRef}
        id={inputId}
        className="inline-group-creator-input"
        type="text"
        value={name}
        placeholder=""
        onChange={(event) => setName(event.target.value)}
        onKeyDown={handleInputKeyDown}
        autoFocus={autoFocus}
        spellCheck={false}
      />

      {/* Color palette chips below the input; currently shown as non-interactive decorations. */}
      <div className="inline-group-creator-colors">
        <span className="inline-group-creator-color inline-group-creator-color-gray" />
        <span className="inline-group-creator-color inline-group-creator-color-green" />
        <span className="inline-group-creator-color inline-group-creator-color-blue" />
        <span className="inline-group-creator-color inline-group-creator-color-red" />
        <span className="inline-group-creator-color inline-group-creator-color-purple" />
        <span className="inline-group-creator-color inline-group-creator-color-yellow" />
      </div>

      {hasContent && (
        <span className="inline-group-creator-hint">Press Enter to create</span>
      )}
    </div>
  );
}