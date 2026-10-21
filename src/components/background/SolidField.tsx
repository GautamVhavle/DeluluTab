import type { SolidEffect } from '@/types'

/** A flat colour, or the same colour fading or breathing toward a second one. */
export function SolidField({ color, effect, to }: { color: string; effect: SolidEffect; to: string }) {
  if (effect === 'fade') {
    return <div className="solid-fade absolute inset-0" style={{ backgroundColor: color, ['--solid-to' as string]: to }} />
  }
  if (effect === 'breathe') {
    return (
      <div className="absolute inset-0" style={{ backgroundColor: color }}>
        <div
          className="solid-breathe absolute inset-[-8%]"
          style={{ background: `radial-gradient(circle at 50% 42%, ${to}, transparent 68%)` }}
        />
      </div>
    )
  }
  return <div className="absolute inset-0" style={{ backgroundColor: color }} />
}
