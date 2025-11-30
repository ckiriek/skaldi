import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

async function testGeneration() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  const projectId = '3d1c2098-2f60-40ff-addf-5b8073430f59'
  
  console.log('🔍 Testing data aggregation for project:', projectId)
  
  // 1. Check if project exists
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()
  
  if (projectError) {
    console.error('❌ Project error:', projectError)
    return
  }
  
  if (!project) {
    console.error('❌ Project not found!')
    return
  }
  
  console.log('\n✅ Project found:')
  console.log('   Title:', project.title)
  console.log('   Phase:', project.phase)
  console.log('   Indication:', project.indication)
  console.log('   Design JSON:', JSON.stringify(project.design_json, null, 2))
  
  // 2. Check for compound
  const compound = project.design_json?.compound
  console.log('\n🧪 Compound:', compound || 'NOT FOUND')
  
  if (!compound) {
    console.log('\n⚠️  No compound in design_json - this is why data is empty!')
    console.log('   Need to add compound to project.design_json')
    return
  }
  
  // 3. Check for Knowledge Graph
  const { data: kg, error: kgError } = await supabase
    .from('knowledge_snapshots')
    .select('*')
    .eq('inn', compound)
    .order('created_at', { ascending: false })
    .limit(1)
  
  if (kgError) {
    console.error('\n❌ KG error:', kgError)
  } else if (!kg || kg.length === 0) {
    console.log('\n⚠️  No Knowledge Graph found for compound:', compound)
  } else {
    console.log('\n✅ Knowledge Graph found:')
    console.log('   INN:', kg[0].inn)
    console.log('   Data keys:', Object.keys(kg[0].snapshot_data || {}))
  }
  
  // 4. Check for documents
  const { data: documents } = await supabase
    .from('documents')
    .select('*')
    .eq('project_id', projectId)
  
  console.log('\n📄 Documents:', documents?.length || 0)
  documents?.forEach(doc => {
    console.log(`   - ${doc.type} (${doc.status})`)
  })
}

testGeneration().catch(console.error)
