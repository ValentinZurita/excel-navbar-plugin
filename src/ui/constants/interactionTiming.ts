/**
 * Max delay (ms) between two primary-button clicks to start inline **worksheet** rename
 * (sheet rows and search results). Group headers use plain click-to-toggle only.
 * Tighter than typical OS double-click (~500ms); slower pairs are separate single clicks.
 */
export const FAST_DOUBLE_CLICK_RENAME_MS = 280;
