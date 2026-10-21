import { expect, test } from '@playwright/test'

test('a light gradient puts dark type on the wallpaper', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Background' }).click()
  await page.getByRole('radio', { name: 'Gradient', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-bg', 'light')
  const ink = await page.locator('header').evaluate((el) => getComputedStyle(el).color)
  expect(ink).toBe('rgb(15, 23, 42)')
})

test('gradient styles paint clouds, sunrise, aurora and watercolors', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Background' }).click()
  await page.getByRole('radio', { name: 'Gradient', exact: true }).click()
  await page.getByRole('radio', { name: 'Clouds', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Blue sky' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.wallpaper-layer canvas')).toHaveCount(1)

  await page.getByRole('radio', { name: 'Aurora', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Northern lights' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('html')).toHaveAttribute('data-bg', 'dark')
})

test('live scenes show a still before the video is fetched', async ({ page }) => {
  await page.route(/videos\.pexels\.com/, (route) => route.abort())
  await page.goto('/')
  await page.getByRole('button', { name: 'Background' }).click()
  await page.getByRole('radio', { name: 'Live', exact: true }).click()
  const night = page.getByRole('button', { name: 'Night earth' })
  await expect(night.locator('img')).toHaveAttribute('src', /night-earth\.jpg/)
  await night.click()
  // The previous scene stays underneath for the crossfade, so match the incoming still.
  await expect(page.locator('video[poster*="night-earth.jpg"]')).toHaveCount(1)
})

test('the first visit plays Night earth, and another scene can replace it', async ({ page }) => {
  await page.route(/videos\.pexels\.com/, (route) => route.abort())
  await page.goto('/')
  await expect(page.getByRole('region', { name: 'Clock and greeting' })).toBeVisible()
  const night = page.locator('video[poster*="night-earth.jpg"]')
  await expect(night).toHaveCount(1)
  await expect(night).toHaveAttribute('src', /1851190/)

  await page.getByRole('button', { name: 'Background' }).click()
  await page.getByRole('radio', { name: 'Live', exact: true }).click()
  await page.getByRole('button', { name: 'Golden coast' }).click()
  // The old scene stays underneath while the new one fades in, so match the incoming clip.
  const coast = page.locator('video[poster*="golden-coast.jpg"]')
  await expect(coast).toHaveCount(1)
  await expect.poll(() => coast.evaluate((node) => (node as HTMLVideoElement).muted && (node as HTMLVideoElement).loop)).toBe(true)
  await expect(coast).toHaveAttribute('src', /1093662/)
})
