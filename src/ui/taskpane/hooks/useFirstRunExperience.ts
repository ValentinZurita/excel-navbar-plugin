import { useCallback, useState } from 'react';
import {
  dismissFirstRunExperience as persistFirstRunDismissal,
  hasDismissedFirstRunExperience,
} from '../../../infrastructure/persistence/FirstRunExperienceRepository';

export function useFirstRunExperience() {
  const [isVisible, setIsVisible] = useState(() => !hasDismissedFirstRunExperience());

  const dismiss = useCallback(() => {
    setIsVisible(false);
    persistFirstRunDismissal();
  }, []);

  return { isVisible, dismiss };
}
