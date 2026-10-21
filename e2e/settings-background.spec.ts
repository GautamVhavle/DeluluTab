import { expect, test } from '@playwright/test'

test('settings stay on the everyday choices until More is opened', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('tab', { name: 'Appearance', exact: true }).click()
  await expect(page.getByRole('radio', { name: 'Dark', exact: true })).toBeVisible()
  await expect(page.getByLabel('Custom accent color')).toHaveCount(0)
  await page.getByRole('button', { name: 'Font, accent and logos' }).click()
  await expect(page.getByLabel('Custom accent color')).toBeVisible()

  await page.getByRole('tab', { name: 'Clock', exact: true }).click()
  await expect(page.getByRole('radio', { name: '12-hour', exact: true })).toBeVisible()
  await expect(page.getByRole('slider', { name: 'Clock weight' })).toBeVisible()
  await expect(page.getByRole('radiogroup', { name: 'Clock face' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Face, colour and greetings' }).click()
  await expect(page.getByRole('radiogroup', { name: 'Clock face' })).toBeVisible()
})

test('a solid colour can fade or breathe, and extras stay tucked away', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Background' }).click()
  await expect(page.getByText(/Windows desktop|doesn't publish/)).toHaveCount(0)
  await expect(page.getByRole('slider', { name: /Dim/ })).toHaveCount(0)

  await page.getByRole('radio', { name: 'Colour', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Ink', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByLabel('Custom colour').fill('#aa3366')
  await page.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(page.getByRole('button', { name: '#aa3366', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Remove #aa3366' }).click()
  await expect(page.getByRole('button', { name: 'Ink', exact: true })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('radio', { name: 'Fade', exact: true }).click()
  await expect(page.locator('.solid-fade')).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Fades toward' })).toBeVisible()
  await page.getByRole('radio', { name: 'Breathe', exact: true }).click()
  await expect(page.locator('.solid-breathe')).toHaveCount(1)
  await page.getByRole('button', { name: 'Paper', exact: true }).first().click()
  await expect(page.locator('html')).toHaveAttribute('data-bg', 'light')

  await page.getByRole('button', { name: 'Dim, blur and how often it changes' }).click()
  await expect(page.getByRole('slider', { name: /Dim/ })).toBeVisible()

  await page.getByRole('radio', { name: 'Gradient', exact: true }).click()
  await expect(page.getByRole('list', { name: 'Palette' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Adjust colours' }).click()
  await expect(page.getByRole('list', { name: 'Palette' })).toBeVisible()

  await page.getByRole('radio', { name: 'Uploads', exact: true }).click()
  await expect(page.getByRole('radio', { name: 'Daily', exact: true })).toHaveCount(0)
  await expect(page.getByLabel('Picture link')).toBeVisible()
  await expect(page.getByText('An https picture, or JSON with a url.')).toBeVisible()
  await expect(page.getByText(/Windows desktop|homepage photographs/)).toHaveCount(0)
})
