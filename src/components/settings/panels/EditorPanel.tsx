import { useSettingsStore } from '@/store/settingsStore';
import { SettingsSection } from '@/components/settings/panels/SettingsSection';
import { Switch } from '@/components/ui/Switch';
import { Slider } from '@/components/ui/Slider';
import { Field, Select } from '@/components/ui/Input';
import type { EditorSettings } from '@/types/domain';

const FONTS: Array<{ value: EditorSettings['fontFamily']; label: string; stack: string }> = [
  { value: 'charter', label: 'Charter (default)', stack: 'var(--font-prose)' },
  { value: 'system-serif', label: 'System serif', stack: 'Georgia, Cambria, serif' },
  { value: 'inter', label: 'Inter', stack: 'var(--font-sans)' },
  { value: 'mono', label: 'Monospace', stack: 'var(--font-mono)' },
];

export function EditorPanel() {
  const editor = useSettingsStore((s) => s.settings.editor);
  const update = useSettingsStore((s) => s.update);
  const stack = FONTS.find((font) => font.value === editor.fontFamily)?.stack ?? 'var(--font-prose)';

  return (
    <>
      <SettingsSection
        title="Typography"
        description="Charter is the default writing face. Changes apply live to the manuscript."
      >
        <div className="py-2">
          <Field label="Editor font" htmlFor="editor-font">
            <Select
              id="editor-font"
              value={editor.fontFamily}
              onChange={(event) =>
                update('editor', {
                  fontFamily: event.target.value as EditorSettings['fontFamily'],
                })
              }
            >
              {FONTS.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Slider
          label="Font size"
          value={editor.fontSize}
          min={13}
          max={26}
          onChange={(fontSize) => update('editor', { fontSize })}
          format={(value) => `${value}px`}
        />
        <Slider
          label="Line height"
          value={editor.lineHeight}
          min={1.2}
          max={2.4}
          step={0.05}
          onChange={(lineHeight) => update('editor', { lineHeight })}
          format={(value) => value.toFixed(2)}
        />
        <Slider
          label="Writing width"
          value={editor.writingWidth}
          min={480}
          max={1100}
          step={10}
          onChange={(writingWidth) => update('editor', { writingWidth })}
          format={(value) => `${value}px`}
        />
        <Slider
          label="Paragraph spacing"
          value={editor.paragraphSpacing}
          min={0}
          max={2}
          step={0.05}
          onChange={(paragraphSpacing) => update('editor', { paragraphSpacing })}
          format={(value) => `${value.toFixed(2)}em`}
        />

        <div className="pt-3">
          <p className="type-label mb-2">Preview</p>
          <div
            className="rounded-[var(--radius-control)] border border-[var(--color-line)] bg-[var(--color-canvas)] px-4 py-3.5"
            style={{
              fontFamily: stack,
              fontSize: `${editor.fontSize}px`,
              lineHeight: editor.lineHeight,
              maxWidth: Math.min(editor.writingWidth, 640),
            }}
          >
            <p style={{ margin: 0 }}>
              The tide went out further than it should have, and kept going.
            </p>
            <p style={{ marginTop: `${editor.paragraphSpacing}em`, marginBottom: 0 }}>
              She counted the lights out of habit. There were nine, and there had been eleven
              the night before.
            </p>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Behaviour">
        <Switch
          label="Spellcheck"
          checked={editor.spellcheck}
          onChange={(spellcheck) => update('editor', { spellcheck })}
        />
        <Switch
          label="Typewriter focus"
          description="Keeps the line you are writing near the middle of the screen."
          checked={editor.typewriterMode}
          onChange={(typewriterMode) => update('editor', { typewriterMode })}
        />
        <Switch
          label="Formatting toolbar"
          checked={editor.showToolbar}
          onChange={(showToolbar) => update('editor', { showToolbar })}
        />
        <Switch
          label="Word count"
          checked={editor.showWordCount}
          onChange={(showWordCount) => update('editor', { showWordCount })}
        />
        <Switch
          label="Character count"
          checked={editor.showCharCount}
          onChange={(showCharCount) => update('editor', { showCharCount })}
        />
      </SettingsSection>
    </>
  );
}
