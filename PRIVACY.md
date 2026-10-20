# DeluluTab privacy

DeluluTab has no accounts, no analytics, no ads and no server of its own. Everything it stores stays in your browser.

## What is stored, and where

- **Settings, shortcuts, chords, widget choices and grid layouts** are saved with `chrome.storage.sync`. If Chrome Sync is on, Google syncs them across your devices like any extension's settings.
- **Notes, tasks, saved tab groups, custom widget code, a GitHub username, your Spotify Client ID and Spotify sign-in tokens, uploaded background images and your Unsplash access key** are saved with `chrome.storage.local`, on this device only. None of these are synced. A backup file can include the GitHub username and Spotify Client ID, never the Spotify tokens.
- **The focus timer's state** (when the session ends, sessions finished today) is saved with `chrome.storage.local` so it survives closing the tab.
- **Cached weather and news, and your last approximate location,** are kept in the page's local storage so a new tab opens instantly. Your location is rounded to about 1 km and kept for 24 hours.

Removing the extension deletes all of it.

## What leaves your browser

DeluluTab only contacts these services, and only for the feature named:

| Service | When | What is sent |
| --- | --- | --- |
| Open-Meteo (`api.open-meteo.com`, `geocoding-api.open-meteo.com`) | Weather widget is on | Your approximate coordinates (rounded to about 1 km), or the city name you search for |
| rss2json (`api.rss2json.com`) | News widget is on | Which news feed you chose (Tech, World, Business or AI) |
| Platform logo hosts (`github.githubassets.com`, `abs.twimg.com`, `www.gstatic.com`, `grok.com`, `www.perplexity.ai`) | A shortcut, AI provider or search engine shows its official logo | Nothing beyond the image request itself |
| Google favicon service (`www.google.com/s2/favicons`) | A site has no official logo on file | The domain of that site |
| GitHub (`api.github.com`) | GitHub widget has a username | The username (to list your public repositories) |
| github-contributions-api (`github-contributions-api.jogruber.de`), a community service | GitHub widget has a username | The username (to draw your public contribution graph) |
| Unsplash (`api.unsplash.com`, `images.unsplash.com`) | You pick Unsplash backgrounds and add your own key | Your access key and topic keywords |
| Spotify sign-in (`accounts.spotify.com`) | You press **Connect Spotify**, and about once an hour after that | Your own app's Client ID and the sign-in codes Spotify issued. Chrome opens Spotify's own sign-in window; DeluluTab never sees your password |
| Spotify (`api.spotify.com`) | The Spotify widget is connected | The access token, to read what is currently playing |

Your browser asks before sharing location. If you say no, weather works with a city you type.

Logos can be turned off in Settings > Appearance ("Fetch logos from the web"). Nothing is requested then, and generic symbols are shown. Fonts are bundled with the extension, so choosing a font makes no network request.

## Browser permissions

- **Tabs:** when you press **Save tabs**, DeluluTab reads the titles and web addresses of the tabs in that window and stores them on this device. It does not read tabs at any other time, and never sends them anywhere.
- **Alarms and notifications:** so a focus session can end with a desktop notification even if no new tab is open.
- **Identity:** only to open Spotify's sign-in window when you press **Connect Spotify** (`chrome.identity.launchWebAuthFlow`). It does not read your Google account.

Searches and AI prompts go to the site you pick (Google, DuckDuckGo, Bing, Ecosia, Perplexity, ChatGPT, Claude, Grok or Gemini) only when you press Enter. DeluluTab never sees your answers.

Like any web request, these services can see your IP address.
