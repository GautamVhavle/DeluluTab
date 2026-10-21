import { expect, test } from '@playwright/test'

test.use({ reducedMotion: 'no-preference', colorScheme: 'dark' })

test('light and dark ease instead of snapping', async ({ page }) => {
  await page.goto('/')
  const toggle = page.getByRole('button', { name: /switch to light mode/i })
  await expect(toggle).toBeVisible()
  const read = () => page.locator('body').evaluate((el) => getComputedStyle(el).backgroundColor)
  const before = await read()
  await toggle.click()
  await page.waitForTimeout(220)
  const mid = await read()
  await page.waitForTimeout(700)
  const after = await read()
  expect(before).not.toBe(after)
  expect(mid).not.toBe(before)
  expect(mid).not.toBe(after)
})
