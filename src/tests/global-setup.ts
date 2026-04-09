import { chromium, FullConfig, Page } from '@playwright/test'
import { config } from 'dotenv'
import * as fs from 'fs'
import path from 'path'

config({ path: path.resolve(process.cwd(), '.env.local') })

/**
 * Global setup — authenticates admin and vendor once, saves storage state.
 * Tests reference these state files instead of logging in on every run.
 */
async function globalSetup(_config: FullConfig) {
  const adminEmail = process.env.E2E_ADMIN_EMAIL
  const adminPassword = process.env.E2E_ADMIN_PASSWORD
  const vendorEmail = process.env.E2E_VENDOR_EMAIL
  const vendorPassword = process.env.E2E_VENDOR_PASSWORD

  if (!adminEmail || !adminPassword || !vendorEmail || !vendorPassword) {
    console.log('Skipping auth setup — E2E credentials not set')
    return
  }

  fs.mkdirSync('playwright/.auth', { recursive: true })

  const browser = await chromium.launch()

  /** Wait for a post-login UI signal across supported auth flows. */
  async function waitForPostLogin(page: Page): Promise<void> {
    const timeout = 20_000
    await Promise.any([
      page.getByRole('heading', { name: 'Complete Your Company Profile' })
        .waitFor({ state: 'visible', timeout }),
      page.getByRole('heading', { name: 'Share Request' })
        .waitFor({ state: 'visible', timeout }),
      page.getByRole('heading', { name: /welcome back/i })
        .waitFor({ state: 'visible', timeout }),
      page.getByRole('button', { name: 'Send Share Request' })
        .waitFor({ state: 'visible', timeout }),
      page.getByText('Your Share Requests')
        .waitFor({ state: 'visible', timeout }),
    ])
  }

  /** Log in as a user and save storage state to the given file path. */
  async function saveAuthState(email: string, password: string, stateFile: string) {
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto('http://localhost:3000/login')
    await page.waitForSelector('text=Welcome to Ramply', { timeout: 15_000 })
    await page.locator('[role="tab"]', { hasText: 'Sign In' }).click()
    await page.locator('#signin-email').fill(email)
    await page.locator('#signin-password').fill(password)
    await page.locator('form').filter({ has: page.locator('#signin-email') })
      .getByRole('button', { name: /sign in/i })
      .click()

    // Wait for redirect away from login
    await page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 30_000 })

    // Wait for auth context to fully hydrate before saving cookies
    await waitForPostLogin(page)

    await context.storageState({ path: stateFile })
    await context.close()
    console.log(`Saved auth state for ${email} → ${stateFile}`)
  }

  await saveAuthState(adminEmail, adminPassword, 'playwright/.auth/admin.json')
  await saveAuthState(vendorEmail, vendorPassword, 'playwright/.auth/vendor.json')

  await browser.close()
}

export default globalSetup
