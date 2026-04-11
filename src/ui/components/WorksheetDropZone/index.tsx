import type { DragEvent } from 'react';
import './WorksheetDropZone.css';

interface WorksheetDropZoneProps {
  testId: string;
  dropTargetId: string;
  isDragActive: boolean;
  isActive: boolean;
  onDragOver: (event: DragEvent<HTMLDivElement>, dropTargetId: string) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
}

export function WorksheetDropZone({
  testId,
  dropTargetId,
  isDragActive,
  isActive,
  onDragOver,
  onDrop,
}: WorksheetDropZoneProps) {
  if (!isDragActive) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      data-testid={testId}
      className={`worksheet-drop-zone ${isActive ? 'worksheet-drop-zone-active' : ''}`}
      onDragOver={(event) => onDragOver(event, dropTargetId)}
      onDrop={onDrop}
    />
  );
}
