import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useGroupCreationState } from '../../src/ui/taskpane/hooks/useGroupCreationState';

describe('useGroupCreationState', () => {
  it('starts not creating', () => {
    const { result } = renderHook(() =>
      useGroupCreationState({ onCreateGroup: vi.fn() }),
    );

    expect(result.current.isCreating).toBe(false);
    expect(result.current.initialWorksheetId).toBeUndefined();
  });

  it('enters creating mode on startCreating', () => {
    const { result } = renderHook(() =>
      useGroupCreationState({ onCreateGroup: vi.fn() }),
    );

    act(() => {
      result.current.startCreating('sheet-1');
    });

    expect(result.current.isCreating).toBe(true);
    expect(result.current.initialWorksheetId).toBe('sheet-1');
  });

  it('enters creating mode without worksheet id', () => {
    const { result } = renderHook(() =>
      useGroupCreationState({ onCreateGroup: vi.fn() }),
    );

    act(() => {
      result.current.startCreating();
    });

    expect(result.current.isCreating).toBe(true);
    expect(result.current.initialWorksheetId).toBeUndefined();
  });

  it('exits creating mode on cancelCreating', () => {
    const { result } = renderHook(() =>
      useGroupCreationState({ onCreateGroup: vi.fn() }),
    );

    act(() => {
      result.current.startCreating('sheet-1');
    });

    expect(result.current.isCreating).toBe(true);

    act(() => {
      result.current.cancelCreating();
    });

    expect(result.current.isCreating).toBe(false);
    expect(result.current.initialWorksheetId).toBeUndefined();
  });

  it('calls onCreateGroup with name and worksheet id on confirmCreating', () => {
    const onCreateGroup = vi.fn();
    const { result } = renderHook(() =>
      useGroupCreationState({ onCreateGroup }),
    );

    act(() => {
      result.current.startCreating('sheet-1');
    });

    act(() => {
      result.current.confirmCreating('Finance');
    });

    expect(onCreateGroup).toHaveBeenCalledWith('Finance', 'sheet-1');
  });

  it('calls onCreateGroup with only name when no worksheet id', () => {
    const onCreateGroup = vi.fn();
    const { result } = renderHook(() =>
      useGroupCreationState({ onCreateGroup }),
    );

    act(() => {
      result.current.startCreating();
    });

    act(() => {
      result.current.confirmCreating('Operations');
    });

    expect(onCreateGroup).toHaveBeenCalledWith('Operations', undefined);
  });

  it('does not call onCreateGroup with empty name', () => {
    const onCreateGroup = vi.fn();
    const { result } = renderHook(() =>
      useGroupCreationState({ onCreateGroup }),
    );

    act(() => {
      result.current.startCreating('sheet-1');
    });

    act(() => {
      result.current.confirmCreating('');
    });

    expect(onCreateGroup).not.toHaveBeenCalled();
  });

  it('does not call onCreateGroup with whitespace-only name', () => {
    const onCreateGroup = vi.fn();
    const { result } = renderHook(() =>
      useGroupCreationState({ onCreateGroup }),
    );

    act(() => {
      result.current.startCreating('sheet-1');
    });

    act(() => {
      result.current.confirmCreating('   ');
    });

    expect(onCreateGroup).not.toHaveBeenCalled();
  });

  it('trims name before calling onCreateGroup', () => {
    const onCreateGroup = vi.fn();
    const { result } = renderHook(() =>
      useGroupCreationState({ onCreateGroup }),
    );

    act(() => {
      result.current.startCreating('sheet-1');
    });

    act(() => {
      result.current.confirmCreating('  Finance  ');
    });

    expect(onCreateGroup).toHaveBeenCalledWith('Finance', 'sheet-1');
  });

  it('exits creating mode after successful confirmation', () => {
    const { result } = renderHook(() =>
      useGroupCreationState({ onCreateGroup: vi.fn() }),
    );

    act(() => {
      result.current.startCreating('sheet-1');
    });

    expect(result.current.isCreating).toBe(true);

    act(() => {
      result.current.confirmCreating('Finance');
    });

    expect(result.current.isCreating).toBe(false);
    expect(result.current.initialWorksheetId).toBeUndefined();
  });

  it('calls onSuccess callback after successful confirmation', () => {
    const onCreateGroup = vi.fn();
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useGroupCreationState({ onCreateGroup, onSuccess }),
    );

    act(() => {
      result.current.startCreating('sheet-1');
    });

    act(() => {
      result.current.confirmCreating('Finance');
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('does not call onSuccess with empty name', () => {
    const onCreateGroup = vi.fn();
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useGroupCreationState({ onCreateGroup, onSuccess }),
    );

    act(() => {
      result.current.startCreating('sheet-1');
    });

    act(() => {
      result.current.confirmCreating('');
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('does not call onSuccess on cancel', () => {
    const onCreateGroup = vi.fn();
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useGroupCreationState({ onCreateGroup, onSuccess }),
    );

    act(() => {
      result.current.startCreating('sheet-1');
    });

    act(() => {
      result.current.cancelCreating();
    });

    expect(onSuccess).not.toHaveBeenCalled();
  });
});
