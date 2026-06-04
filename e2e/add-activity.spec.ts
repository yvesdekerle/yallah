import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear()
    window.localStorage.setItem('yallah.userId.v1', JSON.stringify('yves'))
  })
  await page.goto('/')
})

test('adds an activity (URL photo) and shows it in the list + résultats', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'ajouter', exact: true }).click()

  await page.getByLabel('Titre').fill('Pique-nique secret au Morne')
  await page
    .getByLabel('coller une url d’image')
    .fill('https://example.com/morne.jpg')
  // The URL field commits on Enter.
  await page.getByLabel('coller une url d’image').press('Enter')
  await expect(page.getByLabel('photo principale')).toBeVisible()

  await page.getByRole('button', { name: 'ajouter l’activité' }).click()

  // Appears in "Mes activités ajoutées".
  await expect(page.getByText('Mes activités ajoutées')).toBeVisible()
  await expect(page.getByText('Pique-nique secret au Morne')).toBeVisible()

  // It reached the deck (it's the last card): random-fill then check Résultats.
  await page.getByRole('button', { name: 'résultats', exact: true }).click()
  await page.getByLabel('remplir aléatoirement les activités restantes').click()
  await page.getByRole('button', { name: 'Remplir', exact: true }).click()
  // The voted row exposes the activity via its accessible name (the vote-row-*
  // testid was dropped in d56aa3c in favour of role/name queries).
  const row = page.getByRole('button', {
    name: 'Voir le détail de Pique-nique secret au Morne',
  })
  await expect(row).toBeVisible()

  // The detail shows the creator — "toi" in demo mode (item 8).
  await row.click()
  await expect(page.getByTestId('detail-sheet')).toContainText('Créé par toi')
})

test('edits and deletes an added activity', async ({ page }) => {
  await page.getByRole('button', { name: 'ajouter', exact: true }).click()
  await page.getByLabel('Titre').fill('Brouillon')
  await page.getByRole('button', { name: 'ajouter l’activité' }).click()
  await expect(page.getByText('Brouillon')).toBeVisible()

  // Edit
  await page.getByLabel('modifier Brouillon').click()
  await expect(page.getByLabel('Titre')).toHaveValue('Brouillon')
  await page.getByLabel('Titre').fill('Titre corrigé')
  await page.getByRole('button', { name: 'enregistrer les modifications' }).click()
  await expect(page.getByText('Titre corrigé')).toBeVisible()

  // Delete (confirm modal)
  await page.getByLabel('supprimer Titre corrigé').click()
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await expect(page.getByText('Mes activités ajoutées')).toHaveCount(0)
})
