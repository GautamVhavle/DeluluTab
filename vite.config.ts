import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Everything in `public/` (manifest.json, icons) is copied verbatim into `dist/`,
// so `dist/` can be loaded directly via chrome://extensions → "Load unpacked".
export default defineConfig({
  plugins: [react()],
  // Relative asset URLs so the page resolves under chrome-extension://<id>/
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    // MV3 CSP forbids inline scripts; keep the module-preload polyfill out of index.html.
    modulePreload: { polyfill: false },
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})
