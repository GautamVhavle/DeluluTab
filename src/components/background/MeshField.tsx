import { useEffect, useId, useState } from 'react'

const SPOTS = [
  { cx: 220, cy: 160, rx: 340, ry: 280 },
  { cx: 980, cy: 140, rx: 320, ry: 300 },
  { cx: 860, cy: 620, rx: 380, ry: 300 },
  { cx: 280, cy: 640, rx: 300, ry: 260 },
  { cx: 600, cy: 400, rx: 240, ry: 220 },
]

/**
 * A soft, moving colour field. Large blurred spots are pushed through noise,
 * which is what makes the blend look painted instead of like stacked circles.
 * The motion stops when the tab is hidden or the person asked for less of it.
 */
export function MeshField({ colors }: { colors: string[] }) {
  const uid = useId().replace(/:/g, '')
  const [alive, setAlive] = useState(true)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setAlive(!document.hidden && !reduced.matches)
    sync()
    document.addEventListener('visibilitychange', sync)
    reduced.addEventListener('change', sync)
    return () => {
      document.removeEventListener('visibilitychange', sync)
      reduced.removeEventListener('change', sync)
    }
  }, [])

  return (
    <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-[120%] w-[120%] -translate-x-[10%] -translate-y-[10%]" aria-hidden>
      <defs>
        <filter id={uid} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="42" result="blur" />
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.011" numOctaves="2" seed="4" result="noise">
            {alive && <animate attributeName="baseFrequency" dur="32s" values="0.007 0.01;0.013 0.008;0.007 0.01" repeatCount="indefinite" />}
          </feTurbulence>
          <feDisplacementMap in="blur" in2="noise" scale="110" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g filter={`url(#${uid})`}>
        <rect width="1200" height="800" fill={colors[0]} />
        {colors.map((color, i) => {
          const spot = SPOTS[i % SPOTS.length]
          return <ellipse key={`${color}-${i}`} cx={spot.cx} cy={spot.cy} rx={spot.rx} ry={spot.ry} fill={color} />
        })}
      </g>
    </svg>
  )
}
