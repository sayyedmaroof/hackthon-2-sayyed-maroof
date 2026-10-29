import { expect, test } from '@playwright/test'

test.describe('smoke: public pages', () => {
  test('landing page renders hero and core sections', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/ScentBuild/i)
    await expect(page.getByRole('banner')).toBeVisible()
    await expect(page.getByRole('link', { name: /explore/i }).first()).toBeVisible()
  })

  test('explore page lists preset blends', async ({ page }) => {
    await page.goto('/explore')
    const presetLinks = page.getByRole('link', { name: /discover more/i })
    const cards = page.locator('a[href^="/blend/"]')
    await expect(cards.first()).toBeVisible()
    expect(await cards.count()).toBeGreaterThan(3)
    expect(presetLinks).toBeTruthy()
  })

  test('blend detail page shows notes and links to customize', async ({ page }) => {
    await page.goto('/explore')
    await page.locator('a[href^="/blend/"]').first().click()
    await expect(page).toHaveURL(/\/blend\//)
    await expect(page.getByRole('link', { name: 'Customize this blend' })).toBeVisible()
  })

  test('unknown blend id returns 404', async ({ page }) => {
    const res = await page.goto('/blend/this-preset-does-not-exist')
    expect(res?.status()).toBe(404)
  })

  test('auth session endpoint works for guests', async ({ request }) => {
    const res = await request.get('/api/auth/me')
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { user: unknown }
    expect(body.user).toBeNull()
  })

  test('concierge page loads', async ({ page }) => {
    await page.goto('/concierge')
    await expect(page.locator('main')).toBeVisible()
  })
})
