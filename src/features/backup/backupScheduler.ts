import { useBackupStore } from '@/store/backupStore';

let intervalId: number | undefined;

/**
 * Starts the background poll that keeps the connected backup folder in
 * sync with the active project. Polls every 30s rather than setting a
 * single long-lived timer at the configured interval — the interval is a
 * setting the user can change mid-session, and a cheap "is it due yet"
 * check every 30s is simpler than tearing down and rebuilding a timer
 * whenever that setting moves.
 *
 * Safe to call more than once (e.g. hot reload) — only the first call
 * actually starts the poll.
 */
export async function startBackupScheduler(): Promise<void> {
  await useBackupStore.getState().init();
  if (intervalId !== undefined) return;
  intervalId = window.setInterval(() => {
    void useBackupStore.getState().tick();
  }, 30_000);
}
