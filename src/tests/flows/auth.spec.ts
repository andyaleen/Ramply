import { test, expect } from '@playwright/test'

/**
 * Auth form tests — cover client-side validation without real credentials.
 * All tests run against the public /login and /signup pages.
 */
test.describe('auth — form validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.waitForSelector('text=Welcome to Ramply')
  })

  test('sign-in rejects empty fields', async ({ page }) => {
    await page.getByRole('tab', { name: /sign in/i }).click()
    await page.getByRole('button', { name: /^sign in$/i }).click()
    // Browser required-field validation or our custom error
    const emailInput = page.getByLabel(/^email$/i)
    const validity = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valueMissing)
    expect(validity).toBe(true)
  })

  test('sign-in with bad credentials shows error message', async ({ page }) => {
    await page.getByRole('tab', { name: /sign in/i }).click()
    await page.getByLabel(/^email$/i).fill('notreal@example.com')
    await page.getByLabel(/^password$/i).fill('wrongpassword')
    await page.getByRole('button', { name: /^sign in$/i }).click()
    await expect(page.getByText(/invalid credentials/i)).toBeVisible({ timeout: 10_000 })
  })

  test('sign-up rejects mismatched passwords', async ({ page }) => {
    await page.getByRole('tab', { name: /sign up/i }).click()
    await page.getByLabel(/^email$/i).fill('test@example.com')
    await page.getByLabel(/^password$/i).fill('password123')
    await page.getByLabel(/confirm password/i).fill('different456')
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page.getByText(/passwords do not match/i)).toBeVisible({ timeout: 5_000 })
  })

  test('sign-up rejects a short password', async ({ page }) => {
    await page.getByRole('tab', { name: /sign up/i }).click()
    await page.getByLabel(/^email$/i).fill('test@example.com')
    await page.getByLabel(/^password$/i).fill('shortpass11')
    await page.getByLabel(/confirm password/i).fill('shortpass11')
    await page.getByRole('button', { name: /create account/i }).click()
    // minLength is enforced by the browser before React's handler runs.
    const passwordInput = page.getByLabel(/^password$/i)
    const tooShort = await passwordInput.evaluate((el: HTMLInputElement) => el.validity.tooShort)
    expect(tooShort).toBe(true)
  })

  test('sign-up tab becomes active when clicking the tab', async ({ page }) => {
    await page.getByRole('tab', { name: /sign up/i }).click()
    await expect(page.getByLabel(/confirm password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible()
  })
})
