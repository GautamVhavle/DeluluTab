# DeluluTab

An AI-focused Chrome extension that replaces the new tab page.

- **Search bar** with Google, DuckDuckGo, Bing, Ecosia, Perplexity, ChatGPT and Claude (`/` or `Ctrl/⌘+K` to focus)
- **AI prompt launcher**: type a prompt, press Enter, and it opens in ChatGPT, Claude, Grok, Gemini or Perplexity in a new tab. No API keys.
- **Clock and greeting**, **weather** (Open-Meteo, no key), **news** by category
- **Shortcuts and folders**, plus **keyboard chords**: press `` ` `` then type `gh` to jump to GitHub
- **Mini tools drawer**: notes (Markdown), tasks, calculator and unit converter
- **Backgrounds**: gradient presets, Unsplash photos, or your own images, with a slideshow and an overlay that keeps text readable
- Compact, Detailed and Focus layouts; light, dark and system themes

**Stack:** Vite · React 18 + TypeScript · Tailwind CSS 3 · Radix/shadcn-style UI · Zustand · Framer Motion · GSAP · Manifest V3

## Develop

```bash
npm install
npm run dev        # UI at http://localhost:5173 (chrome.* APIs are replaced by localStorage)
npm run typecheck
```

## Build, package, install

```bash
npm run build         # type-check + production build into dist/
npm run verify:dist   # check dist/ against the manifest and Web Store rules
npm run package       # build + verify + zip -> release/DeluluTab-v<version>.zip
```

**Load it in Chrome**

1. `npm run build`
2. Open `chrome://extensions` and turn on **Developer mode**
3. **Load unpacked** and pick the `dist/` folder (or unzip the release zip and pick that folder)
4. Open a new tab

After rebuilding, press the reload icon on the extension's card.

The version lives in `package.json`; the build stamps it into the manifest.

## Where things live

| Data | Stored in | Syncs across devices |
| --- | --- | --- |
| Settings, shortcuts, chords, widget choices | `chrome.storage.sync` | yes |
| Notes, tasks | `chrome.storage.local` | no |
| Uploaded wallpapers, Unsplash key, photo queue | `chrome.storage.local` | no |
| Weather and news cache, theme mirror | `localStorage` | no |

See [PRIVACY.md](PRIVACY.md) for what leaves your browser, and [RELEASING.md](RELEASING.md) for the release checklist.

## Project layout

```
index.html                 new tab entry (chrome_url_overrides.newtab)
public/                    manifest.json, icons, theme-boot.js (copied into dist/ as-is)
scripts/package.mjs        verifies dist/ and builds the release zip
src/
  App.tsx                  shell: header, dashboard, settings panels
  components/              widgets, shortcuts, chords, background, quickapps, ui
  hooks/                   theme, hydration, chords, cached fetch, geolocation
  lib/                     calc parser, units, weather, news, AI providers, ...
  store/                   zustand store + chrome.storage adapters
```
