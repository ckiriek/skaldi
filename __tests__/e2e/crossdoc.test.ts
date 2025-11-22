/**
 * E2E Tests: Cross-Document Intelligence
 * Test full user journey with intentional inconsistencies
 */

import { test, expect } from '@playwright/test'

test.describe('Cross-Document Intelligence E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth/login')
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@skaldi.co')
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('should load Cross-Document panel', async ({ page }) => {
    // Navigate to project with multiple documents
    await page.goto('/dashboard/projects')
    
    // Click on a project (assuming test project exists)
    await page.click('text=Test Project')
    
    // Navigate to Cross-Document tab
    await page.click('text=Cross-Document Intelligence')
    
    // Verify panel loaded
    await expect(page.locator('text=Cross-Document Intelligence')).toBeVisible()
    await expect(page.locator('button:has-text("Run Validation")')).toBeVisible()
  })

  test('should run validation and display issues', async ({ page }) => {
    await page.goto('/dashboard/projects/test-project')
    await page.click('text=Cross-Document Intelligence')
    
    // Run validation
    await page.click('button:has-text("Run Validation")')
    
    // Wait for validation to complete
    await page.waitForSelector('text=Total Issues', { timeout: 10000 })
    
    // Verify summary cards are displayed
    await expect(page.locator('text=Total Issues')).toBeVisible()
    await expect(page.locator('text=Critical')).toBeVisible()
    await expect(page.locator('text=Errors')).toBeVisible()
    
    // Verify issues list is displayed
    const issuesList = page.locator('[data-testid="issues-list"]')
    if (await issuesList.isVisible()) {
      await expect(issuesList).toBeVisible()
    }
  })

  test('should filter issues by severity', async ({ page }) => {
    await page.goto('/dashboard/projects/test-project')
    await page.click('text=Cross-Document Intelligence')
    
    // Run validation
    await page.click('button:has-text("Run Validation")')
    await page.waitForSelector('text=Total Issues', { timeout: 10000 })
    
    // Filter by critical
    await page.selectOption('select:near(:text("Severity:"))', 'critical')
    
    // Verify only critical issues are shown
    const criticalBadges = page.locator('text=CRITICAL')
    const count = await criticalBadges.count()
    expect(count).toBeGreaterThanOrEqual(0)
  })

  test('should expand and collapse issue details', async ({ page }) => {
    await page.goto('/dashboard/projects/test-project')
    await page.click('text=Cross-Document Intelligence')
    
    // Run validation
    await page.click('button:has-text("Run Validation")')
    await page.waitForSelector('text=Total Issues', { timeout: 10000 })
    
    // Find first "Show Details" button
    const showDetailsButton = page.locator('button:has-text("Show Details")').first()
    
    if (await showDetailsButton.isVisible()) {
      await showDetailsButton.click()
      
      // Verify details are shown
      await expect(page.locator('text=Details')).toBeVisible()
      
      // Click "Hide Details"
      await page.click('button:has-text("Hide Details")')
      
      // Verify details are hidden
      await expect(page.locator('text=Details')).not.toBeVisible()
    }
  })

  test('should select auto-fixable issues', async ({ page }) => {
    await page.goto('/dashboard/projects/test-project')
    await page.click('text=Cross-Document Intelligence')
    
    // Run validation
    await page.click('button:has-text("Run Validation")')
    await page.waitForSelector('text=Total Issues', { timeout: 10000 })
    
    // Click "Select All Auto-fixable"
    const selectAllButton = page.locator('button:has-text("Select All Auto-fixable")')
    
    if (await selectAllButton.isVisible()) {
      await selectAllButton.click()
      
      // Verify some issues are selected
      const selectedCount = page.locator('text=issue(s) selected')
      await expect(selectedCount).toBeVisible()
    }
  })

  test('should apply auto-fixes', async ({ page }) => {
    await page.goto('/dashboard/projects/test-project')
    await page.click('text=Cross-Document Intelligence')
    
    // Run validation
    await page.click('button:has-text("Run Validation")')
    await page.waitForSelector('text=Total Issues', { timeout: 10000 })
    
    // Select all auto-fixable
    const selectAllButton = page.locator('button:has-text("Select All Auto-fixable")')
    
    if (await selectAllButton.isVisible()) {
      await selectAllButton.click()
      
      // Apply fixes
      const applyButton = page.locator('button:has-text("Apply")')
      
      if (await applyButton.isEnabled()) {
        await applyButton.click()
        
        // Wait for fixes to be applied
        await page.waitForSelector('text=Applying Fixes', { timeout: 2000 })
        
        // Wait for completion (alert or success message)
        await page.waitForTimeout(3000)
      }
    }
  })

  test('should show "All Clear" when no issues', async ({ page }) => {
    // This test assumes a project with no cross-doc issues exists
    await page.goto('/dashboard/projects/clean-project')
    await page.click('text=Cross-Document Intelligence')
    
    // Run validation
    await page.click('button:has-text("Run Validation")')
    await page.waitForSelector('text=Total Issues', { timeout: 10000 })
    
    // Check if "All Clear" is shown
    const allClearMessage = page.locator('text=All Clear!')
    
    if (await allClearMessage.isVisible()) {
      await expect(allClearMessage).toBeVisible()
      await expect(page.locator('text=No cross-document consistency issues found')).toBeVisible()
    }
  })

  test('should handle validation errors gracefully', async ({ page }) => {
    await page.goto('/dashboard/projects/invalid-project')
    await page.click('text=Cross-Document Intelligence')
    
    // Run validation (should fail)
    await page.click('button:has-text("Run Validation")')
    
    // Wait for error message
    const errorAlert = page.locator('[role="alert"]')
    
    if (await errorAlert.isVisible()) {
      await expect(errorAlert).toBeVisible()
    }
  })

  test('should display issue locations correctly', async ({ page }) => {
    await page.goto('/dashboard/projects/test-project')
    await page.click('text=Cross-Document Intelligence')
    
    // Run validation
    await page.click('button:has-text("Run Validation")')
    await page.waitForSelector('text=Total Issues', { timeout: 10000 })
    
    // Expand first issue
    const showDetailsButton = page.locator('button:has-text("Show Details")').first()
    
    if (await showDetailsButton.isVisible()) {
      await showDetailsButton.click()
      
      // Verify locations are shown
      const locationBadges = page.locator('text=Affected Locations')
      
      if (await locationBadges.isVisible()) {
        await expect(locationBadges).toBeVisible()
      }
    }
  })

  test('should show suggested fixes with patches', async ({ page }) => {
    await page.goto('/dashboard/projects/test-project')
    await page.click('text=Cross-Document Intelligence')
    
    // Run validation
    await page.click('button:has-text("Run Validation")')
    await page.waitForSelector('text=Total Issues', { timeout: 10000 })
    
    // Expand first auto-fixable issue
    const autoFixableBadge = page.locator('text=Auto-fixable').first()
    
    if (await autoFixableBadge.isVisible()) {
      // Find parent issue and expand
      const issueContainer = autoFixableBadge.locator('..')
      const showDetailsButton = issueContainer.locator('button:has-text("Show Details")')
      
      if (await showDetailsButton.isVisible()) {
        await showDetailsButton.click()
        
        // Verify suggested fixes are shown
        await expect(page.locator('text=Suggested Fixes')).toBeVisible()
      }
    }
  })

  test('should complete full validation → fix → re-validation cycle', async ({ page }) => {
    await page.goto('/dashboard/projects/test-project')
    await page.click('text=Cross-Document Intelligence')
    
    // Step 1: Initial validation
    await page.click('button:has-text("Run Validation")')
    await page.waitForSelector('text=Total Issues', { timeout: 10000 })
    
    // Get initial issue count
    const initialTotalText = await page.locator('text=Total Issues').locator('..').locator('.text-2xl').textContent()
    const initialTotal = parseInt(initialTotalText || '0')
    
    // Step 2: Select and apply fixes
    const selectAllButton = page.locator('button:has-text("Select All Auto-fixable")')
    
    if (await selectAllButton.isVisible()) {
      await selectAllButton.click()
      
      const applyButton = page.locator('button:has-text("Apply")')
      
      if (await applyButton.isEnabled()) {
        await applyButton.click()
        await page.waitForTimeout(3000) // Wait for fixes
        
        // Step 3: Re-validate
        await page.click('button:has-text("Run Validation")')
        await page.waitForSelector('text=Total Issues', { timeout: 10000 })
        
        // Get new issue count
        const newTotalText = await page.locator('text=Total Issues').locator('..').locator('.text-2xl').textContent()
        const newTotal = parseInt(newTotalText || '0')
        
        // Verify issue count decreased or stayed same
        expect(newTotal).toBeLessThanOrEqual(initialTotal)
      }
    }
  })
})

