import { useCallback, useState } from 'react';
import type { GroupMenuState, OpenGroupMenuArgs, OpenSheetMenuArgs, SheetMenuState } from '../types/contextMenuTypes';

export function useContextMenus() {
  // Only one context menu can be visible at a time.
  const [sheetMenu, setSheetMenu] = useState<SheetMenuState | null>(null);
  const [groupMenu, setGroupMenu] = useState<GroupMenuState | null>(null);

  const closeMenus = useCallback(() => {
    setSheetMenu(null);
    setGroupMenu(null);
  }, []);

  const openSheetMenu = useCallback(({ x, y, worksheet }: OpenSheetMenuArgs) => {
    // Right-clicking the same worksheet toggles the menu off.
    setGroupMenu(null);
    setSheetMenu((currentMenu) => {
      if (currentMenu?.worksheet.worksheetId === worksheet.worksheetId) {
        return null;
      }

      return { x, y, worksheet };
    });
  }, []);

  const openGroupMenu = useCallback(({ x, y, groupId, groupName }: OpenGroupMenuArgs) => {
    setSheetMenu(null);
    setGroupMenu({ x, y, groupId, groupName });
  }, []);

  return {
    sheetMenu,
    groupMenu,
    contextMenuOpenSheetId: sheetMenu?.worksheet.worksheetId,
    contextMenuOpenGroupId: groupMenu?.groupId,
    closeMenus,
    openSheetMenu,
    openGroupMenu,
  };
}
