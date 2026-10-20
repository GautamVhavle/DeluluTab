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
