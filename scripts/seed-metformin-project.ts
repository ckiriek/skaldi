import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

async function seedMetforminProject() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  console.log('🌱 Seeding Metformin Test Project...\n')
  
  // 1. Create Project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      title: 'Metformin Test',
      indication: 'Type 2 Diabetes Mellitus',
      phase: 'Phase 3',
      design_json: {
        compound: 'Metformin',
        study_type: 'Interventional',
        design: 'Randomized, Double-Blind, Placebo-Controlled'
      }
    })
    .select()
    .single()
  
  if (projectError) {
    console.error('❌ Error creating project:', projectError)
    return
  }
  
  console.log('✅ Created project:', project.id)
  console.log('   Title:', project.title)
  
  // 2. Create Knowledge Graph
  const kgSnapshot = {
    compound_name: 'Metformin',
    compound_class: 'Biguanide',
    mechanism: 'Decreases hepatic glucose production, decreases intestinal absorption of glucose, and improves insulin sensitivity',
    indication: 'Type 2 Diabetes Mellitus',
    route: 'Oral',
    formulation: 'Tablet',
    dose_range: '500-2000 mg/day',
    pharmacokinetics: {
      absorption: 'Bioavailability ~50-60%',
      distribution: 'Vd ~650 L',
      metabolism: 'Not metabolized',
      elimination: 'Renal excretion, t½ ~6.2 hours'
    },
    safety_profile: {
      common_aes: ['Diarrhea', 'Nausea', 'Abdominal pain'],
      serious_risks: ['Lactic acidosis (rare)', 'Vitamin B12 deficiency'],
      contraindications: ['Severe renal impairment', 'Metabolic acidosis']
    }
  }
  
  const { data: kg, error: kgError } = await supabase
    .from('knowledge_snapshots')
    .insert({
      inn: 'Metformin',
      snapshot_data: kgSnapshot,
      created_at: new Date().toISOString()
    })
    .select()
    .single()
  
  if (kgError) {
    console.error('❌ Error creating KG:', kgError)
  } else {
    console.log('✅ Created Knowledge Graph')
  }
  
  console.log('✅ Knowledge Graph seeded')
  console.log('\n⚠️  Note: Study design and external data tables do not exist in current schema')
  console.log('   These would need to be added via migrations if required')
  
  console.log('\n✅ Seed complete!')
  console.log('\n📋 Project Details:')
  console.log('   ID:', project.id)
  console.log('   Title:', project.title)
  console.log('   Compound:', project.design_json?.compound)
  console.log('\n💡 Use this ID in the UI to test generation!')
}

seedMetforminProject().catch(console.error)
