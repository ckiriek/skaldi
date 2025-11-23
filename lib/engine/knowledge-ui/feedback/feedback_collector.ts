/**
 * Phase H.UI v2: Feedback Collector
 * 
 * Collects user feedback signals for ranking improvement
 */

export type FeedbackSignal = 'accept' | 'reject' | 'edit' | 'delete' | 'ignore'

export interface FeedbackEvent {
  userId: string
  sessionId: string
  field: string
  candidateId: string
  candidateText: string
  signal: FeedbackSignal
  rank: number
  score: number
  timestamp: Date
  metadata?: any
}

// In-memory store (in production, use database)
const feedbackEvents: FeedbackEvent[] = []

/**
 * Record feedback event
 */
export function recordFeedback(event: Omit<FeedbackEvent, 'timestamp'>): void {
  feedbackEvents.push({
    ...event,
    timestamp: new Date()
  })
  
  console.log('📊 Feedback recorded:', event.signal, event.candidateText)
}

/**
 * Get feedback for user
 */
export function getUserFeedback(
  userId: string,
  limit?: number
): FeedbackEvent[] {
  const userEvents = feedbackEvents.filter(e => e.userId === userId)
  
  if (limit) {
    return userEvents.slice(-limit)
  }
  
  return userEvents
}

/**
 * Get feedback for field
 */
export function getFieldFeedback(
  field: string,
  limit?: number
): FeedbackEvent[] {
  const fieldEvents = feedbackEvents.filter(e => e.field === field)
  
  if (limit) {
    return fieldEvents.slice(-limit)
  }
  
  return fieldEvents
}

/**
 * Calculate signal weights
 */
export function calculateSignalWeights(signal: FeedbackSignal): {
  positive: number
  negative: number
} {
  switch (signal) {
    case 'accept':
      return { positive: 1.0, negative: 0.0 }
    case 'reject':
      return { positive: 0.0, negative: 1.0 }
    case 'edit':
      return { positive: 0.3, negative: 0.3 }
    case 'delete':
      return { positive: 0.0, negative: 0.8 }
    case 'ignore':
      return { positive: 0.0, negative: 0.2 }
    default:
      return { positive: 0.0, negative: 0.0 }
  }
}

/**
 * Get acceptance rate for candidate
 */
export function getAcceptanceRate(candidateText: string): number {
  const events = feedbackEvents.filter(e => 
    e.candidateText.toLowerCase() === candidateText.toLowerCase()
  )
  
  if (events.length === 0) return 0.5
  
  const accepts = events.filter(e => e.signal === 'accept').length
  
  return accepts / events.length
}

/**
 * Get average rank for accepted candidates
 */
export function getAverageAcceptedRank(field: string): number {
  const acceptedEvents = feedbackEvents.filter(e => 
    e.field === field && e.signal === 'accept'
  )
  
  if (acceptedEvents.length === 0) return 1
  
  const totalRank = acceptedEvents.reduce((sum, e) => sum + e.rank, 0)
  
  return totalRank / acceptedEvents.length
}

/**
 * Get feedback statistics
 */
export function getFeedbackStats(userId?: string): {
  total: number
  accepts: number
  rejects: number
  edits: number
  acceptanceRate: number
} {
  const events = userId 
    ? feedbackEvents.filter(e => e.userId === userId)
    : feedbackEvents
  
  const accepts = events.filter(e => e.signal === 'accept').length
  const rejects = events.filter(e => e.signal === 'reject').length
  const edits = events.filter(e => e.signal === 'edit').length
  
  return {
    total: events.length,
    accepts,
    rejects,
    edits,
    acceptanceRate: events.length > 0 ? accepts / events.length : 0
  }
}
