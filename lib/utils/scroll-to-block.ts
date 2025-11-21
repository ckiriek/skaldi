/**
 * Scroll to Block Utility
 * 
 * Scrolls to and highlights a specific block
 */

export function scrollToBlock(blockId: string, options?: {
  behavior?: ScrollBehavior
  highlight?: boolean
  highlightDuration?: number
}) {
  const element = document.getElementById(`block-${blockId}`)
  
  if (!element) {
    console.warn(`Block not found: ${blockId}`)
    return false
  }

  // Scroll to element
  element.scrollIntoView({
    behavior: options?.behavior || 'smooth',
    block: 'center'
  })

  // Add highlight effect
  if (options?.highlight !== false) {
    const duration = options?.highlightDuration || 2000
    
    // Add highlight class
    element.classList.add('ring-4', 'ring-blue-500', 'ring-opacity-50')
    
    // Remove after duration
    setTimeout(() => {
      element.classList.remove('ring-4', 'ring-blue-500', 'ring-opacity-50')
    }, duration)
  }

  return true
}

/**
 * Scroll to section
 */
export function scrollToSection(sectionId: string, options?: {
  behavior?: ScrollBehavior
}) {
  const element = document.getElementById(`section-${sectionId}`)
  
  if (!element) {
    console.warn(`Section not found: ${sectionId}`)
    return false
  }

  element.scrollIntoView({
    behavior: options?.behavior || 'smooth',
    block: 'start'
  })

  return true
}

/**
 * Scroll to issue location
 */
export function scrollToIssue(issueId: string, blockId: string) {
  return scrollToBlock(blockId, {
    behavior: 'smooth',
    highlight: true,
    highlightDuration: 3000
  })
}
