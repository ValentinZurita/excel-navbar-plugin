import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WorksheetDropZone } from '../../src/ui/components/WorksheetDropZone';

const useDroppableMock = vi.fn();

vi.mock('@dnd-kit/core', () => ({
  useDroppable: (...args: unknown[]) => useDroppableMock(...args),
}));

describe('WorksheetDropZone', () => {
  beforeEach(() => {
    useDroppableMock.mockReturnValue({
      setNodeRef: vi.fn(),
    });
  });

  it('renders but disables droppable when drag is inactive', () => {
    render(
      <WorksheetDropZone
        dropTargetId="sheets:end"
        containerId="sheets"
        index={0}
        kind="container-end"
        isActive={false}
        isDragActive={false}
        testId="drop-zone"
      />,
    );

    expect(screen.queryByTestId('drop-zone')).toBeInTheDocument();

    // Check that useDroppable was called with disabled: true
    expect(useDroppableMock).toHaveBeenCalledWith(
      expect.objectContaining({
        disabled: true,
      }),
    );
  });

  it('renders empty and active visual states when requested', () => {
    render(
      <WorksheetDropZone
        dropTargetId="sheets:end"
        containerId="sheets"
        index={0}
        kind="container-end"
        isActive={true}
        isDragActive={true}
        isEmpty={true}
        testId="drop-zone"
      />,
    );

    const zone = screen.getByTestId('drop-zone');
    expect(zone).toHaveClass('worksheet-drop-zone');
    expect(zone).toHaveClass('worksheet-drop-zone-empty');
    expect(zone.querySelector('.worksheet-insertion-line-active')).toBeInTheDocument();
  });
});
