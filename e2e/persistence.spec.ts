import { test, expect } from '@playwright/test'

test('votes survive a page reload', async ({ page }) => {
  // Start fresh — clear storage on the first navigation only. We can't use
  // addInitScript because it would fire again on `page.reload()` and wipe
  // out the state we want to verify.
  await page.goto('/')
  await page.evaluate(() => {
    window.localStorage.clear()
    window.localStorage.setItem('yallah.userId.v1', JSON.stringify('yves'))
  })
  await page.reload({ waitUntil: 'domcontentloaded' })

  await page.getByLabel('like').click()
  await page.waitForTimeout(700)
  await page.getByLabel('non').click()
  await page.waitForTimeout(700)
  await page.getByLabel('why not').click()
  await page.waitForTimeout(700)

  // Storage should contain 3 entries.
  const stored = await page.evaluate(() =>
    window.localStorage.getItem('yallah.history.v1'),
  )
  expect(stored).not.toBeNull()
  expect(JSON.parse(stored!)).toHaveLength(3)

  // Capture the activity number now visible (3 swipes done → 4th card).
  const headingBefore = await page.locator('h2').first().textContent()

  await page.reload({ waitUntil: 'domcontentloaded' })
  // Same card visible again, undo enabled.
  await expect(page.getByLabel('annuler le dernier swipe')).toBeEnabled()
  await expect(page.locator('h2').first()).toHaveText(headingBefore!)
})
