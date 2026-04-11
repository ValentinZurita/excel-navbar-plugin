import type { DragEvent } from 'react';
import type { NavigatorView } from '../../../domain/navigation/types';
import { GroupSection } from '../../components/GroupSection';
import { HiddenSection } from '../../components/HiddenSection';
import { SearchBox } from '../../components/SearchBox';
import { Section } from '../../components/Section';
import { SheetList } from '../../components/SheetList';
import type { OpenGroupMenuArgs, OpenSheetMenuArgs } from '../types/contextMenuTypes';

interface WorksheetDragConfig {
  draggedWorksheetId: string | null;
  activeDropTargetId: string | null;
  isDragActive: boolean;
  onStartDrag: (event: DragEvent<HTMLElement>, worksheet: NavigatorView['ungrouped'][number]) => void;
  onEndDrag: () => void;
  onDragOverDropZone: (event: DragEvent<HTMLElement>, dropTargetId: string) => void;
  onDropIntoSheetSection: (event: DragEvent<HTMLElement>, targetIndex: number) => void;
  onDropIntoGroup: (event: DragEvent<HTMLElement>, groupId: string, targetIndex: number) => void;
  onDropIntoGroupHeader: (event: DragEvent<HTMLElement>, groupId: string, worksheetCount: number) => void;
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
  return (
    <>
      {/* Search stays first so keyboard users can navigate immediately. */}
      <SearchBox
        value={query}
        onChange={onChangeQuery}
        results={searchResults}
        onSelect={onSelectSearchResult}
      />

      {/* Pinned tabs are rendered as a dedicated section for quick access. */}
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

      {/* User-defined groups with collapse behavior and own context menu. */}
      {navigatorView.groups.length ? (
        <Section title="Groups">
          <GroupSection
            groups={navigatorView.groups}
            activeWorksheetId={activeWorksheetId}
            contextMenuOpenId={contextMenuOpenSheetId}
            groupMenuOpenId={contextMenuOpenGroupId}
            dragConfig={{
              draggedWorksheetId: dragConfig.draggedWorksheetId,
              activeDropTargetId: dragConfig.activeDropTargetId,
              isDragActive: dragConfig.isDragActive,
              onStartDrag: dragConfig.onStartDrag,
              onEndDrag: dragConfig.onEndDrag,
              onDragOverDropZone: dragConfig.onDragOverDropZone,
              onDropAtIndex: dragConfig.onDropIntoGroup,
              onDropOnHeader: dragConfig.onDropIntoGroupHeader,
            }}
            onActivate={onActivateWorksheet}
            onToggleCollapsed={onToggleGroupCollapsed}
            onOpenGroupMenu={onOpenGroupMenu}
            onOpenSheetMenu={onOpenSheetMenu}
          />
        </Section>
      ) : null}

      {/* Ungrouped visible worksheets stay after pinned tabs and groups. */}
      {navigatorView.ungrouped.length || dragConfig.isDragActive ? (
        <Section title="Sheets">
          <div className="primary-tabs">
            <SheetList
              worksheets={navigatorView.ungrouped}
              activeWorksheetId={activeWorksheetId}
              contextMenuOpenId={contextMenuOpenSheetId}
              dragConfig={{
                draggedWorksheetId: dragConfig.draggedWorksheetId,
                activeDropTargetId: dragConfig.activeDropTargetId,
                dropTargetPrefix: 'sheet-section',
                isDragActive: dragConfig.isDragActive,
                onStartDrag: dragConfig.onStartDrag,
                onEndDrag: dragConfig.onEndDrag,
                onDragOverDropZone: dragConfig.onDragOverDropZone,
                onDropAtIndex: dragConfig.onDropIntoSheetSection,
              }}
              onActivate={onActivateWorksheet}
              onTogglePin={onPinWorksheet}
              onOpenContextMenu={onOpenSheetMenu}
            />
          </div>
        </Section>
      ) : null}

      {/* Hidden sheets stay separated to avoid accidental navigation noise. */}
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
