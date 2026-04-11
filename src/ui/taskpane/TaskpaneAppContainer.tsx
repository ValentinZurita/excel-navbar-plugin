import { useState } from 'react';
import { useNavigationController } from '../../application/navigation/useNavigationController';
import { TaskpaneShell } from '../components/TaskpaneShell';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { TextPromptDialog } from '../components/TextPromptDialog';
import type { WorksheetEntity } from '../../domain/navigation/types';
import { TaskpaneMenus } from './components/TaskpaneMenus';
import { TaskpaneSections } from './components/TaskpaneSections';
import { useContextMenus } from './hooks/useContextMenus';
import { useWorksheetDnD } from './hooks/useWorksheetDnD';
import { useTextPromptState } from './hooks/useTextPromptState';

export function TaskpaneAppContainer() {
  // The controller owns workbook operations and domain state transitions.
  const controller = useNavigationController();
  const [deleteGroupRequest, setDeleteGroupRequest] = useState<{ groupId: string; groupName: string } | null>(null);

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

  const dragAndDrop = useWorksheetDnD({
    navigatorView: controller.navigatorView,
    worksheetsById: controller.state.worksheetsById,
    assignWorksheetToGroup: controller.assignWorksheetToGroup,
    removeWorksheetFromGroup: controller.removeWorksheetFromGroup,
    reorderGroupWorksheet: controller.reorderGroupWorksheet,
    reorderSheetSectionWorksheet: controller.reorderSheetSectionWorksheet,
    setGroupCollapsed: controller.setGroupCollapsed,
  });

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
    setDeleteGroupRequest({ groupId, groupName });
  }

  function closeDeleteGroupDialog() {
    setDeleteGroupRequest(null);
  }

  function confirmDeleteGroup() {
    if (!deleteGroupRequest) {
      return;
    }

    controller.deleteGroup(deleteGroupRequest.groupId);
    setDeleteGroupRequest(null);
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
        dragConfig={{
          sensors: dragAndDrop.sensors,
          activeWorksheetId: dragAndDrop.activeWorksheetId,
          activeWorksheet: dragAndDrop.activeWorksheet,
          projectedDropTarget: dragAndDrop.projectedDropTarget,
          isDragActive: Boolean(dragAndDrop.activeWorksheetId),
          getContainerWorksheets: dragAndDrop.getContainerWorksheets,
          shouldSuppressActivation: dragAndDrop.shouldSuppressActivation,
          onDragStart: dragAndDrop.onDragStart,
          onDragOver: dragAndDrop.onDragOver,
          onDragEnd: dragAndDrop.onDragEnd,
          onDragCancel: dragAndDrop.onDragCancel,
        }}
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
        onCloseMenus={closeMenus}
        onTogglePin={handleTogglePin}
        onToggleVisibility={handleToggleVisibility}
        onRenameWorksheet={(worksheet) => openRenameWorksheetPrompt(worksheet.worksheetId, worksheet.name)}
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

      {/* Product-owned confirmation keeps delete flow aligned with the rest of the UI. */}
      <ConfirmDialog
        isOpen={Boolean(deleteGroupRequest)}
        title="Delete group"
        description={
          deleteGroupRequest
            ? `Delete ${deleteGroupRequest.groupName}? Sheets will become ungrouped.`
            : undefined
        }
        confirmLabel="Delete group"
        onCancel={closeDeleteGroupDialog}
        onConfirm={confirmDeleteGroup}
      />
    </TaskpaneShell>
  );
}
