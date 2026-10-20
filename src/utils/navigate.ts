/** Navigates the current tab: chrome.tabs.update inside the extension, plain navigation elsewhere. */
export function navigateTo(url: string) {
  const go = () => {
    window.location.href = url
  }
  if (typeof chrome !== 'undefined' && chrome.tabs?.update) {
    try {
      chrome.tabs.update({ url }).catch(go)
    } catch {
      go()
    }
    return
  }
  go()
}

/** Opens `url` in a new tab: chrome.tabs.create inside the extension, window.open elsewhere. */
export function openInNewTab(url: string) {
  const fallback = () => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
  if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
    try {
      chrome.tabs.create({ url }).catch(fallback)
    } catch {
      fallback()
    }
    return
  }
  fallback()
}
