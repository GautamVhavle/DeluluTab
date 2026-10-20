# Releasing DeluluTab

## 1. Prepare

```bash
git switch main && git pull
npm ci
# bump the version (package.json is the single source of truth)
npm version <x.y.z> --no-git-tag-version
```

## 2. Package and verify

```bash
npm run package
```

This type-checks, builds, then **fails** if any of these is wrong: manifest version differs from `package.json`; a missing or wrong-sized icon; the new tab page missing; a permission outside `storage` and `unlimitedStorage`; any `host_permissions`; a remote or inline script in `index.html`; source maps; `localhost` URLs or `debugger` in the bundle; orphaned files. It then writes `release/DeluluTab-v<version>.zip` with `manifest.json` at the root, and re-reads the zip to compare every file with `dist/`. The zip is reproducible: the same `dist/` always gives the same SHA-256.

## 3. Manual check (about 5 minutes)

Unzip the release, open `chrome://extensions`, enable Developer mode, **Load unpacked**, then open a new tab and check:

- [ ] The page opens with no console errors (`F12`)
- [ ] Search runs from the bar; `/` and `Ctrl/⌘+K` focus it
- [ ] AI launcher: Enter opens the chosen AI in a **new** tab with your prompt
- [ ] Weather asks for location (or search a city); the news card fills in
- [ ] Add a shortcut, make a folder, set a chord (`` ` `` then the code)
- [ ] Mini tools: write a note, close and reopen the tab; it is still there
- [ ] Background panel: pick a gradient, shuffle, switch to light theme (no dark flash on reload)
- [ ] Reload the extension from `chrome://extensions`; settings persist

## 4. Tag and push

```bash
git add -A
git commit -m "build: release DeluluTab vX.Y.Z production build"
git tag -a vX.Y.Z -m "DeluluTab release X.Y.Z"
git push origin main --tags
```

## 5. Chrome Web Store

Upload `release/DeluluTab-vX.Y.Z.zip` at <https://chrome.google.com/webstore/devconsole>.

- **Single purpose:** replaces the new tab page with a customizable dashboard.
- **Permission justifications**
  - `storage`: saves your settings, shortcuts, notes and tasks.
  - `unlimitedStorage`: lets you keep uploaded wallpaper images and notes in local storage without hitting the 10 MB default.
  - No host permissions: all network requests go to services that allow cross-origin requests (see [PRIVACY.md](PRIVACY.md)).
- **Privacy policy URL:** `https://github.com/GautamVhavle/DeluluTab/blob/main/PRIVACY.md`
- **Data disclosure:** location (approximate, used for weather, not stored on a server), website content you enter (notes, prompts you send on to AI sites), and web history is **not** collected. Nothing is sold or used for ads.
- **Store assets still needed:** at least one 1280×800 screenshot and a 440×280 small promo tile.