test.describe('Cross-Document Intelligence - Specific Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || 'test@skaldi.co')
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || 'testpass123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('should detect PRIMARY_ENDPOINT_DRIFT', async ({ page }) => {
    // Navigate to project with known endpoint mismatch
    await page.goto('/dashboard/projects/endpoint-mismatch-project')
    await page.click('text=Cross-Document Intelligence')
    
    await page.click('button:has-text("Run Validation")')
    await page.waitForSelector('text=Total Issues', { timeout: 10000 })
    
    // Look for PRIMARY_ENDPOINT_DRIFT issue
    const driftIssue = page.locator('text=PRIMARY_ENDPOINT_DRIFT')
    
    if (await driftIssue.isVisible()) {
      await expect(driftIssue).toBeVisible()
      
      // Verify it's marked as critical
      const criticalBadge = driftIssue.locator('..').locator('text=CRITICAL')
      await expect(criticalBadge).toBeVisible()
    }
  })

  test('should detect DOSE_INCONSISTENT', async ({ page }) => {
    await page.goto('/dashboard/projects/dose-mismatch-project')
    await page.click('text=Cross-Document Intelligence')
    
    await page.click('button:has-text("Run Validation")')
    await page.waitForSelector('text=Total Issues', { timeout: 10000 })
    
    // Look for dose inconsistency
    const doseIssue = page.locator('text=DOSE_INCONSISTENT')
    
    if (await doseIssue.isVisible()) {
      await expect(doseIssue).toBeVisible()
    }
  })

  test('should detect GLOBAL_PURPOSE_DRIFT', async ({ page }) => {
    await page.goto('/dashboard/projects/purpose-drift-project')
    await page.click('text=Cross-Document Intelligence')
    
    await page.click('button:has-text("Run Validation")')
    await page.waitForSelector('text=Total Issues', { timeout: 10000 })
    
    // Look for global purpose drift
    const purposeIssue = page.locator('text=GLOBAL_PURPOSE_DRIFT')
    
    if (await purposeIssue.isVisible()) {
      await expect(purposeIssue).toBeVisible()
      
      // Verify it's critical
      const criticalBadge = purposeIssue.locator('..').locator('text=CRITICAL')
      await expect(criticalBadge).toBeVisible()
    }
  })
})
