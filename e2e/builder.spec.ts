import { expect, test, type Page } from '@playwright/test'
import { authSubmit, clickAndAwait, gotoWithRetry, testEmail } from './helpers'

/**
 * Builder flow: load a preset into the studio, edit notes, add to cart.
 * Add-to-cart is behind the auth gate, so the test signs up mid-flow
 * (exactly as a real guest would) and continues afterwards.
 */
test.describe('builder + cart', () => {
  let email: string

  test.beforeEach(async () => {
    email = testEmail('builder')
  })

  /** Load the first preset into the studio and dismiss the onboarding tour. */
  async function openPresetInBuilder(page: Page) {
    await gotoWithRetry(page, '/explore')
    await page.locator('a[href^="/blend/"]').first().click()
    await expect(page).toHaveURL(/\/blend\//)
    await page.getByRole('link', { name: 'Customize this blend' }).click()
    await expect(page).toHaveURL(/\/builder\?preset=/)
    // A preloaded blend must already have notes selected
    await expect(page.locator('button[aria-label^="Remove "]').first()).toBeVisible()
    // The first-time walkthrough tour can overlap the studio — dismiss it
    const skip = page.getByRole('button', { name: 'Skip tour' })
    if (await skip.isVisible().catch(() => false)) await skip.click()
  }

  /**
   * Click "Add to cart" and wait for the app's reaction: either the success
   * toast (already authenticated) or the signup gate (guest).
   */
  async function clickAddToCart(page: Page) {
    await clickAndAwait(
      page.getByRole('button', { name: 'Add to cart', exact: true }),
      page
        .getByText('Blend added to cart.')
        .or(page.getByRole('dialog', { name: 'Create account' })),
      15_000,
    )
  }

  test('builder lists notes and toggling updates the draft', async ({ page }) => {
    await gotoWithRetry(page, '/builder')

    // Preset/top-layer notes rendered as image cards with aria-labels
    const noteCards = page.locator('button[aria-label^="Add "]')
    await expect(noteCards.first()).toBeVisible()
    expect(await noteCards.count()).toBeGreaterThan(5)

    // Toggle the first available top note on — the flip is instant once hydrated
    const addLabel = page.locator('button[aria-label^="Add "]').first()
    const noteName = (await addLabel.getAttribute('aria-label'))!.replace(/^Add /, '')
    const skip = page.getByRole('button', { name: 'Skip tour' })
    if (await skip.isVisible().catch(() => false)) await skip.click()
    await clickAndAwait(addLabel, page.locator(`button[aria-label="Remove ${noteName}"]`))
  })

  test('preset → customize → add to cart (signup gate) → cart reflects item', async ({ page }) => {
    // 1–2. Pick a preset and load it into the builder
    await openPresetInBuilder(page)

    // 3. Add to cart → auth gate appears for guests
    await clickAddToCart(page)
    await expect(page.getByRole('dialog', { name: 'Create account' })).toBeVisible()

    // 4. Complete signup inside the gate
    await page.getByPlaceholder('Ada Lovelace').fill('E2E Builder')
    await page.getByPlaceholder('you@example.com').fill(email)
    await page.getByPlaceholder('At least 8 characters').fill('bu1ld3r-s3cret!')
    await authSubmit(page).click()

    // The gate replays the add-to-cart action once authenticated
    await expect(page.getByText('Blend added to cart.').first()).toBeVisible()

    // 5. Yet another add from a signed-in session works without the gate
    await openPresetInBuilder(page)
    await clickAddToCart(page)
    await expect(page.getByText('Blend added to cart.').first()).toBeVisible()

    // 6. Cart page now shows at least one line item
    await gotoWithRetry(page, '/cart')
    await expect(page.locator('article').first()).toBeVisible()
  })

  test('cart quantity stepper and removal', async ({ page }) => {
    // Sign up through the API to focus on cart behaviour
    const signup = await page.request.post('/api/auth/signup', {
      data: { name: 'E2E Cart', email: testEmail('cart'), password: 'c4rt-s3cret-99!' },
    })
    expect(signup.status()).toBe(200)

    await openPresetInBuilder(page)
    await clickAddToCart(page)
    await expect(page.getByText('Blend added to cart.').first()).toBeVisible()

    await gotoWithRetry(page, '/cart')
    await expect(page.locator('article').first()).toBeVisible()

    // Quantity stepper: plus raises the quantity, minus clamps back at 1
    const line = page.locator('article').first()
    const stepper = line.locator('div.flex.items-center.gap-3')
    const qty = stepper.locator('span').filter({ hasText: /^\d+$/ })
    const before = await qty.innerText()
    const plus = stepper.locator('button').last()
    const minus = stepper.locator('button').first()
    await plus.click()
    await expect(qty).not.toHaveText(before, { timeout: 15_000 })
    const raised = await qty.innerText()
    await minus.click()
    await expect(qty).toHaveText(before, { timeout: 15_000 })
    expect(Number(raised)).toBeGreaterThan(Number(before))
  })

  test('cart items can be removed', async ({ page }) => {
    const signup = await page.request.post('/api/auth/signup', {
      data: { name: 'E2E Cart Remove', email: testEmail('rm'), password: 'c4rt-s3cret-99!' },
    })
    expect(signup.status()).toBe(200)

    await openPresetInBuilder(page)
    await clickAddToCart(page)
    await expect(page.getByText('Blend added to cart.').first()).toBeVisible()

    await gotoWithRetry(page, '/cart')
    // Remove every line item until the cart is empty (qty/bundle can add > 1 line)
    for (let i = 0; i < 5; i++) {
      const removeButtons = page.getByRole('button', { name: 'Remove' })
      if ((await removeButtons.count()) === 0) break
      await removeButtons.first().click({ trial: true }).catch(() => {})
      await removeButtons.first().click()
      await page.waitForTimeout(1_500)
    }
    await expect(page.getByRole('heading', { name: 'Your cart is empty.' })).toBeVisible({
      timeout: 15_000,
    })
  })
})
