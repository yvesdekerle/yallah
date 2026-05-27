import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.localStorage.setItem('yallah.userId.v1', JSON.stringify('yves'))
  })
  await page.goto('/')
})

test('DetailModal shows the "Sur la carte" section', async ({ page }) => {
  await page.getByLabel('voir le détail').click()
  await expect(page.getByRole('dialog')).toContainText('Sur la carte')
})

test('tapping the mini-map opens the FullscreenMap', async ({ page }) => {
  await page.getByLabel('voir le détail').click()
  const dialog = page.getByRole('dialog', { name: /Détail de/ })
  await expect(dialog).toBeVisible()
  const mini = dialog.locator('[data-testid="mini-map-tap-target"]')
  await expect(mini).toBeVisible({ timeout: 5000 })
  await mini.click()
  await expect(
    page.getByRole('dialog', { name: 'Carte des activités' }),
  ).toBeVisible()
})

test('"Voir sur la carte" button in Résultats opens the FullscreenMap', async ({
  page,
}) => {
  // Cast a LIKE on a001 (which has overridden coords).
  await page.getByLabel('like', { exact: true }).click()
  await page.waitForTimeout(700)
  await page.getByRole('button', { name: 'résultats' }).click()
  const btn = page.getByRole('button', { name: /voir sur la carte/i })
  await expect(btn).toBeVisible()
  await btn.click()
  await expect(
    page.getByRole('dialog', { name: 'Carte des activités' }),
  ).toBeVisible()
  await page.getByLabel('fermer la carte').click()
  await expect(
    page.getByRole('dialog', { name: 'Carte des activités' }),
  ).toHaveCount(0)
})
