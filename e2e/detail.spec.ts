import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.localStorage.setItem('yallah.userId.v1', JSON.stringify('mathieu'))
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

// Regression: clicking the photo-lightbox backdrop used to bubble up to the
// DetailModal backdrop and dismiss the whole sheet (falling through to the
// map). Closing the lightbox must leave the detail sheet open.
test('closing the photo lightbox keeps the detail open', async ({ page }) => {
  await page.getByLabel('voir le détail').click()
  await expect(page.getByTestId('detail-sheet')).toBeVisible()

  await page.getByLabel('ouvrir la photo 1', { exact: true }).click()
  const lightbox = page.getByTestId('photo-lightbox')
  await expect(lightbox).toBeVisible()
  // Wait past the DetailModal backdrop "armed" guard so a propagated click
  // would actually close it — proving the fix isn't just the timing guard.
  await page.waitForTimeout(500)

  // Click the backdrop (top-left corner, away from the centered photo).
  await lightbox.click({ position: { x: 6, y: 6 } })

  await expect(lightbox).toHaveCount(0)
  await expect(page.getByTestId('detail-sheet')).toBeVisible()
})

// Regression: the active card opens this modal on `pointerup`; on touch the
// trailing synthesized click landed on the backdrop and closed it instantly.
// The backdrop close is now guarded for a short window after open.
test.describe('open via card tap (touch)', () => {
  test.use({ hasTouch: true })

  test('tapping the card opens the detail and it stays open', async ({
    page,
  }) => {
    await page.getByTestId('active-card').tap()
    await page.waitForTimeout(500)
    await expect(page.getByTestId('detail-sheet')).toBeVisible()
  })
})
