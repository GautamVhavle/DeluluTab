/**
 * Custom widgets render in `public/widget-sandbox.html`, which the manifest serves as a sandboxed
 * extension page: a unique origin with no chrome.* APIs and no access to this page's DOM or storage.
 * The iframe sandbox attribute repeats those limits so a missing manifest entry cannot widen them.
 */
export const WIDGET_FRAME_SANDBOX = 'allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox'

export const WIDGET_MESSAGE = {
  render: 'delulutab:render',
  error: 'delulutab:error',
} as const

export function widgetSandboxUrl(): string {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.id) return chrome.runtime.getURL('widget-sandbox.html')
  } catch {
    // Not running as an extension (vite dev) or the extension was reloaded under this tab.
  }
  return new URL('widget-sandbox.html', document.baseURI).href
}
