import { test, expect } from '@playwright/test'
import { loginAs } from '../helpers/auth'

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? ''
const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? ''
const vendorEmail = process.env.E2E_VENDOR_EMAIL ?? ''
const vendorPassword = process.env.E2E_VENDOR_PASSWORD ?? ''

const hasCredentials = () =>
  Boolean(adminEmail && adminPassword && vendorEmail && vendorPassword)

/**
 * Unauthenticated share-link tests — no credentials required.
 */
test.describe('share request — unauthenticated', () => {
  test('visiting a pending share link shows auth wall', async ({ page }) => {
    // Use a syntactically valid but non-existent token
    await page.goto('/onboard/0000000000000000000000000000000000000000000000000000000000000000')
    // Should show "Share Request" auth-wall heading or "Invalid Link" — either is correct
    await expect(
      page.getByRole('heading', { name: /share request|invalid link/i })
    ).toBeVisible({ timeout: 10_000 })
  })
})

/**
 * Full E2E: requester → respondent → reviewer loop.
 * Requires E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_VENDOR_EMAIL, E2E_VENDOR_PASSWORD.
 */
test.describe('share request — full flow', () => {
  test.skip(!hasCredentials(), 'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_VENDOR_EMAIL, E2E_VENDOR_PASSWORD to run')

  let shareLink: string

  /**
   * Step 1 — Admin creates a share request and copies the generated link.
   */
  test('admin creates a share request and receives a link', async ({ page }) => {
    await loginAs(page, adminEmail, adminPassword)
    await page.goto('/admin/send-links')

    await page.getByRole('button', { name: /new request/i }).click()
    await page.waitForSelector('text=New Share Request')

    // Fill in recipient email
    await page.getByLabel(/recipient email/i).fill(vendorEmail)

    // Select at least one mandatory field (Legal Business Name)
    await page.getByText('Legal Business Name').click()

    await page.getByRole('button', { name: /create & send/i }).click()

    // Dialog switches to "Link Generated" state
    await expect(page.getByText('Link Generated')).toBeVisible({ timeout: 15_000 })

    const linkInput = page.locator('input[readonly]')
    await expect(linkInput).toBeVisible()
    shareLink = await linkInput.inputValue()
    expect(shareLink).toContain('/onboard/')

    // Save the link for the next test via env or file — use a workaround
    // by storing it on process.env (only works within the same worker)
    process.env.E2E_SHARE_LINK = shareLink
  })

  /**
   * Step 2 — Unauthenticated vendor visits the link and sees the auth wall.
   */
  test('vendor sees auth wall on share link before signing in', async ({ page }) => {
    const link = process.env.E2E_SHARE_LINK
    test.skip(!link, 'Requires prior test to generate the share link')

    await page.goto(link!)
    await expect(page.getByRole('heading', { name: /share request/i })).toBeVisible({ timeout: 10_000 })
    // Auth wall: sign in / sign up tabs should be visible
    await expect(page.getByRole('tab', { name: /sign in/i })).toBeVisible()
  })

  /**
   * Step 3 — Vendor signs in and sees the fulfillment form.
   */
  test('vendor signs in and sees fulfillment form', async ({ page }) => {
    const link = process.env.E2E_SHARE_LINK
    test.skip(!link, 'Requires prior test to generate the share link')

    // Vendor goes directly to login, then to the share link
    await loginAs(page, vendorEmail, vendorPassword)
    await page.goto(link!)

    await expect(page.getByRole('heading', { name: /share request/i })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/information requested|documents requested|share information/i)).toBeVisible()
  })

  /**
   * Step 4 — Vendor submits the fulfillment form.
   */
  test('vendor submits the fulfillment form', async ({ page }) => {
    const link = process.env.E2E_SHARE_LINK
    test.skip(!link, 'Requires prior test to generate the share link')

    await loginAs(page, vendorEmail, vendorPassword)
    await page.goto(link!)
    await page.waitForSelector('text=Share Request')

    // Fill in any visible text inputs in the fulfillment form
    const inputs = page.locator('input[type="text"], input:not([type])')
    const count = await inputs.count()
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i)
      const isReadonly = await input.getAttribute('readonly')
      if (!isReadonly) {
        await input.fill('Test Value')
      }
    }

    const submitBtn = page.getByRole('button', { name: /share information/i })
    await expect(submitBtn).toBeEnabled({ timeout: 5_000 })
    await submitBtn.click()

    // On success: "All Done!" screen
    await expect(page.getByText(/all done/i)).toBeVisible({ timeout: 15_000 })
  })

  /**
   * Step 5 — Admin reviews the completed response in the responses page.
   */
  test('admin sees the completed response in responses page', async ({ page }) => {
    await loginAs(page, adminEmail, adminPassword)
    await page.goto('/admin/responses')

    await expect(page.getByRole('heading', { name: /share responses/i })).toBeVisible()

    // Stats should show at least 1 total response
    const totalCard = page.getByText('Total Responses').locator('..').locator('..')
    await expect(totalCard).toBeVisible()

    // The response list should contain at least one entry
    // Accept any content visible in the card area — vendor email should appear
    await expect(page.getByText(vendorEmail)).toBeVisible({ timeout: 10_000 })
  })
})
