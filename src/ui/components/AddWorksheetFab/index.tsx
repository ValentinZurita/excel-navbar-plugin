import { PlusIcon } from '../../icons';
import './AddWorksheetFab.css';

interface AddWorksheetFabProps {
  onClick: () => void | Promise<void>;
  disabled?: boolean;
}

export function AddWorksheetFab({ onClick, disabled = false }: AddWorksheetFabProps) {
  return (
    <button
      type="button"
      className="add-worksheet-fab"
      aria-label="Add worksheet"
      title="Add worksheet"
      onClick={() => {
        void onClick();
      }}
      disabled={disabled}
    >
      <PlusIcon className="add-worksheet-fab-icon" />
    </button>
  );
}
