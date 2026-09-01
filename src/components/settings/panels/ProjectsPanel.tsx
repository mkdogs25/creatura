import { useMemo } from 'react';
import { useProjectStore } from '@/store/projectStore';
import { useUiStore } from '@/store/uiStore';
import { projectStats } from '@/store/selectors';
import { SettingsSection } from '@/components/settings/panels/SettingsSection';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { templateById } from '@/data/templates';
import { formatNumber, relativeTime } from '@/utils/text';
import { FolderCog, Plus } from 'lucide-react';
import type { Project } from '@/types/domain';

export function ProjectsPanel() {
  const bundle = useProjectStore((s) => s.bundle);
  const updateProject = useProjectStore((s) => s.updateProject);
  const setProjectDialogOpen = useUiStore((s) => s.setProjectDialogOpen);

  const stats = useMemo(() => projectStats(bundle), [bundle]);

  if (!bundle) {
    return (
      <EmptyState
        icon={FolderCog}
        title="No project open."
        body="Create a project to see its details and statistics here."
        compact
      >
        <Button variant="primary" onClick={() => setProjectDialogOpen(true)}>
          <Plus size={14} />
          New project
        </Button>
      </EmptyState>
    );
  }

  const { project } = bundle;

  const rows: Array<[string, string]> = [
    ['Notes', formatNumber(stats.notes)],
    ['Characters', formatNumber(stats.characters)],
    ['Locations', formatNumber(stats.locations)],
    ['Folders', formatNumber(stats.folders)],
    ['Timeline Events', formatNumber(stats.events)],
    ['Points of view', formatNumber(stats.povs)],
    ['Relationships', formatNumber(stats.relationships)],
    ['Tags', formatNumber(stats.tags)],
    ['Maps', formatNumber(stats.maps)],
    ['Words', formatNumber(stats.words)],
  ];

  return (
    <>
      <SettingsSection title="Current project">
        <div className="space-y-3 py-2">
          <Field label="Name" htmlFor="project-settings-name">
            <Input
              id="project-settings-name"
              defaultValue={project.name}
              onBlur={(event) => {
                const name = event.target.value.trim();
                if (name && name !== project.name) updateProject({ name });
              }}
            />
          </Field>
          <Field label="Description" htmlFor="project-settings-description">
            <Textarea
              id="project-settings-description"
              rows={3}
              defaultValue={project.description}
              onBlur={(event) => updateProject({ description: event.target.value })}
            />
          </Field>
          <Field
            label="Timeline unit"
            htmlFor="project-timeline-unit"
            hint="How positions on the timeline axis are labelled."
          >
            <Select
              id="project-timeline-unit"
              value={project.timelineUnit}
              onChange={(event) =>
                updateProject({ timelineUnit: event.target.value as Project['timelineUnit'] })
              }
            >
              <option value="chapter">Chapters</option>
              <option value="day">Days</option>
              <option value="year">Years</option>
            </Select>
          </Field>
        </div>
      </SettingsSection>

      <SettingsSection title="Details">
        <dl className="divide-y divide-[var(--color-line)] text-[0.8rem]">
          <div className="flex justify-between py-2">
            <dt className="text-[var(--color-ink-muted)]">Template</dt>
            <dd className="text-[var(--color-ink)]">{templateById(project.template).label}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-[var(--color-ink-muted)]">Created</dt>
            <dd className="text-[var(--color-ink)]">
              {new Date(project.createdAt).toLocaleDateString()}
            </dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-[var(--color-ink-muted)]">Last edited</dt>
            <dd className="text-[var(--color-ink)]">{relativeTime(project.updatedAt)}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-[var(--color-ink-muted)]">Schema version</dt>
            <dd className="font-mono text-[var(--color-ink)]">{project.schemaVersion}</dd>
          </div>
        </dl>
      </SettingsSection>

      <SettingsSection title="Statistics">
        <dl className="grid grid-cols-2 gap-x-6 text-[0.8rem]">
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex justify-between border-b border-[var(--color-line)] py-2"
            >
              <dt className="text-[var(--color-ink-muted)]">{label}</dt>
              <dd className="font-mono text-[var(--color-ink)] tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </SettingsSection>
    </>
  );
}
