import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.localStorage.setItem('yallah.userId.v1', JSON.stringify('yves'))
  })
  await page.goto('/')
  // The deck is now code-split behind a loading splash — wait for the first
  // card to mount before any test interacts with the action row.
  await expect(
    page.getByRole('heading', { name: 'Snorkeling à Blue Bay Marine Park' }),
  ).toBeVisible()
})

test('renders the yallah wordmark and the first activity', async ({ page }) => {
  await expect(page.locator('text=yallah').first()).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Snorkeling à Blue Bay Marine Park' }),
  ).toBeVisible()
})

test('voting through the action row advances to the next activity', async ({
  page,
}) => {
  await page.getByLabel('like', { exact: true }).click()
  // Wait for the exit animation to finish.
  await page.waitForTimeout(700)
  await expect(
    page.getByRole('heading', { name: 'Snorkeling à Blue Bay Marine Park' }),
  ).toHaveCount(0)
})

test('undo restores the previous activity', async ({ page }) => {
  await page.getByLabel('non').click()
  await page.waitForTimeout(700)
  await page.getByLabel('annuler le dernier swipe').click()
  await expect(
    page.getByRole('heading', { name: 'Snorkeling à Blue Bay Marine Park' }),
  ).toBeVisible()
})

test('the undo button is disabled until at least one vote is cast', async ({
  page,
}) => {
  await expect(page.getByLabel('annuler le dernier swipe')).toBeDisabled()
  await page.getByLabel('like', { exact: true }).click()
  await page.waitForTimeout(700)
  await expect(page.getByLabel('annuler le dernier swipe')).toBeEnabled()
})
