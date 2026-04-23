export type ContextMenuInteraction = 'pointer' | 'keyboard';

/**
 * Infer context-menu trigger source from browser event payload.
 * Keyboard menu key / Shift+F10 usually dispatches contextmenu with zeroed coords.
 */
export function inferContextMenuInteraction(event: {
  button: number;
  detail: number;
  clientX: number;
  clientY: number;
}): ContextMenuInteraction {
  const keyboardTriggered =
    event.button === 0 && event.detail === 0 && event.clientX === 0 && event.clientY === 0;
  return keyboardTriggered ? 'keyboard' : 'pointer';
}
