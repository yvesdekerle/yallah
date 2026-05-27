import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.localStorage.setItem('yallah.userId.v1', JSON.stringify('yves'))
  })
  await page.goto('/')
})

test('opens the detail modal via the eye button', async ({ page }) => {
  await page.getByLabel('voir le détail').click()
  await expect(
    page.getByRole('dialog', { name: /Snorkeling à Blue Bay/ }),
  ).toBeVisible()
})

test('detail modal shows meta chips and description', async ({ page }) => {
  await page.getByLabel('voir le détail').click()
  await expect(
    page.getByRole('dialog'),
  ).toContainText('Parc marin protégé')
  await expect(page.getByRole('dialog')).toContainText('Facile')
})

test('closes the detail modal via the X button', async ({ page }) => {
  await page.getByLabel('voir le détail').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await page.getByLabel('fermer', { exact: true }).click()
  // Give the close animation time to finish.
  await page.waitForTimeout(400)
  await expect(dialog).toHaveCount(0)
})

test('voting from the detail modal records the vote', async ({ page }) => {
  await page.getByLabel('voir le détail').click()
  // The sticky bottom bar reuses the same labels; scope to dialog.
  await page.getByRole('dialog').getByLabel('like', { exact: true }).click()
  await page.waitForTimeout(900)
  // Modal closes; first card has moved on.
  await expect(
    page.getByRole('heading', { name: 'Snorkeling à Blue Bay Marine Park' }),
  ).toHaveCount(0)
})
