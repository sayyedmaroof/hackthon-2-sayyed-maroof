import { expect, test } from '@playwright/test'
import { clickAndAwait, gotoWithRetry, testEmail } from './helpers'

/**
 * Real Stripe Checkout purchase path: sign in → build a blend → cart →
 * checkout → Stripe hosted Checkout → success confirmation.
 *
 * With STRIPE_SECRET_KEY configured, the submit button redirects to Stripe's
 * test-hosted checkout — the payment step is verified there with the standard
 * test card. Without Stripe configuration the API answers 503 and the page
 * must keep the cart intact with a clear retry message.
 */

const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY)

test('checkout: cart → Stripe hosted checkout → confirmation → account shows order', async ({ page }) => {
  test.skip(!stripeConfigured, 'Stripe is not configured for this run')

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

  // ── Cart → checkout → Stripe hosted payment ────────────────────────
  await gotoWithRetry(page, '/cart')
  await expect(page.locator('article').first()).toBeVisible()
  await gotoWithRetry(page, '/checkout')
  await page.getByPlaceholder('Jane Doe').fill('E2E Shopper')
  await page.getByPlaceholder('jane@example.com').fill('shopper@example.com')

  await expect(
    page.getByRole('button', { name: 'Continue to payment' }),
  ).toBeVisible()

  // Submitting must leave the app for Stripe's hosted Checkout.
  await page.getByRole('button', { name: 'Continue to payment' }).click()
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 })

  // ── Pay with Stripe's test card ────────────────────────────────────
  // Hosted Checkout is rendered in one Stripe iframe; use role/placeholder
  // selectors that survive layout changes.
  await page.getByPlaceholder('1234 1234 1234 1234').fill('4242 4242 4242 4242')
  await page.getByPlaceholder('MM / YY').fill('12 / 34')
  await page.getByPlaceholder('CVC').fill('123')
  const cardholder = page.getByPlaceholder('Full name on card')
  if (await cardholder.isVisible().catch(() => false)) {
    await cardholder.fill('E2E Shopper')
  }
  await page.getByRole('button', { name: 'Pay', exact: true }).click()
  await page.waitForURL(/\/checkout\/success/, { timeout: 60_000 })

  // ── Success page shows the confirmed order ────────────────────────
  const sessionId = new URL(page.url()).searchParams.get('session_id')
  expect(sessionId).toMatch(/^cs_/)
  await expect(page.getByText(/payment received/i)).toBeVisible({ timeout: 15_000 })

  // ── Order history on the account page ─────────────────────────────
  await gotoWithRetry(page, '/account')
  // Real DB-backed history: the paid order shows its reference + amount.
  await expect(page.getByText(/^SB-[A-Z0-9]{10}$/).first()).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Royal Ember').first()).toBeVisible({ timeout: 15_000 })
})

test('cancelled checkout keeps the cart and offers retry', async ({ page }) => {
  test.skip(!stripeConfigured, 'Stripe is not configured for this run')

  await page.request.post('/api/auth/signup', {
    data: { name: 'E2E Canceler', email: testEmail('canceler'), password: 'c4ncel-s3cret!' },
  })

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

  await gotoWithRetry(page, '/checkout')
  await page.getByPlaceholder('Jane Doe').fill('E2E Canceler')
  await page.getByPlaceholder('jane@example.com').fill('canceler@example.com')
  await page.getByRole('button', { name: 'Continue to payment' }).click()
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30_000 })

  // Cancel on the hosted page → back to /checkout?canceled=1
  await page.getByRole('link', { name: /cancel/i }).first().click()

  await expect(page.getByText(/payment was cancelled/i)).toBeVisible({ timeout: 20_000 })
  // Returned to the checkout page with the cart intact.
  await expect(page.getByRole('button', { name: 'Continue to payment' })).toBeVisible()
  // The order summary still lists the blend.
  await expect(page.getByText(/× 1/).first()).toBeVisible()
})

test('checkout with an empty cart cannot proceed', async ({ page }) => {
  await page.goto('/checkout')
  await expect(page.getByText(/add a blend/i)).toBeVisible()
})
