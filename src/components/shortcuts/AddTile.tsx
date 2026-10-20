import { Plus } from '@/lib/icons'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function AddTile({ compact, label, onClick }: { compact: boolean; label: string; onClick: () => void }) {
  return (
    <motion.button
      layout
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      aria-label={`${label} shortcut`}
      className={cn(
        'flex flex-col items-center rounded-xl text-muted-foreground outline-none transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
        compact ? 'w-12 p-1.5' : 'w-[4.75rem] gap-2 p-2',
      )}
    >
      <span
        className={cn(
          'grid place-items-center rounded-xl border border-dashed',
          compact ? 'h-9 w-9' : 'h-11 w-11',
        )}
      >
        <Plus className="h-5 w-5" />
      </span>
      {!compact && <span className="text-xs">{label}</span>}
    </motion.button>
  )
}
