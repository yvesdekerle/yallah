import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
  })
  await page.goto('/')
})

test('onboarding picker appears on first launch and is blocking', async ({
  page,
}) => {
  await expect(page.getByRole('dialog', { name: 'Tu es qui ?' })).toBeVisible()
  // Escape does not dismiss in blocking mode.
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('dialog', { name: 'Tu es qui ?' }),
  ).toBeVisible()
})

test('picking Chloé closes the picker and shows the deck', async ({ page }) => {
  await page.getByTestId('picker-row-chloe').click()
  await expect(
    page.getByRole('dialog', { name: 'Tu es qui ?' }),
  ).toHaveCount(0)
  // First activity heading visible.
  await expect(page.locator('h2').first()).toBeVisible()
  // Storage updated.
  const stored = await page.evaluate(() =>
    window.localStorage.getItem('yallah.userId.v1'),
  )
  expect(stored).toBe(JSON.stringify('chloe'))
})

test('on Groupe page, the picked participant carries the "toi" badge', async ({
  page,
}) => {
  await page.getByTestId('picker-row-chloe').click()
  await page.getByRole('button', { name: 'groupe' }).click()
  const chloeRow = page.getByTestId('participant-chloe')
  await expect(chloeRow).toContainText('toi')
  await expect(page.getByTestId('participant-yves')).not.toContainText('toi')
})

test('"Changer d\'identité" reopens the dismissable picker', async ({
  page,
}) => {
  await page.getByTestId('picker-row-chloe').click()
  await page.getByRole('button', { name: 'groupe' }).click()
  await page.getByRole('button', { name: /changer d'identité/i }).click()

  const dialog = page.getByRole('dialog', { name: 'Tu es qui ?' })
  await expect(dialog).toBeVisible()
  // Now there's a close button.
  await expect(page.getByLabel('fermer le sélecteur')).toBeVisible()

  await page.getByTestId('picker-row-ade').click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByTestId('participant-ade')).toContainText('toi')
})

test('Réinitialiser wipes the chosen identity and onboarding returns', async ({
  page,
}) => {
  await page.getByTestId('picker-row-chloe').click()
  // Cast a vote so the reset button is enabled.
  await page.getByLabel('like', { exact: true }).click()
  await page.waitForTimeout(700)

  await page.getByRole('button', { name: 'résultats' }).click()
  await page.getByRole('button', { name: /réinitialiser les votes/i }).click()
  await page.getByRole('button', { name: 'Tout effacer' }).click()

  // Picker is back (blocking, no close button).
  await expect(
    page.getByRole('dialog', { name: 'Tu es qui ?' }),
  ).toBeVisible()
  await expect(page.getByLabel('fermer le sélecteur')).toHaveCount(0)

  const stored = await page.evaluate(() =>
    window.localStorage.getItem('yallah.userId.v1'),
  )
  expect(stored).toBeNull()
})
