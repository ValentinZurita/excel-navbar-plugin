import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { GroupColorToken } from '../../../domain/navigation/types';
import './InlineGroupCreator.css';

// Mapeo de tokens a clases CSS para los chips
const colorChipClasses: Record<GroupColorToken, string> = {
  gray: 'inline-group-creator-color-gray',
  green: 'inline-group-creator-color-green',
  blue: 'inline-group-creator-color-blue',
  red: 'inline-group-creator-color-red',
  purple: 'inline-group-creator-color-purple',
  orange: 'inline-group-creator-color-orange',
};

// Orden de colores disponibles
const availableColors: GroupColorToken[] = ['blue', 'green', 'orange', 'purple', 'red', 'gray'];

interface InlineGroupCreatorProps {
  onCreate: (name: string, colorToken: GroupColorToken) => void;
  onCancel: () => void;
  onCloseMenu: () => void;
  autoFocus?: boolean;
  defaultColorIndex?: number;
}

// Inline group creation UI shown inside the sheet navigator.
// Handles focus, keyboard submit, and color selection while typing a new group name.
export function InlineGroupCreator({ onCreate, onCancel, onCloseMenu, autoFocus = true, defaultColorIndex = 0 }: InlineGroupCreatorProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState<GroupColorToken>(
    () => availableColors[defaultColorIndex % availableColors.length],
  );

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
        onCreate(trimmed, selectedColor);
      }
    }
  }

  function handleColorClick(color: GroupColorToken) {
    setSelectedColor(color);
  }

  const hasContent = name.trim().length > 0;

  return (
    <div className="inline-group-creator">
      <input
        ref={inputRef}
        className="inline-group-creator-input"
        type="text"
        value={name}
        aria-label="Name"
        placeholder="Group name"
        onChange={(event) => setName(event.target.value)}
        onKeyDown={handleInputKeyDown}
        autoFocus={autoFocus}
        spellCheck={false}
      />

      {/* Color palette chips - selectable */}
      <div
        className="inline-group-creator-colors"
        role="group"
        aria-label="Color options"
      >
        {availableColors.map((color) => (
          <button
            key={color}
            type="button"
            className={`inline-group-creator-color ${colorChipClasses[color]} ${
              selectedColor === color ? 'inline-group-creator-color-selected' : ''
            }`}
            aria-label={`Color ${color}`}
            aria-pressed={selectedColor === color}
            onClick={() => handleColorClick(color)}
          />
        ))}
      </div>

      {hasContent && (
        <span className="inline-group-creator-hint">Press Enter to create</span>
      )}
    </div>
  );
}