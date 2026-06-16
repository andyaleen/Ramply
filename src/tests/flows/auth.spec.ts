import { test, expect } from '@playwright/test'

/**
 * Auth form tests — cover client-side validation without real credentials.
 * Sign-in and sign-up live on separate public pages.
 */
test.describe('auth — form validation', () => {
  test('sign-in rejects empty fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /welcome back to ramply/i })).toBeVisible()
    await page.getByRole('button', { name: /^sign in$/i }).click()
    const emailInput = page.getByLabel(/^email$/i)
    const validity = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valueMissing)
    expect(validity).toBe(true)
  })

  test('sign-in with bad credentials shows error message', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/^email$/i).fill('notreal@example.com')
    await page.getByLabel(/^password$/i).fill('wrongpassword')
    await page.getByRole('button', { name: /^sign in$/i }).click()
    await expect(page.getByText(/invalid credentials/i)).toBeVisible({ timeout: 10_000 })
  })

  test('sign-up rejects mismatched passwords', async ({ page }) => {
    await page.goto('/signup')
    await page.getByLabel(/^email$/i).fill('test@example.com')
    await page.getByLabel(/^password$/i).fill('password12345')
    await page.getByLabel(/confirm password/i).fill('different45678')
    await page.getByRole('button', { name: /create account/i }).click()
    await expect(page.getByText(/passwords do not match/i)).toBeVisible({ timeout: 5_000 })
  })

  test('sign-up rejects a short password', async ({ page }) => {
    await page.goto('/signup')
    await page.getByLabel(/^email$/i).fill('test@example.com')
    await page.getByLabel(/^password$/i).fill('shortpass11')
    await page.getByLabel(/confirm password/i).fill('shortpass11')
    await page.getByRole('button', { name: /create account/i }).click()
    const passwordInput = page.getByLabel(/^password$/i)
    const tooShort = await passwordInput.evaluate((el: HTMLInputElement) => el.validity.tooShort)
    expect(tooShort).toBe(true)
  })

  test('login page links to signup', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /^sign up$/i }).click()
    await expect(page).toHaveURL(/\/signup/)
    await expect(page.getByRole('heading', { name: /welcome to ramply/i })).toBeVisible()
  })

  test('signup page links to login', async ({ page }) => {
    await page.goto('/signup')
    await page.getByRole('button', { name: /^sign in$/i }).click()
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: /welcome back to ramply/i })).toBeVisible()
  })
})
