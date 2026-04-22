import { describe, expect, it } from 'vitest';
import { deriveActiveVisualItemId } from '../../src/domain/navigation/deriveActiveVisualItemId';
import type { NavigableItem, NavigatorView, WorksheetEntity } from '../../src/domain/navigation/types';

function worksheet(partial: Partial<WorksheetEntity> & Pick<WorksheetEntity, 'worksheetId' | 'name'>): WorksheetEntity {
  return {
    visibility: 'Visible',
    workbookOrder: 0,
    isPinned: false,
    groupId: null,
    lastKnownStructuralState: null,
    ...partial,
  };
}

const emptyNavigator = (overrides: Partial<NavigatorView> = {}): NavigatorView => ({
  pinned: [],
  groups: [],
  ungrouped: [],
  hidden: [],
  searchResults: [],
  ...overrides,
});

describe('deriveActiveVisualItemId', () => {
  it('returns worksheet id when the active sheet is in the linear navigable list', () => {
    const navigable: NavigableItem[] = [
      { id: 'worksheet:main-1', kind: 'worksheet', worksheetId: 'main-1', name: 'Main' },
    ];
    const view = emptyNavigator();
    expect(deriveActiveVisualItemId('main-1', view, navigable)).toBe('worksheet:main-1');
  });

  it('returns worksheet id when the active hidden sheet is already in expanded linear navigation', () => {
    const navigable: NavigableItem[] = [
      { id: 'worksheet:hidden-1', kind: 'hidden-worksheet', worksheetId: 'hidden-1', name: 'Hidden' },
    ];
    const view = emptyNavigator({
      hidden: [worksheet({
        worksheetId: 'hidden-1',
        name: 'Hidden',
        visibility: 'Hidden',
      })],
    });
    expect(deriveActiveVisualItemId('hidden-1', view, navigable)).toBe('worksheet:hidden-1');
  });

  it('returns worksheet id when the active sheet is only under collapsed Hidden', () => {
    const navigable: NavigableItem[] = [
      { id: 'worksheet:visible-1', kind: 'worksheet', worksheetId: 'visible-1', name: 'Visible' },
    ];
    const view = emptyNavigator({
      hidden: [worksheet({
        worksheetId: 'hidden-only',
        name: 'Secret',
        visibility: 'Hidden',
      })],
    });
    expect(deriveActiveVisualItemId('hidden-only', view, navigable)).toBe('worksheet:hidden-only');
  });

  it('returns group header id when active sheet is inside a collapsed group and header is navigable', () => {
    const navigable: NavigableItem[] = [
      { id: 'group-header:g1', kind: 'group-header', groupId: 'g1', name: 'G', isGroupCollapsed: true },
    ];
    const view = emptyNavigator({
      groups: [{
        groupId: 'g1',
        name: 'G',
        colorToken: 'green',
        isCollapsed: true,
        worksheets: [worksheet({
          worksheetId: 'inside',
          name: 'Inside',
          groupId: 'g1',
        })],
      }],
    });
    expect(deriveActiveVisualItemId('inside', view, navigable)).toBe('group-header:g1');
  });

  it('returns null when there is no active worksheet', () => {
    expect(deriveActiveVisualItemId(null, emptyNavigator(), [])).toBeNull();
  });
});
