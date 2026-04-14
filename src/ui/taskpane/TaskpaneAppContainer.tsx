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
import { useGroupCreationState } from './hooks/useGroupCreationState';
import { pinnedSectionPolicy } from './dnd/dndPolicies';

export function TaskpaneAppContainer() {
  // The controller owns workbook operations and domain state transitions.
  const controller = useNavigationController();
  const [deleteGroupRequest, setDeleteGroupRequest] = useState<{ groupId: string; groupName: string } | null>(null);
  const [hoveredWorksheetId, setHoveredWorksheetId] = useState<string | null>(null);

  // Inline rename state for worksheets and groups (replaces dialog-based rename).
  const [renamingWorksheetId, setRenamingWorksheetId] = useState<string | null>(null);
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);

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
    openRenameWorksheetPrompt,
    openRenameGroupPrompt,
    submitTextPrompt,
  } = useTextPromptState({
    closeMenus,
    renameGroup: controller.renameGroup,
    renameWorksheet: controller.renameWorksheet,
  });

  // Inline group creation state (replaces the dialog-based create-group flow).
  const {
    isCreating,
    startCreating: startCreatingGroup,
    cancelCreating: cancelCreatingGroup,
    confirmCreating: confirmCreatingGroup,
  } = useGroupCreationState({ onCreateGroup: controller.createGroup, onSuccess: closeMenus });

  // Close menus and reset creation state when closing from outside.
  function handleCloseMenus() {
    closeMenus();
    if (isCreating) {
      cancelCreatingGroup();
    }
  }

  const dragAndDrop = useWorksheetDnD({
    assignWorksheetToGroup: controller.assignWorksheetToGroup,
    removeWorksheetFromGroup: controller.removeWorksheetFromGroup,
    reorderGroupWorksheet: controller.reorderGroupWorksheet,
    reorderSheetSectionWorksheet: controller.reorderSheetSectionWorksheet,
    reorderPinnedWorksheet: controller.reorderPinnedWorksheet,
    policy: pinnedSectionPolicy,
    policyState: { worksheetsById: controller.state.worksheetsById },
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

  // Inline rename handlers for worksheets.
  function handleRenameWorksheetStart(worksheet: WorksheetEntity) {
    closeMenus();
    setRenamingWorksheetId(worksheet.worksheetId);
  }

  async function handleRenameWorksheetSubmit(worksheetId: string, newName: string) {
    await controller.renameWorksheet(worksheetId, newName);
    setRenamingWorksheetId(null);
  }

  function handleRenameWorksheetCancel() {
    setRenamingWorksheetId(null);
  }

  // Inline rename handlers for groups.
  function handleRenameGroupStart(groupId: string, groupName: string) {
    closeMenus();
    setRenamingGroupId(groupId);
  }

  function handleRenameGroupSubmit(groupId: string, newName: string) {
    controller.renameGroup(groupId, newName);
    setRenamingGroupId(null);
  }

  function handleRenameGroupCancel() {
    setRenamingGroupId(null);
  }

  return (
    <TaskpaneShell banner={controller.banner}>
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
        renamingWorksheetId={renamingWorksheetId}
        renamingGroupId={renamingGroupId}
        isSessionOnlyPersistence={controller.isSessionOnlyPersistence}
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
        onRenameWorksheetSubmit={handleRenameWorksheetSubmit}
        onRenameGroupSubmit={handleRenameGroupSubmit}
        onRenameCancel={() => {
          handleRenameWorksheetCancel();
          handleRenameGroupCancel();
        }}
      />

      {/* Right-click context menus for worksheet and group actions. */}
      <TaskpaneMenus
        activeMenu={activeMenu}
        onCloseMenus={handleCloseMenus}
        onTogglePin={handleTogglePin}
        onToggleVisibility={handleToggleVisibility}
        onRenameWorksheet={handleRenameWorksheetStart}
        onRemoveFromGroup={controller.removeWorksheetFromGroup}
        onStartCreatingGroup={startCreatingGroup}
        onRenameGroup={handleRenameGroupStart}
        onDeleteGroup={handleDeleteGroup}
        onSetGroupColor={controller.setGroupColor}
        isCreatingGroup={isCreating}
        onCancelCreatingGroup={cancelCreatingGroup}
        onConfirmCreatingGroup={confirmCreatingGroup}
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
