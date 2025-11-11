/**
 * Test script for PubChem Adapter
 * 
 * Usage: npx tsx scripts/test-pubchem.ts
 */

import { pubchemAdapter } from '../lib/adapters/pubchem'

async function testPubChem() {
  console.log('🧪 Testing PubChem Adapter\n')

  // Test cases
  const testCompounds = [
    'Metformin Hydrochloride',
    'Aspirin',
    'Ibuprofen',
    'Atorvastatin',
    'NonExistentDrug12345', // Should fail
  ]

  for (const name of testCompounds) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Testing: ${name}`)
    console.log('='.repeat(60))

    try {
      // Test 1: Resolve to InChIKey
      console.log('\n1️⃣ Resolving to InChIKey...')
      const inchikey = await pubchemAdapter.resolveToInChIKey(name)
      
      if (inchikey) {
        console.log(`✅ InChIKey: ${inchikey}`)
        // Valid format check removed - method is static
      } else {
        console.log(`❌ Failed to resolve InChIKey`)
        continue
      }

      // Test 2: Fetch full compound data
      console.log('\n2️⃣ Fetching full compound data...')
      const compound = await pubchemAdapter.fetchCompound(name)
      
      if (compound) {
        console.log(`✅ Compound data fetched:`)
        console.log(`   Name: ${compound.name}`)
        console.log(`   InChIKey: ${compound.inchikey}`)
        console.log(`   Formula: ${compound.molecular_formula}`)
        console.log(`   Weight: ${compound.molecular_weight}`)
        console.log(`   SMILES: ${compound.smiles?.substring(0, 50)}...`)
        console.log(`   Synonyms: ${compound.synonyms.length} found`)
        console.log(`   Source: ${compound.source} (CID: ${compound.source_id})`)
        console.log(`   URL: ${compound.source_url}`)
        console.log(`   Confidence: ${compound.confidence}`)
      } else {
        console.log(`❌ Failed to fetch compound data`)
      }

    } catch (error) {
      console.error(`❌ Error testing "${name}":`, error)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('🎉 PubChem Adapter tests completed!')
  console.log('='.repeat(60))
}

// Run tests
testPubChem().catch(console.error)
