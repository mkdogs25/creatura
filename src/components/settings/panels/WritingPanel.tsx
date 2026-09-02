import { useSettingsStore } from '@/store/settingsStore';
import { SettingsSection } from '@/components/settings/panels/SettingsSection';
import { Switch } from '@/components/ui/Switch';
import { Slider } from '@/components/ui/Slider';
import { Field, Input, Select } from '@/components/ui/Input';
import type { DocKind } from '@/types/domain';

export function WritingPanel() {
  const writing = useSettingsStore((s) => s.settings.writing);
  const update = useSettingsStore((s) => s.update);

  return (
    <>
      <SettingsSection
        title="Autosave"
        description="Changes are written to your Supabase database as you write."
      >
        <Switch
          label="Save automatically while writing"
          description="With this off, use ⌘S to save."
          checked={writing.autosave}
          onChange={(autosave) => update('writing', { autosave })}
        />
        <Slider
          label="Save delay"
          value={writing.autosaveDelay}
          min={200}
          max={3000}
          step={100}
          onChange={(autosaveDelay) => update('writing', { autosaveDelay })}
          format={(value) => `${(value / 1000).toFixed(1)}s after you stop typing`}
        />
      </SettingsSection>

      <SettingsSection title="Goals and defaults">
        <div className="py-2">
          <Field
            label="Daily word goal"
            htmlFor="word-goal"
            hint="Set to 0 to hide the progress bar entirely."
          >
            <Input
              id="word-goal"
              type="number"
              min={0}
              step={100}
              value={writing.wordGoal}
              onChange={(event) =>
                update('writing', { wordGoal: Math.max(0, Number(event.target.value)) })
              }
            />
          </Field>
        </div>
        <div className="py-2">
          <Field label="Default new entry" htmlFor="default-kind">
            <Select
              id="default-kind"
              value={writing.defaultDocKind}
              onChange={(event) =>
                update('writing', { defaultDocKind: event.target.value as DocKind })
              }
            >
              <option value="note">Note</option>
              <option value="character">Character</option>
              <option value="location">Location</option>
            </Select>
          </Field>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Text conventions"
        description="Applied as you type. Existing text is never rewritten."
      >
        <Switch
          label="Smart quotes"
          description="Turns straight quotes into typographic ones."
          checked={writing.smartQuotes}
          onChange={(smartQuotes) => update('writing', { smartQuotes })}
        />
        <Switch
          label="Em dashes"
          description="Converts -- into —."
          checked={writing.emDashes}
          onChange={(emDashes) => update('writing', { emDashes })}
        />
        <Switch
          label="Capitalise sentences"
          description="Off by default — plenty of prose deliberately starts lowercase."
          checked={writing.autoCapitalize}
          onChange={(autoCapitalize) => update('writing', { autoCapitalize })}
        />
      </SettingsSection>
    </>
  );
}
