import { Page } from '@playwright/test'

/**
 * Log in via the /login page using email/password credentials.
 * Waits for navigation away from /login to confirm success.
 *
 * Uses input IDs directly (#signin-email, #signin-password) to avoid
 * ambiguity — both sign-in and sign-up forms render "Email"/"Password" labels.
 * The submit button is scoped to the form containing #signin-email to prevent
 * accidentally clicking the "Continue with Google" button above the tabs.
 */
export async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login')
  await page.waitForSelector('text=Welcome to Ramply', { timeout: 15_000 })

  // Ensure Sign In tab is active
  await page.locator('[role="tab"]', { hasText: 'Sign In' }).click()

  // Target inputs by ID — avoids ambiguity with the sign-up form's labels
  await page.locator('#signin-email').fill(email)
  await page.locator('#signin-password').fill(password)

  // Scope submit to the form containing the sign-in email input
  await page.locator('form').filter({ has: page.locator('#signin-email') })
    .getByRole('button', { name: /sign in/i })
    .click()

  // Wait for redirect away from /login (admin → /admin, user → /dashboard).
  // AuthContext has a 500ms setTimeout + async profile fetch before redirecting,
  // so we use a generous timeout and also accept any non-login URL.
  await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 30_000 })
}
