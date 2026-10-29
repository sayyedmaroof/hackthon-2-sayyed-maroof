import { expect, test } from '@playwright/test'
import { authSubmit, clickAndAwait, expectSignedInViaApi, gotoWithRetry, testEmail } from './helpers'

test.describe('auth', () => {
  test('signup validation rejects short passwords', async ({ page }) => {
    await gotoWithRetry(page, '/account')
    // The page's "Create account" button opens the dialog in signup mode
    const createAccount = page.locator('main').getByRole('button', { name: 'Create account' })
    await clickAndAwait(createAccount, page.getByPlaceholder('Ada Lovelace'))
    await page.getByPlaceholder('Ada Lovelace').fill('E2E Short Password')
    await page.getByPlaceholder('you@example.com').fill(testEmail('shortpw'))
    await page.getByPlaceholder('At least 8 characters').fill('short')
    await authSubmit(page).click()
    // Client stays on the dialog and does not create the account
    await expect(authSubmit(page)).toBeVisible()
    await expect(page.getByPlaceholder('At least 8 characters')).toBeVisible()
  })

  test('signup, session, logout, and login round-trip', async ({ page, request }) => {
    const email = testEmail('roundtrip')
    const password = 'sup3rs3cret!pass'

    // ── Sign up through the account page gate ────────────────────────
    await gotoWithRetry(page, '/account')
    const createAccount = page.locator('main').getByRole('button', { name: 'Create account' })
    await clickAndAwait(createAccount, page.getByPlaceholder('Ada Lovelace'))
    await page.getByPlaceholder('Ada Lovelace').fill('E2E Roundtrip')
    await page.getByPlaceholder('you@example.com').fill(email)
    await page.getByPlaceholder('At least 8 characters').fill(password)
    await authSubmit(page).click()

    // Session cookie set + me endpoint returns the user
    await expectSignedInViaApi(page, 'E2E Roundtrip')

    // Signed-in member sees their dashboard (greets by first name)
    await expect(page.getByRole('heading', { name: 'Welcome back, E2E.' })).toBeVisible()

    // ── Log out (and clear the db session via the API) ───────────────
    await request.post('/api/auth/logout')

    // /me is now unauthenticated again
    const me = await request.get('/api/auth/me')
    expect((await me.json()).user).toBeNull()

    // ── Log back in with the same credentials ────────────────────────
    const login = await request.post('/api/auth/login', {
      data: { email, password },
    })
    expect(login.status()).toBe(200)
    const afterLogin = await request.get('/api/auth/me')
    const body = (await afterLogin.json()) as { user: { email: string } | null }
    expect(body.user?.email).toBe(email)
  })

  test('login rejects wrong password and duplicate signup is a conflict', async ({ request }) => {
    const email = testEmail('guard')
    const password = 'g0od-password-9!'

    const signup = await request.post('/api/auth/signup', {
      data: { name: 'E2E Guard', email, password },
    })
    expect(signup.status()).toBe(200)

    const badLogin = await request.post('/api/auth/login', {
      data: { email, password: 'wr0ng-password-9!' },
    })
    expect(badLogin.status()).toBe(401)

    const duplicate = await request.post('/api/auth/signup', {
      data: { name: 'E2E Duplicate', email, password },
    })
    expect(duplicate.status()).toBe(409)
  })
})
