import {
  Folder,
  FolderCode,
  Github,
  Globe,
  Mail,
  Sparkles,
  Youtube,
  type LucideIcon,
} from 'lucide-react'

const ICONS: Record<string, LucideIcon> = {
  github: Github,
  sparkles: Sparkles,
  youtube: Youtube,
  mail: Mail,
  globe: Globe,
  folder: Folder,
  'folder-code': FolderCode,
}

export function ShortcutIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Globe
  return <Icon className={className} />
}
