import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
  })
  await page.goto('/')
})

test('the super-like quota badge counts down from 5 to 0', async ({ page }) => {
  const badge = page.getByTestId('super-badge').first()
  await expect(badge).toHaveText('5')
  for (let i = 4; i >= 0; i--) {
    await page.getByLabel('super like').click()
    // 750ms exit + small margin
    await page.waitForTimeout(900)
    await expect(badge).toHaveText(i.toString())
  }
  // 6th attempt — button is disabled.
  await expect(page.getByLabel('super like')).toBeDisabled()
})
