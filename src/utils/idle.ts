/** Runs `task` once the browser is idle, or after `timeout` ms if it stays busy. */
export function onIdle(task: () => void, timeout = 1200) {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(() => task(), { timeout })
    return () => window.cancelIdleCallback(id)
  }
  const id = window.setTimeout(task, Math.min(timeout, 400))
  return () => window.clearTimeout(id)
}
