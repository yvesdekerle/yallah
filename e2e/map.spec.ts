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

// Regression: opening the map from a touch tap used to close it instantly.
// Mobile browsers synthesize a "ghost" mouse click ~300ms after touchend at
// the tap coords; with the FullscreenMap mounted there, that click hit the
// close button. A short post-mount click-shield swallows it. Needs a touch
// context (the default e2e context is mouse-only, which never ghost-clicks).
test.describe('ghost-click on touch open', () => {
  test.use({ hasTouch: true })

  test('a ghost click right after a tap-open does not dismiss the map', async ({
    page,
  }) => {
    await page.getByLabel('voir le détail').click()
    const dialog = page.getByRole('dialog', { name: /Détail de/ })
    await expect(dialog).toBeVisible()
    const mini = dialog.locator('[data-testid="mini-map-tap-target"]')
    await expect(mini).toBeVisible({ timeout: 10000 })
    const map = page.getByRole('dialog', { name: 'Carte des activités' })

    // Warm the lazy chunk so the next open mounts instantly — that's when
    // the bug bit on a real device (close button present at ghost-click time).
    await mini.tap()
    await expect(map).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(map).toHaveCount(0)

    await mini.tap()
    await expect(map).toBeVisible()

    const cbox = (await page.getByLabel('fermer la carte').boundingBox())!
    const cbx = cbox.x + cbox.width / 2
    const cby = cbox.y + cbox.height / 2

    // Ghost click within the shield window → swallowed, map stays open.
    await page.waitForTimeout(200)
    await page.mouse.click(cbx, cby)
    await page.waitForTimeout(120)
    await expect(map).toBeVisible()

    // After the window, an intentional click still closes the map.
    await page.waitForTimeout(400)
    await page.mouse.click(cbx, cby)
    await expect(map).toHaveCount(0)
  })
})
