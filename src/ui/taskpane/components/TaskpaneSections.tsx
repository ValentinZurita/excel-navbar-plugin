import {
  type CollisionDetection,
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  pointerWithin,
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
  hoveredWorksheetId: string | null;
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
  onHoverWorksheet: (worksheetId: string | null) => void;
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
}

const worksheetCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);

  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }

  // For pointer-driven drag, avoid geometric fallback to keep projected targets
  // strictly aligned with the pointer and prevent distant ghost highlights.
  if (args.pointerCoordinates) {
    return [];
  }

  return closestCorners(args);
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

export function TaskpaneSections({
  query,
  searchResults,
  navigatorView,
  activeWorksheetId,
  hoveredWorksheetId,
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
  onHoverWorksheet,
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
}: TaskpaneSectionsProps) {
  const shouldShowPinnedSection = navigatorView.pinned.length > 0;
  const shouldShowGroupsSection = navigatorView.groups.length > 0;
  const shouldShowUngroupedSection = shouldRenderUngroupedSection(navigatorView, dragConfig.isDragActive);
  const shouldShowHiddenSection = navigatorView.hidden.length > 0;
  const shouldShowSessionOnlyGroupsHint = shouldShowGroupsSection && isSessionOnlyPersistence;
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
    <>
      <SearchBox
        value={query}
        onChange={onChangeQuery}
        results={searchResults}
        onSelect={onSelectSearchResult}
      />

      {shouldShowPinnedSection ? (
        <Section title="Pinned">
          <SheetList
            worksheets={navigatorView.pinned}
            activeWorksheetId={activeWorksheetId}
            contextMenuOpenId={contextMenuOpenSheetId}
            hoveredWorksheetId={hoveredWorksheetId}
            renamingWorksheetId={renamingWorksheetId}
            onActivate={onActivateWorksheet}
            onHoverWorksheet={onHoverWorksheet}
            onTogglePin={onUnpinWorksheet}
            onOpenContextMenu={onOpenSheetMenu}
            onRenameSubmit={onRenameWorksheetSubmit}
            onRenameCancel={onRenameCancel}
          />
        </Section>
      ) : null}

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

        {shouldShowGroupsSection ? (
          <Section title="Groups" headerAccessory={groupsSessionOnlyHint}>
            <GroupSection
              groups={navigatorView.groups}
              activeWorksheetId={activeWorksheetId}
              contextMenuOpenId={contextMenuOpenSheetId}
              groupMenuOpenId={contextMenuOpenGroupId}
              hoveredWorksheetId={hoveredWorksheetId}
              dragConfig={buildGroupDragConfig(dragConfig)}
              renamingGroupId={renamingGroupId}
              onActivate={onActivateWorksheet}
              onHoverWorksheet={onHoverWorksheet}
              onToggleCollapsed={onToggleGroupCollapsed}
              onTogglePin={onPinWorksheet}
              onOpenGroupMenu={onOpenGroupMenu}
              onOpenSheetMenu={onOpenSheetMenu}
              onRenameSubmit={onRenameGroupSubmit}
              onRenameCancel={onRenameCancel}
            />
          </Section>
        ) : null}

        {shouldShowUngroupedSection ? (
          <Section title="Sheets">
            <div className="primary-tabs">
              <SheetList
                worksheets={navigatorView.ungrouped}
                activeWorksheetId={activeWorksheetId}
                contextMenuOpenId={contextMenuOpenSheetId}
                hoveredWorksheetId={hoveredWorksheetId}
                dragConfig={buildSheetListDragConfig(dragConfig, 'sheets')}
                renamingWorksheetId={renamingWorksheetId}
                onActivate={onActivateWorksheet}
                onHoverWorksheet={onHoverWorksheet}
                onTogglePin={onPinWorksheet}
                onOpenContextMenu={onOpenSheetMenu}
                onRenameSubmit={onRenameWorksheetSubmit}
                onRenameCancel={onRenameCancel}
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
