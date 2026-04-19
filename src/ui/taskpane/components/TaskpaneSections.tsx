import { useMemo, useState } from 'react';
import {
  type CollisionDetection,
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  pointerWithin,
  closestCenter,
  closestCorners,
  type Modifier,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type SensorDescriptor,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import type { NavigatorView } from '../../../domain/navigation/types';
import { buildNavigableItems } from '../../../domain/navigation/navigableItems';
import { KeyboardNavigationProvider } from '../../navigation/KeyboardNavigationProvider';
import { GroupSection } from '../../components/GroupSection';
import { HiddenSection } from '../../components/HiddenSection';
import { SearchBox } from '../../components/SearchBox';
import { Section } from '../../components/Section';
import { SheetList } from '../../components/SheetList';
import { SheetRow } from '../../components/SheetRow';
import type { GroupDragVisualConfig, WorksheetDragVisualConfig } from '../types/worksheetDragVisualConfig';
import type { OpenGroupMenuArgs, OpenSheetMenuArgs } from '../types/contextMenuTypes';
import type { WorksheetEntity } from '../../../domain/navigation/types';

interface WorksheetDragConfig extends GroupDragVisualConfig {
  activeDragWorksheet: WorksheetEntity | null;
  sensors: SensorDescriptor<any>[];
  onDragStart: (event: DragStartEvent) => void;
  onDragOver: (event: DragOverEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragCancel: (event: DragCancelEvent) => void;
}

interface TaskpaneSectionsProps {
  query: string;
  searchResults: NavigatorView['searchResults'];
  navigatorView: NavigatorView;
  activeWorksheetId: string | null;
  isHiddenSectionCollapsed: boolean;
  contextMenuOpenSheetId?: string;
  contextMenuOpenGroupId?: string;
  renamingWorksheetId?: string | null;
  renamingGroupId?: string | null;
  isSessionOnlyPersistence?: boolean;
  dragConfig: WorksheetDragConfig;
  onChangeQuery: (query: string) => void;
  onSelectSearchResult: (worksheetId: string) => void | Promise<void>;
  onActivateWorksheet: (worksheetId: string) => void | Promise<void>;
  onPinWorksheet: (worksheetId: string) => void;
  onUnpinWorksheet: (worksheetId: string) => void;
  onToggleGroupCollapsed: (groupId: string) => void;
  onToggleHiddenSection: () => void;
  onUnhideWorksheet: (worksheetId: string) => void | Promise<void>;
  onOpenSheetMenu: (args: OpenSheetMenuArgs) => void;
  onOpenGroupMenu: (args: OpenGroupMenuArgs) => void;
  onRenameWorksheetSubmit?: (worksheetId: string, newName: string) => void | Promise<void>;
  onRenameGroupSubmit?: (groupId: string, newName: string) => void;
  onRenameCancel?: () => void;
  /** Suppression flags for keyboard navigation */
  isDialogOpen?: boolean;
  isRenaming?: boolean;
  isContextMenuOpen?: boolean;
  /** Ref to the search input, lifted from container for shortcut access */
  searchInputRef: React.RefObject<HTMLInputElement>;
}

const worksheetCollisionDetection: CollisionDetection = (args) => {
  // Only consider explicit drop-target zones (gap, container-end, group-header).
  // useSortable registers each row as a droppable too, but rows should not compete
  // with gap zones for collision priority.
  const filteredArgs = {
    ...args,
    droppableContainers: args.droppableContainers.filter(
      (container) => container.data.current?.type === 'worksheet-drop-target',
    ),
  };

  const pointerCollisions = pointerWithin(filteredArgs);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }

  // When the pointer is between gap zones (i.e. over a row), closestCenter
  // finds the nearest gap zone center. This naturally switches at the row
  // midpoint, giving correct top-half / bottom-half insertion behavior.
  if (args.pointerCoordinates) {
    return closestCenter(filteredArgs);
  }

  // Keyboard fallback.
  return closestCorners(filteredArgs);
};

const worksheetDragOverlayOffset: Modifier = ({ transform }) => ({
  ...transform,
  x: transform.x + 10,
  y: transform.y - 6,
});

function shouldRenderUngroupedSection(navigatorView: NavigatorView, isDragActive: boolean) {
  return navigatorView.ungrouped.length > 0 || isDragActive;
}

function buildGroupDragConfig(dragConfig: WorksheetDragConfig): GroupDragVisualConfig {
  return {
    projectedDropTarget: dragConfig.projectedDropTarget,
    flashedGroupId: dragConfig.flashedGroupId,
    isDragActive: dragConfig.isDragActive,
    shouldSuppressActivation: dragConfig.shouldSuppressActivation,
  };
}

function buildSheetListDragConfig(
  dragConfig: WorksheetDragConfig,
  containerId: 'sheets',
): WorksheetDragVisualConfig & { containerId: 'sheets' } {
  return {
    containerId,
    projectedDropTarget: dragConfig.projectedDropTarget,
    isDragActive: dragConfig.isDragActive,
    shouldSuppressActivation: dragConfig.shouldSuppressActivation,
  };
}

function buildPinnedDragConfig(
  dragConfig: WorksheetDragConfig,
  containerId: 'pinned',
): WorksheetDragVisualConfig & { containerId: 'pinned' } {
  return {
    containerId,
    projectedDropTarget: dragConfig.projectedDropTarget,
    isDragActive: dragConfig.isDragActive,
    shouldSuppressActivation: dragConfig.shouldSuppressActivation,
  };
}

function deriveActiveVisualItemId(
  activeWorksheetId: string | null,
  navigatorView: NavigatorView,
  navigableItems: ReturnType<typeof buildNavigableItems>,
): string | null {
  if (!activeWorksheetId) {
    return null;
  }

  const activeWorksheetItemId = `worksheet:${activeWorksheetId}`;
  if (navigableItems.some((item) => item.id === activeWorksheetItemId)) {
    return activeWorksheetItemId;
  }

  const collapsedOwningGroup = navigatorView.groups.find((group) => (
    group.isCollapsed
    && group.worksheets.some((worksheet) => worksheet.worksheetId === activeWorksheetId)
  ));

  if (!collapsedOwningGroup) {
    return null;
  }

  const groupHeaderItemId = `group-header:${collapsedOwningGroup.groupId}`;
  return navigableItems.some((item) => item.id === groupHeaderItemId)
    ? groupHeaderItemId
    : null;
}

export function TaskpaneSections({
  query,
  searchResults,
  navigatorView,
  activeWorksheetId,
  isHiddenSectionCollapsed,
  contextMenuOpenSheetId,
  contextMenuOpenGroupId,
  renamingWorksheetId,
  renamingGroupId,
  isSessionOnlyPersistence = false,
  dragConfig,
  onChangeQuery,
  onSelectSearchResult,
  onActivateWorksheet,
  onPinWorksheet,
  onUnpinWorksheet,
  onToggleGroupCollapsed,
  onToggleHiddenSection,
  onUnhideWorksheet,
  onOpenSheetMenu,
  onOpenGroupMenu,
  onRenameWorksheetSubmit,
  onRenameGroupSubmit,
  onRenameCancel,
  isDialogOpen = false,
  isRenaming = false,
  isContextMenuOpen = false,
  searchInputRef,
}: TaskpaneSectionsProps) {

  const [isPinnedCollapsed, setIsPinnedCollapsed] = useState(false);
  const [isGroupsCollapsed, setIsGroupsCollapsed] = useState(false);
  const [isSheetsCollapsed, setIsSheetsCollapsed] = useState(false);

  // Build the linear list of navigable items for keyboard navigation
  const navigableItems = useMemo(() => {
    return buildNavigableItems({
      query,
      searchResults,
      pinned: isPinnedCollapsed ? [] : navigatorView.pinned,
      groups: isGroupsCollapsed ? [] : navigatorView.groups,
      ungrouped: isSheetsCollapsed ? [] : navigatorView.ungrouped,
    });
  }, [
    query,
    searchResults,
    navigatorView.pinned,
    navigatorView.groups,
    navigatorView.ungrouped,
    isPinnedCollapsed,
    isGroupsCollapsed,
    isSheetsCollapsed,
  ]);

  const shouldShowPinnedSection = navigatorView.pinned.length > 0;
  const shouldShowGroupsSection = navigatorView.groups.length > 0;
  const shouldShowUngroupedSection = shouldRenderUngroupedSection(navigatorView, dragConfig.isDragActive);
  const shouldShowHiddenSection = navigatorView.hidden.length > 0;
  const shouldShowSessionOnlyGroupsHint = shouldShowGroupsSection && isSessionOnlyPersistence;
  const isSearchActive = Boolean(query.trim());
  const contextMenuTargetItemId = contextMenuOpenSheetId
    ? `worksheet:${contextMenuOpenSheetId}`
    : contextMenuOpenGroupId
      ? `group-header:${contextMenuOpenGroupId}`
      : null;
  const activeVisualItemId = deriveActiveVisualItemId(
    activeWorksheetId,
    navigatorView,
    navigableItems,
  );
  const groupsSessionOnlyHint = shouldShowSessionOnlyGroupsHint ? (
    <button
      className="section-hint-button"
      type="button"
      aria-label="This workbook has not been saved yet. Group changes persist only for this session."
      title="This workbook has not been saved yet. Group changes persist only for this session."
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      !
    </button>
  ) : null;

  return (
    <KeyboardNavigationProvider
      items={navigableItems}
      activeWorksheetId={activeWorksheetId}
      onActivate={(itemId) => {
        // Extract worksheetId from the itemId (format: 'worksheet:{id}' or 'search:{id}')
        const worksheetId = itemId.split(':')[1];
        if (worksheetId) {
          if (itemId.startsWith('search:')) {
            void onSelectSearchResult(worksheetId);
          } else {
            void onActivateWorksheet(worksheetId);
          }
        }
      }}
      onExpandGroup={onToggleGroupCollapsed}
      onCollapseGroup={onToggleGroupCollapsed}
      onFocusSearchInput={() => {
        searchInputRef.current?.focus();
      }}
      searchInputRef={searchInputRef}
      onClearSearch={() => onChangeQuery('')}
      isSearchActive={isSearchActive}
      isDragActive={dragConfig.isDragActive}
      isDialogOpen={isDialogOpen}
      isRenaming={isRenaming}
      isContextMenuOpen={isContextMenuOpen}
      contextMenuTargetItemId={contextMenuTargetItemId}
      activeVisualItemId={activeVisualItemId}
    >
      <TaskpaneSectionsContent
        query={query}
        searchResults={searchResults}
        navigatorView={navigatorView}
        activeWorksheetId={activeWorksheetId}
        isHiddenSectionCollapsed={isHiddenSectionCollapsed}
        contextMenuOpenSheetId={contextMenuOpenSheetId}
        contextMenuOpenGroupId={contextMenuOpenGroupId}
        renamingWorksheetId={renamingWorksheetId}
        renamingGroupId={renamingGroupId}
        isSessionOnlyPersistence={isSessionOnlyPersistence}
        dragConfig={dragConfig}
        groupsSessionOnlyHint={groupsSessionOnlyHint}
        shouldShowPinnedSection={shouldShowPinnedSection}
        shouldShowGroupsSection={shouldShowGroupsSection}
        shouldShowUngroupedSection={shouldShowUngroupedSection}
        shouldShowHiddenSection={shouldShowHiddenSection}
        searchInputRef={searchInputRef}
        isPinnedCollapsed={isPinnedCollapsed}
        setIsPinnedCollapsed={setIsPinnedCollapsed}
        isGroupsCollapsed={isGroupsCollapsed}
        setIsGroupsCollapsed={setIsGroupsCollapsed}
        isSheetsCollapsed={isSheetsCollapsed}
        setIsSheetsCollapsed={setIsSheetsCollapsed}
        onChangeQuery={onChangeQuery}
        onSelectSearchResult={onSelectSearchResult}
        onActivateWorksheet={onActivateWorksheet}
        onPinWorksheet={onPinWorksheet}
        onUnpinWorksheet={onUnpinWorksheet}
        onToggleGroupCollapsed={onToggleGroupCollapsed}
        onToggleHiddenSection={onToggleHiddenSection}
        onUnhideWorksheet={onUnhideWorksheet}
        onOpenSheetMenu={onOpenSheetMenu}
        onOpenGroupMenu={onOpenGroupMenu}
        onRenameWorksheetSubmit={onRenameWorksheetSubmit}
        onRenameGroupSubmit={onRenameGroupSubmit}
        onRenameCancel={onRenameCancel}
      />
    </KeyboardNavigationProvider>
  );
}

// Internal component that consumes the keyboard navigation context
import { useKeyboardNavContext } from '../../navigation/KeyboardNavigationProvider';

interface TaskpaneSectionsContentProps extends Omit<TaskpaneSectionsProps, 'isDialogOpen' | 'isRenaming' | 'isContextMenuOpen'> {
  groupsSessionOnlyHint: React.ReactNode;
  shouldShowPinnedSection: boolean;
  shouldShowGroupsSection: boolean;
  shouldShowUngroupedSection: boolean;
  shouldShowHiddenSection: boolean;
  searchInputRef: React.RefObject<HTMLInputElement>;
  isPinnedCollapsed: boolean;
  setIsPinnedCollapsed: (collapsed: boolean) => void;
  isGroupsCollapsed: boolean;
  setIsGroupsCollapsed: (collapsed: boolean) => void;
  isSheetsCollapsed: boolean;
  setIsSheetsCollapsed: (collapsed: boolean) => void;
}

function TaskpaneSectionsContent(props: TaskpaneSectionsContentProps) {
  const {
    query,
    searchResults,
    navigatorView,
    activeWorksheetId,
    isHiddenSectionCollapsed,
    contextMenuOpenSheetId,
    contextMenuOpenGroupId,
    renamingWorksheetId,
    renamingGroupId,
    isSessionOnlyPersistence,
    dragConfig,
    groupsSessionOnlyHint,
    shouldShowPinnedSection,
    shouldShowGroupsSection,
    shouldShowUngroupedSection,
    shouldShowHiddenSection,
    searchInputRef,
    isPinnedCollapsed,
    setIsPinnedCollapsed,
    isGroupsCollapsed,
    setIsGroupsCollapsed,
    isSheetsCollapsed,
    setIsSheetsCollapsed,
    onChangeQuery,
    onSelectSearchResult,
    onActivateWorksheet,
    onPinWorksheet,
    onUnpinWorksheet,
    onToggleGroupCollapsed,
    onToggleHiddenSection,
    onUnhideWorksheet,
    onOpenSheetMenu,
    onOpenGroupMenu,
    onRenameWorksheetSubmit,
    onRenameGroupSubmit,
    onRenameCancel,
  } = props;

  // Get keyboard navigation context
  const {
    focusedItemId,
    visualFocusedItemId,
    visualExitingItemId,
    navigationInputMode,
    setPointerFocusItem,
    handleSearchKeyDown,
    handleItemKeyDown,
    handleGroupHeaderKeyDown,
    registerElement,
  } = useKeyboardNavContext();

  return (
    <>
      <SearchBox
        value={query}
        onChange={onChangeQuery}
        results={searchResults}
        activeWorksheetId={activeWorksheetId}
        onSelect={onSelectSearchResult}
        inputRef={searchInputRef}
        onSearchKeyDown={handleSearchKeyDown}
        focusedItemId={focusedItemId}
        navigationInputMode={navigationInputMode}
        onResultKeyDown={handleItemKeyDown}
        onResultPointerFocus={setPointerFocusItem}
        registerElement={registerElement}
      />

      <DndContext
        sensors={dragConfig.sensors}
        collisionDetection={worksheetCollisionDetection}
        modifiers={[restrictToVerticalAxis]}
        measuring={{
          droppable: {
            strategy: MeasuringStrategy.Always,
          },
        }}
        onDragStart={dragConfig.onDragStart}
        onDragOver={dragConfig.onDragOver}
        onDragEnd={dragConfig.onDragEnd}
        onDragCancel={dragConfig.onDragCancel}
      >
        <DragOverlay
          dropAnimation={null}
          className="worksheet-drag-overlay"
          modifiers={[worksheetDragOverlayOffset]}
          zIndex={20}
        >
          {dragConfig.activeDragWorksheet ? (
            <SheetRow
              worksheet={dragConfig.activeDragWorksheet}
              isActive={dragConfig.activeDragWorksheet.worksheetId === activeWorksheetId}
              isOverlay
              onActivate={() => Promise.resolve()}
              onOpenContextMenu={() => undefined}
            />
          ) : null}
        </DragOverlay>

        {shouldShowPinnedSection ? (
          <Section title="Pinned" isCollapsed={isPinnedCollapsed} onToggle={setIsPinnedCollapsed}>
            <SheetList
              worksheets={navigatorView.pinned}
              activeWorksheetId={activeWorksheetId}
              contextMenuOpenId={contextMenuOpenSheetId}
              dragConfig={buildPinnedDragConfig(dragConfig, 'pinned')}
              renamingWorksheetId={renamingWorksheetId}
              focusedItemId={focusedItemId}
              visualFocusedItemId={visualFocusedItemId}
              visualExitingItemId={visualExitingItemId}
              onActivate={onActivateWorksheet}
              onTogglePin={onUnpinWorksheet}
              onOpenContextMenu={onOpenSheetMenu}
              onRenameSubmit={onRenameWorksheetSubmit}
              onRenameCancel={onRenameCancel}
              onItemKeyDown={handleItemKeyDown}
              registerElement={registerElement}
            />
          </Section>
        ) : null}

        {shouldShowGroupsSection ? (
          <Section title="Groups" headerAccessory={groupsSessionOnlyHint} isCollapsed={isGroupsCollapsed} onToggle={setIsGroupsCollapsed}>
            <GroupSection
              groups={navigatorView.groups}
              activeWorksheetId={activeWorksheetId}
              contextMenuOpenId={contextMenuOpenSheetId}
              groupMenuOpenId={contextMenuOpenGroupId}
              dragConfig={buildGroupDragConfig(dragConfig)}
              renamingGroupId={renamingGroupId}
              focusedItemId={focusedItemId}
              visualFocusedItemId={visualFocusedItemId}
              visualExitingItemId={visualExitingItemId}
              onActivate={onActivateWorksheet}
              onToggleCollapsed={onToggleGroupCollapsed}
              onTogglePin={onPinWorksheet}
              onOpenGroupMenu={onOpenGroupMenu}
              onOpenSheetMenu={onOpenSheetMenu}
              onRenameSubmit={onRenameGroupSubmit}
              onRenameCancel={onRenameCancel}
              onGroupHeaderKeyDown={handleGroupHeaderKeyDown}
              onItemKeyDown={handleItemKeyDown}
              registerElement={registerElement}
            />
          </Section>
        ) : null}

        {shouldShowUngroupedSection ? (
          <Section title="Sheets" isCollapsed={isSheetsCollapsed} onToggle={setIsSheetsCollapsed}>
            <div className="primary-tabs">
              <SheetList
                worksheets={navigatorView.ungrouped}
                activeWorksheetId={activeWorksheetId}
                contextMenuOpenId={contextMenuOpenSheetId}
                dragConfig={buildSheetListDragConfig(dragConfig, 'sheets')}
                renamingWorksheetId={renamingWorksheetId}
                focusedItemId={focusedItemId}
                visualFocusedItemId={visualFocusedItemId}
                visualExitingItemId={visualExitingItemId}
                onActivate={onActivateWorksheet}
                onTogglePin={onPinWorksheet}
                onOpenContextMenu={onOpenSheetMenu}
                onRenameSubmit={onRenameWorksheetSubmit}
                onRenameCancel={onRenameCancel}
                onItemKeyDown={handleItemKeyDown}
                registerElement={registerElement}
              />
            </div>
          </Section>
        ) : null}
      </DndContext>

      {shouldShowHiddenSection ? (
        <HiddenSection
          isCollapsed={isHiddenSectionCollapsed}
          worksheets={navigatorView.hidden}
          onToggle={onToggleHiddenSection}
          onUnhide={onUnhideWorksheet}
          onOpenContextMenu={onOpenSheetMenu}
        />
      ) : null}
    </>
  );
}
