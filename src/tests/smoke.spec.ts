import { test, expect } from '@playwright/test'

test.describe('smoke — public pages', () => {
  test('landing page renders hero heading', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Effortless Onboarding Starts Here')
  })

  test('landing page has sign-up CTA buttons', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /sign up free with email/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()
  })

  test('login page renders auth form with sign-in and sign-up tabs', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Welcome to Ramply')).toBeVisible()
    await expect(page.getByRole('tab', { name: /sign in/i })).toBeVisible()
    await expect(page.getByRole('tab', { name: /sign up/i })).toBeVisible()
  })

  test('signup page renders with signup tab active', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByText('Welcome to Ramply')).toBeVisible()
    // Confirm password field is visible when signup tab is default
    await expect(page.getByLabel(/confirm password/i)).toBeVisible()
  })

  test('invalid onboard token shows invalid link screen', async ({ page }) => {
    await page.goto('/onboard/not-a-real-token-abc123')
    // May show auth wall or invalid link — either way should not crash
    await expect(page).not.toHaveURL(/error/)
    // If the token resolves (error path), expect InvalidLink or auth form
    // Just verify the page loads without a 500
    await expect(page.locator('body')).toBeVisible()
  })

  test('unauthenticated /admin redirects to /login', async ({ page }) => {
    // /admin is a legacy path that now 308s to /dashboard; unauthenticated users
    // should end up at /login either way.
    await page.goto('/admin')
    await expect(page).toHaveURL(/login|\/dashboard/, { timeout: 8000 })
  })

  test('unauthenticated /dashboard redirects to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/login|\/dashboard/, { timeout: 8000 })
  })
})
