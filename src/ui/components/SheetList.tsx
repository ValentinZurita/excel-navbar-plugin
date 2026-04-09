import type { GroupEntity, WorksheetEntity } from '../../domain/navigation/types';
import { SheetRow } from './SheetRow';

interface SheetListProps {
  worksheets: WorksheetEntity[];
  activeWorksheetId: string | null;
  onActivate: (worksheetId: string) => void | Promise<void>;
  onOpenContextMenu: (args: { target: HTMLElement; worksheet: WorksheetEntity }) => void;
}

export function SheetList(props: SheetListProps) {
  if (!props.worksheets.length) {
    return null;
  }

  return (
    <div className="sheet-list">
      {props.worksheets.map((worksheet) => (
        <SheetRow
          key={worksheet.worksheetId}
          worksheet={worksheet}
          isActive={worksheet.worksheetId === props.activeWorksheetId}
          onActivate={props.onActivate}
          onOpenContextMenu={props.onOpenContextMenu}
        />
      ))}
    </div>
  );
}
