import type { ShortcutActionIdValue } from './ShortcutRegistry';

/** Describes a shortcut action handler to be registered with Office.actions.associate. */
export interface ShortcutAction {
  /** Must match an action ID from shortcuts.json and ShortcutRegistry */
  id: ShortcutActionIdValue;
  /** Human-readable description for logging/debugging */
  description: string;
  /** The handler to invoke when the shortcut fires */
  handler: () => void | Promise<void>;
}
