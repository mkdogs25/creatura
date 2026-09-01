import { Extension } from '@tiptap/core';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';
import { PluginKey } from '@tiptap/pm/state';
import { useProjectStore } from '@/store/projectStore';
import { allDocs, folderPath } from '@/store/selectors';
import { useMentionStore, type MentionCandidate } from '@/editor/extensions/mentionState';
import { fuzzyRank } from '@/utils/fuzzy';

const KIND_LABEL: Record<string, string> = {
  character: 'Character',
  location: 'Location',
  note: 'Note',
};

/**
 * The `@` autocomplete.
 *
 * Candidates are read straight from the project store, so the list is always
 * the current world — no separate index to keep in sync. Selecting one inserts
 * an `entityReference` node carrying the entity's stable id.
 */
export const MentionSuggestion = Extension.create({
  name: 'mentionSuggestion',

  addProseMirrorPlugins() {
    const options: Omit<SuggestionOptions<MentionCandidate>, 'editor'> = {
      char: '@',
      pluginKey: new PluginKey('creaturaMention'),
      allowSpaces: false,
      startOfLine: false,

      items: ({ query }) => {
        const bundle = useProjectStore.getState().bundle;
        const docs = allDocs(bundle);
        const withContext = (doc: (typeof docs)[number]): MentionCandidate => {
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
          return [...docs]
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .slice(0, 8)
            .map(withContext);
        }
        return fuzzyRank(query, docs, (doc) => doc.name, 12).map(({ item }) =>
          withContext(item),
        );
      },

      command: ({ editor, range, props }) => {
        editor
          .chain()
          .focus()
          .deleteRange(range)
          .insertEntityReference({ entityId: props.doc.id, label: props.doc.name })
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
