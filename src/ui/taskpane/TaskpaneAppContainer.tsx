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
  const [hoveredWorksheetId, setHoveredWorksheetId] = useState<string | null>(null);

  // Context menus are isolated in a dedicated hook so view code stays simple.
  const {
    activeMenu,
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
    assignWorksheetToGroup: controller.assignWorksheetToGroup,
    removeWorksheetFromGroup: controller.removeWorksheetFromGroup,
    reorderGroupWorksheet: controller.reorderGroupWorksheet,
    reorderSheetSectionWorksheet: controller.reorderSheetSectionWorksheet,
  });
  const activeDragWorksheet = dragAndDrop.activeWorksheetId
    ? controller.state.worksheetsById[dragAndDrop.activeWorksheetId] ?? null
    : null;

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
        hoveredWorksheetId={hoveredWorksheetId}
        isHiddenSectionCollapsed={controller.state.hiddenSectionCollapsed}
        contextMenuOpenSheetId={contextMenuOpenSheetId}
        contextMenuOpenGroupId={contextMenuOpenGroupId}
        dragConfig={{
          activeDragWorksheet,
          sensors: dragAndDrop.sensors,
          projectedDropTarget: dragAndDrop.projectedDropTarget,
          flashedGroupId: dragAndDrop.flashedGroupId,
          isDragActive: Boolean(dragAndDrop.activeWorksheetId),
          shouldSuppressActivation: dragAndDrop.shouldSuppressActivation,
          onDragStart: (event) => {
            setHoveredWorksheetId(null);
            dragAndDrop.onDragStart(event);
          },
          onDragOver: dragAndDrop.onDragOver,
          onDragEnd: (event) => {
            setHoveredWorksheetId(null);
            dragAndDrop.onDragEnd(event);
          },
          onDragCancel: (event) => {
            setHoveredWorksheetId(null);
            dragAndDrop.onDragCancel(event);
          },
        }}
        onChangeQuery={controller.setQuery}
        onSelectSearchResult={activateWorksheetFromSearch}
        onActivateWorksheet={controller.activateWorksheet}
        onHoverWorksheet={setHoveredWorksheetId}
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
        activeMenu={activeMenu}
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
