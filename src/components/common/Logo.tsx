import { useId } from 'react'

/** The DeluluTab mark: same artwork as public/logo.svg (the tab icon), inlined so it can scale and recolor-free. */
export function Logo({ className, title }: { className?: string; title?: string }) {
  const uid = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 128 128" className={className} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <linearGradient id={`${uid}-tile`} x1="18" y1="8" x2="112" y2="124" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6d5efc" />
          <stop offset="0.48" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect width="128" height="128" rx="32" fill="#100d1c" />
      <rect x="6" y="6" width="116" height="116" rx="26" fill={`url(#${uid}-tile)`} />
      <path fill="#fff" fillRule="evenodd" d="M38 34h26c22 0 36 13 36 30s-14 30-36 30H38zm18 16v28h8c10 0 16-5.5 16-14s-6-14-16-14z" />
    </svg>
  )
}
