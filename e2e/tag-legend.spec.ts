import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    window.localStorage.clear()
    window.localStorage.setItem('yallah.userId.v1', JSON.stringify('mathieu'))
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
})

const SNORKELING = 'Snorkeling à Blue Bay Marine Park' // a001 — tags 🌊 🐅

test('tapping a tag chip opens the legend with its French label', async ({
  page,
}) => {
  const card = page.getByTestId('active-card')
  await expect(card.getByRole('heading', { name: SNORKELING })).toBeVisible()

  // Legend hidden until a chip is tapped.
  await expect(card.getByRole('dialog', { name: 'Légende des tags' })).toHaveCount(
    0,
  )

  // The chip's accessible name is the tag's French label.
  await card.getByLabel('Mer & sports nautiques').click()

  const legend = card.getByRole('dialog', { name: 'Légende des tags' })
  await expect(legend).toBeVisible()
  await expect(legend).toContainText('Mer & sports nautiques')
  await expect(legend).toContainText('Faune sauvage')
})

test('tapping the chip again closes the legend', async ({ page }) => {
  const card = page.getByTestId('active-card')
  const chip = card.getByLabel('Mer & sports nautiques')

  await chip.click()
  await expect(
    card.getByRole('dialog', { name: 'Légende des tags' }),
  ).toBeVisible()

  await chip.click()
  await expect(
    card.getByRole('dialog', { name: 'Légende des tags' }),
  ).toHaveCount(0)
})
