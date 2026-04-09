import type { GroupEntity, WorksheetEntity } from '../../domain/navigation/types';

interface SheetRowProps {
  worksheet: WorksheetEntity;
  isActive: boolean;
  onActivate: (worksheetId: string) => void | Promise<void>;
  onOpenContextMenu: (args: {
    target: HTMLElement;
    worksheet: WorksheetEntity;
  }) => void;
}

export function SheetRow({
  worksheet,
  isActive,
  onActivate,
  onOpenContextMenu,
}: SheetRowProps) {
  return (
    <article
      className={`sheet-row ${isActive ? 'sheet-row-active' : ''}`}
      onContextMenu={(event) => {
        event.preventDefault();
        onOpenContextMenu({
          target: event.currentTarget,
          worksheet,
        });
      }}
    >
      <div className="row-topline">
        <button className="sheet-link" type="button" onClick={() => onActivate(worksheet.worksheetId)}>
          <span className="sheet-title">{worksheet.name}</span>
          {worksheet.groupId ? <small>Grouped</small> : worksheet.isPinned ? <small>Pinned</small> : null}
        </button>
        <button
          className="toolbar-button"
          type="button"
          onClick={(event) =>
            onOpenContextMenu({
              target: event.currentTarget,
              worksheet,
            })
          }
        >
          •••
        </button>
      </div>
    </article>
  );
}
