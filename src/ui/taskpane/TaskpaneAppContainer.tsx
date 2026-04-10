import { useMemo } from 'react';
import { useNavigationController } from '../../application/navigation/useNavigationController';
import { TaskpaneShell } from '../components/TaskpaneShell';
import { TextPromptDialog } from '../components/TextPromptDialog';
import type { WorksheetEntity } from '../../domain/navigation/types';
import { TaskpaneMenus } from './components/TaskpaneMenus';
import { TaskpaneSections } from './components/TaskpaneSections';
import { useContextMenus } from './hooks/useContextMenus';
import { useTextPromptState } from './hooks/useTextPromptState';

export function TaskpaneAppContainer() {
  // The controller owns workbook operations and domain state transitions.
  const controller = useNavigationController();

  // Context menus are isolated in a dedicated hook so view code stays simple.
  const {
    sheetMenu,
    groupMenu,
    contextMenuOpenSheetId,
    contextMenuOpenGroupId,
    closeMenus,
    openSheetMenu,
    openGroupMenu,
  } = useContextMenus();

  // All create/rename prompts are centralized in one state machine.
  const {
    textPrompt,
    textPromptConfig,
    closeTextPrompt,
    openCreateGroupPrompt,
    openRenameWorksheetPrompt,
    openRenameGroupPrompt,
    submitTextPrompt,
  } = useTextPromptState({
    closeMenus,
    createGroup: controller.createGroup,
    renameGroup: controller.renameGroup,
    renameWorksheet: controller.renameWorksheet,
  });

  // Precompute visible groups once per state update for menu rendering.
  const availableGroupOptions = useMemo(
    () =>
      controller.state.groupOrder
        .map((groupId) => controller.state.groupsById[groupId])
        .filter((group): group is NonNullable<typeof group> => Boolean(group)),
    [controller.state.groupOrder, controller.state.groupsById],
  );

  async function activateWorksheetFromSearch(worksheetId: string) {
    await controller.activateWorksheet(worksheetId);
    controller.setQuery('');
  }

  function handleTogglePin(worksheet: WorksheetEntity) {
    if (worksheet.isPinned) {
      controller.unpinWorksheet(worksheet.worksheetId);
      return;
    }

    controller.pinWorksheet(worksheet.worksheetId);
  }

  function handleToggleVisibility(worksheet: WorksheetEntity) {
    if (worksheet.visibility === 'Visible') {
      void controller.hideWorksheet(worksheet.worksheetId);
      return;
    }

    void controller.unhideWorksheet(worksheet.worksheetId);
  }

  function handleDeleteGroup(groupId: string, groupName: string) {
    if (window.confirm(`Delete ${groupName}? Sheets will become ungrouped.`)) {
      controller.deleteGroup(groupId);
    }
  }

  return (
    <TaskpaneShell errorMessage={controller.errorMessage}>
      {/* Main taskpane navigation sections (search, pinned, groups, hidden). */}
      <TaskpaneSections
        query={controller.state.query}
        searchResults={controller.navigatorView.searchResults}
        navigatorView={controller.navigatorView}
        activeWorksheetId={controller.state.activeWorksheetId}
        isHiddenSectionCollapsed={controller.state.hiddenSectionCollapsed}
        contextMenuOpenSheetId={contextMenuOpenSheetId}
        contextMenuOpenGroupId={contextMenuOpenGroupId}
        onChangeQuery={controller.setQuery}
        onSelectSearchResult={activateWorksheetFromSearch}
        onActivateWorksheet={controller.activateWorksheet}
        onPinWorksheet={controller.pinWorksheet}
        onUnpinWorksheet={controller.unpinWorksheet}
        onToggleGroupCollapsed={controller.toggleGroupCollapsed}
        onToggleHiddenSection={controller.toggleHiddenSection}
        onUnhideWorksheet={controller.unhideWorksheet}
        onOpenSheetMenu={openSheetMenu}
        onOpenGroupMenu={openGroupMenu}
      />

      {/* Right-click context menus for worksheet and group actions. */}
      <TaskpaneMenus
        sheetMenu={sheetMenu}
        groupMenu={groupMenu}
        availableGroupOptions={availableGroupOptions}
        onCloseMenus={closeMenus}
        onTogglePin={handleTogglePin}
        onToggleVisibility={handleToggleVisibility}
        onRenameWorksheet={(worksheet) => openRenameWorksheetPrompt(worksheet.worksheetId, worksheet.name)}
        onMoveToGroup={controller.assignWorksheetToGroup}
        onRemoveFromGroup={controller.removeWorksheetFromGroup}
        onCreateGroup={openCreateGroupPrompt}
        onRenameGroup={openRenameGroupPrompt}
        onDeleteGroup={handleDeleteGroup}
      />

      {/* Shared dialog used by create group and rename flows. */}
      <TextPromptDialog
        isOpen={Boolean(textPrompt && textPromptConfig)}
        title={textPromptConfig?.title ?? ''}
        description={textPromptConfig?.description}
        initialValue={textPrompt?.initialValue ?? ''}
        placeholder={textPromptConfig?.placeholder}
        submitLabel={textPromptConfig?.submitLabel ?? 'Save'}
        onCancel={closeTextPrompt}
        onSubmit={submitTextPrompt}
      />
    </TaskpaneShell>
  );
}
