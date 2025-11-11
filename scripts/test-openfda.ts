/**
 * Test script for openFDA Adapter
 * 
 * Usage: npx tsx scripts/test-openfda.ts
 */

import { openfdaAdapter } from '../lib/adapters/openfda'

async function testOpenFDA() {
  console.log('🧪 Testing openFDA Adapter\n')

  // Test cases
  const testCases = [
    {
      type: 'application_number',
      value: 'NDA020357', // Metformin / GLUCOPHAGE
      description: 'Metformin (GLUCOPHAGE)',
    },
    {
      type: 'brand_name',
      value: 'GLUCOPHAGE',
      description: 'GLUCOPHAGE brand',
    },
    {
      type: 'application_number',
      value: 'NDA020503', // Atorvastatin / LIPITOR
      description: 'Atorvastatin (LIPITOR)',
    },
  ]

  for (const testCase of testCases) {
    console.log(`\n${'='.repeat(60)}`)
    console.log(`Testing: ${testCase.description}`)
    console.log('='.repeat(60))

    try {
      if (testCase.type === 'application_number') {
        // Test 1: Fetch label by application number
        console.log(`\n1️⃣ Fetching label by application number: ${testCase.value}`)
        const label = await openfdaAdapter.fetchLabelByApplicationNumber(testCase.value)
        
        if (label) {
          console.log(`✅ Label fetched:`)
          console.log(`   Label Type: ${label.label_type}`)
          console.log(`   Effective Date: ${label.effective_date}`)
          console.log(`   Source: ${label.source}`)
          console.log(`   Confidence: ${label.confidence}`)
          console.log(`\n   Sections available:`)
          
          const sections = Object.entries(label.sections)
            .filter(([_, value]) => value)
            .map(([key, value]) => {
              const length = typeof value === 'string' ? value.length : 0
              return `     - ${key}: ${length} chars`
            })
          
          sections.forEach(s => console.log(s))
          
          console.log(`\n   Full text length: ${label.full_text?.length || 0} chars`)
          
          // Show sample of indications
          if (label.sections.indications_and_usage) {
            const sample = label.sections.indications_and_usage.substring(0, 200)
            console.log(`\n   Sample (Indications):\n   "${sample}..."`)
          }
        } else {
          console.log(`❌ No label found`)
        }
      }

      if (testCase.type === 'brand_name') {
        // Test 2: Fetch label by brand name
        console.log(`\n2️⃣ Fetching label by brand name: ${testCase.value}`)
        const label = await openfdaAdapter.fetchLabelByBrandName(testCase.value)
        
        if (label) {
          console.log(`✅ Label fetched via brand name`)
        } else {
          console.log(`❌ No label found`)
        }

        // Test 3: Get application numbers
        console.log(`\n3️⃣ Getting application numbers for: ${testCase.value}`)
        const appNumbers = await openfdaAdapter.getApplicationNumbers(testCase.value)
        
        if (appNumbers.length > 0) {
          console.log(`✅ Found ${appNumbers.length} application numbers:`)
          appNumbers.forEach(num => console.log(`   - ${num}`))
        } else {
          console.log(`❌ No application numbers found`)
        }
      }

    } catch (error) {
      console.error(`❌ Error testing "${testCase.description}":`, error)
    }
  }

  // Test 4: Search adverse events
  console.log(`\n${'='.repeat(60)}`)
  console.log('Testing: Adverse Events Search')
  console.log('='.repeat(60))

  try {
    console.log(`\n4️⃣ Searching adverse events for: metformin`)
    const events = await openfdaAdapter.searchAdverseEvents('metformin', 10)
    
    if (events.length > 0) {
      console.log(`✅ Found ${events.length} adverse events:`)
      events.slice(0, 5).forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.pt} (n=${event.incidence_n})`)
      })
    } else {
      console.log(`❌ No adverse events found`)
    }
  } catch (error) {
    console.error(`❌ Error searching adverse events:`, error)
  }

  console.log('\n' + '='.repeat(60))
  console.log('🎉 openFDA Adapter tests completed!')
  console.log('='.repeat(60))
}

// Run tests
testOpenFDA().catch(console.error)
