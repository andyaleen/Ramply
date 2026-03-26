import { Page } from '@playwright/test'

/**
 * Log in via the /login page using email/password credentials.
 * Waits for navigation away from /login to confirm success.
 */
export async function loginAs(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login')
  await page.waitForSelector('text=Welcome to Ramply')

  // Ensure Sign In tab is active
  await page.getByRole('tab', { name: /sign in/i }).click()

  await page.getByLabel(/^email$/i).fill(email)
  await page.getByLabel(/^password$/i).fill(password)
  await page.getByRole('button', { name: /^sign in$/i }).click()

  // Wait for redirect away from /login (admin → /admin, user → /dashboard)
  await page.waitForURL(/\/(admin|dashboard)/, { timeout: 15_000 })
}
