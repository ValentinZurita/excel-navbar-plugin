import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { WorksheetPreviewState } from '../../../application/navigation/useWorksheetPreview';
import './WorksheetPreviewPopover.css';

interface WorksheetPreviewPopoverProps {
  preview: WorksheetPreviewState;
}

const popoverWidth = 260;
const estimatedPopoverHeight = 170;
const viewportMargin = 10;
const pointerGapX = 14;
const pointerGapY = 12;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function calculatePosition(preview: Exclude<WorksheetPreviewState, { status: 'idle' }>) {
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || popoverWidth;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 400;
  const { clientX, clientY } = preview.pointerPosition;
  const shouldOpenLeft = clientX + pointerGapX + popoverWidth > viewportWidth - viewportMargin;
  const shouldOpenAbove =
    clientY + pointerGapY + estimatedPopoverHeight > viewportHeight - viewportMargin;
  const left = shouldOpenLeft ? clientX - popoverWidth - pointerGapX : clientX + pointerGapX;
  const top = shouldOpenAbove
    ? clientY - estimatedPopoverHeight - pointerGapY
    : clientY + pointerGapY;

  return {
    left: clamp(
      left,
      viewportMargin,
      Math.max(viewportMargin, viewportWidth - popoverWidth - viewportMargin),
    ),
    top: clamp(
      top,
      viewportMargin,
      Math.max(viewportMargin, viewportHeight - estimatedPopoverHeight - viewportMargin),
    ),
  };
}

export function WorksheetPreviewPopover({ preview }: WorksheetPreviewPopoverProps) {
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (preview.status === 'idle' || !preview.anchorElement.isConnected) {
      setPosition(null);
      return undefined;
    }

    const updatePosition = () => {
      if (!preview.anchorElement.isConnected) {
        setPosition(null);
        return;
      }

      setPosition(calculatePosition(preview));
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [preview]);

  if (preview.status === 'idle' || preview.status === 'loading' || !position) {
    return null;
  }

  return createPortal(
    <div
      className="worksheet-preview-popover"
      data-testid="worksheet-preview-popover"
      role="tooltip"
      style={{
        left: position.left,
        top: position.top,
      }}
    >
      {preview.status === 'ready' ? (
        <img className="worksheet-preview-image" src={preview.imageSrc} alt="" draggable={false} />
      ) : null}

      {preview.status === 'unavailable' ? (
        <div className="worksheet-preview-unavailable">{preview.message}</div>
      ) : null}
    </div>,
    document.body,
  );
}
