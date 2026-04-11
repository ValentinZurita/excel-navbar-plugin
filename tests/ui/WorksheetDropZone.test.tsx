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

  it('does not render when drag is inactive', () => {
    const { container } = render(
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

    expect(screen.queryByTestId('drop-zone')).not.toBeInTheDocument();
    expect(container.firstChild).toBeNull();
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
