/**
 * Validate API Route
 * 
 * Endpoint for content validation using Validator Agent
 * 
 * POST /api/v1/validate
 * - Validates content for compliance
 * - Returns validation results with issues
 * 
 * Version: 1.0.0
 * Date: 2025-11-11
 */

import { NextRequest, NextResponse } from 'next/server'
import { validatorAgent } from '@/lib/agents/validator'
import type { ValidationRequest } from '@/lib/agents/validator'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/v1/validate
 * 
 * Validate content
 */
export async function POST(request: NextRequest) {
  try {
    const body: ValidationRequest = await request.json()

    // Validate request
    if (!body.content) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      )
    }

    if (!body.section_id) {
      return NextResponse.json(
        { error: 'section_id is required' },
        { status: 400 }
      )
    }

    if (!body.document_type) {
      return NextResponse.json(
        { error: 'document_type is required' },
        { status: 400 }
      )
    }

    const validLevels = ['basic', 'standard', 'strict']
    if (body.validation_level && !validLevels.includes(body.validation_level)) {
      return NextResponse.json(
        { error: `validation_level must be one of: ${validLevels.join(', ')}` },
        { status: 400 }
      )
    }

    console.log(`✓ Validate API: Processing ${body.section_id} (${body.validation_level || 'standard'})`)

    // Call Validator Agent
    const result = await validatorAgent.validate(body)

    console.log(`✅ Validate API: Completed in ${result.duration_ms}ms`)
    console.log(`   Score: ${result.score}/100 (${result.passed ? 'PASSED' : 'FAILED'})`)
    console.log(`   Issues: ${result.summary.errors} errors, ${result.summary.warnings} warnings`)

    // Return result
    return NextResponse.json(result, {
      status: result.success ? 200 : 500,
    })

  } catch (error) {
    console.error('Validate API error:', error)
    
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
 * GET /api/v1/validate/info
 * 
 * Get validation information
 */
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      available_levels: ['basic', 'standard', 'strict'],
      level_descriptions: {
        basic: 'Basic validation (threshold: 70%)',
        standard: 'Standard validation (threshold: 80%)',
        strict: 'Strict validation (threshold: 90%)',
      },
      validation_categories: [
        'ICH E6 (R2) Compliance',
        'FDA Guidelines',
        'Terminology',
        'Quality',
        'Completeness',
      ],
      issue_types: ['error', 'warning', 'info'],
    })

  } catch (error) {
    console.error('Validate API GET error:', error)
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
