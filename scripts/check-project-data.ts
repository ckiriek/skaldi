import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

async function checkProjectData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  console.log('🔍 Finding all projects...\n')
  
  // Find all projects
  const { data: allProjects } = await supabase
    .from('projects')
    .select('id, name, compound, created_at')
    .order('created_at', { ascending: false })
    .limit(10)
  
  console.log('📁 Recent Projects:')
  allProjects?.forEach(p => {
    console.log(`   - ${p.name} (${p.compound || 'no compound'})`)
    console.log(`     ID: ${p.id}`)
  })
  
  // Find Metformin project
  const { data: metforminProjects } = await supabase
    .from('projects')
    .select('*')
    .ilike('name', '%metformin%')
  
  console.log('\n🔍 Metformin Projects:', metforminProjects?.length || 0)
  const project = metforminProjects?.[0]
  
  if (!project) {
    console.log('❌ No Metformin project found!')
    return
  }
  
  const projectId = project.id
  console.log('\n📁 Using Project:', project.name)
  console.log('   ID:', projectId)
  
  // Check Knowledge Graph
  const { data: kg } = await supabase
    .from('knowledge_graphs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
  
  console.log('\n🧠 Knowledge Graph:', kg?.length ? 'EXISTS' : 'MISSING')
  if (kg?.[0]) {
    console.log('   - Compound:', kg[0].snapshot?.compound_name || 'Unknown')
    console.log('   - Created:', kg[0].created_at)
  }
  
  // Check external data
  const { data: external } = await supabase
    .from('external_data')
    .select('source, count')
    .eq('project_id', projectId)
  
  console.log('\n📊 External Data:')
  if (external?.length) {
    external.forEach(row => {
      console.log(`   - ${row.source}: ${row.count || 'N/A'}`)
    })
  } else {
    console.log('   - NONE')
  }
  
  // Check RAG references
  const { data: rag } = await supabase
    .from('drug_reference_chunks')
    .select('document_type, count')
    .limit(10)
  
  console.log('\n📚 RAG References:', rag?.length || 0, 'chunks')
}

checkProjectData().catch(console.error)
