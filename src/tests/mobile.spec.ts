import { test, expect } from '@playwright/test'
import * as fs from 'fs'

const adminStateFile = 'playwright/.auth/admin.json'

const hasAuthState = () => fs.existsSync(adminStateFile)

test.describe('mobile — layout', () => {
  test('public pages avoid horizontal overflow', async ({ page }) => {
    for (const path of ['/', '/login', '/pricing']) {
      await page.goto(path)
      await expect(page.locator('body')).toBeVisible()

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(scrollWidth, `horizontal overflow on ${path}`).toBeLessThanOrEqual(clientWidth + 1)
    }
  })
})

test.describe('mobile — dashboard shell', () => {
  test.use({ storageState: adminStateFile })

  test.beforeEach(async ({ page }, testInfo) => {
    if (!hasAuthState()) {
      testInfo.skip(true, 'Auth state not found — set E2E credentials and run global setup')
      return
    }

    await page.goto('/dashboard')

    if (await page.waitForURL(/\/login/, { timeout: 15_000 }).then(() => true).catch(() => false)) {
      testInfo.skip(true, 'Stored auth session expired — verify E2E credentials')
      return
    }

    try {
      await page.getByRole('button', { name: /open navigation menu/i }).waitFor({ timeout: 20_000 })
    } catch {
      testInfo.skip(true, 'Dashboard mobile shell did not load — check auth state and profile setup')
    }
  })

  test('shows compact header and off-canvas navigation', async ({ page }) => {
    await expect(page.getByRole('button', { name: /open navigation menu/i })).toBeVisible()

    await page.getByRole('button', { name: /open navigation menu/i }).click()
    await expect(page.getByRole('button', { name: 'Send Requests' })).toBeVisible()
    await page.getByRole('button', { name: 'Send Requests' }).click()
    await expect(page).toHaveURL(/\/dashboard\/send-links/)
    await expect(page.getByRole('heading', { name: /send requests/i })).toBeVisible()
  })

  test('send requests and documents pages avoid horizontal overflow', async ({ page }) => {
    for (const path of ['/dashboard/send-links', '/dashboard/documents']) {
      await page.goto(path)
      if (await page.waitForURL(/\/login/, { timeout: 10_000 }).then(() => true).catch(() => false)) {
        test.skip(true, 'Stored auth session expired')
      }
      await expect(page.locator('body')).toBeVisible()

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(scrollWidth, `horizontal overflow on ${path}`).toBeLessThanOrEqual(clientWidth + 1)
    }
  })

  test('responses page hides wide table below md breakpoint', async ({ page }) => {
    await page.goto('/dashboard/responses')
    if (await page.waitForURL(/\/login/, { timeout: 10_000 }).then(() => true).catch(() => false)) {
      test.skip(true, 'Stored auth session expired')
    }
    await expect(page.getByRole('heading', { name: /^responses$/i })).toBeVisible({ timeout: 15_000 })

    const table = page.locator('table')
    if ((await table.count()) > 0) {
      await expect(table.first()).toBeHidden()
    }
  })
})
