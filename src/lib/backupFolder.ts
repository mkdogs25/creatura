import { db, type DeviceRecord } from '@/db/database';

/**
 * Whether this browser supports the File System Access API at all. Only
 * Chromium-based browsers do at the time of writing — everywhere else, the
 * backup folder feature quietly disappears rather than erroring.
 */
export const isFileSystemAccessSupported =
  typeof window !== 'undefined' && 'showDirectoryPicker' in window;

const DEVICE_ID = 'local';

async function getDeviceRecord(): Promise<DeviceRecord> {
  const row = await db.device.get(DEVICE_ID);
  return row ?? { id: DEVICE_ID };
}

async function putDeviceRecord(patch: Partial<DeviceRecord>): Promise<DeviceRecord> {
  const current = await getDeviceRecord();
  const next: DeviceRecord = { ...current, ...patch, id: DEVICE_ID };
  await db.device.put(next);
  return next;
}

/** Reads the stored backup folder connection, if any, without prompting. */
export async function getStoredBackupFolder(): Promise<DeviceRecord | null> {
  const record = await getDeviceRecord();
  return record.backupDirHandle ? record : null;
}

/**
 * Checks (and optionally requests) read/write permission on a stored
 * directory handle. Requesting shows a browser prompt and requires a user
 * gesture — only pass `request: true` from a click handler, never on boot.
 */
export async function verifyBackupPermission(
  handle: FileSystemDirectoryHandle,
  { request = false }: { request?: boolean } = {},
): Promise<PermissionState> {
  const options = { mode: 'readwrite' as const };
  const queried = await handle.queryPermission(options);
  if (queried === 'granted' || !request) return queried;
  return handle.requestPermission(options);
}

/** Opens the native folder picker and remembers the choice for next time. */
export async function connectBackupFolder(): Promise<DeviceRecord | null> {
  if (!isFileSystemAccessSupported) return null;
  try {
    const handle = await window.showDirectoryPicker({ id: 'creatura-backup', mode: 'readwrite' });
    return putDeviceRecord({
      backupDirHandle: handle,
      backupDirName: handle.name,
      backupConnectedAt: Date.now(),
      backupLastError: null,
    });
  } catch (error) {
    // AbortError — the user closed the picker without choosing anything.
    if (error instanceof Error && error.name === 'AbortError') return null;
    throw error;
  }
}

export async function disconnectBackupFolder(): Promise<void> {
  await db.device.put({ id: DEVICE_ID });
}

export async function recordBackupRun(error: string | null): Promise<void> {
  await putDeviceRecord({ backupLastRunAt: Date.now(), backupLastError: error });
}
