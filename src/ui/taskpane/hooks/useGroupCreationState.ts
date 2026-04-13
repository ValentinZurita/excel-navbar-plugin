import { useCallback, useState } from 'react';
import type { GroupColorToken } from '../../../domain/navigation/types';

interface UseGroupCreationStateOptions {
  onCreateGroup: (name: string, colorToken: GroupColorToken, initialWorksheetId?: string) => void;
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
    (name: string, colorToken: GroupColorToken) => {
      if (!name.trim()) {
        return;
      }

      onCreateGroup(name.trim(), colorToken, initialWorksheetId);
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
