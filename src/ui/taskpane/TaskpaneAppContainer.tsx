import { useCallback, useMemo, useState } from 'react';
import { useNavigationController } from '../../application/navigation/useNavigationController';
import { TaskpaneShell } from '../components/TaskpaneShell';
import { AddWorksheetFab } from '../components/AddWorksheetFab';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { TextPromptDialog } from '../components/TextPromptDialog';
import type { WorksheetEntity } from '../../domain/navigation/types';
import { TaskpaneMenus } from './components/TaskpaneMenus';
import { TaskpaneSections } from './components/TaskpaneSections';
import { useContextMenus } from './hooks/useContextMenus';
import { useWorksheetDnD } from './hooks/useWorksheetDnD';
import { useTextPromptState } from './hooks/useTextPromptState';
import { useGroupCreationState } from './hooks/useGroupCreationState';
import { useDeleteConfirmationState } from './hooks/useDeleteConfirmationState';
import { pinnedSectionPolicy } from './dnd/dndPolicies';

export function TaskpaneAppContainer() {
  // The controller owns workbook operations and domain state transitions.
  const controller = useNavigationController();
  const [deleteGroupRequest, setDeleteGroupRequest] = useState<{ groupId: string; groupName: string } | null>(null);

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

  // Inline delete confirmation state.
  const {
    isConfirming: isConfirmingDelete,
    worksheetToDelete,
    startConfirmation: startDeleteConfirmation,
    cancelConfirmation: cancelDeleteConfirmation,
    confirmDeletion: confirmDelete,
    isDeleting,
    error: deleteError,
  } = useDeleteConfirmationState({
    onDelete: controller.deleteWorksheet,
    onSuccess: closeMenus,
  });

  // Close menus and reset creation/confirmation state when closing from outside.
  const handleCloseMenus = useCallback(() => {
    closeMenus();
    if (isCreating) {
      cancelCreatingGroup();
    }
    if (isConfirmingDelete) {
      cancelDeleteConfirmation();
    }
  }, [cancelCreatingGroup, cancelDeleteConfirmation, closeMenus, isConfirmingDelete, isCreating]);

  // Mutually exclusive: starting one cancels the other
  const handleStartCreatingGroup = useCallback((worksheetId?: string) => {
    if (isConfirmingDelete) {
      cancelDeleteConfirmation();
    }
    startCreatingGroup(worksheetId);
  }, [cancelDeleteConfirmation, isConfirmingDelete, startCreatingGroup]);

  const handleStartDeleteConfirmation = useCallback((worksheet: WorksheetEntity) => {
    if (isCreating) {
      cancelCreatingGroup();
    }
    startDeleteConfirmation(worksheet);
  }, [cancelCreatingGroup, isCreating, startDeleteConfirmation]);

  const dragPolicyState = useMemo(() => ({
    worksheetsById: controller.state.worksheetsById,
  }), [controller.state.worksheetsById]);

  const dragAndDrop = useWorksheetDnD({
    assignWorksheetToGroup: controller.assignWorksheetToGroup,
    removeWorksheetFromGroup: controller.removeWorksheetFromGroup,
    reorderGroupWorksheet: controller.reorderGroupWorksheet,
    reorderSheetSectionWorksheet: controller.reorderSheetSectionWorksheet,
    reorderPinnedWorksheet: controller.reorderPinnedWorksheet,
    policy: pinnedSectionPolicy,
    policyState: dragPolicyState,
  });
  const activeDragWorksheet = dragAndDrop.activeWorksheetId
    ? controller.state.worksheetsById[dragAndDrop.activeWorksheetId] ?? null
    : null;

  const activateWorksheetFromSearch = useCallback(async (worksheetId: string) => {
    await controller.activateWorksheet(worksheetId);
    controller.setQuery('');
  }, [controller.activateWorksheet, controller.setQuery]);

  const handleTogglePin = useCallback((worksheet: WorksheetEntity) => {
    if (worksheet.isPinned) {
      controller.unpinWorksheet(worksheet.worksheetId);
      return;
    }

    controller.pinWorksheet(worksheet.worksheetId);
  }, [controller.pinWorksheet, controller.unpinWorksheet]);

  const handleToggleVisibility = useCallback((worksheet: WorksheetEntity) => {
    if (worksheet.visibility === 'Visible') {
      void controller.hideWorksheet(worksheet.worksheetId);
      return;
    }

    void controller.unhideWorksheet(worksheet.worksheetId);
  }, [controller.hideWorksheet, controller.unhideWorksheet]);

  const handleDeleteGroup = useCallback((groupId: string, groupName: string) => {
    setDeleteGroupRequest({ groupId, groupName });
  }, []);

  const closeDeleteGroupDialog = useCallback(() => {
    setDeleteGroupRequest(null);
  }, []);

  const confirmDeleteGroup = useCallback(() => {
    if (!deleteGroupRequest) {
      return;
    }

    controller.deleteGroup(deleteGroupRequest.groupId);
    setDeleteGroupRequest(null);
  }, [controller.deleteGroup, deleteGroupRequest]);

  // Inline rename handlers for worksheets.
  const handleRenameWorksheetStart = useCallback((worksheet: WorksheetEntity) => {
    closeMenus();
    setRenamingWorksheetId(worksheet.worksheetId);
  }, [closeMenus]);

  const handleRenameWorksheetSubmit = useCallback(async (worksheetId: string, newName: string) => {
    await controller.renameWorksheet(worksheetId, newName);
    setRenamingWorksheetId(null);
  }, [controller.renameWorksheet]);

  const handleRenameWorksheetCancel = useCallback(() => {
    setRenamingWorksheetId(null);
  }, []);

  // Inline rename handlers for groups.
  const handleRenameGroupStart = useCallback((groupId: string, _groupName: string) => {
    closeMenus();
    setRenamingGroupId(groupId);
  }, [closeMenus]);

  const handleRenameGroupSubmit = useCallback((groupId: string, newName: string) => {
    controller.renameGroup(groupId, newName);
    setRenamingGroupId(null);
  }, [controller.renameGroup]);

  const handleRenameGroupCancel = useCallback(() => {
    setRenamingGroupId(null);
  }, []);

  const handleRenameCancel = useCallback(() => {
    handleRenameWorksheetCancel();
    handleRenameGroupCancel();
  }, [handleRenameGroupCancel, handleRenameWorksheetCancel]);

  const dragConfig = useMemo(() => ({
    activeDragWorksheet,
    sensors: dragAndDrop.sensors,
    projectedDropTarget: dragAndDrop.projectedDropTarget,
    flashedGroupId: dragAndDrop.flashedGroupId,
    isDragActive: Boolean(dragAndDrop.activeWorksheetId),
    shouldSuppressActivation: dragAndDrop.shouldSuppressActivation,
    onDragStart: dragAndDrop.onDragStart,
    onDragOver: dragAndDrop.onDragOver,
    onDragEnd: dragAndDrop.onDragEnd,
    onDragCancel: dragAndDrop.onDragCancel,
  }), [
    activeDragWorksheet,
    dragAndDrop.activeWorksheetId,
    dragAndDrop.flashedGroupId,
    dragAndDrop.onDragCancel,
    dragAndDrop.onDragEnd,
    dragAndDrop.onDragOver,
    dragAndDrop.onDragStart,
    dragAndDrop.projectedDropTarget,
    dragAndDrop.sensors,
    dragAndDrop.shouldSuppressActivation,
  ]);

  return (
    <TaskpaneShell banner={controller.banner}>
      {/* Main taskpane navigation sections (search, pinned, groups, hidden). */}
      <TaskpaneSections
        query={controller.state.query}
        searchResults={controller.navigatorView.searchResults}
        navigatorView={controller.navigatorView}
        activeWorksheetId={controller.state.activeWorksheetId}
        isHiddenSectionCollapsed={controller.state.hiddenSectionCollapsed}
        contextMenuOpenSheetId={contextMenuOpenSheetId}
        contextMenuOpenGroupId={contextMenuOpenGroupId}
        renamingWorksheetId={renamingWorksheetId}
        renamingGroupId={renamingGroupId}
        isSessionOnlyPersistence={controller.isSessionOnlyPersistence}
        dragConfig={dragConfig}
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
        onRenameWorksheetSubmit={handleRenameWorksheetSubmit}
        onRenameGroupSubmit={handleRenameGroupSubmit}
        onRenameCancel={handleRenameCancel}
      />

      {!dragAndDrop.activeWorksheetId ? (
        <AddWorksheetFab
          onClick={controller.createWorksheet}
          disabled={controller.isBusy}
        />
      ) : null}

      {/* Right-click context menus for worksheet and group actions. */}
      <TaskpaneMenus
        activeMenu={activeMenu}
        onCloseMenus={handleCloseMenus}
        onTogglePin={handleTogglePin}
        onToggleVisibility={handleToggleVisibility}
        onRenameWorksheet={handleRenameWorksheetStart}
        onRemoveFromGroup={controller.removeWorksheetFromGroup}
        onStartCreatingGroup={handleStartCreatingGroup}
        onRenameGroup={handleRenameGroupStart}
        onDeleteGroup={handleDeleteGroup}
        onSetGroupColor={controller.setGroupColor}
        isCreatingGroup={isCreating}
        onCancelCreatingGroup={cancelCreatingGroup}
        onConfirmCreatingGroup={confirmCreatingGroup}
        isConfirmingDelete={isConfirmingDelete}
        worksheetToDelete={worksheetToDelete}
        onStartDeleteConfirmation={handleStartDeleteConfirmation}
        onCancelDeleteConfirmation={cancelDeleteConfirmation}
        onConfirmDelete={confirmDelete}
        isDeleting={isDeleting}
        deleteError={deleteError}
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
