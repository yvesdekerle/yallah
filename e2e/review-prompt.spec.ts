import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.localStorage.setItem('yallah.userId.v1', JSON.stringify('mathieu'))
  })
  await page.goto('/')
})

// Regression: random-fill voted everything but left the Vote tab showing an
// empty deck. It must now show the cards behind a "Revoir les votes ?" prompt.
test('once everything is voted the Vote tab shows the review prompt over cards', async ({
  page,
}) => {
  // Vote everything via random fill (from Résultats).
  await page.getByRole('button', { name: 'résultats', exact: true }).click()
  await page.getByLabel('remplir aléatoirement les activités restantes').click()
  await page.getByRole('button', { name: 'Remplir', exact: true }).click()

  // Back to the Vote tab.
  await page.getByRole('button', { name: 'vote', exact: true }).click()

  // The prompt is shown, and a card is rendered behind it (not empty).
  await expect(page.getByTestId('review-prompt')).toBeVisible()
  await expect(page.getByTestId('active-card')).toBeVisible()

  // OK enters review mode: prompt gone, exit-review pill available.
  await page.getByRole('button', { name: 'revoir les votes' }).click()
  await expect(page.getByTestId('review-prompt')).toHaveCount(0)
  await expect(page.getByLabel('quitter le mode révision')).toBeVisible()
})
