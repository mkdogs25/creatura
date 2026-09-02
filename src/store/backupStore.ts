import { create } from 'zustand';
import {
  connectBackupFolder,
  disconnectBackupFolder,
  getStoredBackupFolder,
  isFileSystemAccessSupported,
  recordBackupRun,
  verifyBackupPermission,
} from '@/lib/backupFolder';
import { writeProjectBackup } from '@/lib/backupWriter';
import { useProjectStore } from '@/store/projectStore';
import { useSettingsStore } from '@/store/settingsStore';

interface BackupState {
  supported: boolean;
  connected: boolean;
  folderName: string | null;
  connectedAt: number | null;
  lastRunAt: number | null;
  lastError: string | null;
  permission: PermissionState | 'unknown';
  running: boolean;
  /** Reads back whatever folder connection was remembered from last time. */
  init: () => Promise<void>;
  /** Opens the folder picker — must be called from a user gesture. */
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  /** Runs a backup right now, requesting permission if it was revoked. */
  backupNow: () => Promise<void>;
  /** Called on the scheduler's poll — silent, never prompts for permission. */
  tick: () => Promise<void>;
}

/**
 * The live directory handle lives outside the store's own state: Zustand
 * devtools/persistence would try to serialize it, and nothing outside this
 * module needs to touch it directly anyway.
 */
let activeHandle: FileSystemDirectoryHandle | null = null;

export const useBackupStore = create<BackupState>((set, get) => ({
  supported: isFileSystemAccessSupported,
  connected: false,
  folderName: null,
  connectedAt: null,
  lastRunAt: null,
  lastError: null,
  permission: 'unknown',
  running: false,

  init: async () => {
    if (!isFileSystemAccessSupported) return;
    const record = await getStoredBackupFolder();
    if (!record?.backupDirHandle) return;
    activeHandle = record.backupDirHandle;
    const permission = await verifyBackupPermission(activeHandle, { request: false });
    set({
      connected: true,
      folderName: record.backupDirName ?? activeHandle.name,
      connectedAt: record.backupConnectedAt ?? null,
      lastRunAt: record.backupLastRunAt ?? null,
      lastError: record.backupLastError ?? null,
      permission,
    });
  },

  connect: async () => {
    const record = await connectBackupFolder();
    if (!record?.backupDirHandle) return false;
    activeHandle = record.backupDirHandle;
    set({
      connected: true,
      folderName: record.backupDirName ?? activeHandle.name,
      connectedAt: record.backupConnectedAt ?? Date.now(),
      lastError: null,
      permission: 'granted',
    });
    void get().backupNow();
    return true;
  },

  disconnect: async () => {
    await disconnectBackupFolder();
    activeHandle = null;
    set({
      connected: false,
      folderName: null,
      connectedAt: null,
      lastRunAt: null,
      lastError: null,
      permission: 'unknown',
    });
  },

  backupNow: async () => {
    if (!activeHandle || get().running) return;
    const permission = await verifyBackupPermission(activeHandle, { request: true });
    set({ permission });
    if (permission !== 'granted') return;
    const bundle = useProjectStore.getState().bundle;
    if (!bundle) return;
    set({ running: true });
    try {
      await writeProjectBackup(activeHandle, bundle);
      await recordBackupRun(null);
      set({ running: false, lastRunAt: Date.now(), lastError: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Backup failed';
      await recordBackupRun(message);
      set({ running: false, lastError: message });
    }
  },

  tick: async () => {
    const state = get();
    if (!state.connected || !activeHandle || state.running) return;
    if (!useSettingsStore.getState().settings.backup.enabled) return;
    // Query only — never request from an unattended timer, since a
    // permission prompt with no user gesture behind it just fails silently.
    const permission = await verifyBackupPermission(activeHandle, { request: false });
    if (permission !== state.permission) set({ permission });
    if (permission !== 'granted') return;
    const intervalMs = useSettingsStore.getState().settings.backup.intervalMinutes * 60_000;
    if (Date.now() < (state.lastRunAt ?? 0) + intervalMs) return;
    await get().backupNow();
  },
}));
