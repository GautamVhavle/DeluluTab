<p align="center">
  <img src="public/logo.svg" alt="DeluluTab" width="72" height="72" />
</p>

<h1 align="center">DeluluTab</h1>

<p align="center">
  <strong>The new tab that already knows where you are going.</strong><br />
  An AI-focused Chrome New Tab: GTA-style keyboard chords, a draggable bento grid, and launchers that open the model you actually want — no API keys.
</p>

<p align="center">
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue.svg" /></a>
  <img alt="Manifest V3" src="https://img.shields.io/badge/manifest-V3-4285F4.svg" />
  <img alt="React 18" src="https://img.shields.io/badge/React-18-61DAFB.svg" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.6-3178C6.svg" />
  <img alt="Vite" src="https://img.shields.io/badge/Vite-6-646CFF.svg" />
</p>

---

## Features

- **GTA chords.** Press `` ` ``, then type a short sequence. `gh` opens GitHub, `yt` YouTube, `gpt` ChatGPT. The trigger key is yours to change.
- **Drag-and-drop grid.** Arrange and resize widgets like an iOS home screen. Each layout mode (Detailed, Compact, Focus) keeps its own positions.
- **Direct AI launchers.** Type a prompt, press Enter, and it opens in ChatGPT, Claude, Grok, Gemini or Perplexity. No API keys, and DeluluTab never sees the reply.
- **Custom code widgets.** Drop in your own HTML, CSS and JavaScript. It runs in a sandboxed frame that cannot touch the extension page.
- **Dynamic themes.** Light, dark and system, five bundled fonts, accent color, text size, gradient presets, Unsplash photos or your own images.
- **Search** across Google, DuckDuckGo, Bing, Ecosia, Perplexity, ChatGPT and Claude. Focus the bar with `/` or `Ctrl/⌘+K`.
- **Clock** in four styles (Digital, Retro flip, Analog, World dual-timezone), **weather** from Open-Meteo, and **news** by category.
- **Tab stash**, a **GitHub** contribution graph, a **focus timer** with Rain, Cafe and White-noise, and a **mini tools** drawer (Markdown notes, tasks, calculator, unit converter).
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
npm run verify:dist   # check dist/ against the manifest
npm run package       # build + verify + zip → release/DeluluTab-v<version>.zip
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

The grid only renders widgets listed in `src/components/widgets/registry.tsx`. A new built-in widget is a registry entry plus a settings toggle. The grid itself does not change.

## Where things live

| Data | Stored in | Syncs |
| --- | --- | --- |
| Settings, shortcuts, chords, widget choices, grid layouts | `chrome.storage.sync` | yes |
| Notes, tasks, tab stashes, custom widget code | `chrome.storage.local` | no |
| Uploaded wallpapers, Unsplash key, photo queue | `chrome.storage.local` | no |
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
4. `npm run build` must pass before you open a pull request. That runs the typecheck and the production build.
5. Describe what changed and how you checked it.

Please open an issue before a large redesign. Bug fixes and small, focused improvements are welcome as pull requests.

## License

MIT. Copyright (c) 2026 GautamVhavle.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

The full text is in [LICENSE](LICENSE).
