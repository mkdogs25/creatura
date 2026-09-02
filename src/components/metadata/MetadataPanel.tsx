import { useMemo } from 'react';
import { CalendarClock, History, MapPin, Network, Sparkles, Tags, User } from 'lucide-react';
import { useProjectStore } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';
import { useUiStore } from '@/store/uiStore';
import {
  allDocs,
  docById,
  eventsForEntity,
  locationsForCharacter,
} from '@/store/selectors';
import { useNavigation } from '@/hooks/useNavigation';
import { TagEditor } from '@/components/metadata/TagEditor';
import { MetadataFields } from '@/components/metadata/MetadataFields';
import { RelationshipEditor } from '@/components/metadata/RelationshipEditor';
import { HistorySection } from '@/components/metadata/HistorySection';
import { EntitySuggestions } from '@/components/metadata/EntitySuggestions';
import { expandKnownNames, linkEntityInContent } from '@/features/mentions/entitySuggestions';
import { formatPosition } from '@/utils/time';
import { relativeTime } from '@/utils/text';
import type { DocKind } from '@/types/domain';

const FIELD_SUGGESTIONS: Record<DocKind, string[]> = {
  character: [
    'Status',
    'Age',
    'Role',
    'First Appearance',
    'Importance',
    'Affiliation',
    'Relationship Status',
  ],
  location: ['Status', 'Region', 'Population', 'Ruler', 'First Appearance', 'Climate'],
  note: ['Status', 'Category', 'Source', 'Importance'],
};

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Tags;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-[var(--color-line)] px-4 py-[var(--section-py)] first:border-t-0">
      <h3 className="type-label mb-2.5 flex items-center gap-1.5">
        <Icon size={11} aria-hidden="true" />
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * Everything known about the open document: its tags, its metadata fields, its
 * relationships, and the connections derived from the rest of the project.
 */
export function MetadataPanel() {
  const activeDocId = useEditorStore((s) => s.activeDocId);
  const reloadContent = useEditorStore((s) => s.reloadContent);
  const bundle = useProjectStore((s) => s.bundle);
  const updateDoc = useProjectStore((s) => s.updateDoc);
  const createDoc = useProjectStore((s) => s.createDoc);
  const updateDocContent = useProjectStore((s) => s.updateDocContent);
  const restoreSnapshot = useProjectStore((s) => s.restoreSnapshot);
  const toast = useUiStore((s) => s.toast);
  const { openEntity, openEvent } = useNavigation();

  const doc = useMemo(() => docById(bundle, activeDocId), [bundle, activeDocId]);
  const knownNames = useMemo(() => expandKnownNames(allDocs(bundle)), [bundle]);

  const events = useMemo(
    () => (doc ? eventsForEntity(bundle, doc.id) : []),
    [bundle, doc],
  );

  const appearsIn = useMemo(() => {
    if (!doc || !bundle) return [];
    if (doc.kind === 'character') {
      return locationsForCharacter(bundle, doc.id)
        .map((id) => docById(bundle, id))
        .filter((entity): entity is NonNullable<typeof entity> => Boolean(entity));
    }
    if (doc.kind === 'location') {
      // For a location, "appears in" reads as the cast who show up there.
      const ids = new Set<string>();
      for (const event of bundle.events) {
        if (!event.locationIds.includes(doc.id)) continue;
        event.characterIds.forEach((id) => ids.add(id));
      }
      return [...ids]
        .map((id) => docById(bundle, id))
        .filter((entity): entity is NonNullable<typeof entity> => Boolean(entity));
    }
    return [];
  }, [bundle, doc]);

  if (!doc) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center">
        <p className="text-[0.78rem] leading-relaxed text-[var(--color-ink-faint)]">
          Open a note, character or location to see and edit its details here.
        </p>
      </div>
    );
  }

  const appearsLabel = doc.kind === 'location' ? 'Cast Present' : 'Appears In';

  const createFromSuggestion = (kind: 'character' | 'location', name: string) => {
    const id = createDoc({ kind, name });
    updateDocContent(doc.id, linkEntityInContent(doc.content, name, id));
    reloadContent();
    toast({ tone: 'success', title: `Created “${name}”`, body: 'Mentions in this document now link to it.' });
  };

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="px-4 pt-3.5 pb-1">
        <p className="type-label">{doc.kind}</p>
        <p className="mt-1 text-[0.7rem] text-[var(--color-ink-faint)]">
          Edited {relativeTime(doc.updatedAt)} · {doc.wordCount.toLocaleString()} words
        </p>
      </div>

      <Section icon={Sparkles} title="Suggestions">
        <EntitySuggestions
          key={doc.id}
          content={doc.content}
          knownNames={knownNames}
          onCreate={createFromSuggestion}
        />
      </Section>

      <Section icon={Tags} title="Tags">
        <TagEditor
          tagIds={doc.tagIds}
          onChange={(tagIds) => updateDoc(doc.id, { tagIds })}
        />
      </Section>

      <Section icon={User} title="Metadata">
        <MetadataFields
          fields={doc.fields}
          onChange={(fields) => updateDoc(doc.id, { fields })}
          suggestions={FIELD_SUGGESTIONS[doc.kind]}
        />
      </Section>

      <Section icon={Network} title="Relationships">
        <RelationshipEditor entityId={doc.id} />
      </Section>

      {appearsIn.length > 0 && (
        <Section icon={MapPin} title={appearsLabel}>
          <ul className="space-y-0.5">
            {appearsIn.map((entity) => (
              <li key={entity.id}>
                <button
                  type="button"
                  onClick={() => openEntity(entity.id)}
                  className="w-full truncate rounded px-1 py-1 text-left text-[0.78rem] text-[var(--color-ink-muted)] transition-colors hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-accent)]"
                >
                  {entity.name}
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section icon={History} title="Recent versions">
        <HistorySection docId={doc.id} updatedAt={doc.updatedAt} onRestore={restoreSnapshot} />
      </Section>

      <Section icon={CalendarClock} title="Timeline">
        {events.length === 0 ? (
          <p className="text-[0.76rem] text-[var(--color-ink-faint)]">
            Not present in any timeline event yet.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {events.map((event) => (
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => openEvent(event.id)}
                  className="w-full rounded px-1 py-1 text-left transition-colors hover:bg-[var(--color-surface-raised)]"
                >
                  <span className="block truncate text-[0.78rem] text-[var(--color-ink-muted)] hover:text-[var(--color-accent)]">
                    {event.title}
                  </span>
                  <span className="block text-[0.68rem] text-[var(--color-ink-faint)]">
                    {event.dateLabel || formatPosition(event.start, bundle?.project ?? null)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
