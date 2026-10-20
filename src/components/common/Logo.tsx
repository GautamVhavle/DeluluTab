import { useId } from 'react'

/** The DeluluTab mark: same artwork as public/logo.svg (the tab icon), inlined so it can scale and recolor-free. */
export function Logo({ className, title }: { className?: string; title?: string }) {
  const uid = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 128 128" className={className} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <linearGradient id={`${uid}-tile`} x1="12" y1="6" x2="116" y2="126" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4f46e5" />
          <stop offset="0.55" stopColor="#9333ea" />
          <stop offset="1" stopColor="#ec4899" />
        </linearGradient>
        <linearGradient id={`${uid}-gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="30" fill={`url(#${uid}-tile)`} />
      <rect width="128" height="64" rx="30" fill={`url(#${uid}-gloss)`} />
      <path fill="#fff" fillRule="evenodd" d="M30 26h32c28 0 44 17 44 38s-16 38-44 38H30z M52 46v36h10c13 0 21-7 21-18s-8-18-21-18z" />
      <path
        fill="#fff"
        stroke="#8b3fe8"
        strokeWidth="5"
        strokeLinejoin="round"
        paintOrder="stroke"
        d="M98 12c1.7 12 6.3 17 18 19-11.7 2-16.3 7-18 19-1.7-12-6.3-17-18-19 11.7-2 16.3-7 18-19z"
      />
    </svg>
  )
}
