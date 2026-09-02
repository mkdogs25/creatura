import type { SaveStatus } from '@/types/domain';

type Listener = (status: SaveStatus, lastSavedAt: number | null) => void;

/**
 * Tracks every write to the local database and exposes a single save status
 * for the header indicator.
 *
 * Writes are counted rather than flagged, so a burst of edits shows "Saving…"
 * once and settles to "Saved" only when the last one lands. A failure is
 * sticky until a later write succeeds — the writer should never be told their
 * work is safe when it isn't.
 */
class PersistenceTracker {
  private listeners = new Set<Listener>();
  private inFlight = 0;
  private status: SaveStatus = 'idle';
  private lastSavedAt: number | null = null;
  private settleTimer: number | undefined;
  private lastError: unknown = null;

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.status, this.lastSavedAt);
    return () => this.listeners.delete(listener);
  }

  getStatus(): SaveStatus {
    return this.status;
  }

  getLastSavedAt(): number | null {
    return this.lastSavedAt;
  }

  getLastError(): unknown {
    return this.lastError;
  }

  private emit(status: SaveStatus): void {
    this.status = status;
    for (const listener of this.listeners) listener(status, this.lastSavedAt);
  }

  /** Wraps a write so its lifecycle drives the status indicator. */
  async run<T>(operation: () => Promise<T>): Promise<T | null> {
    this.inFlight += 1;
    window.clearTimeout(this.settleTimer);
    if (this.status !== 'saving') this.emit('saving');

    try {
      const result = await operation();
      this.inFlight -= 1;
      this.lastError = null;
      if (this.inFlight === 0) {
        this.lastSavedAt = Date.now();
        this.emit('saved');
        // Fade the indicator back to idle once the writer has had a moment
        // to notice it, rather than leaving "Saved" pinned forever.
        this.settleTimer = window.setTimeout(() => {
          if (this.inFlight === 0 && this.status === 'saved') this.emit('idle');
        }, 2600);
      }
      return result;
    } catch (error) {
      this.inFlight = Math.max(0, this.inFlight - 1);
      this.lastError = error;
      console.error('[creatura] persistence write failed', error);
      this.emit('error');
      return null;
    }
  }

  markOffline(): void {
    this.emit('offline');
  }
}

export const persistence = new PersistenceTracker();
