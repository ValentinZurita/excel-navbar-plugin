import { describe, expect, it } from 'vitest';
import type { WorksheetEntity } from '../../src/domain/navigation/types';
import {
  buildDragCommitWithPolicy,
  composePolicies,
  createPolicyState,
  defaultDnDPolicy,
  pinnedSectionPolicy,
} from '../../src/ui/taskpane/dnd/dndPolicies';

function createWorksheet(overrides: Partial<WorksheetEntity> = {}): WorksheetEntity {
  return {
    worksheetId: 'sheet-1',
    name: 'Test Sheet',
    visibility: 'Visible',
    workbookOrder: 0,
    isPinned: false,
    groupId: null,
    lastKnownStructuralState: null,
    ...overrides,
  };
}

describe('dndPolicies', () => {
  describe('createPolicyState', () => {
    it('creates policy state from worksheets', () => {
      const worksheetsById = {
        'sheet-1': createWorksheet({ worksheetId: 'sheet-1' }),
      };
      const state = createPolicyState(worksheetsById);
      expect(state.worksheetsById).toBe(worksheetsById);
    });
  });

  describe('defaultDnDPolicy', () => {
    it('allows all drag operations', () => {
      const worksheet = createWorksheet();
      const state = createPolicyState({});

      expect(defaultDnDPolicy.canDrag(worksheet, 'sheets', state)).toBe(true);
      expect(defaultDnDPolicy.canDrag(worksheet, 'group:group-1', state)).toBe(true);
    });

    it('allows all drop operations', () => {
      const worksheet = createWorksheet();
      const state = createPolicyState({});

      expect(defaultDnDPolicy.canDrop(worksheet, 'sheets', 'group:group-1', state)).toBe(true);
      expect(defaultDnDPolicy.canDrop(worksheet, 'group:group-1', 'sheets', state)).toBe(true);
    });
  });

  describe('pinnedSectionPolicy', () => {
    describe('canDrag', () => {
      it('allows dragging pinned worksheets from pinned container', () => {
        const worksheet = createWorksheet({ isPinned: true });
        const state = createPolicyState({ 'sheet-1': worksheet });

        expect(pinnedSectionPolicy.canDrag(worksheet, 'pinned', state)).toBe(true);
      });

      it('allows dragging non-pinned worksheets from other containers', () => {
        const worksheet = createWorksheet({ isPinned: false });
        const state = createPolicyState({ 'sheet-1': worksheet });

        expect(pinnedSectionPolicy.canDrag(worksheet, 'sheets', state)).toBe(true);
        expect(pinnedSectionPolicy.canDrag(worksheet, 'group:group-1', state)).toBe(true);
      });

      it('prevents dragging non-pinned worksheets from pinned container', () => {
        const worksheet = createWorksheet({ isPinned: false });
        const state = createPolicyState({ 'sheet-1': worksheet });

        // This is an edge case - a worksheet in pinned that isn't marked as pinned
        expect(pinnedSectionPolicy.canDrag(worksheet, 'pinned', state)).toBe(false);
      });
    });

    describe('canDrop', () => {
      it('allows dropping within pinned section', () => {
        const worksheet = createWorksheet({ isPinned: true });
        const state = createPolicyState({ 'sheet-1': worksheet });

        expect(pinnedSectionPolicy.canDrop(worksheet, 'pinned', 'pinned', state)).toBe(true);
      });

      it('prevents dropping from pinned to other sections', () => {
        const worksheet = createWorksheet({ isPinned: true });
        const state = createPolicyState({ 'sheet-1': worksheet });

        expect(pinnedSectionPolicy.canDrop(worksheet, 'pinned', 'sheets', state)).toBe(false);
        expect(pinnedSectionPolicy.canDrop(worksheet, 'pinned', 'group:group-1', state)).toBe(false);
      });

      it('prevents dropping from other sections to pinned', () => {
        const worksheet = createWorksheet({ isPinned: false });
        const state = createPolicyState({ 'sheet-1': worksheet });

        expect(pinnedSectionPolicy.canDrop(worksheet, 'sheets', 'pinned', state)).toBe(false);
        expect(pinnedSectionPolicy.canDrop(worksheet, 'group:group-1', 'pinned', state)).toBe(false);
      });

      it('allows drops between non-pinned sections', () => {
        const worksheet = createWorksheet({ isPinned: false });
        const state = createPolicyState({ 'sheet-1': worksheet });

        expect(pinnedSectionPolicy.canDrop(worksheet, 'sheets', 'group:group-1', state)).toBe(true);
        expect(pinnedSectionPolicy.canDrop(worksheet, 'group:group-1', 'sheets', state)).toBe(true);
        expect(pinnedSectionPolicy.canDrop(worksheet, 'group:group-1', 'group:group-2', state)).toBe(true);
      });
    });
  });

  describe('buildDragCommitWithPolicy', () => {
    it('returns null when worksheet is not found', () => {
      const state = createPolicyState({});
      const result = buildDragCommitWithPolicy(
        'non-existent',
        { containerId: 'sheets', index: 0 },
        { containerId: 'sheets', index: 1 },
        defaultDnDPolicy,
        state,
      );
      expect(result).toBeNull();
    });

    it('returns null when drag is not allowed by policy', () => {
      const worksheet = createWorksheet({ worksheetId: 'sheet-1', isPinned: true });
      const state = createPolicyState({ 'sheet-1': worksheet });

      const restrictivePolicy = {
        canDrag: () => false,
        canDrop: () => true,
      };

      const result = buildDragCommitWithPolicy(
        'sheet-1',
        { containerId: 'pinned', index: 0 },
        { containerId: 'pinned', index: 1 },
        restrictivePolicy,
        state,
      );
      expect(result).toBeNull();
    });

    it('returns null when drop is not allowed by policy', () => {
      const worksheet = createWorksheet({ worksheetId: 'sheet-1', isPinned: true });
      const state = createPolicyState({ 'sheet-1': worksheet });

      const restrictivePolicy = {
        canDrag: () => true,
        canDrop: () => false,
      };

      const result = buildDragCommitWithPolicy(
        'sheet-1',
        { containerId: 'pinned', index: 0 },
        { containerId: 'sheets', index: 0 },
        restrictivePolicy,
        state,
      );
      expect(result).toBeNull();
    });

    it('creates reorder-pinned commit for pinned section', () => {
      const worksheet = createWorksheet({ worksheetId: 'sheet-1', isPinned: true });
      const state = createPolicyState({ 'sheet-1': worksheet });

      const result = buildDragCommitWithPolicy(
        'sheet-1',
        { containerId: 'pinned', index: 0 },
        { containerId: 'pinned', index: 2 },
        defaultDnDPolicy,
        state,
      );

      expect(result).toEqual({
        kind: 'reorder-pinned',
        worksheetId: 'sheet-1',
        targetIndex: 1, // normalized because dragging downward
      });
    });

    it('creates reorder-sheet-section commit for sheets section', () => {
      const worksheet = createWorksheet({ worksheetId: 'sheet-1', isPinned: false });
      const state = createPolicyState({ 'sheet-1': worksheet });

      // Moving from index 0 to index 2 in same container
      // After normalization (2-1=1), this is a valid reorder
      const result = buildDragCommitWithPolicy(
        'sheet-1',
        { containerId: 'sheets', index: 0 },
        { containerId: 'sheets', index: 2 },
        defaultDnDPolicy,
        state,
      );

      expect(result).toEqual({
        kind: 'reorder-sheet-section',
        worksheetId: 'sheet-1',
        targetIndex: 1, // normalized: 2 - 1 = 1
      });
    });

    it('creates reorder-group commit for same group', () => {
      const worksheet = createWorksheet({
        worksheetId: 'sheet-1',
        groupId: 'group-1',
        isPinned: false,
      });
      const state = createPolicyState({ 'sheet-1': worksheet });

      const result = buildDragCommitWithPolicy(
        'sheet-1',
        { containerId: 'group:group-1', index: 0 },
        { containerId: 'group:group-1', index: 2 },
        defaultDnDPolicy,
        state,
      );

      expect(result).toEqual({
        kind: 'reorder-group',
        worksheetId: 'sheet-1',
        groupId: 'group-1',
        targetIndex: 1, // normalized
      });
    });

    it('creates assign-to-group commit when moving to a different group', () => {
      const worksheet = createWorksheet({
        worksheetId: 'sheet-1',
        groupId: 'group-1',
        isPinned: false,
      });
      const state = createPolicyState({ 'sheet-1': worksheet });

      const result = buildDragCommitWithPolicy(
        'sheet-1',
        { containerId: 'group:group-1', index: 0 },
        { containerId: 'group:group-2', index: 0 },
        defaultDnDPolicy,
        state,
      );

      expect(result).toEqual({
        kind: 'assign-to-group',
        worksheetId: 'sheet-1',
        groupId: 'group-2',
        targetIndex: 0,
      });
    });

    it('creates remove-from-group commit when moving to sheets', () => {
      const worksheet = createWorksheet({
        worksheetId: 'sheet-1',
        groupId: 'group-1',
        isPinned: false,
      });
      const state = createPolicyState({ 'sheet-1': worksheet });

      const result = buildDragCommitWithPolicy(
        'sheet-1',
        { containerId: 'group:group-1', index: 0 },
        { containerId: 'sheets', index: 0 },
        defaultDnDPolicy,
        state,
      );

      expect(result).toEqual({
        kind: 'remove-from-group',
        worksheetId: 'sheet-1',
        targetIndex: 0,
      });
    });

    it('returns null for no-op (same position)', () => {
      const worksheet = createWorksheet({ worksheetId: 'sheet-1' });
      const state = createPolicyState({ 'sheet-1': worksheet });

      const result = buildDragCommitWithPolicy(
        'sheet-1',
        { containerId: 'sheets', index: 0 },
        { containerId: 'sheets', index: 0 },
        defaultDnDPolicy,
        state,
      );

      expect(result).toBeNull();
    });

    describe('with pinnedSectionPolicy', () => {
      it('prevents moving from pinned to sheets', () => {
        const worksheet = createWorksheet({ worksheetId: 'sheet-1', isPinned: true });
        const state = createPolicyState({ 'sheet-1': worksheet });

        const result = buildDragCommitWithPolicy(
          'sheet-1',
          { containerId: 'pinned', index: 0 },
          { containerId: 'sheets', index: 0 },
          pinnedSectionPolicy,
          state,
        );

        expect(result).toBeNull();
      });

      it('prevents moving from sheets to pinned', () => {
        const worksheet = createWorksheet({ worksheetId: 'sheet-1', isPinned: false });
        const state = createPolicyState({ 'sheet-1': worksheet });

        const result = buildDragCommitWithPolicy(
          'sheet-1',
          { containerId: 'sheets', index: 0 },
          { containerId: 'pinned', index: 0 },
          pinnedSectionPolicy,
          state,
        );

        expect(result).toBeNull();
      });

      it('allows reordering within pinned', () => {
        const worksheet = createWorksheet({ worksheetId: 'sheet-1', isPinned: true });
        const state = createPolicyState({ 'sheet-1': worksheet });

        // Moving from index 0 to index 2 in pinned
        // After normalization (2-1=1), this is a valid reorder
        const result = buildDragCommitWithPolicy(
          'sheet-1',
          { containerId: 'pinned', index: 0 },
          { containerId: 'pinned', index: 2 },
          pinnedSectionPolicy,
          state,
        );

        expect(result).toEqual({
          kind: 'reorder-pinned',
          worksheetId: 'sheet-1',
          targetIndex: 1, // normalized: 2 - 1 = 1
        });
      });
    });
  });

  describe('composePolicies', () => {
    it('combines multiple policies with AND logic', () => {
      const allowPolicy: typeof defaultDnDPolicy = {
        canDrag: () => true,
        canDrop: () => true,
      };

      const denyPolicy: typeof defaultDnDPolicy = {
        canDrag: () => false,
        canDrop: () => false,
      };

      const composed = composePolicies(allowPolicy, denyPolicy);
      const worksheet = createWorksheet();
      const state = createPolicyState({});

      expect(composed.canDrag(worksheet, 'sheets', state)).toBe(false);
      expect(composed.canDrop(worksheet, 'sheets', 'group:group-1', state)).toBe(false);
    });

    it('allows operation when all policies allow', () => {
      const allowPolicy1: typeof defaultDnDPolicy = {
        canDrag: () => true,
        canDrop: () => true,
      };

      const allowPolicy2: typeof defaultDnDPolicy = {
        canDrag: () => true,
        canDrop: () => true,
      };

      const composed = composePolicies(allowPolicy1, allowPolicy2);
      const worksheet = createWorksheet();
      const state = createPolicyState({});

      expect(composed.canDrag(worksheet, 'sheets', state)).toBe(true);
      expect(composed.canDrop(worksheet, 'sheets', 'group:group-1', state)).toBe(true);
    });
  });
});
