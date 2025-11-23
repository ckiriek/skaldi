/**
 * Phase H.UI v2: Memory Store
 * 
 * Stores user preferences and selections
 */

export interface UserMemory {
  userId: string
  recentIndications: string[]
  recentEndpoints: string[]
  recentFormulations: string[]
  preferredSources: string[]
  fieldPreferences: Record<string, any>
  lastUpdated: Date
}

export interface SessionMemory {
  sessionId: string
  currentProject: {
    compound?: string
    indication?: string
    phase?: string
    productType?: string
  }
  selections: Array<{
    field: string
    value: string
    timestamp: Date
  }>
  rejections: Array<{
    field: string
    value: string
    timestamp: Date
  }>
}

// In-memory store (in production, use Redis or Supabase)
const userMemories = new Map<string, UserMemory>()
const sessionMemories = new Map<string, SessionMemory>()

/**
 * Get user memory
 */
export function getUserMemory(userId: string): UserMemory {
  if (!userMemories.has(userId)) {
    userMemories.set(userId, {
      userId,
      recentIndications: [],
      recentEndpoints: [],
      recentFormulations: [],
      preferredSources: [],
      fieldPreferences: {},
      lastUpdated: new Date()
    })
  }
  
  return userMemories.get(userId)!
}

/**
 * Update user memory
 */
export function updateUserMemory(
  userId: string,
  updates: Partial<Omit<UserMemory, 'userId' | 'lastUpdated'>>
): void {
  const memory = getUserMemory(userId)
  
  Object.assign(memory, updates, { lastUpdated: new Date() })
  
  userMemories.set(userId, memory)
}

/**
 * Add to recent list
 */
export function addToRecent(
  userId: string,
  field: 'indications' | 'endpoints' | 'formulations',
  value: string,
  maxSize: number = 10
): void {
  const memory = getUserMemory(userId)
  const fieldKey = `recent${field.charAt(0).toUpperCase() + field.slice(1)}` as keyof UserMemory
  const list = memory[fieldKey] as string[]
  
  // Remove if already exists
  const index = list.indexOf(value)
  if (index > -1) {
    list.splice(index, 1)
  }
  
  // Add to front
  list.unshift(value)
  
  // Trim to max size
  if (list.length > maxSize) {
    list.splice(maxSize)
  }
  
  updateUserMemory(userId, { [fieldKey]: list })
}

/**
 * Get session memory
 */
export function getSessionMemory(sessionId: string): SessionMemory {
  if (!sessionMemories.has(sessionId)) {
    sessionMemories.set(sessionId, {
      sessionId,
      currentProject: {},
      selections: [],
      rejections: []
    })
  }
  
  return sessionMemories.get(sessionId)!
}

/**
 * Update session context
 */
export function updateSessionContext(
  sessionId: string,
  context: Partial<SessionMemory['currentProject']>
): void {
  const memory = getSessionMemory(sessionId)
  
  memory.currentProject = {
    ...memory.currentProject,
    ...context
  }
  
  sessionMemories.set(sessionId, memory)
}

/**
 * Record selection
 */
export function recordSelection(
  sessionId: string,
  field: string,
  value: string
): void {
  const memory = getSessionMemory(sessionId)
  
  memory.selections.push({
    field,
    value,
    timestamp: new Date()
  })
  
  sessionMemories.set(sessionId, memory)
}

/**
 * Record rejection
 */
export function recordRejection(
  sessionId: string,
  field: string,
  value: string
): void {
  const memory = getSessionMemory(sessionId)
  
  memory.rejections.push({
    field,
    value,
    timestamp: new Date()
  })
  
  sessionMemories.set(sessionId, memory)
}

/**
 * Get recent selections for field
 */
export function getRecentSelections(
  sessionId: string,
  field: string,
  limit: number = 5
): string[] {
  const memory = getSessionMemory(sessionId)
  
  return memory.selections
    .filter(s => s.field === field)
    .slice(-limit)
    .map(s => s.value)
    .reverse()
}

/**
 * Clear session memory
 */
export function clearSessionMemory(sessionId: string): void {
  sessionMemories.delete(sessionId)
}
