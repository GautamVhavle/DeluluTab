# DeluluTab

A modern, AI-focused Chrome extension that replaces the default New Tab page.

**Stack:** Vite · React 18 + TypeScript · Tailwind CSS 3 (class-based dark mode) · shadcn/ui · Lucide · Manifest V3

## Develop

```bash
npm install
npm run dev      # UI preview at http://localhost:5173 (chrome.* APIs unavailable here)
npm run build    # type-check + production build into dist/
```

## Load in Chrome

1. `npm run build`
2. Open `chrome://extensions`, enable **Developer mode**
3. **Load unpacked** → select the `dist/` folder
4. Open a new tab

After rebuilding, click the reload icon on the extension card.

## Structure

```
├── index.html              # New Tab entry (chrome_url_overrides.newtab)
├── public/
│   ├── manifest.json       # MV3 manifest, copied to dist/ as-is
│   └── icons/
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css           # Tailwind layers + shadcn theme tokens
│   ├── components/ui/      # shadcn components (npx shadcn@latest add <name>)
│   ├── hooks/use-theme.ts  # dark/light toggle on <html class="dark">
│   └── lib/utils.ts        # cn() helper
├── components.json         # shadcn config
├── tailwind.config.js
└── vite.config.ts
```
