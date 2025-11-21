/**
 * Test Simple Section Generation (without RAG)
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function main() {
  console.log('🧪 Testing Simple Section Generation')
  console.log('='.repeat(60))

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  const prompt = `Write a Disease Background section for Herpes Simplex Virus Infection.

Include:
1. Definition and classification
2. Pathophysiology  
3. Clinical presentation
4. Epidemiology
5. Clinical significance

Style: Formal, scientific, regulatory-appropriate. 500-800 words.`

  console.log('\n🔄 Calling generate-section WITHOUT RAG...')

  const startTime = Date.now()

  const { data, error } = await supabase.functions.invoke('generate-section', {
    body: {
      prompt,
      sectionId: 'disease_background',
      documentType: 'protocol',
      useRag: false,
      maxTokens: 1500,
      temperature: 0.7
    }
  })

  const duration = Date.now() - startTime

  if (error) {
    console.error('❌ Error:', error)
    console.error('Response:', data)
    return
  }

  console.log(`\n✅ Generation completed in ${duration}ms`)
  console.log(`📊 Tokens used: ${data.usage?.totalTokens || 'N/A'}`)
  console.log(`📝 Content length: ${data.content?.length || 0} characters`)
  console.log(`📝 Word count: ${data.content?.split(/\s+/).length || 0} words`)

  console.log('\n📄 Generated Content:')
  console.log('-'.repeat(60))
  console.log(data.content)
  console.log('-'.repeat(60))

  console.log('\n✅ Test completed!')
}

main().catch(console.error)
