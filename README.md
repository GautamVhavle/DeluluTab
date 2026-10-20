<p align="center">
  <img src="public/logo.svg" alt="DeluluTab" width="72" height="72" />
</p>

<h1 align="center">DeluluTab</h1>

<p align="center">
  <strong>The new tab that already knows where you are going.</strong><br />
  An AI-focused Chrome New Tab: one bar for search and AI, GTA-style keyboard chords, and a widget grid you arrange like a phone home screen. No API keys.
</p>

<p align="center">
  <img src="store/screenshot-1-detailed.png" alt="DeluluTab in Detailed mode" width="820" />
</p>

<p align="center">
  <a href="https://github.com/GautamVhavle/DeluluTab/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/GautamVhavle/DeluluTab/actions/workflows/ci.yml/badge.svg" /></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg" /></a>
  <img alt="Manifest V3" src="https://img.shields.io/badge/manifest-V3-4285F4.svg" />
  <img alt="React 18" src="https://img.shields.io/badge/React-18-61DAFB.svg" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.6-3178C6.svg" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6-646CFF.svg" />
</p>

---

## Features

- **One bar for search and AI.** Pick **Search** or **Ask** before you type: Search goes to Google, DuckDuckGo, Bing, Ecosia or Perplexity; Ask opens ChatGPT, Claude, Grok, Gemini or Perplexity with your prompt. `Tab` in the bar or `Alt+S` anywhere switches. `/` or `Ctrl/⌘+K` focuses it. No API keys, and DeluluTab never sees the reply.
- **GTA chords.** Press `` ` ``, then type a short sequence. `gh` opens GitHub, `yt` YouTube, `gpt` ChatGPT. The trigger key is yours to change.
- **A grid you arrange like a phone home screen.** Press **Edit**: drag widgets by the handle, resize from the corner, or use the arrow keys (Shift+arrows resizes). Rows stay full as you resize, every widget has a minimum and maximum size, and Detailed, Compact and Focus each keep their own layout, so switching modes never moves anything.
- **Widget gallery.** Edit mode opens a tray of every widget that is not on the dashboard yet. Drag one in or press +. Optional widgets (focus timer, GitHub, tab stash, Spotify, AI prompt launcher) start in the tray.
- **Widgets that ask, and keep it local.** GitHub asks for a username; Spotify connects with your own Spotify app. Those values live in `chrome.storage.local` on this device. They are never synced, and backups never include sign-in tokens. Widgets show a skeleton while they load and a setup card until they have what they need.
- **Custom code widgets.** Drop in your own HTML, CSS and JavaScript. It runs in a sandboxed frame that cannot touch the extension page.
- **Dynamic themes.** Light, dark and system, five bundled fonts, accent color, text size, gradient presets (Aurora by default), Unsplash photos or your own images.
- **Clock** in four styles (Digital, Retro flip, Analog, World dual-timezone), **weather** from Open-Meteo, and **news** by category.
- **Tab stash**, a **GitHub** contribution graph, **Spotify now playing**, a **focus timer** with Rain, Cafe and White-noise, and a **mini tools** drawer (Markdown notes, tasks, calculator, unit converter).
- **Official logos** for shortcuts, AI providers and search engines, with a fallback chain. Turn network logos off in Settings.
- **Settings hub** for the tab title and icon, appearance, widgets, chords, and a JSON backup of the whole configuration.

## Tech stack

| | |
| --- | --- |
| Build | Vite 6 |
| UI | React 18, TypeScript |
| Styling | Tailwind CSS, shadcn-style primitives (Radix) |
| State | Zustand, split across single-purpose slices |
| Motion | Framer Motion, GSAP |
| Layout | `react-grid-layout` |
| Extension | Chrome Manifest V3 |

## Install

```bash
git clone https://github.com/GautamVhavle/DeluluTab.git
cd DeluluTab
npm install
npm run build
```

Load the unpacked extension:

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select the `dist/` folder.
4. Open a new tab.

After you rebuild, press the reload icon on the extension card. `npm run dev` serves the UI at `http://localhost:5173` and stores data in `localStorage` instead of `chrome.*`.

```bash
npm run typecheck     # tsc only
npm test              # unit tests (layout engine, backups)
npm run e2e           # Playwright against the production build (npx playwright install chromium once)
npm run verify:dist   # check dist/ against the manifest
npm run package       # build + verify + zip → release/DeluluTab-v<version>.zip
npm run store:assets  # Web Store screenshots and promo tile → store/
```

