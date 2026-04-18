import './UndoToast.css';

interface UndoToastProps {
  message: string;
  actionLabel: string;
  onUndo: () => void;
  onDismiss: () => void;
}

export function UndoToast({ message, actionLabel, onUndo, onDismiss }: UndoToastProps) {
  return (
    <section
      className="undo-toast"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <span className="undo-toast-message">{message}</span>
      <div className="undo-toast-actions">
        <button type="button" className="undo-toast-action" onClick={onUndo}>{actionLabel}</button>
        <button type="button" className="undo-toast-dismiss" onClick={onDismiss} aria-label="Dismiss notification">×</button>
      </div>
    </section>
  );
}
