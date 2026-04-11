import { useCallback, useState } from 'react';

interface UseGroupCreationStateOptions {
  onCreateGroup: (name: string, initialWorksheetId?: string) => void;
  onSuccess?: () => void;
}

export function useGroupCreationState({ onCreateGroup, onSuccess }: UseGroupCreationStateOptions) {
  const [isCreating, setIsCreating] = useState(false);
  const [initialWorksheetId, setInitialWorksheetId] = useState<string | undefined>(undefined);

  const startCreating = useCallback((worksheetId?: string) => {
    setInitialWorksheetId(worksheetId);
    setIsCreating(true);
  }, []);

  const cancelCreating = useCallback(() => {
    setIsCreating(false);
    setInitialWorksheetId(undefined);
  }, []);

  const confirmCreating = useCallback(
    (name: string) => {
      if (!name.trim()) {
        return;
      }

      onCreateGroup(name.trim(), initialWorksheetId);
      setIsCreating(false);
      setInitialWorksheetId(undefined);
      onSuccess?.();
    },
    [onCreateGroup, initialWorksheetId, onSuccess],
  );

  return {
    isCreating,
    initialWorksheetId,
    startCreating,
    cancelCreating,
    confirmCreating,
  };
}
