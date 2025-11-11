/**
 * Autocomplete API for Drug Class / Active Ingredient
 * 
 * Searches DailyMed for drug classes and active ingredients
 * 
 * GET /api/v1/autocomplete/drug-class?q=metformin
 */

import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, validateRequiredFields } from '@/lib/middleware/error-handler'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '10')

    console.log('💊 Drug Class autocomplete API called:', { query, limit })

    validateRequiredFields(
      { q: query },
      ['q'],
      'AutocompleteAPI',
      'drug-class'
    )

    // Minimum 3 characters for search
    if (query!.length < 3) {
      console.log('⚠️ Query too short:', query)
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Query too short (minimum 3 characters)'
      })
    }

    const results: Array<{
      name: string
      type: 'active_ingredient' | 'drug_class'
    }> = []

    // Search DailyMed for active ingredients
    try {
      console.log('💊 Searching DailyMed for active ingredients:', query)
      
      // DailyMed API for searching by active ingredient
      const response = await fetch(
        `https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?drug_name=${encodeURIComponent(query!)}&pagesize=${limit}`
      )

      if (response.ok) {
        const data = await response.json()
        console.log('💊 DailyMed response:', data)
        
        if (data.data && Array.isArray(data.data)) {
          // Extract unique active ingredients from results
          const ingredientsSet = new Set<string>()
          
          for (const spl of data.data.slice(0, limit)) {
            // Try to extract active ingredient from title
            // DailyMed titles often have format: "DRUG NAME (active ingredient)"
            if (spl.title) {
              const match = spl.title.match(/\(([^)]+)\)/)
              if (match) {
                const ingredient = match[1].trim()
                if (ingredient.toLowerCase().includes(query!.toLowerCase())) {
                  ingredientsSet.add(ingredient)
                }
              }
              
              // Also add the main drug name as potential active ingredient
              const mainName = spl.title.split(/[-\(]/)[0].trim()
              if (mainName.toLowerCase().includes(query!.toLowerCase())) {
                ingredientsSet.add(mainName)
              }
            }
          }
          
          // Add to results
          for (const ingredient of ingredientsSet) {
            results.push({
              name: ingredient,
              type: 'active_ingredient'
            })
          }
          
          console.log('✅ Found', results.length, 'active ingredients')
        }
      }
    } catch (error) {
      console.error('❌ DailyMed search error:', error)
    }

    // Limit results
    const limitedResults = results.slice(0, limit)

    console.log('✅ Returning results:', { total: limitedResults.length, results: limitedResults })

    return NextResponse.json({
      success: true,
      data: limitedResults,
      query,
      total: limitedResults.length
    })
  } catch (error) {
    return handleApiError(error, 'AutocompleteAPI', 'drug-class')
  }
}
