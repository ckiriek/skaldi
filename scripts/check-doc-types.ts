import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

async function checkDocTypes() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  const { data } = await supabase
    .from('document_structure')
    .select('document_type_id')
    .limit(50)
  
  const types = [...new Set(data?.map(d => d.document_type_id) || [])]
  console.log('Document types in database:', types)
  
  // Check IB specifically
  const { data: ibData, error } = await supabase
    .from('document_structure')
    .select('*')
    .ilike('document_type_id', '%ib%')
    .limit(5)
  
  console.log('\nIB-related records:', ibData?.length || 0)
  if (ibData && ibData.length > 0) {
    console.log('First IB record:', ibData[0])
  }
  if (error) {
    console.log('Error:', error)
  }
}

checkDocTypes().catch(console.error)
