import {
  AlignCenter,
  Archive,
  BookOpen,
  BookText,
  CalendarPlus,
  Copy,
  Cpu,
  Database,
  Download,
  FilePlus2,
  FileUp,
  FolderCog,
  FolderPlus,
  FolderUp,
  Grid3x3,
  Info,
  Keyboard,
  LayoutPanelLeft,
  MapPin,
  Moon,
  Palette,
  PanelLeft,
  PanelRight,
  PawPrint,
  PenLine,
  FileType,
  Plus,
  Printer,
  Search,
  Settings as SettingsIcon,
  Focus,
  SpellCheck,
  Tag as TagIcon,
  Timer,
  Trash2,
  Type,
  User,
  Upload,
  WrapText,
  type LucideIcon,
} from 'lucide-react';

export interface Command {
  id: string;
  label: string;
  group: 'Document' | 'Create' | 'Navigate' | 'Settings' | 'View' | 'Project';
  icon: LucideIcon;
  shortcut?: string;
  keywords?: string;
  run: () => void;
}

export interface CommandContext {
  createDoc: (kind: 'note' | 'character' | 'location' | 'creature' | 'tech') => void;
  createFolder: () => void;
  createTag: () => void;
  createEvent: () => void;
  createChapter: () => void;
  goto: (
    view: 'library' | 'timeline' | 'manuscript' | 'matrix' | 'settings',
    settingsCategory?: string,
  ) => void;
  toggleFocus: () => void;
  toggleTheme: () => void;
  toggleLibraryPanel: () => void;
  toggleDetailsPanel: () => void;
  toggleToolbar: () => void;
  toggleTypewriterMode: () => void;
  toggleSpellcheck: () => void;
  toggleMatrixTab: () => void;
  openFindReplace: () => void;
  newProject: () => void;
  duplicateCurrentProject: () => void;
  archiveCurrentProject: () => void;
  deleteCurrentProject: () => void;
  exportProject: () => void;
  exportManuscriptAsMarkdown: () => void;
  exportManuscriptAsPdf: () => void;
  importProject: () => void;
  importMarkdownNotes: () => void;
  importMarkdownChapters: () => void;
  importFolderAsProject: () => void;
}

/**
 * The command palette's catalogue. Kept as data so the same list can drive the
 * palette, the Quick Create menu and the keyboard-shortcuts reference — every
 * feature in the app that isn't scoped to whatever document happens to be
 * open belongs here (document-scoped actions — duplicate this note, toggle
 * this location's map — are added by the palette itself, since they only
 * make sense in context).
 */
