import { useEffect } from 'react';
import { FolderCog, FolderX, RefreshCw } from 'lucide-react';
import { useBackupStore } from '@/store/backupStore';
import { useSettingsStore } from '@/store/settingsStore';
import { SettingsSection } from '@/components/settings/panels/SettingsSection';
import { Switch } from '@/components/ui/Switch';
import { Field, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { relativeTime } from '@/utils/text';

/**
 * Connects a folder on disk that the active project is mirrored into on a
 * timer — markdown for text, SVG for maps, plus a full-fidelity JSON
 * manifest. IndexedDB (above) is where the app actually reads and writes;
 * this is a portable, human-readable copy, not a second live database.
 */
export function LocalBackupSection() {
  const backup = useBackupStore();
  const backupSettings = useSettingsStore((s) => s.settings.backup);
  const updateSettings = useSettingsStore((s) => s.update);

  useEffect(() => {
    void backup.init();
    // Only ever needs to run once — the store itself owns re-checking permission.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!backup.supported) {
    return (
      <SettingsSection title="Local backup">
        <p className="py-2 text-[0.8rem] leading-relaxed text-[var(--color-ink-muted)]">
          This browser doesn't support connecting a folder on disk (Chrome, Edge, and other
          Chromium-based browsers do). Use Export from Backup above instead.
        </p>
      </SettingsSection>
    );
  }

  return (
    <SettingsSection
      title="Local backup"
      description="Periodically mirrors the active project into a folder on disk — markdown for characters, locations and notes, SVG for maps."
    >
      {!backup.connected ? (
        <div className="py-2">
          <Button variant="secondary" onClick={() => void backup.connect()}>
            <FolderCog size={14} />
            Choose backup folder
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4 py-2.5">
            <span className="min-w-0">
              <span className="block truncate text-[0.83rem] text-[var(--color-ink)]">
                {backup.folderName}
              </span>
              <span className="mt-0.5 block text-[0.74rem] text-[var(--color-ink-faint)]">
                {backup.running
                  ? 'Backing up…'
                  : backup.lastRunAt
                    ? `Last backup ${relativeTime(backup.lastRunAt)}`
                    : 'Not backed up yet'}
              </span>
            </span>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Back up now"
                disabled={backup.running}
                onClick={() => void backup.backupNow()}
              >
                <RefreshCw size={14} className={backup.running ? 'animate-spin' : undefined} />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Disconnect backup folder"
                onClick={() => void backup.disconnect()}
              >
                <FolderX size={14} />
              </Button>
            </div>
          </div>

          {backup.permission !== 'granted' && (
            <p className="rounded-[var(--radius-control)] border border-[color-mix(in_oklab,var(--color-danger)_40%,transparent)] px-3 py-2 text-[0.76rem] leading-relaxed text-[var(--color-danger)]">
              Permission for this folder was lost — usually after a browser restart.{' '}
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => void backup.backupNow()}
              >
                Reconnect
              </button>{' '}
              to resume backups.
            </p>
          )}
          {backup.lastError && (
            <p className="rounded-[var(--radius-control)] border border-[color-mix(in_oklab,var(--color-danger)_40%,transparent)] px-3 py-2 text-[0.76rem] leading-relaxed text-[var(--color-danger)]">
              {backup.lastError}
            </p>
          )}

          <Switch
            label="Back up automatically"
            description="Runs on the interval below, whenever this project has an open tab."
            checked={backupSettings.enabled}
            onChange={(enabled) => updateSettings('backup', { enabled })}
          />

          <div className="py-2.5">
            <Field label="Backup interval" htmlFor="backup-interval">
              <Select
                id="backup-interval"
                value={backupSettings.intervalMinutes}
                onChange={(event) =>
                  updateSettings('backup', { intervalMinutes: Number(event.target.value) })
                }
              >
                {[1, 2, 3, 5].map((minutes) => (
                  <option key={minutes} value={minutes}>
                    Every {minutes} minute{minutes === 1 ? '' : 's'}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </>
      )}
    </SettingsSection>
  );
}
