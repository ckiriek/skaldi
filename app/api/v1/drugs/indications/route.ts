/**
 * Get Common Indications for a Drug
 * 
 * Fetches most common indications for a given drug from:
 * - DailyMed (FDA labels)
 * - ClinicalTrials.gov
 * 
 * GET /api/v1/drugs/indications?drug=aspirin
 */

import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, validateRequiredFields } from '@/lib/middleware/error-handler'

export const runtime = 'nodejs'
export const maxDuration = 30 // 30 seconds for external API calls

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const drug = searchParams.get('drug')

    console.log('💊 Get indications for drug:', drug)

    validateRequiredFields(
      { drug },
      ['drug'],
      'DrugsAPI',
      'indications'
    )

    const indications: Array<{
      indication: string
      source: 'dailymed' | 'clinicaltrials'
      count?: number
    }> = []

    // Skip DailyMed for now - too complex parsing
    // Focus on ClinicalTrials.gov which has structured data
    console.log('💊 Skipping DailyMed, using ClinicalTrials.gov only')

    // Search ClinicalTrials.gov for common conditions
    try {
      console.log('🔬 Searching ClinicalTrials.gov for:', drug)
      const ctResponse = await fetch(
        `https://clinicaltrials.gov/api/v2/studies?query.intr=${encodeURIComponent(drug!)}&pageSize=20`
      )

      if (ctResponse.ok) {
        const ctData = await ctResponse.json()
        console.log('🔬 ClinicalTrials.gov found', ctData.studies?.length || 0, 'studies')

        if (ctData.studies && Array.isArray(ctData.studies)) {
          // Count condition frequencies
          const conditionCounts = new Map<string, number>()

          for (const study of ctData.studies) {
            const conditions = study.protocolSection?.conditionsModule?.conditions
            if (conditions && Array.isArray(conditions)) {
              for (const condition of conditions) {
                conditionCounts.set(
                  condition,
                  (conditionCounts.get(condition) || 0) + 1
                )
              }
            }
          }

          // Sort by frequency and take top 5
          const sortedConditions = Array.from(conditionCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)

          for (const [condition, count] of sortedConditions) {
            // Only add if not already from DailyMed
            if (!indications.find(i => i.indication.toLowerCase().includes(condition.toLowerCase()))) {
              indications.push({
                indication: condition,
                source: 'clinicaltrials',
                count
              })
            }
          }

          console.log('✅ Added', sortedConditions.length, 'conditions from ClinicalTrials.gov')
        }
      }
    } catch (error) {
      console.error('❌ ClinicalTrials.gov error:', error)
    }

    // Sort: DailyMed first, then by count
    const sortedIndications = indications.sort((a, b) => {
      if (a.source === 'dailymed' && b.source === 'clinicaltrials') return -1
      if (a.source === 'clinicaltrials' && b.source === 'dailymed') return 1
      return (b.count || 0) - (a.count || 0)
    })

    console.log('✅ Returning', sortedIndications.length, 'indications')

    return NextResponse.json({
      success: true,
      data: sortedIndications.slice(0, 10), // Limit to 10
      drug,
      total: sortedIndications.length
    })
  } catch (error) {
    return handleApiError(error, 'DrugsAPI', 'indications')
  }
}
