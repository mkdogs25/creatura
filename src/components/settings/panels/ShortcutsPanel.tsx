import { SettingsSection } from '@/components/settings/panels/SettingsSection';

const GROUPS: Array<{ title: string; items: Array<[string, string]> }> = [
  {
    title: 'Application',
    items: [
      ['⌘K / Ctrl+K', 'Search and command palette'],
      ['⌘, / Ctrl+,', 'Open settings'],
      ['⌘S / Ctrl+S', 'Save now'],
      ['⌘. / Ctrl+.', 'Toggle focus mode'],
      ['Esc', 'Close menus, drawers, dialogs and focus mode'],
    ],
  },
  {
    title: 'Navigation',
    items: [
      ['⌘1 / Ctrl+1', 'World Library'],
      ['⌘2 / Ctrl+2', 'Timeline Mapper'],
      ['⌘3 / Ctrl+3', 'Matrix View'],
      ['⌘\\ / Ctrl+\\', 'Toggle the library panel'],
      ['⌘/ / Ctrl+/', 'Toggle the details panel'],
    ],
  },
  {
    title: 'Writing',
    items: [
      ['@', 'Reference a character, location or note'],
      ['⌘B / Ctrl+B', 'Bold'],
      ['⌘I / Ctrl+I', 'Italic'],
      ['⌘U / Ctrl+U', 'Underline'],
      ['⌘Z / Ctrl+Z', 'Undo'],
      ['⇧⌘Z / Ctrl+Shift+Z', 'Redo'],
      ['⌘⇧8', 'Bullet list'],
      ['⌘⇧7', 'Numbered list'],
      ['⌘⇧B', 'Block quote'],
    ],
  },
  {
    title: 'Timeline and map',
    items: [
      ['Drag an event', 'Move it along the axis'],
      ['Drag its right edge', 'Change how long it lasts'],
      ['Drag between lanes', 'Reassign the point of view'],
      ['Double-click an event', 'Open the event drawer'],
      ['Scroll wheel on the map', 'Zoom'],
      ['Drag the map', 'Pan'],
    ],
  },
];

export function ShortcutsPanel() {
  return (
    <>
      {GROUPS.map((group) => (
        <SettingsSection key={group.title} title={group.title}>
          <dl className="text-[0.8rem]">
            {group.items.map(([keys, description]) => (
              <div key={keys} className="flex items-center justify-between gap-4 py-2">
                <dt className="text-[var(--color-ink-muted)]">{description}</dt>
                <dd>
                  <kbd className="rounded border border-[var(--color-line)] bg-[var(--color-surface-sunken)] px-1.5 py-0.5 font-mono text-[0.7rem] whitespace-nowrap text-[var(--color-ink)]">
                    {keys}
                  </kbd>
                </dd>
              </div>
            ))}
          </dl>
        </SettingsSection>
      ))}
    </>
  );
}
