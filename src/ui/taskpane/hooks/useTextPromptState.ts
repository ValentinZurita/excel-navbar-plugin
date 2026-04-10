import { useCallback, useMemo, useState } from 'react';

interface UseTextPromptStateParams {
  closeMenus: () => void;
  createGroup: (name: string, initialWorksheetId?: string) => void;
  renameGroup: (groupId: string, name: string) => void;
  renameWorksheet: (worksheetId: string, name: string) => Promise<void>;
}

export type TextPromptState =
  | { kind: 'create-group'; initialValue: string; initialWorksheetId?: string }
  | { kind: 'rename-sheet'; worksheetId: string; initialValue: string }
  | { kind: 'rename-group'; groupId: string; initialValue: string };

interface TextPromptConfig {
  title: string;
  description: string;
  placeholder: string;
  submitLabel: string;
}

export function useTextPromptState({
  closeMenus,
  createGroup,
  renameGroup,
  renameWorksheet,
}: UseTextPromptStateParams) {
  // One prompt state drives all create/rename dialog variants.
  const [textPrompt, setTextPrompt] = useState<TextPromptState | null>(null);

  const closeTextPrompt = useCallback(() => {
    setTextPrompt(null);
  }, []);

  const openCreateGroupPrompt = useCallback((initialWorksheetId?: string) => {
    closeMenus();
    setTextPrompt({ kind: 'create-group', initialValue: '', initialWorksheetId });
  }, [closeMenus]);

  const openRenameWorksheetPrompt = useCallback((worksheetId: string, currentName: string) => {
    closeMenus();
    setTextPrompt({ kind: 'rename-sheet', worksheetId, initialValue: currentName });
  }, [closeMenus]);

  const openRenameGroupPrompt = useCallback((groupId: string, currentName: string) => {
    closeMenus();
    setTextPrompt({ kind: 'rename-group', groupId, initialValue: currentName });
  }, [closeMenus]);

  const submitTextPrompt = useCallback(async (nextValue: string) => {
    if (!textPrompt) {
      return;
    }

    const trimmedValue = nextValue.trim();
    if (!trimmedValue) {
      return;
    }

    const promptState = textPrompt;
    setTextPrompt(null);

    // Execute the side effect based on the active prompt mode.
    if (promptState.kind === 'create-group') {
      createGroup(trimmedValue, promptState.initialWorksheetId);
      return;
    }

    if (promptState.kind === 'rename-group') {
      renameGroup(promptState.groupId, trimmedValue);
      return;
    }

    await renameWorksheet(promptState.worksheetId, trimmedValue);
  }, [createGroup, renameGroup, renameWorksheet, textPrompt]);

  const textPromptConfig = useMemo<TextPromptConfig | null>(() => {
    // Keep dialog text in one place to avoid hardcoded labels in JSX.
    if (!textPrompt) {
      return null;
    }

    if (textPrompt.kind === 'create-group') {
      return {
        title: 'New group',
        description: 'Create a manual group for related sheets.',
        placeholder: 'Finance',
        submitLabel: 'Create group',
      };
    }

    if (textPrompt.kind === 'rename-sheet') {
      return {
        title: 'Rename sheet',
        description: 'Choose a clear worksheet name.',
        placeholder: 'Revenue',
        submitLabel: 'Save name',
      };
    }

    return {
      title: 'Rename group',
      description: 'Keep the group label short and scannable.',
      placeholder: 'Operations',
      submitLabel: 'Save name',
    };
  }, [textPrompt]);

  return {
    textPrompt,
    textPromptConfig,
    closeTextPrompt,
    openCreateGroupPrompt,
    openRenameWorksheetPrompt,
    openRenameGroupPrompt,
    submitTextPrompt,
  };
}
