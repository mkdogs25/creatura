import { Extension } from '@tiptap/core';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import { useProjectStore } from '@/store/projectStore';
import { allDocs, folderPath } from '@/store/selectors';
import { useMentionStore, type MentionCandidate } from '@/editor/extensions/mentionState';
import { fuzzyRank } from '@/utils/fuzzy';
import { firstWord, initialsOf } from '@/utils/text';
import type { AnyDoc, DocKind } from '@/types/domain';

const KIND_LABEL: Record<string, string> = {
  character: 'Character',
  location: 'Location',
  note: 'Note',
};

interface EntityLinkOptions {
  /** Restricts candidates to these kinds; omit for every doc kind. */
  kinds?: DocKind[];
  /** Whether an inserted reference displays just the first word of the
   * resolved name ("Elysia") rather than the full name ("Elysia Ambrose"). */
  short?: boolean;
}

/** A query that reads as initials — "ea", "e.a", "e.a." — 1 to 4 bare letters
 * once dots and spaces are stripped. Distinct from ordinary fuzzy text: this
 * matches against each candidate's *initials*, not a substring of its name,
 * so "ea" reaches "Elysia Ambrose" the same way "e.a." does. */
function initialsQuery(query: string): string | null {
  const stripped = query.replace(/[.\s]/g, '').toLowerCase();
  return /^[a-z]{1,4}$/.test(stripped) ? stripped : null;
}

/**
 * Builds a Suggestion-triggered entity-link extension. `@name` and `[[name`
 * share this wiring — same popup, same inserted node type — and differ only
 * in the trigger string and the two options above.
 */
function createEntityLinkExtension(
  extensionName: string,
  char: string,
  { kinds, short = false }: EntityLinkOptions = {},
) {
  return Extension.create({
    name: extensionName,

    addProseMirrorPlugins() {
      const options: Omit<SuggestionOptions<MentionCandidate>, 'editor'> = {
        char,
        pluginKey: new PluginKey(`creatura-${extensionName}`),
        allowSpaces: false,
        startOfLine: false,

        items: ({ query }) => {
          const bundle = useProjectStore.getState().bundle;
          const pool: AnyDoc[] = kinds
            ? allDocs(bundle).filter((doc) => kinds.includes(doc.kind))
            : allDocs(bundle);
          const withContext = (doc: AnyDoc): MentionCandidate => {
            const path = folderPath(bundle, doc.folderId)
              .map((folder) => folder.name)
              .join(' / ');
            return {
              doc,
              context: path ? `${KIND_LABEL[doc.kind]} · ${path}` : KIND_LABEL[doc.kind],
            };
          };

          if (!query) {
            // No query yet: offer the most recently touched entities.
            return [...pool]
              .sort((a, b) => b.updatedAt - a.updatedAt)
              .slice(0, 8)
              .map(withContext);
          }

          const byName = fuzzyRank(query, pool, (doc) => doc.name, 12).map(({ item }) => item);

          // Initials are a deliberate, unambiguous signal ("e.a." can only
          // mean someone whose initials are E.A.) — resolve them against
          // every candidate's initials, not a substring of their name, and
          // fold in ahead of ordinary fuzzy matches when the query looks
          // like initials specifically (has a dot) rather than merely being
          // short enough to coincidentally read as some.
          const wanted = initialsQuery(query);
          const initialsMatches = wanted
            ? pool.filter((doc) => initialsOf(doc.name).replace(/\./g, '') === wanted)
            : [];

          const ordered = query.includes('.')
            ? [...initialsMatches, ...byName]
            : [...byName, ...initialsMatches];

          const seen = new Set<string>();
          const deduped: AnyDoc[] = [];
          for (const doc of ordered) {
            if (seen.has(doc.id)) continue;
            seen.add(doc.id);
            deduped.push(doc);
          }
          return deduped.slice(0, 12).map(withContext);
        },

        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertEntityReference({
              entityId: props.doc.id,
              label: short ? firstWord(props.doc.name) : props.doc.name,
              short,
            })
            .run();
        },

        render: () => ({
          onStart: (props) => {
            useMentionStore.getState().show({
              query: props.query,
              items: props.items,
              rect: props.clientRect?.() ?? null,
              select: (candidate) => props.command(candidate),
            });
          },
          onUpdate: (props) => {
            useMentionStore.getState().show({
              query: props.query,
              items: props.items,
              rect: props.clientRect?.() ?? null,
              select: (candidate) => props.command(candidate),
            });
          },
          onKeyDown: (props) => {
            const state = useMentionStore.getState();
            if (!state.open) return false;
            if (props.event.key === 'ArrowDown') {
              state.move(1);
              return true;
            }
            if (props.event.key === 'ArrowUp') {
              state.move(-1);
              return true;
            }
            if (props.event.key === 'Enter' || props.event.key === 'Tab') {
              const candidate = state.items[state.index];
              if (!candidate) return false;
              state.select?.(candidate);
              state.hide();
              return true;
            }
            if (props.event.key === 'Escape') {
              state.hide();
              return true;
            }
            return false;
          },
          onExit: () => {
            useMentionStore.getState().hide();
          },
        }),
      };

      return [Suggestion({ editor: this.editor, ...options })];
    },
  });
}

/**
 * The `@` autocomplete — characters and locations only, not notes (a note
 * isn't someone or somewhere the prose is talking *about* the way a mention
 * implies). Matches by full name, first name, last name or initials
 * ("e.a." or "ea" both reach "Elysia Ambrose"), and inserts a reference that
 * displays just the resolved first name, so "@e.a." becomes "@Elysia" in the
 * text — still a live link to the full character underneath.
 */
export const MentionSuggestion = createEntityLinkExtension('mentionSuggestion', '@', {
  kinds: ['character', 'location'],
  short: true,
});

/**
 * Wiki-style linking: typing `[[` opens the same picker, open to every doc
 * kind including notes, and inserts the full name — there's no need to type
 * a closing `]]`, picking an entity completes the link immediately.
 */
export const WikiLinkSuggestion = createEntityLinkExtension('wikiLinkSuggestion', '[[');
