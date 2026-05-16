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
  it('renders loading, ready, and unavailable states without taking focus', () => {
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

    const popover = screen.getByTestId('worksheet-preview-popover');
    expect(popover).toHaveAttribute('role', 'tooltip');
    expect(popover).toHaveStyle({ left: '54px', top: '62px' });
    expect(screen.queryByText('Preview')).not.toBeInTheDocument();
    expect(screen.queryByText('Revenue')).not.toBeInTheDocument();
    expect(screen.getByText('Loading…')).toBeInTheDocument();

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
