import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigationController } from '../../application/navigation/useNavigationController';
import { TaskpaneShell } from '../components/TaskpaneShell';
import { UndoToast } from '../components/UndoToast';
import { AddWorksheetFab } from '../components/AddWorksheetFab';
import type { WorksheetEntity } from '../../domain/navigation/types';
import { TaskpaneMenus } from './components/TaskpaneMenus';
import { TaskpaneSections } from './components/TaskpaneSections';
import type { DeleteGroupRequest } from './types/contextMenuTypes';
import { WorksheetDeleteError } from '../../infrastructure/office/WorkbookAdapter';
import { useContextMenus } from './hooks/useContextMenus';
import { useWorksheetDnD } from './hooks/useWorksheetDnD';
import { useGroupCreationState } from './hooks/useGroupCreationState';
import { useDeleteConfirmationState } from './hooks/useDeleteConfirmationState';
import { usePersistenceBannerAutoDismiss } from './hooks/usePersistenceBannerAutoDismiss';
import { useUndoToastScheduler } from './hooks/useUndoToastScheduler';
import { pinnedSectionPolicy } from './dnd/dndPolicies';
import { useShortcutActions } from '../../application/shortcuts/useShortcutActions';
import { ShortcutActionId } from '../../application/shortcuts/ShortcutRegistry';
import type { ShortcutAction } from '../../application/shortcuts/types';

