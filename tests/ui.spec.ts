import { test, expect } from '@playwright/test'

test.describe('CardioFlow UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for the app to load
    await page.waitForSelector('.app-shell', { timeout: 10000 })
  })

  test('should not have duplicate UI elements', async ({ page }) => {
    // Check that there's only one header
    const headers = await page.locator('.app-header').count()
    expect(headers).toBe(1)

    // Check that there's only one bottom nav
    const bottomNavs = await page.locator('.bottom-nav').count()
    expect(bottomNavs).toBe(1)

    // Check that timer view is not duplicated
    const timerViews = await page.locator('.timer-view').count()
    expect(timerViews).toBeLessThanOrEqual(1)

    // Check that history view is not duplicated
    const historyViews = await page.locator('.history-view').count()
    expect(historyViews).toBeLessThanOrEqual(1)

    // Verify only one view is visible at a time
    const visibleTimerView = await page.locator('.timer-view:visible').count()
    const visibleHistoryView = await page.locator('.history-view:visible').count()

    // Only one should be visible (or none if transitioning)
    expect(visibleTimerView + visibleHistoryView).toBeLessThanOrEqual(1)
  })

  test('should switch between Timer and History tabs', async ({ page }) => {
    // Initially on Timer tab
    await expect(page.locator('.timer-view')).toBeVisible()
    await expect(page.locator('.history-view')).toBeHidden()

    // Click History tab
    await page.locator('.nav-item:has-text("History")').click()
    await page.waitForTimeout(300)

    // Now History should be visible, Timer hidden
    await expect(page.locator('.history-view')).toBeVisible()
    await expect(page.locator('.timer-view')).toBeHidden()

    // Click Timer tab
    await page.locator('.nav-item:has-text("Timer")').click()
    await page.waitForTimeout(300)

    // Now Timer should be visible, History hidden
    await expect(page.locator('.timer-view')).toBeVisible()
    await expect(page.locator('.history-view')).toBeHidden()
  })

  test('should show history when data exists', async ({ page }) => {
    // Add some test data to localStorage before navigating
    const testSession = {
      id: 'test-123',
      name: 'Test Workout',
      date: new Date().toISOString(),
      time: '10:00',
      rounds: 5,
      duration: '15:30',
      status: 'completed',
      note: 'Test note'
    }

    await page.evaluate((session) => {
      localStorage.setItem('cardioflow-history', JSON.stringify([session]))
    }, testSession)

    // Navigate to History tab
    await page.locator('.nav-item:has-text("History")').click()
    await page.waitForTimeout(500)

    // Check that session list is visible
    await expect(page.locator('.session-list')).toBeVisible()

    // Check that the test session is displayed
    await expect(page.locator('.session-card:has-text("Test Workout")')).toBeVisible()
    await expect(page.locator('.session-card:has-text("5 rounds")')).toBeVisible()
  })

  test('should show empty state when no history', async ({ page }) => {
    // Clear localStorage
    await page.evaluate(() => {
      localStorage.removeItem('cardioflow-history')
    })

    // Reload to apply changes
    await page.reload()
    await page.waitForSelector('.app-shell', { timeout: 10000 })

    // Navigate to History tab
    await page.locator('.nav-item:has-text("History")').click()
    await page.waitForTimeout(500)

    // Check empty state is shown
    await expect(page.locator('.empty-state')).toBeVisible()
    await expect(page.locator('.empty-text:has-text("No workouts yet")')).toBeVisible()
  })

  test('should not show both views simultaneously', async ({ page }) => {
    // Take screenshot of initial state
    await page.screenshot({ path: 'test-results/timer-view.png' })

    // Switch to History
    await page.locator('.nav-item:has-text("History")').click()
    await page.waitForTimeout(300)

    // Take screenshot of History view
    await page.screenshot({ path: 'test-results/history-view.png' })

    // Verify no timer elements are visible in history view
    const timerElements = await page.locator('.timer-view:visible').count()
    expect(timerElements).toBe(0)

    // Switch back to Timer
    await page.locator('.nav-item:has-text("Timer")').click()
    await page.waitForTimeout(300)

    // Verify no history elements are visible in timer view
    const historyElements = await page.locator('.history-view:visible').count()
    expect(historyElements).toBe(0)
  })
})
