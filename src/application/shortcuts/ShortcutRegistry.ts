/** Known shortcut action IDs — must match shortcuts.json */
export const ShortcutActionId = {
  TOGGLE_TASKPANE: 'toggleTaskpane',
  FOCUS_SEARCH: 'focusSearch',
  CREATE_WORKSHEET: 'createWorksheet',
} as const;

export type ShortcutActionIdValue = (typeof ShortcutActionId)[keyof typeof ShortcutActionId];
