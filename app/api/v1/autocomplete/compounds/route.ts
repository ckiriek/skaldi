/**
 * Autocomplete API for Compounds
 * 
 * Searches PubChem and DailyMed for compound names
 * 
 * GET /api/v1/autocomplete/compounds?q=metformin
 */

import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, validateRequiredFields } from '@/lib/middleware/error-handler'
import { PubChemAdapter } from '@/lib/adapters/pubchem'
import { DailyMedAdapter } from '@/lib/adapters/dailymed'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '10')

    console.log('🔍 Compounds autocomplete API called:', { query, limit })

    validateRequiredFields(
      { q: query },
      ['q'],
      'AutocompleteAPI',
      'compounds'
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
      source: 'pubchem' | 'dailymed'
      molecular_formula?: string
      inchikey?: string
    }> = []

    // Search PubChem
    try {
      console.log('🔬 Searching PubChem for:', query)
      const pubchem = new PubChemAdapter()
      const searchResults = await pubchem.searchCompounds(query!, limit)
      console.log('🔬 PubChem search results:', searchResults.length, searchResults)
      
      // Add results directly (autocomplete already returns names)
      for (const result of searchResults) {
        results.push({
          name: result.name,
          source: 'pubchem'
        })
      }
      console.log('✅ Added', searchResults.length, 'PubChem results')
    } catch (error) {
      console.error('❌ PubChem search error:', error)
    }

    // Search DailyMed (drug names)
    try {
      console.log('💊 Searching DailyMed for:', query)
      const dailymed = new DailyMedAdapter()
      const dailymedResults = await dailymed.searchByDrugName(query!)
      console.log('💊 DailyMed search results (setids):', dailymedResults.length, dailymedResults)
      
      // DailyMed returns setids, fetch titles directly from API
      for (const setid of dailymedResults.slice(0, 5)) {
        try {
          console.log('💊 Fetching DailyMed SPL for setid:', setid)
          // Fetch SPL data directly to get title
          const response = await fetch(`https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/${setid}.json`)
          console.log('💊 DailyMed API response status:', response.status)
          
          if (response.ok) {
            const data = await response.json()
            if (data.data && data.data.title) {
              // Extract drug name from title (usually first part before dash or parenthesis)
              const drugName = data.data.title.split(/[-\(]/)[0].trim()
              console.log('✅ DailyMed drug found:', drugName, 'from title:', data.data.title)
              
              // Only add if not already in results
              if (!results.find(r => r.name.toLowerCase() === drugName.toLowerCase())) {
                results.push({
                  name: drugName,
                  source: 'dailymed'
                })
              }
            }
          }
        } catch (err) {
          console.error(`❌ Failed to fetch DailyMed SPL ${setid}:`, err)
        }
      }
    } catch (error) {
      console.error('❌ DailyMed search error:', error)
    }

    // Remove duplicates and limit
    const uniqueResults = results
      .filter((result, index, self) => 
        index === self.findIndex(r => r.name.toLowerCase() === result.name.toLowerCase())
      )
      .slice(0, limit)

    console.log('✅ Returning results:', { total: uniqueResults.length, results: uniqueResults })

    return NextResponse.json({
      success: true,
      data: uniqueResults,
      query,
      total: uniqueResults.length
    })
  } catch (error) {
    return handleApiError(error, 'AutocompleteAPI', 'compounds')
  }
}
