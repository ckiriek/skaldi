/**
 * Autocomplete API for RLD (Reference Listed Drug)
 * 
 * Searches FDA Orange Book for RLD brand names and application numbers
 * 
 * GET /api/v1/autocomplete/rld?q=glucophage&type=brand
 * GET /api/v1/autocomplete/rld?q=NDA020357&type=application
 */

import { NextRequest, NextResponse } from 'next/server'
import { handleApiError, validateRequiredFields } from '@/lib/middleware/error-handler'
import { OrangeBookAdapter } from '@/lib/adapters/orange-book'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const type = searchParams.get('type') || 'brand' // 'brand' or 'application'
    const limit = parseInt(searchParams.get('limit') || '10')

    console.log('🔶 RLD autocomplete API called:', { query, type, limit })

    validateRequiredFields(
      { q: query },
      ['q'],
      'AutocompleteAPI',
      'rld'
    )

    // Minimum 3 characters for search
    if (query!.length < 3) {
      return NextResponse.json({
        success: true,
        data: [],
        message: 'Query too short (minimum 3 characters)'
      })
    }

    const orangeBook = new OrangeBookAdapter()
    const results: Array<{
      brand_name: string
      application_number: string
      generic_name?: string
      dosage_form?: string
      te_code?: string
    }> = []

    if (type === 'brand') {
      // Search by brand name
      console.log('🔶 Searching Orange Book for brand:', query)
      const rldResults = await orangeBook.searchRLDByBrandName(query!)
      console.log('🔶 Orange Book returned', rldResults.length, 'results')
      
      for (const rld of rldResults.slice(0, limit)) {
        results.push({
          brand_name: rld.brand_name,
          application_number: rld.application_number,
          generic_name: rld.generic_name,
          dosage_form: rld.dosage_form,
          te_code: rld.te_code
        })
      }
    } else if (type === 'application') {
      // Search by application number
      // Orange Book doesn't have a direct search by partial application number
      // So we'll just validate if it looks like an application number
      const appNumberPattern = /^(NDA|ANDA|BLA)\d+/i
      if (appNumberPattern.test(query!)) {
        try {
          const rld = await orangeBook.getRLDByApplicationNumber(query!)
          if (rld) {
            results.push({
              brand_name: rld.brand_name,
              application_number: rld.application_number,
              generic_name: rld.generic_name,
              dosage_form: rld.dosage_form,
              te_code: rld.te_code
            })
          }
        } catch (error) {
          // Application number not found, return empty results
        }
      }
    }

    console.log('✅ RLD autocomplete returning', results.length, 'results')

    return NextResponse.json({
      success: true,
      data: results,
      query,
      type,
      total: results.length
    })
  } catch (error) {
    console.error('❌ RLD autocomplete error:', error)
    return handleApiError(error, 'AutocompleteAPI', 'rld')
  }
}