export function TaskpaneAppContainer() {
  // The controller owns workbook operations and domain state transitions.
  const controller = useNavigationController();
  const [deleteGroupRequest, setDeleteGroupRequest] = useState<DeleteGroupRequest | null>(null);
  const [isDeletingGroupSheets, setIsDeletingGroupSheets] = useState(false);
  const [deleteGroupSheetsError, setDeleteGroupSheetsError] = useState<string | null>(null);
  const { undoToast, scheduleUndoToast, dismissUndoToast } = useUndoToastScheduler();

  usePersistenceBannerAutoDismiss(controller.banner, controller.dismissBanner);

  // Search input ref lifted here so shortcuts can focus it programmatically.
  const searchInputRef = useRef<HTMLInputElement>(null);

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
    if (isDeletingGroupSheets) {
      return;
    }
    closeMenus();
    setDeleteGroupRequest(null);
    setDeleteGroupSheetsError(null);
    if (isCreating) {
      cancelCreatingGroup();
    }
    if (isConfirmingDelete) {
      cancelDeleteConfirmation();
    }
  }, [
    cancelCreatingGroup,
    cancelDeleteConfirmation,
    closeMenus,
    isConfirmingDelete,
    isCreating,
    isDeletingGroupSheets,
  ]);

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

  const handleAssignWorksheetToGroup = useCallback((worksheetId: string, groupId: string, targetIndex?: number) => {
    const worksheet = controller.state.worksheetsById[worksheetId];
    if (worksheet?.groupId) {
      const previousGroup = controller.state.groupsById[worksheet.groupId];
      if (previousGroup && previousGroup.worksheetOrder.length === 1) {
        const groupOrderIndex = controller.state.groupOrder.findIndex((candidateId) => candidateId === previousGroup.groupId);
        scheduleUndoToast({
          group: {
            ...previousGroup,
            worksheetOrder: [...previousGroup.worksheetOrder],
          },
          worksheetId,
          orderIndex: groupOrderIndex >= 0 ? groupOrderIndex : 0,
          message: `Group ${previousGroup.name} removed.`,
        });
      }
    }

    controller.assignWorksheetToGroup(worksheetId, groupId, targetIndex);
  }, [
    controller.assignWorksheetToGroup,
    controller.state.groupOrder,
    controller.state.groupsById,
    controller.state.worksheetsById,
    scheduleUndoToast,
  ]);

  const handleRemoveFromGroup = useCallback((worksheetId: string, targetIndex?: number) => {
    const worksheet = controller.state.worksheetsById[worksheetId];
    if (!worksheet?.groupId) {
      controller.removeWorksheetFromGroup(worksheetId, targetIndex);
      return;
    }

    const group = controller.state.groupsById[worksheet.groupId];
    if (group && group.worksheetOrder.length === 1) {
      const groupOrderIndex = controller.state.groupOrder.findIndex((groupId) => groupId === group.groupId);
      scheduleUndoToast({
        group: {
          ...group,
          worksheetOrder: [...group.worksheetOrder],
        },
        worksheetId,
        orderIndex: groupOrderIndex >= 0 ? groupOrderIndex : 0,
        message: `Group ${group.name} removed.`,
      });
    }

    controller.removeWorksheetFromGroup(worksheetId, targetIndex);
  }, [
    controller.removeWorksheetFromGroup,
    controller.state.groupOrder,
    controller.state.groupsById,
    controller.state.worksheetsById,
    scheduleUndoToast,
  ]);

  const dragPolicyState = useMemo(() => ({
    worksheetsById: controller.state.worksheetsById,
  }), [controller.state.worksheetsById]);

  const dragAndDrop = useWorksheetDnD({
    assignWorksheetToGroup: handleAssignWorksheetToGroup,
    removeWorksheetFromGroup: handleRemoveFromGroup,
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
    if (worksheet.groupId) {
      const group = controller.state.groupsById[worksheet.groupId];
      if (group && group.worksheetOrder.length === 1) {
        const groupOrderIndex = controller.state.groupOrder.findIndex((groupId) => groupId === group.groupId);
        scheduleUndoToast({
          group: {
            ...group,
            worksheetOrder: [...group.worksheetOrder],
          },
          worksheetId: worksheet.worksheetId,
          orderIndex: groupOrderIndex >= 0 ? groupOrderIndex : 0,
          message: `Group ${group.name} removed.`,
        });
      }
    }

    if (worksheet.isPinned) {
      controller.unpinWorksheet(worksheet.worksheetId);
      return;
    }

    controller.pinWorksheet(worksheet.worksheetId);
  }, [
    controller.pinWorksheet,
    controller.state.groupOrder,
    controller.state.groupsById,
    controller.unpinWorksheet,
    scheduleUndoToast,
  ]);

  const handlePinWorksheet = useCallback((worksheetId: string) => {
    const worksheet = controller.state.worksheetsById[worksheetId];
    if (!worksheet) {
      return;
    }

    if (worksheet.groupId) {
      const group = controller.state.groupsById[worksheet.groupId];
      if (group && group.worksheetOrder.length === 1) {
        const groupOrderIndex = controller.state.groupOrder.findIndex((groupId) => groupId === group.groupId);
        scheduleUndoToast({
          group: {
            ...group,
            worksheetOrder: [...group.worksheetOrder],
          },
          worksheetId,
          orderIndex: groupOrderIndex >= 0 ? groupOrderIndex : 0,
          message: `Group ${group.name} removed.`,
        });
      }
    }

    controller.pinWorksheet(worksheetId);
  }, [
    controller.pinWorksheet,
    controller.state.groupOrder,
    controller.state.groupsById,
    controller.state.worksheetsById,
    scheduleUndoToast,
  ]);

  const handleToggleVisibility = useCallback((worksheet: WorksheetEntity) => {
    if (worksheet.visibility === 'Visible') {
      void controller.hideWorksheet(worksheet.worksheetId);
      return;
    }

    void controller.unhideWorksheet(worksheet.worksheetId);
  }, [controller.hideWorksheet, controller.unhideWorksheet]);

  const handleDeleteGroup = useCallback((groupId: string, groupName: string) => {
    setDeleteGroupSheetsError(null);
    setDeleteGroupRequest({ groupId, groupName, mode: 'ungroup' });
  }, []);

  const handleDeleteGroupAndSheets = useCallback((groupId: string, groupName: string) => {
    const group = controller.state.groupsById[groupId];
    const sheetCount = group?.worksheetOrder.length ?? 0;
    setDeleteGroupSheetsError(null);
    setDeleteGroupRequest({ groupId, groupName, mode: 'deleteSheets', sheetCount });
  }, [controller.state.groupsById]);

  const confirmDeleteGroup = useCallback(async () => {
    if (!deleteGroupRequest) {
      return;
    }

    if (deleteGroupRequest.mode === 'ungroup') {
      controller.deleteGroup(deleteGroupRequest.groupId);
      setDeleteGroupRequest(null);
      closeMenus();
      return;
    }

    setIsDeletingGroupSheets(true);
    setDeleteGroupSheetsError(null);
    try {
      await controller.deleteGroupAndWorksheets(deleteGroupRequest.groupId);
      setDeleteGroupRequest(null);
      closeMenus();
    } catch (error) {
      const message = error instanceof WorksheetDeleteError
        ? error.message
        : 'Failed to delete sheets. Please try again.';
      setDeleteGroupSheetsError(message);
    } finally {
      setIsDeletingGroupSheets(false);
    }
  }, [closeMenus, controller.deleteGroup, controller.deleteGroupAndWorksheets, deleteGroupRequest]);

  const cancelDeleteGroup = useCallback(() => {
    setDeleteGroupRequest(null);
    setDeleteGroupSheetsError(null);
  }, []);

  // Inline rename handlers for worksheets.
  const handleRenameWorksheetStart = useCallback((worksheetId: string) => {
    closeMenus();
    setRenamingGroupId(null);
    setRenamingWorksheetId(worksheetId);
  }, [closeMenus]);

  const handleRenameWorksheetStartFromSearch = useCallback((worksheetId: string) => {
    controller.setQuery('');
    closeMenus();
    setRenamingGroupId(null);
    setRenamingWorksheetId(worksheetId);
  }, [closeMenus, controller.setQuery]);

  const handleRenameWorksheetSubmit = useCallback(async (worksheetId: string, newName: string) => {
    try {
      await controller.renameWorksheet(worksheetId, newName);
    } finally {
      setRenamingWorksheetId(null);
    }
  }, [controller.renameWorksheet]);

  const handleRenameWorksheetCancel = useCallback(() => {
    setRenamingWorksheetId(null);
  }, []);

  // Inline rename handlers for groups.
  const handleRenameGroupStart = useCallback((groupId: string, _groupName: string) => {
    closeMenus();
    setRenamingWorksheetId(null);
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

  // Centralized keyboard shortcuts — suppressed during modal interactions.
  const isShortcutsSuppressed = Boolean(
    deleteGroupRequest || renamingWorksheetId || renamingGroupId || activeMenu,
  );

  const shortcutActions: ShortcutAction[] = useMemo(() => [
    {
      id: ShortcutActionId.FOCUS_SEARCH,
      description: 'Focus the search field',
      handler: async () => {
        try {
          await Office.addin.showAsTaskpane();
        } catch {
          // Ignore if unsupported on current platform
        }
        // Give the taskpane a moment to open and render before focusing
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 100);
      },
    },
    {
      id: ShortcutActionId.CREATE_WORKSHEET,
      description: 'Create a new worksheet',
      handler: () => {
        void controller.createWorksheet();
      },
    },
  ], [controller.createWorksheet]);

  const keyboardSheetMenuOpenFrameRef = useRef<number | null>(null);
  const keyboardNavigationApiRef = useRef<{
    restoreFocusAfterMenuDismiss: (itemId: string) => void;
  } | null>(null);

  useEffect(() => {
    return () => {
      if (keyboardSheetMenuOpenFrameRef.current !== null) {
        window.cancelAnimationFrame(keyboardSheetMenuOpenFrameRef.current);
      }
    };
  }, []);

  useShortcutActions({
    actions: shortcutActions,
    isSuppressed: isShortcutsSuppressed,
  });

  const handleUndoRestoreGroup = useCallback(() => {
    if (!undoToast) {
      return;
    }

    controller.restoreGroup(undoToast.group, undoToast.worksheetId, undoToast.orderIndex);
    dismissUndoToast();
  }, [controller, dismissUndoToast, undoToast]);

  const handleRequestSheetContextMenuFromKeyboard = useCallback(
    ({ worksheetId, anchorElement }: { worksheetId: string; anchorElement: HTMLElement | null }) => {
      const worksheet = controller.state.worksheetsById[worksheetId];
      if (!worksheet) {
        return;
      }

      if (keyboardSheetMenuOpenFrameRef.current !== null) {
        window.cancelAnimationFrame(keyboardSheetMenuOpenFrameRef.current);
        keyboardSheetMenuOpenFrameRef.current = null;
      }

      const resolveAnchor = () => {
        if (anchorElement && document.contains(anchorElement)) {
          return anchorElement;
        }

        return document.querySelector<HTMLElement>(`[data-navigable-id="worksheet:${worksheetId}"]`);
      };

      keyboardSheetMenuOpenFrameRef.current = window.requestAnimationFrame(() => {
        keyboardSheetMenuOpenFrameRef.current = window.requestAnimationFrame(() => {
          const resolvedAnchor = resolveAnchor();
          const rect = resolvedAnchor?.getBoundingClientRect();
          const x = rect ? Math.max(0, rect.right - 12) : 8;
          const y = rect ? Math.max(0, rect.top + 6) : 8;

          openSheetMenu({
            target: resolvedAnchor ?? document.body,
            x,
            y,
            worksheet,
            interaction: 'keyboard',
          });

          keyboardSheetMenuOpenFrameRef.current = null;
        });
      });
    },
    [controller, openSheetMenu],
  );

  return (
    <TaskpaneShell
      banner={controller.banner}
      onDismissBanner={controller.dismissBanner}
      toast={undoToast ? (
        <UndoToast
          message={undoToast.message}
          actionLabel="Undo"
          onUndo={handleUndoRestoreGroup}
          onDismiss={dismissUndoToast}
        />
      ) : null}
    >
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
        onPinWorksheet={handlePinWorksheet}
        onUnpinWorksheet={controller.unpinWorksheet}
        onToggleGroupCollapsed={controller.toggleGroupCollapsed}
        onToggleHiddenSection={controller.toggleHiddenSection}
        onUnhideWorksheet={controller.unhideWorksheet}
        onOpenSheetMenu={openSheetMenu}
        onRequestSheetContextMenuFromKeyboard={handleRequestSheetContextMenuFromKeyboard}
        onOpenGroupMenu={openGroupMenu}
        onRenameWorksheetSubmit={handleRenameWorksheetSubmit}
        onRenameGroupSubmit={handleRenameGroupSubmit}
        onRenameCancel={handleRenameCancel}
        onStartRenameWorksheet={handleRenameWorksheetStart}
        onStartRenameWorksheetFromSearch={handleRenameWorksheetStartFromSearch}
        isDialogOpen={Boolean(deleteGroupRequest)}
        isRenaming={renamingWorksheetId !== null || renamingGroupId !== null}
        isContextMenuOpen={activeMenu !== null}
        searchInputRef={searchInputRef}
        sheetContextMenuOpenedVia={
          activeMenu?.kind === 'sheet' ? (activeMenu.openedVia ?? 'pointer') : null
        }
        keyboardNavigationApiRef={keyboardNavigationApiRef}
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
        onRenameWorksheet={(worksheet) => handleRenameWorksheetStart(worksheet.worksheetId)}
        onRemoveFromGroup={handleRemoveFromGroup}
        onStartCreatingGroup={handleStartCreatingGroup}
        onRenameGroup={handleRenameGroupStart}
        onDeleteGroup={handleDeleteGroup}
        onDeleteGroupAndSheets={handleDeleteGroupAndSheets}
        deleteGroupRequest={deleteGroupRequest}
        onCancelDeleteGroup={cancelDeleteGroup}
        onConfirmDeleteGroup={confirmDeleteGroup}
        isDeletingGroupSheets={isDeletingGroupSheets}
        deleteGroupSheetsError={deleteGroupSheetsError}
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
        onRestoreKeyboardMenuFocus={(itemId) => {
          keyboardNavigationApiRef.current?.restoreFocusAfterMenuDismiss(itemId);
        }}
      />

    </TaskpaneShell>
  );
}
