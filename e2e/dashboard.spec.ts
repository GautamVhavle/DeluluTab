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

async function setMode(page: Page, mode: 'Detailed' | 'Compact' | 'Focus') {
  await page.getByRole('radio', { name: mode, exact: true }).click()
  await settle(page)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Clock and greeting' })).toBeVisible()
  await settle(page)
})

test('starts with the core widgets only, rows filled edge to edge', async ({ page }) => {
  const all = await boxes(page)
  expect(all.map((item) => item.label).sort()).toEqual(['Clock and greeting', 'News', 'Quick apps', 'Search and ask', 'Weather'])
  const clock = box(all, 'Clock and greeting')!
  const weather = box(all, 'Weather')!
  const search = box(all, 'Search and ask')!
  expect(Math.abs(clock.y - weather.y)).toBeLessThanOrEqual(1)
  expect(Math.abs(weather.x + weather.w - (search.x + search.w))).toBeLessThanOrEqual(1)
  expect(Math.abs(clock.h - weather.h)).toBeLessThanOrEqual(1)
})

test('Detailed comes back exactly as it was after Focus and Compact', async ({ page }) => {
  const before = await boxes(page)
  await setMode(page, 'Focus')
  const focus = (await boxes(page)).map((item) => item.label)
  expect(focus).not.toContain('News')
  expect(focus).not.toContain('Quick apps')
  await setMode(page, 'Compact')
  const compact = await boxes(page)
  const grid = (await page.locator('.widget-grid').boundingBox())!
  for (const item of compact) {
    expect(item.x, item.label).toBeGreaterThanOrEqual(Math.round(grid.x) - 1)
    expect(item.x + item.w, item.label).toBeLessThanOrEqual(Math.round(grid.x + grid.width) + 1)
  }
  expect(Math.abs(box(compact, 'Clock and greeting')!.y - box(compact, 'Weather')!.y)).toBeLessThanOrEqual(1)
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

test('resizing a widget keeps its row full', async ({ page }) => {
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Add a widget' })).toBeVisible()
  await settle(page)
  const before = await boxes(page)
  const handle = page.locator('.react-grid-item', { has: page.getByRole('region', { name: 'Clock and greeting' }) }).locator('.react-resizable-handle')
  const start = (await handle.boundingBox())!
  await page.mouse.move(start.x + 5, start.y + 5)
  await page.mouse.down()
  await page.mouse.move(start.x + 150, start.y + 5, { steps: 10 })
  await page.mouse.up()
  await settle(page)
  const after = await boxes(page)
  const clock = box(after, 'Clock and greeting')!
  const weather = box(after, 'Weather')!
  expect(clock.w).toBeGreaterThan(box(before, 'Clock and greeting')!.w + 40)
  expect(Math.abs(weather.y - clock.y)).toBeLessThanOrEqual(1)
  expect(Math.abs(weather.x + weather.w - (box(before, 'Weather')!.x + box(before, 'Weather')!.w))).toBeLessThanOrEqual(2)
})

test('keyboard moves a widget in edit mode', async ({ page }) => {
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await settle(page)
  const before = await boxes(page)
  await page.getByRole('button', { name: /^Move Clock and greeting/ }).focus()
  await page.keyboard.press('ArrowRight')
  await settle(page)
  const after = await boxes(page)
  expect(box(after, 'Weather')!.x).toBe(box(before, 'Clock and greeting')!.x)
  expect(box(after, 'Clock and greeting')!.x).toBeGreaterThan(box(before, 'Clock and greeting')!.x)
})

test('the gallery adds a widget that asks for its value and keeps it on this device', async ({ page }) => {
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  const gallery = page.getByRole('region', { name: 'Add a widget' })
  await gallery.getByRole('button', { name: 'Add GitHub activity' }).click()
  const github = page.getByRole('region', { name: 'GitHub activity' })
  await expect(github).toContainText('this device')
  await page.getByRole('button', { name: 'Done' }).click()
  await github.getByLabel('GitHub username').fill('octocat')
  await github.getByRole('button', { name: /show/i }).click()
  await expect.poll(async () => (await stored(page)).integrations?.github?.username).toBe('octocat')
  const { store } = await stored(page)
  expect(JSON.stringify(store)).not.toContain('octocat')
})

test('dragging a widget from the gallery drops it on the grid', async ({ page }) => {
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await settle(page)
  const card = page.getByRole('region', { name: 'Add a widget' }).getByRole('article', { name: 'Tab stash' })
  await card.dragTo(page.locator('.widget-grid'), { targetPosition: { x: 40, y: 40 } })
  await expect(page.getByRole('region', { name: 'Tab stash' })).toBeVisible()
  await settle(page)
  const all = await boxes(page)
  for (const [index, a] of all.entries()) {
    for (const b of all.slice(index + 1)) {
      const overlap = a.x < b.x + b.w - 2 && a.x + a.w > b.x + 2 && a.y < b.y + b.h - 2 && a.y + a.h > b.y + 2
      expect(overlap, `${a.label} overlaps ${b.label}`).toBe(false)
    }
  }
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
