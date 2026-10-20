// Applies the saved theme before first paint so a light-mode user never sees a dark flash.
// Extension pages forbid inline scripts, so this lives in its own file. The app keeps the key
// below up to date (see useApplyTheme); chrome.storage itself is async and too slow for this.
;(function () {
  try {
    var theme = localStorage.getItem('delulutab:theme')
    var dark = theme === 'light' ? false : theme === 'dynamic' ? matchMedia('(prefers-color-scheme: dark)').matches : true
    document.documentElement.classList.toggle('dark', dark)
  } catch (e) {
    // Storage blocked: keep the default (dark) markup.
  }
})()
