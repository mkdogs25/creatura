import { useEffect, useState } from 'react';
import { Copy, Trash2 } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useUiStore } from '@/store/uiStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useNavigation } from '@/hooks/useNavigation';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { TagEditor } from '@/components/metadata/TagEditor';
import { formatPosition } from '@/utils/time';
import type { TimelineEvent } from '@/types/domain';

interface EventDrawerProps {
  eventId: string | null;
  onClose: () => void;
}

/**
 * Full editor for a timeline event. Characters, locations, POV and related
 * events are all pickers over canonical project records — nothing here stores
 * a copy of a name.
 */
export function EventDrawer({ eventId, onClose }: EventDrawerProps) {
  const bundle = useProjectStore((s) => s.bundle);
  const updateEvent = useProjectStore((s) => s.updateEvent);
  const deleteEvent = useProjectStore((s) => s.deleteEvent);
  const duplicateEvent = useProjectStore((s) => s.duplicateEvent);
  const confirm = useUiStore((s) => s.confirm);
  const confirmDestructive = useSettingsStore((s) => s.settings.interface.confirmDestructive);
  const { openEvent } = useNavigation();

  const event = bundle?.events.find((item) => item.id === eventId) ?? null;
  const [title, setTitle] = useState('');

  useEffect(() => {
    setTitle(event?.title ?? '');
  }, [event?.id, event?.title]);

  if (!event) return <Drawer open={false} onClose={onClose}>{null}</Drawer>;

  const patch = (changes: Partial<TimelineEvent>) => updateEvent(event.id, changes);

  const relatedPool = (bundle?.events ?? []).filter((item) => item.id !== event.id);

  return (
    <Drawer
      open
      onClose={onClose}
      title="Event"
      subtitle={event.dateLabel || formatPosition(event.start, bundle?.project ?? null)}
      width="w-full sm:w-[28rem]"
      footer={
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const id = duplicateEvent(event.id);
              if (id) openEvent(id);
            }}
          >
            <Copy size={13} />
            Duplicate
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={async () => {
              const ok =
                !confirmDestructive ||
                (await confirm({
                  title: `Delete “${event.title}”?`,
                  body: 'This removes the event from the timeline and the matrix.',
                  confirmLabel: 'Delete event',
                  destructive: true,
                }));
              if (!ok) return;
              deleteEvent(event.id);
              onClose();
            }}
          >
            <Trash2 size={13} />
            Delete
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title" htmlFor="event-title">
          <Input
            id="event-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => patch({ title: title.trim() || 'Untitled event' })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            }}
          />
        </Field>

        <Field label="Summary" htmlFor="event-summary">
          <Textarea
            id="event-summary"
            rows={3}
            value={event.summary}
            onChange={(e) => patch({ summary: e.target.value })}
            placeholder="What happens here?"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Starts at" htmlFor="event-start">
            <Input
              id="event-start"
              type="number"
              step="0.5"
              value={event.start}
              onChange={(e) => patch({ start: Number(e.target.value) })}
            />
          </Field>
          <Field label="Duration" htmlFor="event-duration">
            <Input
              id="event-duration"
              type="number"
              step="0.5"
              min="0"
              value={event.duration}
              onChange={(e) => patch({ duration: Math.max(0, Number(e.target.value)) })}
            />
          </Field>
        </div>

        <Field
          label="Date label"
          htmlFor="event-date"
          hint="Optional. Shown instead of the computed position — “Midwinter, Year 12”."
        >
          <Input
            id="event-date"
            value={event.dateLabel}
            onChange={(e) => patch({ dateLabel: e.target.value })}
            placeholder={formatPosition(event.start, bundle?.project ?? null)}
          />
        </Field>

        <Field label="Point of view" htmlFor="event-pov">
          <Select
            id="event-pov"
            value={event.povId ?? ''}
            onChange={(e) => patch({ povId: e.target.value || null })}
          >
            <option value="">No POV assigned</option>
            {(bundle?.povs ?? []).map((pov) => (
              <option key={pov.id} value={pov.id}>
                {pov.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Characters">
          <EntityPicker
            label="Characters in this event"
            kinds={['character']}
            value={event.characterIds}
            onChange={(characterIds) => patch({ characterIds })}
            placeholder="Who is here?"
          />
        </Field>

        <Field label="Locations">
          <EntityPicker
            label="Locations for this event"
            kinds={['location']}
            value={event.locationIds}
            onChange={(locationIds) => patch({ locationIds })}
            placeholder="Where does it happen?"
          />
        </Field>

        <Field label="Tags">
          <TagEditor tagIds={event.tagIds} onChange={(tagIds) => patch({ tagIds })} />
        </Field>

        <Field label="Related events">
          {relatedPool.length === 0 ? (
            <p className="text-[0.76rem] text-[var(--color-ink-faint)]">
              No other events to link to yet.
            </p>
          ) : (
            <div className="space-y-1">
              {event.relatedEventIds.map((id) => {
                const related = relatedPool.find((item) => item.id === id);
                return (
                  <div key={id} className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!related}
                      onClick={() => related && openEvent(related.id)}
                      className="min-w-0 flex-1 truncate text-left text-[0.78rem] text-[var(--color-accent)] hover:underline disabled:text-[var(--color-ink-faint)] disabled:italic disabled:no-underline"
                    >
                      {related?.title ?? 'Deleted event'}
                    </button>
                    <button
                      type="button"
                      aria-label="Unlink event"
                      onClick={() =>
                        patch({
                          relatedEventIds: event.relatedEventIds.filter((value) => value !== id),
                        })
                      }
                      className="text-[0.7rem] text-[var(--color-ink-faint)] hover:text-[var(--color-danger)]"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
              <Select
                value=""
                aria-label="Link a related event"
                onChange={(e) => {
                  if (!e.target.value) return;
                  patch({ relatedEventIds: [...event.relatedEventIds, e.target.value] });
                }}
              >
                <option value="">Link an event…</option>
                {relatedPool
                  .filter((item) => !event.relatedEventIds.includes(item.id))
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
              </Select>
            </div>
          )}
        </Field>

        <Field label="Notes" htmlFor="event-notes">
          <Textarea
            id="event-notes"
            rows={4}
            value={event.notes}
            onChange={(e) => patch({ notes: e.target.value })}
            placeholder="Anything you need to remember about this scene."
          />
        </Field>
      </div>
    </Drawer>
  );
}
