import type { WorksheetProjectedDropTarget } from '../dnd/worksheetDndModel';

export interface WorksheetDragVisualConfig {
  projectedDropTarget: WorksheetProjectedDropTarget | null;
  isDragActive: boolean;
  shouldSuppressActivation: (worksheetId: string) => boolean;
}

export interface GroupDragVisualConfig extends WorksheetDragVisualConfig {
  flashedGroupId: string | null;
}
