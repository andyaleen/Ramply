import { test, expect } from '@playwright/test'
import * as fs from 'fs'

const adminEmail = process.env.E2E_ADMIN_EMAIL ?? ''
const vendorEmail = process.env.E2E_VENDOR_EMAIL ?? ''

const adminStateFile = 'playwright/.auth/admin.json'
const vendorStateFile = 'playwright/.auth/vendor.json'

const hasCredentials = () =>
  Boolean(adminEmail && process.env.E2E_ADMIN_PASSWORD && vendorEmail && process.env.E2E_VENDOR_PASSWORD)

const hasAuthState = () =>
  fs.existsSync(adminStateFile) && fs.existsSync(vendorStateFile)

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
 * Uses storageState from global-setup for pre-authenticated sessions.
 */
test.describe('share request — full flow', () => {
  test.describe.configure({ mode: 'serial' })
  test.skip(!hasCredentials(), 'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, E2E_VENDOR_EMAIL, E2E_VENDOR_PASSWORD to run')

  let shareLink: string

  /**
   * Step 1 — Admin creates a share request and copies the generated link.
   */
  test('admin creates a share request and receives a link', async ({ browser }) => {
    test.skip(!hasAuthState(), 'Auth state not found — global setup may have failed')

    const context = await browser.newContext({ storageState: adminStateFile })
    const page = await context.newPage()

    await page.goto('/dashboard/send-links')
    await expect(page.getByRole('heading', { name: /send share requests/i })).toBeVisible({ timeout: 20_000 })

    await page.getByRole('button', { name: /new request/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('New Share Request')).toBeVisible()

    // Fill in recipient email
    await page.getByPlaceholder(/vendor@company\.com/i).fill(vendorEmail)

    // Mark "Legal Business Name" as Required.
    // Radix Checkbox renders as button[role="checkbox"] — must click the button directly.
    await page.locator('span', { hasText: 'Legal Business Name' })
      .locator('xpath=..')
      .getByRole('checkbox')
      .first()
      .click()

    await page.getByRole('button', { name: /create & send/i }).click()

    // Dialog switches to "Link Generated" state
    await expect(page.getByText('Link Generated')).toBeVisible({ timeout: 20_000 })

    const linkInput = page.locator('input[readonly]')
    await expect(linkInput).toBeVisible()
    shareLink = await linkInput.inputValue()
    expect(shareLink).toContain('/onboard/')

    // Pass the link to subsequent tests via process.env (single worker only)
    process.env.E2E_SHARE_LINK = shareLink

    await context.close()
  })

  /**
   * Step 2 — Unauthenticated vendor visits the link and sees the auth wall.
   */
  test('vendor sees auth wall on share link before signing in', async ({ page }) => {
    const link = process.env.E2E_SHARE_LINK
    test.skip(!link, 'Requires prior test to generate the share link')

    await page.goto(link!)
    await expect(page.getByRole('heading', { name: /share request/i })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('tab', { name: /sign in/i })).toBeVisible()
  })

  /**
   * Step 3 — Vendor signs in and sees the fulfillment form.
   */
  test('vendor signs in and sees fulfillment form', async ({ browser }) => {
    const link = process.env.E2E_SHARE_LINK
    test.skip(!link, 'Requires prior test to generate the share link')
    test.skip(!hasAuthState(), 'Auth state not found — global setup may have failed')

    const context = await browser.newContext({ storageState: vendorStateFile })
    const page = await context.newPage()

    await page.goto(link!)
    await expect(page.getByRole('heading', { name: /share request/i })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('heading', { name: /information requested|documents requested/i })).toBeVisible()

    await context.close()
  })

  /**
   * Step 4 — Vendor submits the fulfillment form.
   */
  test('vendor submits the fulfillment form', async ({ browser }) => {
    const link = process.env.E2E_SHARE_LINK
    test.skip(!link, 'Requires prior test to generate the share link')
    test.skip(!hasAuthState(), 'Auth state not found — global setup may have failed')

    const context = await browser.newContext({ storageState: vendorStateFile })
    const page = await context.newPage()

    await page.goto(link!)
    await page.waitForSelector('text=Share Request', { timeout: 15_000 })

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

    await expect(page.getByText(/all done/i)).toBeVisible({ timeout: 15_000 })

    await context.close()
  })

  /**
   * Step 5 — Admin reviews the completed response in the responses page.
   */
  test('admin sees the completed response in responses page', async ({ browser }) => {
    test.skip(!hasAuthState(), 'Auth state not found — global setup may have failed')

    const context = await browser.newContext({ storageState: adminStateFile })
    const page = await context.newPage()

    await page.goto('/dashboard/responses')
    await expect(page.getByRole('heading', { name: /share responses/i })).toBeVisible({ timeout: 20_000 })

    await expect(page.getByText('Total Responses').locator('..').locator('..')).toBeVisible()
    await expect(page.getByText(vendorEmail).first()).toBeVisible({ timeout: 10_000 })

    await context.close()
  })
})
