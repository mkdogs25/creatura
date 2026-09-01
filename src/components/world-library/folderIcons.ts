import {
  Atom,
  Book,
  Calendar,
  Cpu,
  FileText,
  FlaskConical,
  Folder as FolderIcon,
  Gem,
  Globe,
  Landmark,
  MapPin,
  Orbit,
  PawPrint,
  Scroll,
  Shield,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';

/** Folder icon names stored on records map to Lucide components here. */
const ICONS: Record<string, LucideIcon> = {
  folder: FolderIcon,
  users: Users,
  'map-pin': MapPin,
  sparkles: Sparkles,
  'paw-print': PawPrint,
  shield: Shield,
  scroll: Scroll,
  book: Book,
  gem: Gem,
  landmark: Landmark,
  calendar: Calendar,
  atom: Atom,
  'flask-conical': FlaskConical,
  orbit: Orbit,
  cpu: Cpu,
  globe: Globe,
  'file-text': FileText,
};

export const FOLDER_ICON_NAMES = Object.keys(ICONS);

export function folderIcon(name: string): LucideIcon {
  return ICONS[name] ?? FolderIcon;
}
