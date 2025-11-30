import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

async function checkIBStructure() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  console.log('🔍 Checking IB document structure...\n')
  
  const { data, error } = await supabase
    .from('document_structure')
    .select('*')
    .eq('document_type_id', 'ib')
    .order('order_index', { ascending: true })
  
  if (error) {
    console.error('❌ Error:', error)
    return
  }
  
  if (!data || data.length === 0) {
    console.log('⚠️  No structure found for IB!')
    return
  }
  
  console.log(`✅ Found ${data.length} sections:\n`)
  data.forEach((section, i) => {
    console.log(`${i + 1}. ${section.section_id}`)
    console.log(`   Title: ${section.section_title}`)
    console.log(`   Order: ${section.order_index}`)
    console.log(`   Parent: ${section.parent_section_id || 'none'}`)
    console.log()
  })
}

checkIBStructure().catch(console.error)
