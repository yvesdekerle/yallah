import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // Clear on the first navigation only — not via addInitScript, which would
  // fire again on `page.reload()` and wipe the persisted filter we verify.
  await page.goto('/')
  await page.evaluate(() => {
    window.localStorage.clear()
    window.localStorage.setItem('yallah.userId.v1', JSON.stringify('mathieu'))
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
})

const SNORKELING = 'Snorkeling à Blue Bay Marine Park' // a001 — tags 🌊 🐅
const PECHE = 'Sortie pêche traditionnelle avec un pêcheur' // a009 — first 🏛️

test('filtering by a category only serves matching activities', async ({
  page,
}) => {
  // a001 (no 🏛️) is on top by default.
  await expect(page.getByRole('heading', { name: SNORKELING })).toBeVisible()

  await page.getByLabel('filtrer par catégorie').click()
  await expect(
    page.getByRole('dialog', { name: 'Filtrer par catégorie' }),
  ).toBeVisible()
  await page.getByText('Patrimoine & culture').click()
  await page.getByTestId('filter-confirm').click()

  // Deck now starts at the first 🏛️ activity, the snorkeling card is gone.
  await expect(page.getByRole('heading', { name: PECHE })).toBeVisible()
  await expect(page.getByRole('heading', { name: SNORKELING })).toHaveCount(0)
  await expect(page.getByTestId('filter-badge')).toHaveText('1')
})

test('clearing the filter restores the full deck', async ({ page }) => {
  await page.getByLabel('filtrer par catégorie').click()
  await page.getByText('Patrimoine & culture').click()
  await page.getByTestId('filter-confirm').click()
  await expect(page.getByTestId('filter-badge')).toHaveText('1')

  await page.getByLabel('filtrer par catégorie').click()
  await page.getByText('Tout désélectionner').click()
  await page.getByTestId('filter-confirm').click()

  await expect(page.getByTestId('filter-badge')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: SNORKELING })).toBeVisible()
})

test('the active filter persists across a reload', async ({ page }) => {
  await page.getByLabel('filtrer par catégorie').click()
  await page.getByText('Patrimoine & culture').click()
  await page.getByTestId('filter-confirm').click()
  await expect(page.getByTestId('filter-badge')).toHaveText('1')

  await page.reload()

  await expect(page.getByTestId('filter-badge')).toHaveText('1')
  await expect(page.getByRole('heading', { name: PECHE })).toBeVisible()
})
