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

  constructor(private readonly options: WorkbookSyncCoordinatorOptions) {
    this.intervalMs = options.intervalMs ?? 5000;
    this.debounceMs = options.debounceMs ?? 100;
  }

  private scheduleStructuralSync() {
    if (this.debounceId !== null) {
      return;
    }

    this.debounceId = window.setTimeout(() => {
      this.debounceId = null;
      void this.options.onSync();
    }, this.debounceMs);
  }

  private dispatchChange(kind: WorkbookChangeKind) {
    if (kind === 'activation' && this.options.onActivationSync) {
      // Activation is cheap and idempotent: run immediately without debouncing
      // so the active-sheet indicator reacts as quickly as Excel does.
      void this.options.onActivationSync();
      return;
    }

    this.scheduleStructuralSync();
  }

  async start() {
    this.intervalId = window.setInterval(() => {
      void this.options.onSync();
    }, this.intervalMs);

    if (typeof this.options.adapter.subscribeToWorkbookChanges === 'function') {
      this.unsubscribe = await this.options.adapter.subscribeToWorkbookChanges((kind) => {
        // Default to structural for backwards compatibility with tests/adapters
        // that invoke the listener without an explicit kind argument.
        this.dispatchChange(kind ?? 'structural');
      });
    }
  }

  async stop() {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.debounceId !== null) {
      window.clearTimeout(this.debounceId);
      this.debounceId = null;
    }

    if (this.unsubscribe) {
      await this.unsubscribe();
      this.unsubscribe = null;
    }
  }
}
