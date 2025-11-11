/**
 * Assemble API Route
 * 
 * Endpoint for document assembly using Assembler Agent
 * 
 * POST /api/v1/assemble
 * - Assembles sections into complete document
 * - Returns assembled content with TOC and metadata
 * 
 * Version: 1.0.0
 * Date: 2025-11-11
 */

import { NextRequest, NextResponse } from 'next/server'
import { assemblerAgent } from '@/lib/agents/assembler'
import type { AssemblerRequest } from '@/lib/agents/assembler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/assemble
 * 
 * Assemble document
 */
export async function POST(request: NextRequest) {
  try {
    const body: AssemblerRequest = await request.json()

    // Validate request
    if (!body.project_id) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      )
    }

    if (!body.document_type) {
      return NextResponse.json(
        { error: 'document_type is required' },
        { status: 400 }
      )
    }

    if (!body.sections || Object.keys(body.sections).length === 0) {
      return NextResponse.json(
        { error: 'sections are required' },
        { status: 400 }
      )
    }

    console.log(`📦 Assemble API: Assembling ${body.document_type}`)
    console.log(`   Sections: ${Object.keys(body.sections).length}`)

    // Call Assembler Agent
    const result = await assemblerAgent.assemble(body)

    console.log(`✅ Assemble API: Completed in ${result.duration_ms}ms`)
    console.log(`   Word Count: ${result.metadata.word_count}`)
    console.log(`   Pages: ${result.metadata.page_count_estimate}`)

    // Return result
    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    })

  } catch (error) {
    console.error('Assemble API error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/v1/assemble/info
 * 
 * Get assembly information
 */
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      available_document_types: [
        'investigator_brochure',
        'clinical_protocol',
        'informed_consent',
        'study_synopsis',
      ],
      assembly_options: {
        include_toc: 'Generate Table of Contents',
        include_cover: 'Generate cover page',
        include_metadata: 'Include document metadata',
        page_numbers: 'Add page numbers',
        section_numbers: 'Add section numbers',
      },
      default_options: {
        include_toc: true,
        include_cover: true,
        include_metadata: true,
        page_numbers: true,
        section_numbers: true,
      },
    })

  } catch (error) {
    console.error('Assemble API GET error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
