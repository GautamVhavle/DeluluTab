#!/usr/bin/env node
/**
 * README and store images from the running page: Focus, then a loaded Detailed view,
 * plus the widgets panel and the 440x280 promo tile, written to store/.
 *
 *   npm run build && npm run store:assets
 *
 * Needs Playwright's Chromium (npx playwright install chromium).
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const out = path.join(root, 'store')
const given = process.argv.indexOf('--url')
const URL = given > -1 ? process.argv[given + 1] : 'http://localhost:5198/'

if (given === -1 && !existsSync(path.join(root, 'dist', 'index.html'))) {
  console.error('dist/ not found. Run "npm run build" first.')
  process.exit(1)
}
mkdirSync(out, { recursive: true })

const server = given === -1
  ? spawn('npx', ['vite', 'preview', '--port', '5198', '--strictPort'], { cwd: root, stdio: 'ignore' })
  : null
const stop = () => server?.kill()
process.on('exit', stop)

async function waitForServer() {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(URL)).ok) return
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error('vite preview did not start')
}

/** Greeting Gautam, weather Hyderabad, Night earth behind the cards. */
const SEED = {
  state: {
    settings: {
      userName: 'Gautam',
      layoutMode: 'detailed',
      backgroundSource: 'video',
      ambientVideo: 'night-earth',
      weatherLocation: { name: 'Hyderabad', latitude: 17.385, longitude: 78.4867 },
    },
  },
  version: 11,
}

try {
  await waitForServer()
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, colorScheme: 'dark', reducedMotion: 'reduce' })
  await context.addInitScript((seed) => {
    if (!localStorage.getItem('delulutab:store')) localStorage.setItem('delulutab:store', JSON.stringify(seed))
  }, SEED)
  const page = await context.newPage()
  await page.goto(URL)
  await page.waitForSelector('.react-grid-item')
  await page.waitForTimeout(3500)

  async function show(mode) {
    await page.evaluate((next) => {
      const key = 'delulutab:store'
      const saved = JSON.parse(localStorage.getItem(key) || '{}')
      saved.state ??= {}
      saved.state.settings ??= {}
      saved.state.settings.layoutMode = next
      saved.state.settings.userName = 'Gautam'
      saved.state.settings.backgroundSource = 'video'
      saved.state.settings.ambientVideo = 'night-earth'
      saved.state.settings.weatherLocation = { name: 'Hyderabad', latitude: 17.385, longitude: 78.4867 }
      saved.state.widgets = { ...(saved.state.widgets ?? {}), pomodoro: next === 'focus', news: false }
      saved.version = 11
      localStorage.setItem(key, JSON.stringify(saved))
    }, mode)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.react-grid-item')
    await page.getByText('Gautam').first().waitFor({ timeout: 8000 })
    await page.locator('video[poster*="night-earth"]').first().waitFor({ timeout: 15000 })
    await page.getByRole('radio', { name: mode === 'focus' ? 'Focus' : 'Detailed', exact: true }).waitFor()
    if (mode === 'detailed') {
      await page.getByText('Hyderabad').waitFor({ timeout: 15000 })
      await page.getByText(/\d+°/).first().waitFor({ timeout: 15000 })
      await page.getByRole('region', { name: 'Daily quote' }).waitFor()
      await page.getByRole('region', { name: 'News' }).waitFor({ timeout: 20000 })
      await page.locator('[aria-label="News"] a').first().waitFor({ timeout: 20000 })
    }
    await page.waitForTimeout(600)
  }

  await page.setViewportSize({ width: 1280, height: 1100 })
  await show('focus')
  await page.screenshot({ path: path.join(out, 'screenshot-1-focus.png') })
  console.log('  store/screenshot-1-focus.png')

  await page.setViewportSize({ width: 1280, height: 1280 })
  await show('detailed')
  await page.screenshot({ path: path.join(out, 'screenshot-2-detailed.png') })
  console.log('  store/screenshot-2-detailed.png')

  await page.setViewportSize({ width: 1280, height: 800 })
  await show('focus')
  await page.screenshot({ path: path.join(out, 'screenshot-3-focus.png') })
  console.log('  store/screenshot-3-focus.png')

  await show('detailed')
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('tab', { name: 'Widgets', exact: true }).click()
  await page.waitForTimeout(800)
  await page.screenshot({ path: path.join(out, 'screenshot-4-widgets.png') })
  console.log('  store/screenshot-4-widgets.png')

  const icon = readFileSync(path.join(root, 'public', 'icons', 'icon-128.png')).toString('base64')
  const tile = await browser.newPage({ viewport: { width: 440, height: 280 }, deviceScaleFactor: 1 })
  await tile.setContent(`<!doctype html><html><body style="margin:0;width:440px;height:280px;overflow:hidden;font-family:Inter,system-ui,sans-serif;
    background:radial-gradient(120% 90% at 0% 0%,#7c3aed 0%,transparent 55%),radial-gradient(90% 80% at 100% 10%,#22d3ee 0%,transparent 55%),radial-gradient(100% 90% at 60% 110%,#e11d48 0%,transparent 60%),#07060f;color:#fff">
    <div style="position:absolute;inset:18px;border-radius:22px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.06);backdrop-filter:blur(14px)"></div>
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:0 44px;gap:10px">
      <div style="display:flex;align-items:center;gap:14px"><img src="data:image/png;base64,${icon}" width="52" height="52" style="border-radius:14px"/>
      <span style="font-size:34px;font-weight:700;letter-spacing:-.02em">DeluluTab</span></div>
      <div style="font-size:17px;line-height:1.35;color:rgba(255,255,255,.82);max-width:330px">Search the web or ask an AI from one bar. Widgets you arrange, kept on your device.</div>
    </div></body></html>`)
  await tile.screenshot({ path: path.join(out, 'promo-small-440x280.png') })
  console.log('  store/promo-small-440x280.png')
  await browser.close()
} finally {
  stop()
}
