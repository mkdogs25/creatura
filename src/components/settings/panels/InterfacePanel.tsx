import { useSettingsStore } from '@/store/settingsStore';
import { SettingsSection } from '@/components/settings/panels/SettingsSection';
import { Switch } from '@/components/ui/Switch';
import { Slider } from '@/components/ui/Slider';

export function InterfacePanel() {
  const ui = useSettingsStore((s) => s.settings.interface);
  const update = useSettingsStore((s) => s.update);

  return (
    <>
      <SettingsSection title="Panels">
        <Switch
          label="Open the library panel by default"
          checked={ui.sidebarDefaultOpen}
          onChange={(sidebarDefaultOpen) => update('interface', { sidebarDefaultOpen })}
        />
        <Switch
          label="Open the details panel by default"
          checked={ui.metadataDefaultOpen}
          onChange={(metadataDefaultOpen) => update('interface', { metadataDefaultOpen })}
        />
        <Slider
          label="Library panel width"
          value={ui.leftPanelWidth}
          min={200}
          max={460}
          step={4}
          onChange={(leftPanelWidth) => update('interface', { leftPanelWidth })}
          format={(value) => `${value}px`}
        />
        <Slider
          label="Details panel width"
          value={ui.rightPanelWidth}
          min={240}
          max={520}
          step={4}
          onChange={(rightPanelWidth) => update('interface', { rightPanelWidth })}
          format={(value) => `${value}px`}
        />
      </SettingsSection>

      <SettingsSection title="Assistance">
        <Switch
          label="Tooltips"
          description="Hover hints on toolbar and header controls."
          checked={ui.tooltips}
          onChange={(tooltips) => update('interface', { tooltips })}
        />
        <Switch
          label="Confirm before deleting"
          description="Turning this off deletes notes, folders and entries immediately."
          checked={ui.confirmDestructive}
          onChange={(confirmDestructive) => update('interface', { confirmDestructive })}
        />
      </SettingsSection>
    </>
  );
}
