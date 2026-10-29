import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Shared helpers for the E2E suite.
 *
 * The app stores drafts in localStorage and the sign-up flow creates real
 * rows in the demo database, so every test user gets a unique, clearly
 * labelled "e2e-" address. A global teardown removes them afterwards.
 */

export function testEmail(label: string): string {
  return `e2e-${label}-${Date.now()}-${Math.floor(Math.random() * 10_000)}@example.com`
}

/**
 * Click a link/button that drives a client-side navigation and poll the URL —
 * the URL is the only reaction that can't be confused with pre-existing state.
 */
export async function clickAndNavigate(button: Locator, urlPattern: RegExp, navTimeoutMs = 20_000) {
  for (let attempt = 0; ; attempt++) {
    await button.click({ timeout: 10_000 })
    try {
      const page = button.page() as Page
      await page.waitForURL(urlPattern, { timeout: navTimeoutMs })
      return
    } catch (error) {
      if (attempt >= 2) throw error
    }
  }
}

/**
 * Click a button and wait for an observable reaction, retrying the click:
 * on a cold `next dev` build the page may not be fully hydrated yet, in
 * which case the first click is silently swallowed by the browser.
 */
export async function clickAndAwait(button: Locator, target: Locator, targetTimeoutMs = 12_000) {
  for (let attempt = 0; ; attempt++) {
    await button.click({ timeout: 10_000 })
    try {
      await target.waitFor({ state: 'visible', timeout: targetTimeoutMs })
      return
    } catch (error) {
      if (attempt >= 3) throw error
    }
  }
}

/** Navigate with retry — full page loads occasionally abort mid-render (HMR, hydration). */
export async function gotoWithRetry(page: Page, path: string, attempts = 3) {
  for (let attempt = 0; ; attempt++) {
    try {
      await page.goto(path)
      return
    } catch (error) {
      if (attempt >= attempts - 1) throw error
    }
  }
}

/**
 * Open the auth dialog from a trigger (header chip, account page, or the
 * add-to-cart gate) and wait until the visible form is interactive.
 * `isSignup` selects which placeholder to wait for.
 */
export async function awaitAuthDialog(page: Page, isSignup = true) {
  const field = isSignup
    ? page.getByPlaceholder('Ada Lovelace')
    : page.getByPlaceholder('••••••••')
  await expect(field).toBeVisible({ timeout: 15_000 })
  return field
}

/** The auth dialog's submit button, scoped so page-level buttons can't collide. */
export function authSubmit(page: Page) {
  return page
    .getByRole('dialog', { name: 'Create account' })
    .getByRole('button', { name: 'Create account' })
}

/** Fill the auth dialog with new-account details and submit it. */
export async function completeSignup(
  page: Page,
  { name, email, password }: { name: string; email: string; password: string },
) {
  await page.getByPlaceholder('Ada Lovelace').fill(name)
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder('At least 8 characters').fill(password)
  await authSubmit(page).click()
}

/** Wait until /api/auth/me reports a signed-in user named `expectedName`. */
export async function expectSignedInViaApi(page: Page, expectedName: string) {
  await expect
    .poll(
      async () => {
        const res = await page.request.get('/api/auth/me')
        const body = (await res.json()) as { user: { name: string } | null }
        return body.user?.name ?? null
      },
      { timeout: 15_000 },
    )
    .toBe(expectedName)
}
