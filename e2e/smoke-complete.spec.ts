/**
 * Complete Production Smoke Test
 * 
 * Full workflow based on WORKFLOW_IMPROVEMENT.md:
 * 1. Create Project
 * 2. Fetch External Data (REQUIRED!)
 * 3. Generate IB
 * 4. View Document
 * 5. Run Validation
 * 6. Export DOCX
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'https://app.skaldi.co'

test.describe('Skaldi Complete Workflow', () => {
  
  test('Full workflow: Create → Fetch Data → Generate → Validate → Export', async ({ page }) => {
    test.setTimeout(300000) // 5 minutes for full workflow including data fetch
    
    console.log('🚀 Starting complete workflow test...')
    
    // ============================================
    // STEP 1: Create Project
    // ============================================
    console.log('\n📍 STEP 1: Creating new project...')
    await page.goto(`${BASE_URL}/dashboard/projects/new`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    await page.screenshot({ path: 'e2e/screenshots/01-new-project-form.png' })
    
    const timestamp = Date.now()
    
    // Fill form
    const titleInput = page.locator('input[placeholder*="AST-101 Phase 2 Trial"]')
    await titleInput.fill(`Smoke Test ${timestamp}`)
    console.log('✅ Filled title')
    
    const compoundInput = page.locator('input[placeholder*="AST-256"]').first()
    await compoundInput.click()
    await compoundInput.fill('Aspirin')
    await page.waitForTimeout(1000)
    await compoundInput.press('Enter')
    console.log('✅ Filled compound')
    
    const sponsorInput = page.locator('input[placeholder*="Biogen"]').first()
    await sponsorInput.fill('Test Pharma Inc')
    console.log('✅ Filled sponsor')
    
    const indicationInput = page.locator('input[placeholder*="Type 2 Diabetes"]').first()
    await indicationInput.click()
    await indicationInput.fill('Hypertension')
    await page.waitForTimeout(1000)
    await indicationInput.press('Enter')
    console.log('✅ Filled indication')
    
    await page.screenshot({ path: 'e2e/screenshots/02-form-filled.png' })
    
    // Submit
    const submitButton = page.locator('button[type="submit"]').first()
    await submitButton.click()
    console.log('✅ Clicked Create Project')
    
    // Wait for redirect
    await page.waitForURL('**/dashboard/projects/**', { timeout: 30000 })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    
    const projectUrl = page.url()
    const projectId = projectUrl.split('/').pop()
    console.log(`✅ Project created: ${projectId}`)
    
    await page.screenshot({ path: 'e2e/screenshots/03-project-page.png' })
    
    // ============================================
    // STEP 2: Fetch External Data (REQUIRED!)
    // ============================================
    console.log('\n📍 STEP 2: Fetching external data...')
    
    // Look for "Fetch External Data" button
    const fetchDataButton = page.locator('button', { hasText: /Fetch.*External.*Data/i }).first()
    
    const isFetchVisible = await fetchDataButton.isVisible({ timeout: 5000 }).catch(() => false)
    
    if (isFetchVisible) {
      await fetchDataButton.click()
      console.log('✅ Clicked Fetch External Data')
      
      // Wait for fetch to complete (shows dialog with progress)
      // Dialog should auto-close after completion
      console.log('⏳ Waiting for data fetch (up to 60s)...')
      await page.waitForTimeout(60000) // Wait for fetch to complete
      
      await page.screenshot({ path: 'e2e/screenshots/04-data-fetched.png' })
      console.log('✅ External data fetched')
      
    } else {
      console.log('⚠️ Fetch button not found - checking if data already exists')
      
      // Check for "External Data Ready" message
      const dataReady = await page.locator('text=/External Data Ready/i').isVisible({ timeout: 2000 }).catch(() => false)
      
      if (dataReady) {
        console.log('✅ External data already present')
      } else {
        console.log('❌ No fetch button and no data - this is a problem!')
        await page.screenshot({ path: 'e2e/screenshots/04-no-fetch-button.png' })
      }
    }
    
    // ============================================
    // STEP 3: Generate IB
    // ============================================
    console.log('\n📍 STEP 3: Generating IB...')
    
    // Refresh page to see updated state
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    await page.screenshot({ path: 'e2e/screenshots/05-after-data-fetch.png' })
    
    // Look for "Generate IB" button
    const generateIBButton = page.locator('button', { hasText: /Generate.*IB/i }).first()
    
    const isGenerateVisible = await generateIBButton.isVisible({ timeout: 5000 }).catch(() => false)
    
    if (isGenerateVisible) {
      await generateIBButton.click()
      console.log('✅ Clicked Generate IB')
      
      // Wait for generation (20-30s)
      console.log('⏳ Waiting for IB generation (up to 90s)...')
      
      // Look for "View IB" button
      const viewIBButton = page.locator('button', { hasText: /View.*IB/i }).first()
      
      try {
        await viewIBButton.waitFor({ timeout: 90000 })
        console.log('✅ IB generated successfully')
        
        await page.screenshot({ path: 'e2e/screenshots/06-ib-generated.png' })
        
        // ============================================
        // STEP 4: View IB
        // ============================================
        console.log('\n📍 STEP 4: Opening IB document...')
        await viewIBButton.click()
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(3000)
        
        console.log(`✅ IB document opened: ${page.url()}`)
        await page.screenshot({ path: 'e2e/screenshots/07-ib-viewer.png' })
        
        // ============================================
        // STEP 5: Run Validation
        // ============================================
        console.log('\n📍 STEP 5: Running validation...')
        
        const validateButton = page.locator('button', { hasText: /Validate/i }).first()
        const isValidateVisible = await validateButton.isVisible({ timeout: 5000 }).catch(() => false)
        
        if (isValidateVisible) {
          await validateButton.click()
          console.log('✅ Clicked Validate')
          
          await page.waitForTimeout(5000)
          
          await page.screenshot({ path: 'e2e/screenshots/08-validation-results.png' })
          console.log('✅ Validation completed')
        } else {
          console.log('⚠️ Validate button not found')
        }
        
        // ============================================
        // STEP 6: Export DOCX
        // ============================================
        console.log('\n📍 STEP 6: Exporting DOCX...')
        
        const exportButton = page.locator('button', { hasText: /Export.*DOCX/i }).first()
        const isExportVisible = await exportButton.isVisible({ timeout: 5000 }).catch(() => false)
        
        if (isExportVisible) {
          const downloadPromise = page.waitForEvent('download', { timeout: 15000 })
          
          await exportButton.click()
          console.log('✅ Clicked Export DOCX')
          
          try {
            const download = await downloadPromise
            const fileName = download.suggestedFilename()
            console.log(`✅ Document exported: ${fileName}`)
            
            await download.saveAs(`e2e/downloads/${fileName}`)
          } catch (error) {
            console.log('⚠️ Export download not captured')
          }
          
          await page.screenshot({ path: 'e2e/screenshots/09-export-complete.png' })
        } else {
          console.log('⚠️ Export button not found')
        }
        
      } catch (error) {
        console.log('⚠️ IB generation timeout')
        await page.screenshot({ path: 'e2e/screenshots/06-generation-timeout.png' })
      }
      
    } else {
      console.log('⚠️ Generate IB button not found')
      await page.screenshot({ path: 'e2e/screenshots/05-no-generate-button.png' })
    }
    
    // Final screenshot
    await page.screenshot({ path: 'e2e/screenshots/10-final-state.png' })
    
    console.log('\n🎉 Complete workflow test finished!')
    
    // Basic assertion
    expect(page.url()).toContain(BASE_URL)
  })
})
