import type {
  WorkbookAdapter,
  WorkbookChangeKind,
} from '../../infrastructure/office/WorkbookAdapter';

interface WorkbookSyncCoordinatorOptions {
  adapter: WorkbookAdapter;
  /** Full workbook resync (structural changes, periodic poll). */
  onSync: () => Promise<void>;
  /**
   * Lightweight handler for active-sheet-only changes. When omitted, activation
   * events fall back to the full `onSync` path.
   */
  onActivationSync?: () => Promise<void>;
  intervalMs?: number;
  debounceMs?: number;
}

export class WorkbookSyncCoordinator {
  private readonly intervalMs: number;

  private readonly debounceMs: number;

  private intervalId: number | null = null;

  private debounceId: number | null = null;

  private unsubscribe: (() => Promise<void> | void) | null = null;

  private unsubscribeVisibility: (() => void) | null = null;

  private isVisible = true;

  private isRunning = false;

  private isSyncInFlight = false;

  private pendingSync = false;

  constructor(private readonly options: WorkbookSyncCoordinatorOptions) {
    this.intervalMs = options.intervalMs ?? 5000;
    this.debounceMs = options.debounceMs ?? 100;
  }

  private async triggerGuardedSync() {
    if (this.isSyncInFlight) {
      this.pendingSync = true;
      return;
    }

    this.isSyncInFlight = true;
    this.pendingSync = false;

    try {
      await this.options.onSync();
    } catch {
      // Non-fatal: transient sync errors (e.g. modal editing) should not crash the runtime
    } finally {
      this.isSyncInFlight = false;
      if (this.pendingSync && this.isRunning && this.isVisible) {
        this.pendingSync = false;
        void this.triggerGuardedSync();
      }
    }
  }

  private scheduleStructuralSync() {
    if (!this.isRunning || this.debounceId !== null) {
      return;
    }

    this.debounceId = window.setTimeout(() => {
      this.debounceId = null;
      void this.triggerGuardedSync();
    }, this.debounceMs);
  }

  private dispatchChange(kind: WorkbookChangeKind) {
    if (!this.isRunning) {
      return;
    }

    if (kind === 'activation' && this.options.onActivationSync) {
      // Activation is cheap and idempotent: run immediately without debouncing
      // so the active-sheet indicator reacts as quickly as Excel does.
      void Promise.resolve()
        .then(() => this.options.onActivationSync?.())
        .catch(() => {
          // Transient activation sync error swallowed
        });
      return;
    }

    this.scheduleStructuralSync();
  }

  private startPolling() {
    if (this.intervalId !== null || !this.isRunning || !this.isVisible) {
      return;
    }

    this.intervalId = window.setInterval(() => {
      void this.triggerGuardedSync();
    }, this.intervalMs);
  }

  private stopPolling() {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private handleVisibilityChange(visible: boolean) {
    if (this.isVisible === visible) {
      return;
    }

    this.isVisible = visible;

    if (visible) {
      this.startPolling();
      // On returning to foreground, trigger an immediate resync to catch any
      // changes that occurred while the taskpane was in the background.
      void this.triggerGuardedSync();
    } else {
      this.stopPolling();
      if (this.debounceId !== null) {
        window.clearTimeout(this.debounceId);
        this.debounceId = null;
      }
    }
  }

  async start() {
    this.isRunning = true;
    this.isVisible = typeof document === 'undefined' || document.visibilityState === 'visible';

    this.startPolling();

    if (typeof this.options.adapter.subscribeToWorkbookChanges === 'function') {
      const unsub = await this.options.adapter.subscribeToWorkbookChanges((kind) => {
        // Default to structural for backwards compatibility with tests/adapters
        // that invoke the listener without an explicit kind argument.
        this.dispatchChange(kind ?? 'structural');
      });

      if (!this.isRunning) {
        if (typeof unsub === 'function') {
          void Promise.resolve(unsub());
        }
        return;
      }

      this.unsubscribe = unsub;
    }

    if (!this.isRunning) {
      return;
    }

    // Subscribe to host-level visibility through the adapter if available
    let unsubAdapterVisibility: (() => void) | undefined;
    if (typeof this.options.adapter.subscribeToVisibilityChange === 'function') {
      unsubAdapterVisibility = this.options.adapter.subscribeToVisibilityChange(
        (visible: boolean) => {
          this.handleVisibilityChange(visible);
        },
      );
    }

    // Fallback to DOM Page Visibility API
    const onDomVisibilityChange = () => {
      const isDocVisible =
        typeof document === 'undefined' || document.visibilityState === 'visible';
      this.handleVisibilityChange(isDocVisible);
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onDomVisibilityChange);
    }

    this.unsubscribeVisibility = () => {
      unsubAdapterVisibility?.();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onDomVisibilityChange);
      }
    };
  }

  async stop() {
    this.isRunning = false;
    this.stopPolling();

    if (this.debounceId !== null) {
      window.clearTimeout(this.debounceId);
      this.debounceId = null;
    }

    if (this.unsubscribeVisibility) {
      this.unsubscribeVisibility();
      this.unsubscribeVisibility = null;
    }

    if (this.unsubscribe) {
      await this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}
