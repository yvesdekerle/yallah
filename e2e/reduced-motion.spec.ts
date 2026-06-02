import { test, expect } from '@playwright/test'

// WCAG 2.3.3: the prefers-reduced-motion media query neutralises animations.
// `body` carries no animation, so its computed animation-duration is the UA
// default ('0s') normally and the forced near-zero value under reduce — a
// deterministic probe of the global rule that doesn't depend on any transient
// animated element. (Assert ≠ '0s' rather than an exact literal: Chromium
// serialises 0.01ms to seconds, e.g. "0.00001s".)
test('honours prefers-reduced-motion by neutralising animations', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const reduced = await page.evaluate(
    () => getComputedStyle(document.body).animationDuration,
  )
  expect(reduced).not.toBe('0s')

  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const normal = await page.evaluate(
    () => getComputedStyle(document.body).animationDuration,
  )
  expect(normal).toBe('0s')
})
