import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
  })
  await page.goto('/')
})

// The welcome screen now precedes the identity picker. "Mode démo" reveals the
// blocking picker; Google sign-in is the other entry (not exercised in e2e).
const startDemo = (page: import('@playwright/test').Page) =>
  page.getByRole('button', { name: 'Mode démo' }).click()

test('welcome screen appears first; Mode démo opens the blocking picker', async ({
  page,
}) => {
  // First launch shows the welcome screen, not the picker.
  await expect(page.getByRole('button', { name: 'Mode démo' })).toBeVisible()
  await expect(
    page.getByRole('dialog', { name: 'Tu es qui ?' }),
  ).toHaveCount(0)

  await startDemo(page)
  const dialog = page.getByRole('dialog', { name: 'Tu es qui ?' })
  await expect(dialog).toBeVisible()
  // Escape does not dismiss in blocking mode.
  await page.keyboard.press('Escape')
  await expect(dialog).toBeVisible()
})

test('picking Chloé closes the picker and shows the deck', async ({ page }) => {
  await startDemo(page)
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
  await startDemo(page)
  await page.getByTestId('picker-row-chloe').click()
  await page.getByRole('button', { name: 'groupe' }).click()
  const chloeRow = page.getByTestId('participant-chloe')
  await expect(chloeRow).toContainText('toi')
  await expect(page.getByTestId('participant-yves')).not.toContainText('toi')
})

test('"Changer d\'identité" reopens the dismissable picker', async ({
  page,
}) => {
  await startDemo(page)
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

test('the demo profile menu logs out (→ welcome) and opens Réglages', async ({
  page,
}) => {
  await startDemo(page)
  await page.getByTestId('picker-row-chloe').click()
  await expect(page.getByRole('dialog', { name: 'Tu es qui ?' })).toHaveCount(0)

  // Demo mode now shows the profile avatar (item 4). "Paramètres" opens Réglages.
  await page.getByLabel('Compte de Chloé').click()
  await page.getByRole('menuitem', { name: 'Paramètres' }).click()
  await expect(page.getByRole('dialog', { name: 'Réglages' })).toBeVisible()
  await page.getByLabel('fermer les réglages').click()

  // "Se déconnecter" returns to the welcome screen and clears the identity.
  await page.getByLabel('Compte de Chloé').click()
  await page.getByRole('menuitem', { name: 'Se déconnecter' }).click()
  await expect(page.getByRole('button', { name: 'Mode démo' })).toBeVisible()
  const stored = await page.evaluate(() =>
    window.localStorage.getItem('yallah.userId.v1'),
  )
  expect(stored).toBeNull()
})

test('Réinitialiser les votes clears the votes but keeps the identity and stays in-app', async ({
  page,
}) => {
  await startDemo(page)
  await page.getByTestId('picker-row-chloe').click()
  // Cast a vote so the reset button is enabled.
  await page.getByLabel('like', { exact: true }).click()
  await page.waitForTimeout(700)

  await page.getByRole('button', { name: 'résultats' }).click()
  await page.getByLabel('réinitialiser les votes').click()
  // Confirm in the dialog (scoped so we don't re-hit the Résultats button).
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Réinitialiser les votes' })
    .click()

  // Still in the app: no welcome screen, identity preserved, votes gone.
  await expect(page.getByRole('button', { name: 'Mode démo' })).toHaveCount(0)

  const userId = await page.evaluate(() =>
    window.localStorage.getItem('yallah.userId.v1'),
  )
  expect(userId).toBe('chloe')

  const history = await page.evaluate(() =>
    window.localStorage.getItem('yallah.history.v1'),
  )
  expect(JSON.parse(history ?? '[]')).toEqual([])
})
