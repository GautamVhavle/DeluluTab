import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')) as { version: string }

/** package.json is the one place the version lives; stamp it into the built manifest. */
function manifestVersion(): Plugin {
  let outDir = 'dist'
  return {
    name: 'delulutab:manifest-version',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const file = path.join(outDir, 'manifest.json')
      const manifest = JSON.parse(readFileSync(file, 'utf8'))
      manifest.version = pkg.version
      writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`)
    },
  }
}

// Everything in `public/` (manifest.json, icons, theme-boot.js) is copied verbatim into `dist/`,
// so `dist/` can be loaded directly via chrome://extensions → "Load unpacked" or zipped for the Web Store.
export default defineConfig(({ mode }) => ({
  plugins: [react(), manifestVersion()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  // Relative asset URLs so the page resolves under chrome-extension://<id>/
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  esbuild: {
    // Production builds drop debugger statements and chatty logging; console.warn/error stay for real failures.
    drop: mode === 'production' ? ['debugger'] : [],
    pure: mode === 'production' ? ['console.log', 'console.debug', 'console.info'] : [],
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    sourcemap: false,
    // MV3 CSP forbids inline scripts; keep the module-preload polyfill out of index.html.
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'index.html'),
        // The MV3 service worker (finishes Pomodoro sessions via chrome.alarms). Its file name must be stable
        // because manifest.json points at it, so it is the one entry that is not hashed.
        background: path.resolve(__dirname, 'src/background.ts'),
      },
      output: {
        entryFileNames: (chunk) => (chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js'),
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        // Stable vendor chunks: app code changes between releases, these rarely do.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
          if (/node_modules\/(framer-motion|motion-dom|motion-utils)\//.test(id)) return 'motion'
          if (id.includes('node_modules/gsap/')) return 'gsap'
          return 'vendor'
        },
      },
    },
  },
}))
