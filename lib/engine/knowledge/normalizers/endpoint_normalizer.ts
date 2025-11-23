/**
 * Phase H.3: Endpoint Normalizer
 * 
 * Normalizes and classifies clinical endpoints
 */

import type { NormalizedEndpoint, EndpointType } from '../types'

// Patterns for endpoint type detection
const ENDPOINT_TYPE_PATTERNS: Record<EndpointType, RegExp[]> = {
  'continuous': [
    /change from baseline/i,
    /mean change/i,
    /reduction in/i,
    /decrease in/i,
    /increase in/i,
    /improvement in/i,
    /score/i,
    /level/i,
    /concentration/i
  ],
  'binary': [
    /proportion of/i,
    /percentage of/i,
    /rate of/i,
    /incidence of/i,
    /occurrence of/i,
    /number of patients/i,
    /patients achieving/i,
    /response rate/i
  ],
  'time_to_event': [
    /time to/i,
    /time until/i,
    /survival/i,
    /progression-free/i,
    /event-free/i,
    /disease-free/i
  ],
  'ordinal': [
    /grade/i,
    /stage/i,
    /class/i,
    /severity/i,
    /category/i
  ],
  'count': [
    /number of/i,
    /count of/i,
    /frequency of/i
  ]
}

// Common timepoint patterns
const TIMEPOINT_PATTERNS = [
  /(?:at|after)\s+(week|day|month|year)\s+(\d+)/i,
  /(week|day|month|year)\s+(\d+)/i,
  /(\d+)\s+(week|day|month|year)/i
]

/**
 * Normalize endpoint
 */
export function normalizeEndpoint(title: string, timeFrame?: string): NormalizedEndpoint {
  if (!title || typeof title !== 'string') {
    return {
      originalTitle: title || '',
      cleanedTitle: '',
      type: 'continuous' // default
    }
  }
  
  // Clean the title
  const cleaned = cleanEndpointTitle(title)
  
  // Detect endpoint type
  const type = detectEndpointType(title)
  
  // Extract timepoint
  const timepoint = extractTimepoint(title, timeFrame)
  
  // Generate variable name
  const variableName = generateVariableName(cleaned)
  
  return {
    originalTitle: title,
    cleanedTitle: cleaned,
    type,
    timepoint,
    variableName
  }
}

/**
 * Clean endpoint title
 */
function cleanEndpointTitle(title: string): string {
  let cleaned = title.trim()
  
  // Remove common prefixes
  cleaned = cleaned.replace(/^(primary|secondary|exploratory|other)\s+endpoint:\s*/i, '')
  cleaned = cleaned.replace(/^endpoint:\s*/i, '')
  
  // Remove trailing punctuation
  cleaned = cleaned.replace(/[.,;:]+$/, '')
  
  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, ' ')
  
  return cleaned
}

/**
 * Detect endpoint type
 */
function detectEndpointType(title: string): EndpointType {
  // Check each type's patterns
  for (const [type, patterns] of Object.entries(ENDPOINT_TYPE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(title)) {
        return type as EndpointType
      }
    }
  }
  
  // Default to continuous
  return 'continuous'
}

/**
 * Extract timepoint from title or timeFrame
 */
function extractTimepoint(title: string, timeFrame?: string): string | undefined {
  // Try title first
  for (const pattern of TIMEPOINT_PATTERNS) {
    const match = title.match(pattern)
    if (match) {
      if (match[2]) {
        return `${match[1]} ${match[2]}`
      } else {
        return `${match[2]} ${match[1]}`
      }
    }
  }
  
  // Try timeFrame
  if (timeFrame) {
    for (const pattern of TIMEPOINT_PATTERNS) {
      const match = timeFrame.match(pattern)
      if (match) {
        if (match[2]) {
          return `${match[1]} ${match[2]}`
        } else {
          return `${match[2]} ${match[1]}`
        }
      }
    }
    
    // Return timeFrame as-is if no pattern matched
    return timeFrame
  }
  
  return undefined
}

/**
 * Generate variable name from endpoint title
 */
function generateVariableName(title: string): string {
  // Convert to snake_case
  let varName = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, '_') // Spaces to underscores
    .replace(/_+/g, '_') // Collapse multiple underscores
    .replace(/^_|_$/g, '') // Trim underscores
  
  // Limit length
  if (varName.length > 50) {
    varName = varName.substring(0, 50).replace(/_[^_]*$/, '')
  }
  
  return varName
}

/**
 * Normalize multiple endpoints
 */
export function normalizeEndpoints(endpoints: Array<{ title: string; timeFrame?: string }>): NormalizedEndpoint[] {
  return endpoints.map(ep => normalizeEndpoint(ep.title, ep.timeFrame))
}
