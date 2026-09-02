import type {
  DocKind,
  Folder,
  Project,
  ProjectBundle,
  TemplateId,
} from '@/types/domain';
import { SCHEMA_VERSION } from '@/types/domain';
import { newId } from '@/utils/id';

/** A folder in a template, optionally with children. */
export interface TemplateFolder {
  name: string;
  defaultKind?: DocKind;
  icon?: string;
  children?: TemplateFolder[];
}

export interface TemplateDefinition {
  id: TemplateId;
  label: string;
  tagline: string;
  folders: TemplateFolder[];
}

/**
 * Templates are starting structures, not schemas. Everything they create is an
 * ordinary folder the author can rename, move or delete.
 */
export const TEMPLATES: TemplateDefinition[] = [
  {
    id: 'fantasy',
    label: 'Fantasy',
    tagline: 'Courts, magic and long histories.',
    folders: [
      { name: 'Characters', defaultKind: 'character', icon: 'users' },
      { name: 'Locations', defaultKind: 'location', icon: 'map-pin' },
      { name: 'Magic Systems', icon: 'sparkles' },
      { name: 'Creatures', icon: 'paw-print' },
      { name: 'Factions', icon: 'shield' },
      { name: 'History', icon: 'scroll' },
      { name: 'Lore', icon: 'book' },
      { name: 'Objects', icon: 'gem' },
      { name: 'Cultures', icon: 'landmark' },
      { name: 'Events', icon: 'calendar' },
    ],
  },
  {
    id: 'scifi',
    label: 'Science Fiction',
    tagline: 'Systems, technology and civilisations.',
    folders: [
      { name: 'Characters', defaultKind: 'character', icon: 'users' },
      { name: 'Locations', defaultKind: 'location', icon: 'map-pin' },
      {
        name: 'Science',
        icon: 'atom',
        children: [
          { name: 'Real Science', icon: 'flask-conical' },
          { name: 'Theoretical / Plot Science', icon: 'orbit' },
        ],
      },
      { name: 'Technology', icon: 'cpu' },
      { name: 'Factions', icon: 'shield' },
      { name: 'History', icon: 'scroll' },
      { name: 'Lore', icon: 'book' },
      { name: 'Planets', defaultKind: 'location', icon: 'globe' },
      { name: 'Civilizations', icon: 'landmark' },
      { name: 'Events', icon: 'calendar' },
    ],
  },
  {
    id: 'custom',
    label: 'Custom',
    tagline: 'The three essentials, nothing more.',
    folders: [
      { name: 'Characters', defaultKind: 'character', icon: 'users' },
      { name: 'Locations', defaultKind: 'location', icon: 'map-pin' },
      { name: 'Notes', defaultKind: 'note', icon: 'file-text' },
    ],
  },
  {
    id: 'blank',
    label: 'Blank Project',
    tagline: 'An empty library. Build your own structure.',
    folders: [],
  },
];

export function templateById(id: TemplateId): TemplateDefinition {
  return TEMPLATES.find((template) => template.id === id) ?? TEMPLATES[2];
}

/** Flattens a template's folders into persistable rows. */
export function materializeFolders(
  template: TemplateDefinition,
  projectId: string,
): Folder[] {
  const now = Date.now();
  const rows: Folder[] = [];

  const walk = (nodes: TemplateFolder[], parentId: string | null): void => {
    nodes.forEach((node, index) => {
      const folder: Folder = {
        id: newId('folder'),
        projectId,
        parentId,
        name: node.name,
        defaultKind: node.defaultKind ?? 'note',
        icon: node.icon ?? 'folder',
        color: null,
        order: index,
        collapsed: false,
        createdAt: now,
        updatedAt: now,
      };
      rows.push(folder);
      if (node.children) walk(node.children, folder.id);
    });
  };

  walk(template.folders, null);
  return rows;
}

export function emptyBundle(project: Project, folders: Folder[]): ProjectBundle {
  return {
    project,
    folders,
    characters: [],
    locations: [],
    notes: [],
    tags: [],
    relationships: [],
    events: [],
    sections: [],
    povs: [],
    maps: [],
    markers: [],
    cells: [],
    chapters: [],
    terrain: [],
    stamps: [],
  };
}

/** Creates a brand-new project bundle from a template choice. */
export function buildProjectFromTemplate(input: {
  name: string;
  description: string;
  template: TemplateId;
}): ProjectBundle {
  const now = Date.now();
  const project: Project = {
    id: newId('project'),
    name: input.name.trim() || 'Untitled project',
    description: input.description.trim(),
    template: input.template,
    schemaVersion: SCHEMA_VERSION,
    archived: false,
    timelineOrigin: 1,
    timelineUnit: 'chapter',
    createdAt: now,
    updatedAt: now,
    lastOpenedAt: now,
  };
  return emptyBundle(project, materializeFolders(templateById(input.template), project.id));
}
