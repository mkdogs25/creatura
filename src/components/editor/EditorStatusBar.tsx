import { useMemo } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useSettingsStore } from '@/store/settingsStore';
import { SaveIndicator } from '@/components/navigation/SaveIndicator';

/** Word count, character count and save state beneath the manuscript. */
export function EditorStatusBar() {
  const words = useEditorStore((s) => s.liveWords);
  const chars = useEditorStore((s) => s.liveChars);
  const editor = useSettingsStore((s) => s.settings.editor);
  const goal = useSettingsStore((s) => s.settings.writing.wordGoal);

  const progress = useMemo(
    () => (goal > 0 ? Math.min(100, Math.round((words / goal) * 100)) : null),
    [goal, words],
  );

  return (
    <div className="flex shrink-0 items-center gap-3 border-t border-[var(--color-line)] px-4 py-1.5 text-[0.7rem] text-[var(--color-ink-faint)] sm:px-6">
      {editor.showWordCount && (
        <span className="tabular-nums">{words.toLocaleString()} words</span>
      )}
      {editor.showCharCount && (
        <span className="tabular-nums">{chars.toLocaleString()} characters</span>
      )}
      {progress !== null && (
        <span className="flex items-center gap-1.5">
          <span
            className="h-1 w-16 overflow-hidden rounded-full bg-[var(--color-line)]"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Word goal progress"
          >
            <span
              className="block h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </span>
          <span className="tabular-nums">{progress}% of {goal.toLocaleString()}</span>
        </span>
      )}
      <span className="ml-auto">
        <SaveIndicator />
      </span>
    </div>
  );
}
