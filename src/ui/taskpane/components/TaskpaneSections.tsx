import {
  DndContext,
  DragOverlay,
  MeasuringStrategy,
  closestCorners,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type SensorDescriptor,
} from '@dnd-kit/core';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import type { NavigatorView, WorksheetEntity } from '../../../domain/navigation/types';
import { GroupSection } from '../../components/GroupSection';
import { HiddenSection } from '../../components/HiddenSection';
import { SearchBox } from '../../components/SearchBox';
import { Section } from '../../components/Section';
import { SheetList } from '../../components/SheetList';
import { SheetRow } from '../../components/SheetRow';
import type { WorksheetContainerId, WorksheetProjectedDropTarget } from '../dnd/worksheetDndModel';
import { toGroupContainerId } from '../dnd/worksheetDndModel';
import type { OpenGroupMenuArgs, OpenSheetMenuArgs } from '../types/contextMenuTypes';

interface WorksheetDragConfig {
  sensors: SensorDescriptor<any>[];
  activeWorksheetId: string | null;
  activeWorksheet: WorksheetEntity | null;
  projectedDropTarget: WorksheetProjectedDropTarget | null;
  isDragActive: boolean;
  getContainerWorksheets: (containerId: WorksheetContainerId, fallback: WorksheetEntity[]) => WorksheetEntity[];
  shouldSuppressActivation: (worksheetId: string) => boolean;
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
}

export function TaskpaneSections({
  query,
  searchResults,
  navigatorView,
  activeWorksheetId,
  isHiddenSectionCollapsed,
  contextMenuOpenSheetId,
  contextMenuOpenGroupId,
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
}: TaskpaneSectionsProps) {
  const displayedUngrouped = dragConfig.getContainerWorksheets('sheets', navigatorView.ungrouped);

  return (
    <>
      <SearchBox
        value={query}
        onChange={onChangeQuery}
        results={searchResults}
        onSelect={onSelectSearchResult}
      />

      {navigatorView.pinned.length ? (
        <Section title="Pinned">
          <SheetList
            worksheets={navigatorView.pinned}
            activeWorksheetId={activeWorksheetId}
            contextMenuOpenId={contextMenuOpenSheetId}
            onActivate={onActivateWorksheet}
            onTogglePin={onUnpinWorksheet}
            onOpenContextMenu={onOpenSheetMenu}
          />
        </Section>
      ) : null}

      <DndContext
        sensors={dragConfig.sensors}
        collisionDetection={closestCorners}
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
        {navigatorView.groups.length ? (
          <Section title="Groups">
            <GroupSection
              groups={navigatorView.groups}
              activeWorksheetId={activeWorksheetId}
              contextMenuOpenId={contextMenuOpenSheetId}
              groupMenuOpenId={contextMenuOpenGroupId}
              dragConfig={{
                activeWorksheetId: dragConfig.activeWorksheetId,
                projectedDropTarget: dragConfig.projectedDropTarget,
                isDragActive: dragConfig.isDragActive,
                shouldSuppressActivation: dragConfig.shouldSuppressActivation,
                getDisplayedWorksheets: (group) => dragConfig.getContainerWorksheets(
                  toGroupContainerId(group.groupId),
                  group.worksheets,
                ),
              }}
              onActivate={onActivateWorksheet}
              onToggleCollapsed={onToggleGroupCollapsed}
              onOpenGroupMenu={onOpenGroupMenu}
              onOpenSheetMenu={onOpenSheetMenu}
            />
          </Section>
        ) : null}

        {displayedUngrouped.length || dragConfig.isDragActive ? (
          <Section title="Sheets">
            <div className="primary-tabs">
              <SheetList
                worksheets={displayedUngrouped}
                activeWorksheetId={activeWorksheetId}
                contextMenuOpenId={contextMenuOpenSheetId}
                dragConfig={{
                  containerId: 'sheets',
                  activeWorksheetId: dragConfig.activeWorksheetId,
                  projectedDropTarget: dragConfig.projectedDropTarget,
                  isDragActive: dragConfig.isDragActive,
                  shouldSuppressActivation: dragConfig.shouldSuppressActivation,
                }}
                onActivate={onActivateWorksheet}
                onTogglePin={onPinWorksheet}
                onOpenContextMenu={onOpenSheetMenu}
              />
            </div>
          </Section>
        ) : null}

        <DragOverlay>
          {dragConfig.activeWorksheet ? (
            <SheetRow
              worksheet={dragConfig.activeWorksheet}
              isActive={false}
              isOverlay
              onActivate={() => undefined}
              onOpenContextMenu={() => undefined}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {navigatorView.hidden.length ? (
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
