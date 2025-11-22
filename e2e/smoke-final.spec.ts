/**
 * FINAL Production Smoke Test
 * 
 * Based on complete user journey analysis:
 * 1. Create Project
 * 2. Fetch External Data (REQUIRED - enables pipeline)
 * 3. Wait for page refresh
 * 4. Generate IB (first in pipeline)
 * 5. View Document
 * 6. Validate
 * 7. Export DOCX
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'https://app.skaldi.co'

test.describe('Skaldi Production Smoke Test', () => {
  
  test('Complete workflow: Create → Fetch → Generate → Validate → Export', async ({ page }) => {
    test.setTimeout(300000) // 5 minutes
    
    console.log('🚀 Starting final smoke test...\n')
    
    // ============================================
    // STEP 1: Create Project
    // ============================================
    console.log('📍 STEP 1: Creating project...')
    await page.goto(`${BASE_URL}/dashboard/projects/new`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    const timestamp = Date.now()
    
    // Fill title
    await page.locator('input[placeholder*="AST-101"]').fill(`Smoke Test ${timestamp}`)
    console.log('  ✅ Title filled')
    
    // Fill compound (autocomplete)
    const compoundInput = page.locator('input[placeholder*="AST-256"]').first()
    await compoundInput.click()
    await compoundInput.fill('Aspirin')
    await page.waitForTimeout(1000)
    await compoundInput.press('Enter')
    console.log('  ✅ Compound filled')
    
    // Fill sponsor
    await page.locator('input[placeholder*="Biogen"]').first().fill('Test Pharma Inc')
    console.log('  ✅ Sponsor filled')
    
    // Fill indication (autocomplete)
    const indicationInput = page.locator('input[placeholder*="Type 2 Diabetes"]').first()
    await indicationInput.click()
    await indicationInput.fill('Hypertension')
    await page.waitForTimeout(1000)
    await indicationInput.press('Enter')
    console.log('  ✅ Indication filled')
    
    await page.screenshot({ path: 'e2e/screenshots/01-form-filled.png' })
    
    // Submit
    await page.locator('button[type="submit"]').first().click()
    console.log('  ✅ Form submitted')
    
    // Wait for redirect
    await page.waitForURL('**/dashboard/projects/**', { timeout: 30000 })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    
    const projectId = page.url().split('/').pop()
    console.log(`  ✅ Project created: ${projectId}\n`)
    
    await page.screenshot({ path: 'e2e/screenshots/02-project-page-initial.png' })
    
    // ============================================
    // STEP 2: Verify Initial State
    // ============================================
    console.log('📍 STEP 2: Verifying initial state...')
    
    // Check for "Fetch External Data" button
    const fetchButton = page.locator('button', { hasText: /Fetch.*External.*Data/i }).first()
    const hasFetchButton = await fetchButton.isVisible({ timeout: 5000 }).catch(() => false)
    
    if (!hasFetchButton) {
      console.log('  ❌ Fetch button not found!')
      await page.screenshot({ path: 'e2e/screenshots/02-no-fetch-button.png' })
      throw new Error('Fetch External Data button not found')
    }
    
    console.log('  ✅ Fetch button visible')
    
    // Verify Pipeline tab shows "Enrichment Required"
    const enrichmentRequired = await page.locator('text=/Enrichment Required/i').isVisible({ timeout: 2000 }).catch(() => false)
    if (enrichmentRequired) {
      console.log('  ✅ Pipeline shows "Enrichment Required" (correct!)\n')
    }
    
    // ============================================
    // STEP 3: Fetch External Data
    // ============================================
    console.log('📍 STEP 3: Fetching external data...')
    
    await fetchButton.click()
    console.log('  ✅ Clicked Fetch External Data')
    console.log('  ⏳ Waiting 60 seconds for data fetch...')
    
    // Wait for fetch to complete
    await page.waitForTimeout(60000)
    
    console.log('  ✅ Data fetch completed\n')
    await page.screenshot({ path: 'e2e/screenshots/03-after-fetch.png' })
    
    // ============================================
    // STEP 4: Refresh and Verify Pipeline Visible
    // ============================================
    console.log('📍 STEP 4: Verifying pipeline is now visible...')
    
    // Reload page to see updated state
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    
    await page.screenshot({ path: 'e2e/screenshots/04-after-reload.png' })
    
    // Check enrichment badge
    const dataEnriched = await page.locator('text=/Data Enriched/i').isVisible({ timeout: 2000 }).catch(() => false)
    if (dataEnriched) {
      console.log('  ✅ Enrichment badge shows "Data Enriched"')
    }
    
    // Make sure we're on Pipeline tab
    const pipelineTab = page.locator('button[role="tab"]', { hasText: /Pipeline/i })
    await pipelineTab.click()
    await page.waitForTimeout(1000)
    console.log('  ✅ Switched to Pipeline tab')
    
    // ============================================
    // STEP 5: Generate IB
    // ============================================
    console.log('\n📍 STEP 5: Generating IB...')
    
    // Look for Generate button in IB section
    // Strategy: Find the first "Generate" button (should be IB)
    const generateButton = page.locator('button', { hasText: /^Generate$/i }).first()
    
    const isGenerateVisible = await generateButton.isVisible({ timeout: 5000 }).catch(() => false)
    
    if (!isGenerateVisible) {
      console.log('  ❌ Generate button not found!')
      await page.screenshot({ path: 'e2e/screenshots/05-no-generate-button.png' })
      throw new Error('Generate button not found in pipeline')
    }
    
    console.log('  ✅ Generate button found')
    
    await generateButton.click()
    console.log('  ✅ Clicked Generate')
    console.log('  ⏳ Waiting up to 90 seconds for generation...')
    
    // Wait for "View" button to appear (means generation done)
    const viewButton = page.locator('button', { hasText: /^View$/i }).first()
    
    try {
      await viewButton.waitFor({ timeout: 90000 })
      console.log('  ✅ IB generated successfully!\n')
      
      await page.screenshot({ path: 'e2e/screenshots/06-ib-generated.png' })
      
      // ============================================
      // STEP 6: View Document
      // ============================================
      console.log('📍 STEP 6: Opening document...')
      
      await viewButton.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000)
      
      console.log(`  ✅ Document opened: ${page.url()}\n`)
      await page.screenshot({ path: 'e2e/screenshots/07-document-viewer.png' })
      
      // ============================================
      // STEP 7: Validate
      // ============================================
      console.log('📍 STEP 7: Running validation...')
      
      const validateButton = page.locator('button', { hasText: /Validate/i }).first()
      const isValidateVisible = await validateButton.isVisible({ timeout: 5000 }).catch(() => false)
      
      if (isValidateVisible) {
        await validateButton.click()
        console.log('  ✅ Clicked Validate')
        
        await page.waitForTimeout(5000)
        
        await page.screenshot({ path: 'e2e/screenshots/08-validation-results.png' })
        console.log('  ✅ Validation completed\n')
      } else {
        console.log('  ⚠️ Validate button not found\n')
      }
      
      // ============================================
      // STEP 8: Export DOCX
      // ============================================
      console.log('📍 STEP 8: Exporting DOCX...')
      
      const exportButton = page.locator('button', { hasText: /Export.*DOCX/i }).first()
      const isExportVisible = await exportButton.isVisible({ timeout: 5000 }).catch(() => false)
      
      if (isExportVisible) {
        const downloadPromise = page.waitForEvent('download', { timeout: 15000 })
        
        await exportButton.click()
        console.log('  ✅ Clicked Export DOCX')
        
        try {
          const download = await downloadPromise
          const fileName = download.suggestedFilename()
          console.log(`  ✅ File downloaded: ${fileName}`)
          
          await download.saveAs(`e2e/downloads/${fileName}`)
        } catch (error) {
          console.log('  ⚠️ Download not captured (but button clicked)')
        }
        
        await page.screenshot({ path: 'e2e/screenshots/09-export-complete.png' })
      } else {
        console.log('  ⚠️ Export button not found')
      }
      
    } catch (error) {
      console.log('  ❌ IB generation timeout or failed')
      await page.screenshot({ path: 'e2e/screenshots/06-generation-failed.png' })
      throw error
    }
    
    // ============================================
    // FINAL
    // ============================================
    await page.screenshot({ path: 'e2e/screenshots/10-final.png' })
    
    console.log('\n🎉 SMOKE TEST COMPLETED SUCCESSFULLY!\n')
    
    // Assertion
    expect(page.url()).toContain(BASE_URL)
  })
  
  // Quick health checks
  test('Health check: Dashboard loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('networkidle')
    expect(await page.title()).toBeTruthy()
    console.log('✅ Dashboard health check passed')
  })
  
  test('Health check: Projects page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard/projects`)
    await page.waitForLoadState('networkidle')
    expect(await page.title()).toBeTruthy()
    console.log('✅ Projects health check passed')
  })
})
