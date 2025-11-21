/**
 * Debug Edge Function Response
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function main() {
  console.log('🔍 Debugging Edge Function Response')
  console.log('='.repeat(60))

  const url = `${SUPABASE_URL}/functions/v1/generate-section`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({
      prompt: 'Test',
      sectionId: 'test',
      documentType: 'protocol',
      useRag: false
    })
  })

  console.log(`\nStatus: ${response.status} ${response.statusText}`)
  console.log(`Headers:`, Object.fromEntries(response.headers.entries()))

  const text = await response.text()
  console.log(`\nResponse body (${text.length} chars):`)
  console.log(text)

  try {
    const json = JSON.parse(text)
    console.log('\nParsed JSON:')
    console.log(JSON.stringify(json, null, 2))
  } catch (e) {
    console.log('\n❌ Not valid JSON')
  }
}

main().catch(console.error)
