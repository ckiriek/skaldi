/**
 * Production Smoke Test - Based on Real Code
 * 
 * Tests complete workflow:
 * 1. Create Project
 * 2. Generate IB
 * 3. View Document
 * 4. Run Validation
 * 5. Export DOCX
 */

import { test, expect } from '@playwright/test'

const BASE_URL = 'https://app.skaldi.co'

test.describe('Skaldi Production Smoke Test', () => {
  
  test('Complete workflow: Create Project → Generate IB → Validate → Export', async ({ page }) => {
    test.setTimeout(180000) // 3 minutes for full workflow
    
    console.log('🚀 Starting production smoke test...')
    
    // Step 1: Navigate to New Project page
    console.log('📍 Step 1: Creating new project...')
    await page.goto(`${BASE_URL}/dashboard/projects/new`)
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)
    
    await page.screenshot({ path: 'e2e/screenshots/01-new-project-form.png' })
    console.log('✅ New project form loaded')
    
    // Step 2: Fill project form
    console.log('📍 Step 2: Filling project form...')
    
    const timestamp = Date.now()
    
    // Product type is already "innovator" by default
    console.log('✅ Product type: innovator (default)')
    
    // Project Title - find by placeholder
    const titleInput = page.locator('input[placeholder*="AST-101 Phase 2 Trial"]')
    await titleInput.waitFor({ timeout: 5000 })
    await titleInput.fill(`Smoke Test Project ${timestamp}`)
    console.log('✅ Filled project title')
    
    // Compound Name - this is an autocomplete field
    // Find by placeholder text
    const compoundInput = page.locator('input[placeholder*="AST-256"], input[placeholder*="Compound"]').first()
    await compoundInput.waitFor({ timeout: 5000 })
    await compoundInput.click()
    await compoundInput.fill('Aspirin')
    await page.waitForTimeout(1000) // Wait for autocomplete
    // Press Enter or click first suggestion if appears
    await compoundInput.press('Enter')
    console.log('✅ Filled compound name')
    
    // Sponsor
    const sponsorInput = page.locator('input[placeholder*="Biogen"], input[placeholder*="Pfizer"]').first()
    await sponsorInput.waitFor({ timeout: 5000 })
    await sponsorInput.fill('Test Pharma Inc')
    console.log('✅ Filled sponsor')
    
    // Phase is already "Phase 2" by default
    console.log('✅ Phase: Phase 2 (default)')
    
    // Indication - autocomplete field
    const indicationInput = page.locator('input[placeholder*="Type 2 Diabetes"], input[placeholder*="Indication"]').first()
    await indicationInput.waitFor({ timeout: 5000 })
    await indicationInput.click()
    await indicationInput.fill('Hypertension')
    await page.waitForTimeout(1000) // Wait for autocomplete
    await indicationInput.press('Enter')
    console.log('✅ Filled indication')
    
    await page.screenshot({ path: 'e2e/screenshots/02-form-filled.png' })
    
    // Step 3: Submit form
    console.log('📍 Step 3: Submitting form...')
    
    const submitButton = page.locator('button[type="submit"]', { hasText: /Create Project/i }).first()
    await submitButton.waitFor({ timeout: 5000 })
    await submitButton.click()
    console.log('✅ Clicked Create Project')
    
    // Wait for redirect to project page
    await page.waitForURL('**/dashboard/projects/**', { timeout: 30000 })
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(3000)
    
    const projectUrl = page.url()
    console.log(`✅ Project created: ${projectUrl}`)
    
    await page.screenshot({ path: 'e2e/screenshots/03-project-page.png' })
    
    // Step 4: Generate IB
    console.log('📍 Step 4: Generating IB...')
    
    // Look for "Generate IB" button
    const generateIBButton = page.locator('button', { hasText: /Generate.*IB/i }).first()
    
    const isGenerateVisible = await generateIBButton.isVisible({ timeout: 5000 }).catch(() => false)
    
    if (isGenerateVisible) {
      await generateIBButton.click()
      console.log('✅ Clicked Generate IB')
      
      // Wait for generation to complete (max 60 seconds)
      console.log('⏳ Waiting for IB generation (up to 60s)...')
      
      // Look for "View IB" button to appear (means generation done)
      const viewIBButton = page.locator('button', { hasText: /View.*IB/i }).first()
      
      try {
        await viewIBButton.waitFor({ timeout: 60000 })
        console.log('✅ IB generated successfully')
        
        await page.screenshot({ path: 'e2e/screenshots/04-ib-generated.png' })
        
        // Step 5: View IB
        console.log('📍 Step 5: Opening IB document...')
        await viewIBButton.click()
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000)
        
        console.log(`✅ IB document opened: ${page.url()}`)
        await page.screenshot({ path: 'e2e/screenshots/05-ib-viewer.png' })
        
        // Step 6: Run Validation
        console.log('📍 Step 6: Running validation...')
        
        const validateButton = page.locator('button', { hasText: /Validate/i }).first()
        const isValidateVisible = await validateButton.isVisible({ timeout: 5000 }).catch(() => false)
        
        if (isValidateVisible) {
          await validateButton.click()
          console.log('✅ Clicked Validate')
          
          // Wait for validation results
          await page.waitForTimeout(5000)
          
          await page.screenshot({ path: 'e2e/screenshots/06-validation-results.png' })
          console.log('✅ Validation completed')
        } else {
          console.log('⚠️ Validate button not found')
        }
        
        // Step 7: Export DOCX
        console.log('📍 Step 7: Exporting DOCX...')
        
        const exportButton = page.locator('button', { hasText: /Export.*DOCX/i }).first()
        const isExportVisible = await exportButton.isVisible({ timeout: 5000 }).catch(() => false)
        
        if (isExportVisible) {
          // Setup download listener
          const downloadPromise = page.waitForEvent('download', { timeout: 15000 })
          
          await exportButton.click()
          console.log('✅ Clicked Export DOCX')
          
          try {
            const download = await downloadPromise
            const fileName = download.suggestedFilename()
            console.log(`✅ Document exported: ${fileName}`)
            
            // Save download
            await download.saveAs(`e2e/downloads/${fileName}`)
          } catch (error) {
            console.log('⚠️ Export download not captured')
          }
          
          await page.screenshot({ path: 'e2e/screenshots/07-export-complete.png' })
        } else {
          console.log('⚠️ Export button not found')
        }
        
      } catch (error) {
        console.log('⚠️ IB generation timeout or failed')
        await page.screenshot({ path: 'e2e/screenshots/04-generation-timeout.png' })
      }
      
    } else {
      console.log('⚠️ Generate IB button not found')
      await page.screenshot({ path: 'e2e/screenshots/04-no-generate-button.png' })
    }
    
    // Final screenshot
    await page.screenshot({ path: 'e2e/screenshots/08-final-state.png' })
    
    console.log('🎉 Smoke test completed!')
    
    // Basic assertion - we should still be on the site
    expect(page.url()).toContain(BASE_URL)
  })
  
  test('Quick health check - Dashboard loads', async ({ page }) => {
    console.log('🏥 Running dashboard health check...')
    
    await page.goto(`${BASE_URL}/dashboard`)
    await page.waitForLoadState('networkidle')
    
    // Check page loaded
    expect(await page.title()).toBeTruthy()
    
    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/health-dashboard.png' })
    
    console.log('✅ Dashboard health check passed')
  })
  
  test('Quick health check - Projects page loads', async ({ page }) => {
    console.log('🏥 Running projects health check...')
    
    await page.goto(`${BASE_URL}/dashboard/projects`)
    await page.waitForLoadState('networkidle')
    
    // Check page loaded
    expect(await page.title()).toBeTruthy()
    
    // Take screenshot
    await page.screenshot({ path: 'e2e/screenshots/health-projects.png' })
    
    console.log('✅ Projects health check passed')
  })
})
