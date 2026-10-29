import { expect, test } from '@playwright/test'
import { clickAndAwait, clickAndNavigate, gotoWithRetry, testEmail } from './helpers'

/**
 * Full purchase path: sign in → build a blend → cart → demo checkout →
 * success page with a reference → order shows in account history.
 */
test('checkout: cart → demo order → success → account shows order', async ({ page }) => {
  // ── Sign up fresh (keeps orders isolated) ─────────────────────────
  await page.request.post('/api/auth/signup', {
    data: { name: 'E2E Shopper', email: testEmail('shopper'), password: 'sh0pper-s3cret!' },
  })

  // ── Build a blend and put it in the cart ──────────────────────────
  await gotoWithRetry(page, '/explore')
  await page.locator('a[href^="/blend/"]').first().click()
  await expect(page).toHaveURL(/\/blend\//)
  await page.getByRole('link', { name: 'Customize this blend' }).click()
  await expect(page).toHaveURL(/\/builder\?preset=/)
  const skip = page.getByRole('button', { name: 'Skip tour' })
  if (await skip.isVisible().catch(() => false)) await skip.click()
  await clickAndAwait(
    page.getByRole('button', { name: 'Add to cart', exact: true }).first(),
    page.getByText('Blend added to cart.').first(),
    15_000,
  )

  // ── Cart → checkout → demo order ──────────────────────────────────
  await gotoWithRetry(page, '/cart')
  await expect(page.locator('article').first()).toBeVisible()
  await clickAndNavigate(
    page.getByRole('link', { name: 'Proceed to checkout' }),
    /\/checkout/,
  )
  await page.getByPlaceholder('Jane Doe').fill('E2E Shopper')
  await page.getByPlaceholder('jane@example.com').fill('shopper@example.com')
  await clickAndNavigate(
    page.getByRole('button', { name: 'Complete demo checkout' }),
    /\/checkout\/success\?ref=/,
    30_000,
  )

  // ── Success page shows a reference ────────────────────────────────
  const reference = new URL(page.url()).searchParams.get('ref') as string
  expect(reference).toMatch(/^SB-/)
  await expect(page.getByText(reference).first()).toBeVisible()

  // ── Order history on the account page ─────────────────────────────
  await clickAndNavigate(
    page.getByRole('link', { name: /view my orders/i }),
    /\/account/,
  )
  await expect(page.getByText(reference).first()).toBeVisible({ timeout: 15_000 })
})

test('checkout with an empty cart cannot proceed', async ({ page }) => {
  await page.goto('/checkout')
  await expect(page.getByText(/add a blend/i)).toBeVisible()
})
