import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WorksheetPreviewPopover } from '../../src/ui/components/WorksheetPreviewPopover';

function createAnchor() {
  const anchor = document.createElement('button');
  document.body.appendChild(anchor);
  anchor.getBoundingClientRect = () =>
    ({
      left: 20,
      top: 30,
      right: 120,
      bottom: 54,
      width: 100,
      height: 24,
      x: 20,
      y: 30,
      toJSON: () => ({}),
    }) as DOMRect;
  return anchor;
}

describe('WorksheetPreviewPopover', () => {
  it('does not render while loading, then shows ready and unavailable without taking focus', () => {
    const anchor = createAnchor();
    const pointerPosition = { clientX: 40, clientY: 50 };
    const { rerender } = render(
      <WorksheetPreviewPopover
        preview={{
          status: 'loading',
          worksheetId: 'sheet-1',
          worksheetName: 'Revenue',
          anchorElement: anchor,
          pointerPosition,
        }}
      />,
    );

    expect(screen.queryByTestId('worksheet-preview-popover')).not.toBeInTheDocument();

    rerender(
      <WorksheetPreviewPopover
        preview={{
          status: 'ready',
          worksheetId: 'sheet-1',
          worksheetName: 'Revenue',
          anchorElement: anchor,
          pointerPosition,
          imageSrc: 'data:image/png;base64,preview',
        }}
      />,
    );

    const image = screen.getByTestId('worksheet-preview-popover').querySelector('img');
    expect(image).toHaveAttribute('src', 'data:image/png;base64,preview');
    expect(image).toHaveAttribute('alt', '');

    rerender(
      <WorksheetPreviewPopover
        preview={{
          status: 'unavailable',
          worksheetId: 'sheet-1',
          worksheetName: 'Revenue',
          anchorElement: anchor,
          pointerPosition,
          reason: 'api-unsupported',
          message: 'Unavailable in this Excel version.',
        }}
      />,
    );

    expect(screen.getByText('Unavailable in this Excel version.')).toBeInTheDocument();
    expect(document.activeElement).not.toBe(screen.getByTestId('worksheet-preview-popover'));
  });
});
