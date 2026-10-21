import type { IconBaseProps } from 'react-icons'
import type { IconType } from 'react-icons'

/** Bing's folded ribbon. react-icons has no Bing mark, and the Microsoft logo is a different brand. */
export const BingMark: IconType = (props: IconBaseProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <path d="M5 2.2v16.2l4.1-2.3 6.2 3.7 4.7-2.5V8.6l-4.7 2.2V7.2L9.1 4.4 5 2.2z" />
  </svg>
)
