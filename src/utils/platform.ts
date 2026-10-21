type WithHints = Navigator & { userAgentData?: { platform?: string } }

/** Mac, iPhone and iPad. Windows and Linux take the other branch, so labels say Ctrl instead of ⌘. */
export function isMac() {
  const hinted = (navigator as WithHints).userAgentData?.platform ?? ''
  return /mac|iphone|ipad/i.test(`${navigator.platform || ''} ${hinted} ${navigator.userAgent || ''}`)
}

/** The modifier this browser actually uses for app shortcuts. */
export const modLabel = () => (isMac() ? '⌘' : 'Ctrl')
