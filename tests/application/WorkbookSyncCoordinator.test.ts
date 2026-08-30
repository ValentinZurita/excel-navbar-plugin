import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WorkbookSyncCoordinator } from '../../src/application/navigation/WorkbookSyncCoordinator';
import type { WorkbookAdapter } from '../../src/infrastructure/office/WorkbookAdapter';

describe('WorkbookSyncCoordinator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function createMockAdapter(overrides: Partial<WorkbookAdapter> = {}): WorkbookAdapter {
    return {
      getWorkbookSnapshot: vi.fn(),
      getPersistenceContext: vi.fn(),
      getWorksheetPreview: vi.fn(),
      createWorksheet: vi.fn(),
      activateWorksheet: vi.fn(),
      renameWorksheet: vi.fn(),
      unhideWorksheet: vi.fn(),
      hideWorksheet: vi.fn(),
      deleteWorksheet: vi.fn(),
      subscribeToWorkbookChanges: vi.fn(async () => vi.fn()),
      subscribeToVisibilityChange: vi.fn(() => vi.fn()),
      ...overrides,
    };
  }

  it('triggers periodic sync at configured interval', async () => {
    const onSync = vi.fn(async () => undefined);
    const adapter = createMockAdapter();
    const coordinator = new WorkbookSyncCoordinator({
      adapter,
      onSync,
      intervalMs: 5000,
    });

    await coordinator.start();
    expect(onSync).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5000);
    expect(onSync).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5000);
    expect(onSync).toHaveBeenCalledTimes(2);

    await coordinator.stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(onSync).toHaveBeenCalledTimes(2);
  });

  it('pauses polling when visibility changes to hidden and resumes with immediate sync when visible', async () => {
    let visibilityListener: ((visible: boolean) => void) | null = null;
    const adapter = createMockAdapter({
      subscribeToVisibilityChange: vi.fn((listener) => {
        visibilityListener = listener;
        return vi.fn();
      }),
    });

    const onSync = vi.fn(async () => undefined);
    const coordinator = new WorkbookSyncCoordinator({
      adapter,
      onSync,
      intervalMs: 5000,
    });

    await coordinator.start();
    expect(adapter.subscribeToVisibilityChange).toHaveBeenCalledOnce();

    // Advance 5000ms - normal poll
    await vi.advanceTimersByTimeAsync(5000);
    expect(onSync).toHaveBeenCalledTimes(1);

    // Hide taskpane
    visibilityListener!(false);

    // Advancing timers should not fire sync while hidden
    vi.advanceTimersByTime(15000);
    expect(onSync).toHaveBeenCalledTimes(1);

    // Unhide taskpane -> triggers immediate catch-up sync and resumes timer
    visibilityListener!(true);
    expect(onSync).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(5000);
    expect(onSync).toHaveBeenCalledTimes(3);

    await coordinator.stop();
  });

  it('guards against concurrent overlapping sync executions', async () => {
    let resolveFirstSync: () => void = () => undefined;
    let syncCount = 0;

    const onSync = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          syncCount += 1;
          if (syncCount === 1) {
            resolveFirstSync = resolve;
          } else {
            resolve();
          }
        }),
    );

    const adapter = createMockAdapter();
    const coordinator = new WorkbookSyncCoordinator({
      adapter,
      onSync,
      intervalMs: 5000,
      debounceMs: 50,
    });

    await coordinator.start();

    // Fire first sync
    vi.advanceTimersByTime(5000);
    expect(onSync).toHaveBeenCalledTimes(1);

    // Fire another poll while first is still resolving
    vi.advanceTimersByTime(5000);
    // Should NOT have launched a second concurrent sync
    expect(onSync).toHaveBeenCalledTimes(1);

    // Resolve the first sync
    resolveFirstSync();
    await Promise.resolve();

    // The queued pending sync should now execute
    expect(onSync).toHaveBeenCalledTimes(2);

    await coordinator.stop();
  });

  it('handles activation event via onActivationSync without debouncing structural onSync', async () => {
    let capturedListener: ((kind: any) => void) | null = null;
    const adapter = createMockAdapter({
      subscribeToWorkbookChanges: vi.fn(async (listener) => {
        capturedListener = listener;
        return vi.fn();
      }),
    });

    const onSync = vi.fn(async () => undefined);
    const onActivationSync = vi.fn(async () => undefined);

    const coordinator = new WorkbookSyncCoordinator({
      adapter,
      onSync,
      onActivationSync,
      debounceMs: 100,
    });

    await coordinator.start();
    expect(capturedListener).not.toBeNull();

    // Trigger activation event
    capturedListener!('activation');

    // onActivationSync should be invoked immediately
    await Promise.resolve();
    expect(onActivationSync).toHaveBeenCalledOnce();
    expect(onSync).not.toHaveBeenCalled();

    // Advancing debounce time should not trigger onSync
    await vi.advanceTimersByTimeAsync(200);
    expect(onSync).not.toHaveBeenCalled();

    await coordinator.stop();
  });

  it('falls back to onSync when onActivationSync is not provided', async () => {
    let capturedListener: ((kind: any) => void) | null = null;
    const adapter = createMockAdapter({
      subscribeToWorkbookChanges: vi.fn(async (listener) => {
        capturedListener = listener;
        return vi.fn();
      }),
    });

    const onSync = vi.fn(async () => undefined);

    const coordinator = new WorkbookSyncCoordinator({
      adapter,
      onSync,
      debounceMs: 100,
    });

    await coordinator.start();
    capturedListener!('activation');

    // Debounced fallback to onSync
    await vi.advanceTimersByTimeAsync(100);
    expect(onSync).toHaveBeenCalledOnce();

    await coordinator.stop();
  });

  it('handles async race if stop is called while subscribeToWorkbookChanges is awaiting', async () => {
    let resolveSubscribe: (unsub: () => void) => void = () => undefined;
    const unsubscribeMock = vi.fn();

    const adapter = createMockAdapter({
      subscribeToWorkbookChanges: vi.fn(
        () =>
          new Promise<() => void>((resolve) => {
            resolveSubscribe = resolve;
          }),
      ),
    });

    const coordinator = new WorkbookSyncCoordinator({
      adapter,
      onSync: vi.fn(async () => undefined),
    });

    const startPromise = coordinator.start();

    // Call stop while subscribeToWorkbookChanges is still pending
    await coordinator.stop();

    // Resolve subscribe
    resolveSubscribe(unsubscribeMock);
    await startPromise;

    // The unsubscribe token must be cleaned up immediately
    expect(unsubscribeMock).toHaveBeenCalledOnce();
  });

  it('gracefully catches and survives transient errors thrown by onSync', async () => {
    const errorSync = vi.fn().mockRejectedValueOnce(new Error('Excel modal editing'));
    const adapter = createMockAdapter();

    const coordinator = new WorkbookSyncCoordinator({
      adapter,
      onSync: errorSync,
      intervalMs: 5000,
    });

    await coordinator.start();

    // Advance 5000ms - triggers errorSync which rejects
    await expect(vi.advanceTimersByTimeAsync(5000)).resolves.not.toThrow();
    expect(errorSync).toHaveBeenCalledTimes(1);

    await coordinator.stop();
  });
});
