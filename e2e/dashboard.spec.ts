import { expect, test, type Page } from '@playwright/test'

interface Box {
  label: string
  x: number
  y: number
  w: number
  h: number
}

async function boxes(page: Page): Promise<Box[]> {
  return page.locator('.react-grid-item').evaluateAll((nodes) =>
    nodes.map((node) => {
      const rect = node.getBoundingClientRect()
      return {
        label: node.querySelector('section')?.getAttribute('aria-label') ?? '',
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
      }
    }),
  )
}

const box = (all: Box[], label: string) => all.find((item) => item.label === label)

async function stored(page: Page) {
  return page.evaluate(() => {
    const read = (key: string) => {
      const raw = localStorage.getItem(key)
      return raw ? JSON.parse(raw) : null
    }
    return { store: read('delulutab:store'), integrations: read('delulutab:integrations') }
  })
}

/** Waits for the boot animation and the grid to settle so measurements are stable. */
async function settle(page: Page) {
  let last = ''
  let stable = 0
  for (let tries = 0; tries < 80 && stable < 3; tries++) {
    await page.waitForTimeout(120)
    const now = JSON.stringify(await boxes(page))
    stable = now === last && now !== '[]' ? stable + 1 : 0
    last = now
  }
}

async function setMode(page: Page, mode: 'Detailed' | 'Focus') {
  await page.getByRole('radio', { name: mode, exact: true }).click()
  await settle(page)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Clock and greeting' })).toBeVisible()
  await expect(page.getByRole('radio', { name: 'Focus', exact: true })).toHaveAttribute('aria-checked', 'true')
  await setMode(page, 'Detailed')
})

test('starts with the core widgets only, rows filled edge to edge', async ({ page }) => {
  const all = await boxes(page)
  expect(all.map((item) => item.label).sort()).toEqual(['Clock and greeting', 'Daily quote', 'Quick apps', 'Search and ask', 'Weather'])
  const clock = box(all, 'Clock and greeting')!
  const weather = box(all, 'Weather')!
  const search = box(all, 'Search and ask')!
  expect(Math.abs(clock.y - weather.y)).toBeLessThanOrEqual(1)
  expect(Math.abs(weather.x + weather.w - (search.x + search.w))).toBeLessThanOrEqual(1)
  expect(Math.abs(clock.h - weather.h)).toBeLessThanOrEqual(1)
})

test('Detailed comes back exactly as it was after Focus', async ({ page }) => {
  const before = await boxes(page)
  await setMode(page, 'Focus')
  const focus = (await boxes(page)).map((item) => item.label)
  expect(focus).not.toContain('Daily quote')
  expect(focus).not.toContain('Quick apps')
  expect(focus).not.toContain('News')
  await setMode(page, 'Detailed')
  const after = await boxes(page)
  for (const item of before) {
    const again = box(after, item.label)!
    expect(Math.abs(again.x - item.x), item.label).toBeLessThanOrEqual(2)
    expect(Math.abs(again.y - item.y), item.label).toBeLessThanOrEqual(2)
    expect(Math.abs(again.w - item.w), item.label).toBeLessThanOrEqual(2)
    expect(Math.abs(again.h - item.h), item.label).toBeLessThanOrEqual(2)
  }
  const { store } = await stored(page)
  expect(Object.keys(store?.state.widgetLayouts ?? {})).toEqual([])
})

function noOverlaps(all: Box[]) {
  for (const [index, a] of all.entries()) {
    for (const b of all.slice(index + 1)) {
      const overlap = a.x < b.x + b.w - 2 && a.x + a.w > b.x + 2 && a.y < b.y + b.h - 2 && a.y + a.h > b.y + 2
      expect(overlap, `${a.label} overlaps ${b.label}`).toBe(false)
    }
  }
}

/** Optional widgets live in Settings, not as chips on the dashboard. */
async function setOptional(page: Page, name: string) {
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('tab', { name: 'Widgets', exact: true }).click()
  await page.getByRole('switch', { name, exact: true }).click()
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
}

test('turning an optional widget on and off reflows the locked layout', async ({ page }) => {
  const before = await boxes(page)
  await setOptional(page, 'Tab stash')
  await expect(page.getByRole('region', { name: 'Tab stash' })).toBeVisible()
  await settle(page)
  const withStash = await boxes(page)
  expect(withStash.map((item) => item.label)).toContain('Tab stash')
  noOverlaps(withStash)
  const grid = (await page.locator('.widget-grid').boundingBox())!
  for (const item of withStash) {
    expect(item.x, item.label).toBeGreaterThanOrEqual(Math.round(grid.x) - 1)
    expect(item.x + item.w, item.label).toBeLessThanOrEqual(Math.round(grid.x + grid.width) + 1)
  }
  await setOptional(page, 'Tab stash')
  await expect(page.getByRole('region', { name: 'Tab stash' })).toHaveCount(0)
  await settle(page)
  const after = await boxes(page)
  expect(after.map((item) => item.label).sort()).toEqual(before.map((item) => item.label).sort())
  for (const item of before) {
    const again = box(after, item.label)!
    expect(Math.abs(again.x - item.x), item.label).toBeLessThanOrEqual(2)
    expect(Math.abs(again.w - item.w), item.label).toBeLessThanOrEqual(2)
  }
})

test('an optional widget asks for its value and keeps it on this device', async ({ page }) => {
  await setOptional(page, 'GitHub activity')
  const github = page.getByRole('region', { name: 'GitHub activity' })
  await expect(github).toContainText('this device')
  await github.getByLabel('GitHub username').fill('octocat')
  await github.getByRole('button', { name: /show/i }).click()
  await expect.poll(async () => (await stored(page)).integrations?.github?.username).toBe('octocat')
  const { store } = await stored(page)
  expect(JSON.stringify(store)).not.toContain('octocat')
})

test('one bar for search and AI, switched before typing', async ({ page }) => {
  const input = page.locator('input[name="q"]')
  const ask = page.getByRole('radio', { name: 'Ask', exact: true })
  const search = page.getByRole('radio', { name: 'Search', exact: true })
  await expect(search).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Alt+KeyS')
  await expect(ask).toHaveAttribute('aria-checked', 'true')
  await expect(input).toHaveAttribute('placeholder', /^Ask /)
  await input.focus()
  await input.press('Tab')
  await expect(search).toHaveAttribute('aria-checked', 'true')
  await ask.click()
  await page.route((url) => url.hostname !== 'localhost', (route) =>
    route.request().isNavigationRequest() ? route.fulfill({ contentType: 'text/html', body: 'ok' }) : route.abort(),
  )
  await input.fill('what is a monad')
  const navigation = page.waitForRequest((request) => request.isNavigationRequest() && !request.url().includes('localhost'))
  await input.press('Enter')
  expect(decodeURIComponent((await navigation).url()).replace(/\+/g, ' ')).toContain('what is a monad')
})
