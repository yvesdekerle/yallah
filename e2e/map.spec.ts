import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.localStorage.setItem('yallah.userId.v1', JSON.stringify('mathieu'))
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
  // ActivityMiniMap is lazy-loaded — first cold start can be slow.
  await expect(mini).toBeVisible({ timeout: 10000 })
  await mini.click()
  await expect(
    page.getByRole('dialog', { name: 'Carte des activités' }),
  ).toBeVisible()
})

test('"Voir sur la carte" button in Résultats opens the FullscreenMap', async ({
  page,
}) => {
  // Cast a LIKE on a001 (which has overridden coords). The vote is recorded on
  // commit, so we can switch tabs immediately and let the button assertion
  // below auto-retry rather than waiting a fixed time for the exit animation.
  await page.getByLabel('like', { exact: true }).click()
  await page.getByRole('button', { name: 'résultats' }).click()
  const btn = page.getByRole('button', { name: /voir sur la carte/i })
  await expect(btn).toBeVisible()
  await btn.click()
  const mapDialog = page.getByRole('dialog', { name: 'Carte des activités' })
  await expect(mapDialog).toBeVisible()
  // The close button ignores clicks during the ~400ms ghost-click guard — retry
  // the close until it actually dismisses the map, instead of a fixed wait.
  await expect(async () => {
    await page.getByLabel('fermer la carte').click()
    await expect(mapDialog).toHaveCount(0)
  }).toPass()
})

test('closing a map opened from the mini-map returns to the DetailModal', async ({
  page,
}) => {
  await page.getByLabel('voir le détail').click()
  const detail = page.getByRole('dialog', { name: /Détail de/ })
  await expect(detail).toBeVisible()
  const mini = detail.locator('[data-testid="mini-map-tap-target"]')
  await expect(mini).toBeVisible({ timeout: 10000 })
  await mini.click()
  const map = page.getByRole('dialog', { name: 'Carte des activités' })
  await expect(map).toBeVisible()
  // Retry the close past the ~400ms ghost-click guard (no fixed wait).
  await expect(async () => {
    await page.getByLabel('fermer la carte').click()
    await expect(map).toHaveCount(0)
  }).toPass()
  // The map sat ABOVE the still-mounted DetailModal (mapAboveDetail); closing
  // it must return the user to the detail, not the swipe deck.
  await expect(detail).toBeVisible()
})
