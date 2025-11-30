import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

async function fixMetforminProject() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
  const projectId = '3d1c2098-2f60-40ff-addf-5b8073430f59'
  
  console.log('🔧 Fixing Metformin project...\n')
  
  // 1. Get current project
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()
  
  if (!project) {
    console.error('❌ Project not found!')
    return
  }
  
  console.log('Current design_json:', JSON.stringify(project.design_json, null, 2))
  
  // 2. Update design_json to include compound
  const updatedDesignJson = {
    ...project.design_json,
    compound: 'Metformin',
    compound_class: 'Biguanide',
    route: 'Oral',
    formulation: 'Tablet'
  }
  
  const { error: updateError } = await supabase
    .from('projects')
    .update({ design_json: updatedDesignJson })
    .eq('id', projectId)
  
  if (updateError) {
    console.error('❌ Update error:', updateError)
    return
  }
  
  console.log('\n✅ Project updated!')
  console.log('New design_json:', JSON.stringify(updatedDesignJson, null, 2))
  
  // 3. Create Knowledge Graph snapshot for Metformin
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
      common_aes: ['Diarrhea', 'Nausea', 'Abdominal pain', 'Flatulence'],
      serious_risks: ['Lactic acidosis (rare)', 'Vitamin B12 deficiency'],
      contraindications: ['Severe renal impairment (eGFR <30)', 'Metabolic acidosis', 'Diabetic ketoacidosis']
    },
    clinical_efficacy: {
      hba1c_reduction: '1.0-2.0%',
      fasting_glucose_reduction: '60-70 mg/dL',
      weight_effect: 'Modest weight loss or neutral'
    }
  }
  
  // Check if KG already exists
  const { data: existingKg } = await supabase
    .from('knowledge_snapshots')
    .select('id')
    .eq('inn', 'Metformin')
    .single()
  
  if (existingKg) {
    console.log('\n✅ Knowledge Graph already exists for Metformin')
  } else {
    const { error: kgError } = await supabase
      .from('knowledge_snapshots')
      .insert({
        inn: 'Metformin',
        snapshot_data: kgSnapshot,
        created_at: new Date().toISOString()
      })
    
    if (kgError) {
      console.error('❌ KG creation error:', kgError)
    } else {
      console.log('\n✅ Knowledge Graph created for Metformin')
    }
  }
  
  console.log('\n🎉 All done! Try generating documents now.')
}

fixMetforminProject().catch(console.error)
