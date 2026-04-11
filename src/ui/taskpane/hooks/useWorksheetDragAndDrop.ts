import { useCallback, useState } from 'react';
import type { DragEvent } from 'react';
import type { WorksheetEntity } from '../../../domain/navigation/types';

interface UseWorksheetDragAndDropParams {
  assignWorksheetToGroup: (worksheetId: string, groupId: string, targetIndex?: number) => void;
  removeWorksheetFromGroup: (worksheetId: string, targetIndex?: number) => void;
  reorderGroupWorksheet: (worksheetId: string, groupId: string, targetIndex: number) => void;
  reorderSheetSectionWorksheet: (worksheetId: string, targetIndex: number) => void;
}

interface DragSourceState {
  worksheetId: string;
  groupId: string | null;
}

export function useWorksheetDragAndDrop({
  assignWorksheetToGroup,
  removeWorksheetFromGroup,
  reorderGroupWorksheet,
  reorderSheetSectionWorksheet,
}: UseWorksheetDragAndDropParams) {
  const [dragSource, setDragSource] = useState<DragSourceState | null>(null);
  const [activeDropTargetId, setActiveDropTargetId] = useState<string | null>(null);

  const clearDragState = useCallback(() => {
    setDragSource(null);
    setActiveDropTargetId(null);
  }, []);

  const startWorksheetDrag = useCallback((event: DragEvent<HTMLElement>, worksheet: WorksheetEntity) => {
    if (worksheet.visibility !== 'Visible' || worksheet.isPinned) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', worksheet.worksheetId);
    setDragSource({ worksheetId: worksheet.worksheetId, groupId: worksheet.groupId });
  }, []);

  const endWorksheetDrag = useCallback(() => {
    clearDragState();
  }, [clearDragState]);

  const registerDropTarget = useCallback((event: DragEvent<HTMLElement>, dropTargetId: string) => {
    if (!dragSource) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    if (activeDropTargetId !== dropTargetId) {
      setActiveDropTargetId(dropTargetId);
    }
  }, [activeDropTargetId, dragSource]);

  const dropIntoSheetSection = useCallback((event: DragEvent<HTMLElement>, targetIndex: number) => {
    if (!dragSource) {
      return;
    }

    event.preventDefault();

    if (dragSource.groupId) {
      removeWorksheetFromGroup(dragSource.worksheetId, targetIndex);
    } else {
      reorderSheetSectionWorksheet(dragSource.worksheetId, targetIndex);
    }

    clearDragState();
  }, [clearDragState, dragSource, removeWorksheetFromGroup, reorderSheetSectionWorksheet]);

  const dropIntoGroup = useCallback((event: DragEvent<HTMLElement>, groupId: string, targetIndex: number) => {
    if (!dragSource) {
      return;
    }

    event.preventDefault();

    if (dragSource.groupId === groupId) {
      reorderGroupWorksheet(dragSource.worksheetId, groupId, targetIndex);
    } else {
      assignWorksheetToGroup(dragSource.worksheetId, groupId, targetIndex);
    }

    clearDragState();
  }, [assignWorksheetToGroup, clearDragState, dragSource, reorderGroupWorksheet]);

  const dropIntoGroupHeader = useCallback((event: DragEvent<HTMLElement>, groupId: string, worksheetCount: number) => {
    dropIntoGroup(event, groupId, worksheetCount);
  }, [dropIntoGroup]);

  return {
    draggedWorksheetId: dragSource?.worksheetId ?? null,
    activeDropTargetId,
    isDragActive: Boolean(dragSource),
    startWorksheetDrag,
    endWorksheetDrag,
    registerDropTarget,
    dropIntoSheetSection,
    dropIntoGroup,
    dropIntoGroupHeader,
  };
}
