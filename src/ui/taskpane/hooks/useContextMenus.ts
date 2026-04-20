import { useCallback, useState } from 'react';
import type { ContextMenuState, OpenGroupMenuArgs, OpenSheetMenuArgs } from '../types/contextMenuTypes';

export function useContextMenus() {
  // Only one context menu can be visible at a time.
  const [activeMenu, setActiveMenu] = useState<ContextMenuState | null>(null);

  const closeMenus = useCallback(() => {
    setActiveMenu(null);
  }, []);

  const openSheetMenu = useCallback(({ x, y, worksheet, interaction = 'pointer' }: OpenSheetMenuArgs) => {
    const openedVia = interaction;
    setActiveMenu((currentMenu) => {
      // Pointer: right-clicking the same worksheet toggles the menu off.
      if (
        interaction === 'pointer'
        && currentMenu?.kind === 'sheet'
        && currentMenu.worksheet.worksheetId === worksheet.worksheetId
      ) {
        return null;
      }

      return { kind: 'sheet', x, y, worksheet, openedVia };
    });
  }, []);

  const openGroupMenu = useCallback(({ x, y, groupId, groupName, colorToken }: OpenGroupMenuArgs) => {
    setActiveMenu({ kind: 'group', x, y, groupId, groupName, colorToken });
  }, []);

  const sheetMenu = activeMenu?.kind === 'sheet' ? activeMenu : null;
  const groupMenu = activeMenu?.kind === 'group' ? activeMenu : null;

  return {
    activeMenu,
    sheetMenu,
    groupMenu,
    contextMenuOpenSheetId: sheetMenu?.worksheet.worksheetId,
    contextMenuOpenGroupId: groupMenu?.groupId,
    closeMenus,
    openSheetMenu,
    openGroupMenu,
  };
}
