/**
 * Authentication Setup
 * 
 * Logs in once and saves auth state for all tests
 */

import { test as setup } from '@playwright/test'

const BASE_URL = 'https://app.skaldi.co'
const TEST_EMAIL = 'admin@democro.com'
const TEST_PASSWORD = 'demo123'
const authFile = 'e2e/.auth/user.json'

setup('authenticate', async ({ page }) => {
  console.log('🔐 Setting up authentication...')
  
  // Go to login page
  await page.goto(`${BASE_URL}/auth/login`)
  await page.waitForLoadState('networkidle')
  
  console.log('📍 On login page')
  
  // Fill login form
  const emailInput = page.locator('input[type="email"], input[name="email"]').first()
  await emailInput.waitFor({ timeout: 10000 })
  await emailInput.fill(TEST_EMAIL)
  console.log('✅ Filled email')
  
  const passwordInput = page.locator('input[type="password"], input[name="password"]').first()
  await passwordInput.fill(TEST_PASSWORD)
  console.log('✅ Filled password')
  
  // Click login
  const loginButton = page.locator('button[type="submit"]').first()
  await loginButton.click()
  console.log('✅ Clicked login')
  
  // Wait for successful login
  await page.waitForLoadState('networkidle', { timeout: 20000 })
  await page.waitForTimeout(3000)
  
  console.log(`✅ Logged in - URL: ${page.url()}`)
  
  // Save auth state
  await page.context().storageState({ path: authFile })
  console.log('✅ Auth state saved')
})