export function buildCommands(context: CommandContext): Command[] {
  return [
    // ── Create ──────────────────────────────────────────────────────────
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
      keywords: 'new place setting map',
      run: () => context.createDoc('location'),
    },
    {
      id: 'create-creature',
      label: 'Create Creature',
      group: 'Create',
      icon: PawPrint,
      keywords: 'new monster beast animal',
      run: () => context.createDoc('creature'),
    },
    {
      id: 'create-tech',
      label: 'Create Tech',
      group: 'Create',
      icon: Cpu,
      keywords: 'new artifact item device gadget invention',
      run: () => context.createDoc('tech'),
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
      id: 'create-chapter',
      label: 'Create Chapter',
      group: 'Create',
      icon: BookText,
      keywords: 'new manuscript draft write',
      run: () => context.createChapter(),
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
      id: 'import-markdown',
      label: 'Import Markdown as Notes',
      group: 'Create',
      icon: FileUp,
      keywords: 'md text file note obsidian upload',
      run: () => context.importMarkdownNotes(),
    },
    {
      id: 'import-chapters',
      label: 'Import Files as Chapters',
      group: 'Create',
      icon: FileUp,
      keywords: 'md text file manuscript upload',
      run: () => context.importMarkdownChapters(),
    },

    // ── Navigate ────────────────────────────────────────────────────────
    {
      id: 'goto-library',
      label: 'Open World Library',
      group: 'Navigate',
      icon: BookOpen,
      shortcut: '⌘1',
      run: () => context.goto('library'),
    },
    {
      id: 'goto-timeline',
      label: 'Open Timeline',
      group: 'Navigate',
      icon: Timer,
      shortcut: '⌘2',
      run: () => context.goto('timeline'),
    },
    {
      id: 'goto-manuscript',
      label: 'Open Manuscript',
      group: 'Navigate',
      icon: BookText,
      shortcut: '⌘3',
      keywords: 'chapters draft write',
      run: () => context.goto('manuscript'),
    },
    {
      id: 'goto-matrix',
      label: 'Open Matrix',
      group: 'Navigate',
      icon: Grid3x3,
      keywords: 'grid relationships table',
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

    // ── Settings (each jumps straight to that category) ────────────────
    {
      id: 'settings-appearance',
      label: 'Settings → Appearance',
      group: 'Settings',
      icon: Palette,
      keywords: 'theme density motion dark light',
      run: () => context.goto('settings', 'appearance'),
    },
    {
      id: 'settings-editor',
      label: 'Settings → Editor',
      group: 'Settings',
      icon: Type,
      keywords: 'font size typography writing surface',
      run: () => context.goto('settings', 'editor'),
    },
    {
      id: 'settings-writing',
      label: 'Settings → Writing',
      group: 'Settings',
      icon: PenLine,
      keywords: 'autosave goals smart quotes em dash',
      run: () => context.goto('settings', 'writing'),
    },
    {
      id: 'settings-interface',
      label: 'Settings → Interface',
      group: 'Settings',
      icon: LayoutPanelLeft,
      keywords: 'panels tooltips confirmations matrix tab',
      run: () => context.goto('settings', 'interface'),
    },
    {
      id: 'settings-projects',
      label: 'Settings → Projects',
      group: 'Settings',
      icon: FolderCog,
      keywords: 'statistics word count',
      run: () => context.goto('settings', 'projects'),
    },
    {
      id: 'settings-data',
      label: 'Settings → Data & Storage',
      group: 'Settings',
      icon: Database,
      keywords: 'export import destructive',
      run: () => context.goto('settings', 'data'),
    },
    {
      id: 'settings-shortcuts',
      label: 'Settings → Keyboard Shortcuts',
      group: 'Settings',
      icon: Keyboard,
      keywords: 'bindings hotkeys',
      run: () => context.goto('settings', 'shortcuts'),
    },
    {
      id: 'settings-about',
      label: 'Settings → About',
      group: 'Settings',
      icon: Info,
      keywords: 'version credits privacy',
      run: () => context.goto('settings', 'about'),
    },

    // ── View ────────────────────────────────────────────────────────────
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
      id: 'toggle-library-panel',
      label: 'Toggle Library / Chapters Panel',
      group: 'View',
      icon: PanelLeft,
      shortcut: '⌘\\',
      keywords: 'sidebar left tree',
      run: () => context.toggleLibraryPanel(),
    },
    {
      id: 'toggle-details-panel',
      label: 'Toggle Details Panel',
      group: 'View',
      icon: PanelRight,
      shortcut: '⌘/',
      keywords: 'sidebar right metadata',
      run: () => context.toggleDetailsPanel(),
    },
    {
      id: 'toggle-toolbar',
      label: 'Toggle Formatting Toolbar',
      group: 'View',
      icon: WrapText,
      run: () => context.toggleToolbar(),
    },
    {
      id: 'find-replace',
      label: 'Find & Replace',
      group: 'View',
      icon: Search,
      shortcut: '⌘F',
      keywords: 'search text replace',
      run: () => context.openFindReplace(),
    },
    {
      id: 'toggle-typewriter',
      label: 'Toggle Typewriter Mode',
      group: 'View',
      icon: AlignCenter,
      keywords: 'scroll centre caret',
      run: () => context.toggleTypewriterMode(),
    },
    {
      id: 'toggle-spellcheck',
      label: 'Toggle Spellcheck',
      group: 'View',
      icon: SpellCheck,
      run: () => context.toggleSpellcheck(),
    },
    {
      id: 'toggle-matrix-tab',
      label: 'Toggle Matrix View Tab',
      group: 'View',
      icon: Grid3x3,
      keywords: 'navigation pin show hide',
      run: () => context.toggleMatrixTab(),
    },

    // ── Project ─────────────────────────────────────────────────────────
    {
      id: 'new-project',
      label: 'New Project…',
      group: 'Project',
      icon: Plus,
      run: () => context.newProject(),
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
      id: 'export-manuscript-markdown',
      label: 'Export Manuscript as Markdown',
      group: 'Project',
      icon: FileType,
      keywords: 'md book draft download',
      run: () => context.exportManuscriptAsMarkdown(),
    },
    {
      id: 'export-manuscript-pdf',
      label: 'Export Manuscript as PDF',
      group: 'Project',
      icon: Printer,
      keywords: 'print book draft save',
      run: () => context.exportManuscriptAsPdf(),
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
      id: 'import-folder',
      label: 'Import Folder as Project',
      group: 'Project',
      icon: FolderUp,
      keywords: 'vault obsidian directory markdown new',
      run: () => context.importFolderAsProject(),
    },
    {
      id: 'duplicate-project',
      label: 'Duplicate Current Project',
      group: 'Project',
      icon: Copy,
      run: () => context.duplicateCurrentProject(),
    },
    {
      id: 'archive-project',
      label: 'Archive / Restore Current Project',
      group: 'Project',
      icon: Archive,
      run: () => context.archiveCurrentProject(),
    },
    {
      id: 'delete-project',
      label: 'Delete Current Project',
      group: 'Project',
      icon: Trash2,
      run: () => context.deleteCurrentProject(),
    },
  ];
}
