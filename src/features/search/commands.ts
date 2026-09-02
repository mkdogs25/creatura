import {
  BookOpen,
  CalendarPlus,
  Download,
  FilePlus2,
  FileUp,
  FolderPlus,
  FolderUp,
  Grid3x3,
  MapPin,
  Moon,
  Settings as SettingsIcon,
  Focus,
  Tag as TagIcon,
  Timer,
  User,
  Upload,
  type LucideIcon,
} from 'lucide-react';

export interface Command {
  id: string;
  label: string;
  group: 'Create' | 'Navigate' | 'View' | 'Project';
  icon: LucideIcon;
  shortcut?: string;
  keywords?: string;
  run: () => void;
}

export interface CommandContext {
  createDoc: (kind: 'note' | 'character' | 'location') => void;
  createFolder: () => void;
  createTag: () => void;
  createEvent: () => void;
  goto: (view: 'library' | 'timeline' | 'matrix' | 'settings') => void;
  toggleFocus: () => void;
  toggleTheme: () => void;
  exportProject: () => void;
  importProject: () => void;
  importMarkdownNotes: () => void;
  importFolderAsProject: () => void;
}

/**
 * The command palette's catalogue. Kept as data so the same list can drive the
 * palette, the Quick Create menu and the keyboard-shortcuts reference.
 */
export function buildCommands(context: CommandContext): Command[] {
  return [
    {
      id: 'create-character',
      label: 'Create Character',
      group: 'Create',
      icon: User,
      keywords: 'new person cast',
      run: () => context.createDoc('character'),
    },
    {
      id: 'create-location',
      label: 'Create Location',
      group: 'Create',
      icon: MapPin,
      keywords: 'new place setting',
      run: () => context.createDoc('location'),
    },
    {
      id: 'create-note',
      label: 'Create Note',
      group: 'Create',
      icon: FilePlus2,
      keywords: 'new document page',
      run: () => context.createDoc('note'),
    },
    {
      id: 'create-event',
      label: 'Create Timeline Event',
      group: 'Create',
      icon: CalendarPlus,
      keywords: 'new scene chronology',
      run: () => context.createEvent(),
    },
    {
      id: 'create-folder',
      label: 'Create Folder',
      group: 'Create',
      icon: FolderPlus,
      keywords: 'new directory group',
      run: () => context.createFolder(),
    },
    {
      id: 'create-tag',
      label: 'Create Tag',
      group: 'Create',
      icon: TagIcon,
      keywords: 'new label',
      run: () => context.createTag(),
    },
    {
      id: 'goto-library',
      label: 'Open World Library',
      group: 'Navigate',
      icon: BookOpen,
      run: () => context.goto('library'),
    },
    {
      id: 'goto-timeline',
      label: 'Open Timeline',
      group: 'Navigate',
      icon: Timer,
      run: () => context.goto('timeline'),
    },
    {
      id: 'goto-matrix',
      label: 'Open Matrix',
      group: 'Navigate',
      icon: Grid3x3,
      run: () => context.goto('matrix'),
    },
    {
      id: 'goto-settings',
      label: 'Open Settings',
      group: 'Navigate',
      icon: SettingsIcon,
      shortcut: '⌘,',
      run: () => context.goto('settings'),
    },
    {
      id: 'toggle-focus',
      label: 'Toggle Focus Mode',
      group: 'View',
      icon: Focus,
      shortcut: '⌘.',
      keywords: 'distraction free write',
      run: () => context.toggleFocus(),
    },
    {
      id: 'toggle-theme',
      label: 'Toggle Theme',
      group: 'View',
      icon: Moon,
      keywords: 'dark light appearance',
      run: () => context.toggleTheme(),
    },
    {
      id: 'export',
      label: 'Export Project',
      group: 'Project',
      icon: Download,
      keywords: 'backup json save file',
      run: () => context.exportProject(),
    },
    {
      id: 'import',
      label: 'Import Project',
      group: 'Project',
      icon: Upload,
      keywords: 'restore json open file',
      run: () => context.importProject(),
    },
    {
      id: 'import-markdown',
      label: 'Import Markdown Notes',
      group: 'Create',
      icon: FileUp,
      keywords: 'md text file note obsidian',
      run: () => context.importMarkdownNotes(),
    },
    {
      id: 'import-folder',
      label: 'Import Folder as Project',
      group: 'Project',
      icon: FolderUp,
      keywords: 'vault obsidian directory markdown new',
      run: () => context.importFolderAsProject(),
    },
  ];
}
