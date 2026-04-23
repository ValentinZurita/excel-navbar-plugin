import { useDroppable } from '@dnd-kit/core';
import type { WorksheetContainerId, WorksheetDropKind } from '../../taskpane/dnd/worksheetDndModel';
import './WorksheetDropZone.css';

interface WorksheetDropZoneProps {
  dropTargetId: string;
  containerId: WorksheetContainerId;
  index: number;
  kind: WorksheetDropKind;
  isActive: boolean;
  isDragActive: boolean;
  isEmpty?: boolean;
  testId?: string;
}

function getDropZoneClassName(kind: WorksheetDropKind, isEmpty?: boolean) {
  return `worksheet-drop-zone worksheet-drop-zone-${kind} ${isEmpty ? 'worksheet-drop-zone-empty' : ''}`.trim();
}

function getInsertionLineClassName(isActive: boolean) {
  return `worksheet-insertion-line ${isActive ? 'worksheet-insertion-line-active' : ''}`.trim();
}

export function WorksheetDropZone({
  dropTargetId,
  containerId,
  index,
  kind,
  isActive,
  isDragActive,
  isEmpty,
  testId,
}: WorksheetDropZoneProps) {
  const { setNodeRef } = useDroppable({
    id: dropTargetId,
    data: {
      type: 'worksheet-drop-target',
      containerId,
      index,
      kind,
    },
    disabled: !isDragActive,
  });

  return (
    <div
      ref={setNodeRef}
      aria-hidden="true"
      data-testid={testId}
      className={getDropZoneClassName(kind, isEmpty)}
    >
      <div className={getInsertionLineClassName(isActive)} />
    </div>
  );
}