The version lives in `package.json`. The build stamps it into the manifest.

## Keyboard chords

A chord is a trigger key followed by a short sequence. Nothing happens until the trigger, so normal typing is left alone.

```text
press `          the chord HUD appears
type  g h        GitHub opens
type  y t        YouTube
type  r d        Reddit
type  x          X
type  g p t      ChatGPT
Esc              cancel
```

Defaults ship with those five. Add or rewrite any sequence in **Settings → Chords**. The trigger defaults to `` ` `` (`Backquote`). Function keys and a few punctuation keys are also allowed; a trigger that is not typing-safe is called out in the panel so it does not steal characters from a text field.

Sequences cannot be prefixes of each other (`g` and `gh` cannot both exist). A chord always opens the shortcut it is bound to, so renaming a shortcut does not break the chord.

## Custom widgets

**Settings → Widgets → Add custom widget** opens an editor with HTML, CSS and JavaScript tabs. The preview is an iframe whose origin is opaque: it can run scripts, but it cannot read the new-tab page, extension storage, or cookies. Up to 8 widgets, 24,000 characters each. Their code stays in `chrome.storage.local` on this device.

## Adding a built-in widget

Everything the grid and the gallery know about a widget comes from one entry in `src/config/widgetCatalog.ts`:

1. Write the component in `src/components/widgets/` (it receives `mode`). Use `WidgetSkeleton` while loading and `WidgetSetup` if it needs a value from the user, saved with `useIntegration('<id>')` so it stays on the device.
2. Register it in `src/components/widgets/registry.tsx` (lazy import) and give it an icon in `widgetIcons.ts`.
3. Add a catalog entry: label, gallery blurb, default size with min and max, whether it shows in Focus, and whether it starts on the dashboard (new widgets should start in the gallery).

The grid, the gallery, Settings → Widgets, the size limits and the layout packing all pick it up from there. `npm test` checks that every catalog size is consistent and that the default layouts have no overlaps or gaps.

## Where things live

| Data | Stored in | Syncs |
| --- | --- | --- |
| Settings, shortcuts, chords, widget choices, grid layouts | `chrome.storage.sync` | yes |
| Notes, tasks, tab stashes, custom widget code | `chrome.storage.local` | no |
| Uploaded wallpapers, Unsplash key, photo queue | `chrome.storage.local` | no |
| Widget connections: GitHub username, Spotify Client ID and sign-in tokens | `chrome.storage.local` | no |
| Weather and news cache, theme mirror | `localStorage` | no |

See [PRIVACY.md](PRIVACY.md) for what leaves the browser, and [RELEASING.md](RELEASING.md) for the release checklist.

## Project layout

```text
src/
├── assets/                 logos and static media, when added
├── components/
│   ├── common/             buttons, dialogs, icons, logos
│   ├── layout/             header shell, mode switcher, dashboard grid
│   ├── widgets/            one module per widget, plus the grid registry
│   ├── settings/           settings dialog and tabbed panels
│   ├── background/         wallpaper engine
│   ├── chords/             chord HUD and editor
│   ├── shortcuts/          tiles, folders, editor
│   └── quickapps/          notes, tasks, calculator, converter
├── config/                 defaults, engines, fonts, themes
├── hooks/                  chords, theme, weather-adjacent hooks
├── services/               weather, news, unsplash, github, storage port
│   └── storage/            StorageAdapter and the chrome.storage adapter
├── store/                  Zustand store composed from slices
│   └── slices/             settings, library, widgets, notes, stash, session
├── types/                  shared TypeScript interfaces
└── utils/                  pure helpers (chords, layout, formatting)
```

Persistence goes through `StorageAdapter`. Components never call `chrome.storage`. Outside the extension (the Vite dev server) the same store falls back to `localStorage`.

## Contributing

1. Fork the repository and create a branch from `main`.
2. `npm install`, then `npm run dev` to work in the browser.
3. Keep a change to one concern: a widget in `components/widgets`, an API call in `services`, a keypress in `hooks`.
4. `npm run build`, `npm test` and `npm run e2e` must pass before you open a pull request. CI runs all three.
5. Describe what changed and how you checked it.

Please open an issue before a large redesign. Bug fixes and small, focused improvements are welcome as pull requests.

## License

MIT. Copyright (c) 2026 GautamVhavle.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

The full text is in [LICENSE](LICENSE).
