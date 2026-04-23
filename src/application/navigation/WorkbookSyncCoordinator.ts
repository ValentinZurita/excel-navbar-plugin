import type { WorkbookAdapter } from '../../infrastructure/office/WorkbookAdapter';

interface WorkbookSyncCoordinatorOptions {
  adapter: WorkbookAdapter;
  onSync: () => Promise<void>;
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

  private scheduleSync() {
    if (this.debounceId !== null) {
      return;
    }

    this.debounceId = window.setTimeout(() => {
      this.debounceId = null;
      void this.options.onSync();
    }, this.debounceMs);
  }

  async start() {
    this.intervalId = window.setInterval(() => {
      void this.options.onSync();
    }, this.intervalMs);

    if (typeof this.options.adapter.subscribeToWorkbookChanges === 'function') {
      this.unsubscribe = await this.options.adapter.subscribeToWorkbookChanges(() => {
        this.scheduleSync();
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
