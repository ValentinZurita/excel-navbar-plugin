import { useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { GroupColorToken } from '../../../domain/navigation/types';
import { selectableGroupColorTokens } from '../../../domain/navigation/constants';
import './InlineGroupCreator.css';

// Token-to-CSS class map for the color chips.
const colorChipClasses: Record<GroupColorToken, string> = {
  none: 'inline-group-creator-color-none',
  green: 'inline-group-creator-color-green',
  blue: 'inline-group-creator-color-blue',
  red: 'inline-group-creator-color-red',
  purple: 'inline-group-creator-color-purple',
  yellow: 'inline-group-creator-color-yellow',
};

interface InlineGroupCreatorProps {
  onCreate: (name: string, colorToken: GroupColorToken) => void;
  onCancel: () => void;
  onCloseMenu: () => void;
  autoFocus?: boolean;
  defaultColor?: GroupColorToken;
}

// Inline group creation UI shown inside the sheet navigator.
// Handles focus, keyboard submit, and color selection while typing a new group name.
export function InlineGroupCreator({ onCreate, onCancel, onCloseMenu, autoFocus = true, defaultColor = 'none' }: InlineGroupCreatorProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState<GroupColorToken>(defaultColor);

  // Focus once after mount, synchronously before paint. Avoids a deferred rAF focus
  // racing after Tab and stealing focus from color chips (flaky tests / keyboard flows).
  useLayoutEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
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
        onCreate(trimmed, selectedColor);
      }
    }
  }

  function handleColorClick(color: GroupColorToken) {
    setSelectedColor(color);
  }

  function handleColorKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, color: GroupColorToken) {
    // Ignore Enter while the user is composing IME input.
    if (event.nativeEvent.isComposing) {
      return;
    }

    if (event.key === 'Enter') {
      const trimmed = name.trim();
      if (trimmed) {
        event.preventDefault();
        // Use the color of the focused chip, not the selectedColor state
        onCreate(trimmed, color);
      }
    }
  }

  return (
    <div className="inline-group-creator">
      <input
        ref={inputRef}
        className="inline-group-creator-input"
        type="text"
        value={name}
        aria-label="Name"
        onChange={(event) => setName(event.target.value)}
        onKeyDown={handleInputKeyDown}
        spellCheck={false}
      />

      {/* Color palette chips - selectable */}
      <div
        className="inline-group-creator-colors"
        role="group"
        aria-label="Color options"
      >
        {selectableGroupColorTokens.map((color) => (
          <button
            key={color}
            type="button"
            tabIndex={0}
            className={`inline-group-creator-color ${colorChipClasses[color]} ${
              selectedColor === color ? 'inline-group-creator-color-selected' : ''
            }`}
            aria-label={color === 'none' ? 'No color' : `Color ${color}`}
            aria-pressed={selectedColor === color}
            onClick={() => handleColorClick(color)}
            onKeyDown={(event) => handleColorKeyDown(event, color)}
          />
        ))}
      </div>
    </div>
  );
}