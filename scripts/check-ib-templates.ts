import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

async function checkIBTemplates() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  console.log('🔍 Checking IB templates in database...\n')
  
  // Get structure
  const { data: structure } = await supabase
    .from('document_structure')
    .select('section_id, section_title')
    .eq('document_type_id', 'ib')
    .order('order_index', { ascending: true })
  
  if (!structure || structure.length === 0) {
    console.log('⚠️  No structure found!')
    return
  }
  
  console.log(`Found ${structure.length} sections in structure:\n`)
  
  // Check templates for each section
  for (const section of structure) {
    const { data: template } = await supabase
      .from('document_templates')
      .select('id, template_text')
      .eq('document_type_id', 'ib')
      .eq('section_id', section.section_id)
      .eq('is_active', true)
      .single()
    
    const hasTemplate = template && template.template_text
    const icon = hasTemplate ? '✅' : '❌'
    
    console.log(`${icon} ${section.section_id}`)
    if (!hasTemplate) {
      console.log(`   ⚠️  No template found!`)
    }
  }
}

checkIBTemplates().catch(console.error)
