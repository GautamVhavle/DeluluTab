# Releasing DeluluTab

## 1. Prepare

```bash
git switch main && git pull
npm ci
# bump the version (package.json is the single source of truth)
npm version <x.y.z> --no-git-tag-version
```

## 2. Test, package and verify

```bash
npm test          # unit tests
npm run e2e       # end-to-end, against the production build
npm run package
```

This type-checks, builds, then **fails** if any of these is wrong: manifest version differs from `package.json`; a missing or wrong-sized icon; the new tab page missing; a permission outside `storage`, `unlimitedStorage`, `tabs`, `alarms`, `notifications` and `identity`; a host permission outside the news and quote feeds; a service worker that is missing or that pulls in app code; a remote or inline script in `index.html`; source maps; `localhost` URLs or `debugger` in the bundle; orphaned files. It then writes `release/DeluluTab-v<version>.zip` with `manifest.json` at the root, and re-reads the zip to compare every file with `dist/`. The zip is reproducible: the same `dist/` always gives the same SHA-256.

## 3. Manual check (about 5 minutes)

Unzip the release, open `chrome://extensions` or `brave://extensions`, enable Developer mode, **Load unpacked**, then open a new tab and check:

- [ ] The page opens with no console errors (`F12`)
- [ ] Search runs from the bar; `/` focuses it; `Tab` in the bar and `Alt+S` switch between Search and Ask, and Ask opens the chosen AI with the prompt
- [ ] Switch Detailed → Focus → Detailed: the arrangement for that mode comes back
- [ ] Widgets: open Settings → Widgets, turn one on, turn it off again. The layout closes up. Widgets are not dragged.
- [ ] Add GitHub from the gallery, enter a username: the graph loads
- [ ] Add Spotify, create an app at developer.spotify.com with the redirect URI shown, connect: the current track shows
- [ ] AI launcher: Enter opens the chosen AI in a **new** tab with your prompt
- [ ] Weather asks for location (or search a city); the news card fills in
- [ ] Add a shortcut, make a folder, set a chord (`` ` `` then the code); try the default `gh`, `yt`, `gpt`
- [ ] Settings (gear): change the tab title to Live time, switch the accent color, move the text size, rebind the chord trigger key
- [ ] Settings > Backup: export, restore defaults, then import the file; everything comes back
- [ ] Tab stash: open a few sites, Save tabs, Restore; Focus timer: start it, open another site in this tab, and confirm the notification still arrives
- [ ] Mini tools: write a note, close and reopen the tab; it is still there
- [ ] Background panel (picture icon): pick a gradient, shuffle; switch to light theme (no dark flash on reload)
- [ ] Reload the extension from `chrome://extensions`; settings persist

## 4. Tag and push

```bash
git add -A
git commit -m "build: release DeluluTab vX.Y.Z production build"
git tag -a vX.Y.Z -m "DeluluTab release X.Y.Z"
git push origin main --tags
```

## 5. GitHub release

DeluluTab is not published to the Chrome Web Store. Attach `release/DeluluTab-vX.Y.Z.zip` to the GitHub release. People install it unpacked in Chrome or Brave. Firefox is not supported yet.

- **Single purpose:** replaces the new tab page with a customizable dashboard.
- **Permission justifications**
  - `storage`: saves your settings, shortcuts, notes and tasks.
  - `unlimitedStorage`: lets you keep uploaded wallpaper images and notes in local storage without hitting the 10 MB default.
  - `tabs`: reads tab titles and URLs only when the user presses "Save open tabs" (tab stash). Shows Chrome's "read your browsing history" install warning.
  - `alarms`, `notifications`: finish a Pomodoro session and notify the user when no new tab page is open.
  - `identity`: opens Spotify's sign-in window (`launchWebAuthFlow`) when the user connects the optional Spotify widget. No Google account data is read.
  - `host_permissions`: the news and quote feeds, which do not send CORS headers. Weather, GitHub and picture links are called only when you use those features. See [PRIVACY.md](PRIVACY.md).
- **Privacy policy URL:** `https://github.com/GautamVhavle/DeluluTab/blob/main/PRIVACY.md`
- **Data disclosure:** location (approximate, used for weather, not stored on a server), website content you enter (notes, prompts you send on to AI sites), and web history is **not** collected. Nothing is sold or used for ads.
- **Preview images:** `npm run store:assets -- --url http://localhost:5173/` writes Focus, then a loaded Detailed view, plus the widgets panel and the 440×280 tile, to `store/`. The greeting in those pictures is Gautam and the city is Hyderabad. Run it against the dev server so the news actually loads.
