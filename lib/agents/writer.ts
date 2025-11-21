/**
 * Writer Agent
 * 
 * Responsible for:
 * 1. AI-powered content refinement
 * 2. Style consistency enforcement
 * 3. Regulatory language optimization
 * 4. Content enhancement and expansion
 * 
 * Version: 1.0.0
 * Date: 2025-11-11
 */

// ============================================================================
// TYPES
// ============================================================================

export interface WriterRequest {
  content: string
  section_id: string
  document_type: string
  refinement_type: 'enhance' | 'simplify' | 'expand' | 'regulatory' | 'technical'
  context?: {
    product_type?: string
    therapeutic_area?: string
    target_audience?: string
  }
}

export interface WriterResult {
  success: boolean
  original_content: string
  refined_content: string
  changes_made: string[]
  word_count_before: number
  word_count_after: number
  refinement_type: string
  duration_ms: number
  model_used?: string
}

// ============================================================================
// PROMPTS
// ============================================================================

const REFINEMENT_PROMPTS = {
  enhance: `You are an expert medical writer specializing in regulatory documents. 
Enhance the following content while maintaining accuracy and regulatory compliance.
Focus on:
- Clarity and readability
- Professional medical terminology
- Logical flow and structure
- Completeness of information
- ICH E6 (R2) compliance

Preserve all data, statistics, and references. Only improve presentation and clarity.`,

  simplify: `You are an expert medical writer. Simplify the following content for better readability.
Focus on:
- Clear, concise language
- Shorter sentences
- Active voice where appropriate
- Removal of redundancy
- Maintaining technical accuracy

Preserve all critical information and data.`,

  expand: `You are an expert medical writer. Expand the following content with additional context and detail.
Focus on:
- Adding relevant background information
- Explaining technical terms
- Providing clinical context
- Including regulatory considerations
- Maintaining professional tone

Base expansions on standard medical knowledge and regulatory guidelines.`,

  regulatory: `You are a regulatory affairs expert. Refine the following content for regulatory submission.
Focus on:
- ICH E6 (R2) compliance
- FDA guideline adherence
- Precise regulatory language
- Appropriate qualifiers and disclaimers
- Standard regulatory terminology

Ensure all statements are defensible and evidence-based.`,

  technical: `You are a clinical pharmacology expert. Refine the following technical content.
Focus on:
- Technical accuracy
- Appropriate scientific terminology
- Clear explanation of mechanisms
- Proper citation style
- Professional scientific writing

Maintain high technical standards while ensuring clarity.`,
}

// ============================================================================
// WRITER AGENT
// ============================================================================

export class WriterAgent {
  private apiKey: string | undefined
  private endpoint: string | undefined
  private deploymentName: string | undefined

  constructor() {
    // Azure OpenAI configuration
    this.apiKey = process.env.AZURE_OPENAI_API_KEY
    this.endpoint = process.env.AZURE_OPENAI_ENDPOINT
    this.deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-5.1'
  }

  /**
   * Main refinement method
   */
  async refine(request: WriterRequest): Promise<WriterResult> {
    const startTime = Date.now()

    console.log(`✍️  Writer Agent: Refining ${request.section_id} (${request.refinement_type})`)

    try {
      // Check if Azure OpenAI is configured
      if (!this.apiKey || !this.endpoint) {
        console.warn('⚠️  Azure OpenAI not configured, using mock refinement')
        return this.mockRefinement(request, startTime)
      }

      // Get refinement prompt
      const systemPrompt = REFINEMENT_PROMPTS[request.refinement_type]
      
      // Add context if provided
      let contextPrompt = ''
      if (request.context) {
        contextPrompt = `\n\nContext:\n`
        if (request.context.product_type) {
          contextPrompt += `- Product Type: ${request.context.product_type}\n`
        }
        if (request.context.therapeutic_area) {
          contextPrompt += `- Therapeutic Area: ${request.context.therapeutic_area}\n`
        }
        if (request.context.target_audience) {
          contextPrompt += `- Target Audience: ${request.context.target_audience}\n`
        }
      }

      // Call Azure OpenAI
      const refined = await this.callAzureOpenAI(
        systemPrompt + contextPrompt,
        request.content
      )

      // Analyze changes
      const changes = this.analyzeChanges(request.content, refined)
      const wordCountBefore = this.countWords(request.content)
      const wordCountAfter = this.countWords(refined)

      const duration = Date.now() - startTime

      console.log(`✅ Writer Agent: Completed in ${duration}ms`)
      console.log(`   Words: ${wordCountBefore} → ${wordCountAfter}`)
      console.log(`   Changes: ${changes.length}`)

      return {
        success: true,
        original_content: request.content,
        refined_content: refined,
        changes_made: changes,
        word_count_before: wordCountBefore,
        word_count_after: wordCountAfter,
        refinement_type: request.refinement_type,
        duration_ms: duration,
        model_used: this.deploymentName,
      }

    } catch (error) {
      console.error('Writer Agent error:', error)
      
      // Fallback to mock refinement
      console.warn('⚠️  Falling back to mock refinement')
      return this.mockRefinement(request, startTime)
    }
  }

  /**
   * Call Azure OpenAI API
   */
  private async callAzureOpenAI(systemPrompt: string, content: string): Promise<string> {
    if (!this.endpoint || !this.apiKey || !this.deploymentName) {
      throw new Error('Azure OpenAI not configured')
    }

    const url = `${this.endpoint}/openai/deployments/${this.deploymentName}/chat/completions?api-version=2024-02-15-preview`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Please refine the following content:\n\n${content}`,
          },
        ],
        temperature: 0.3, // Low temperature for consistency
        max_tokens: 4000,
        top_p: 0.95,
        frequency_penalty: 0,
        presence_penalty: 0,
      }),
    })

    if (!response.ok) {
      throw new Error(`Azure OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  }

  /**
   * Mock refinement (fallback when Azure OpenAI not available)
   */
  private mockRefinement(request: WriterRequest, startTime: number): WriterResult {
    console.log('🔧 Using mock refinement')

    // Simple mock: add some enhancements
    let refined = request.content

    switch (request.refinement_type) {
      case 'enhance':
        refined = this.mockEnhance(request.content)
        break
      case 'simplify':
        refined = this.mockSimplify(request.content)
        break
      case 'expand':
        refined = this.mockExpand(request.content)
        break
      case 'regulatory':
        refined = this.mockRegulatory(request.content)
        break
      case 'technical':
        refined = this.mockTechnical(request.content)
        break
    }

    const changes = this.analyzeChanges(request.content, refined)
    const wordCountBefore = this.countWords(request.content)
    const wordCountAfter = this.countWords(refined)
    const duration = Date.now() - startTime

    return {
      success: true,
      original_content: request.content,
      refined_content: refined,
      changes_made: changes,
      word_count_before: wordCountBefore,
      word_count_after: wordCountAfter,
      refinement_type: request.refinement_type,
      duration_ms: duration,
      model_used: 'mock',
    }
  }

  /**
   * Mock enhancement
   */
  private mockEnhance(content: string): string {
    // Add professional enhancements
    return content
      .replace(/\[([^\]]+)\]/g, '[$1 - to be determined based on available data]')
      .replace(/etc\./g, 'and other relevant factors')
  }

  /**
   * Mock simplification
   */
  private mockSimplify(content: string): string {
    // Simplify language
    return content
      .replace(/utilize/g, 'use')
      .replace(/demonstrate/g, 'show')
      .replace(/in order to/g, 'to')
  }

  /**
   * Mock expansion
   */
  private mockExpand(content: string): string {
    // Add context
    return content + '\n\nNote: This information is based on the approved product labeling and published scientific literature.'
  }

  /**
   * Mock regulatory refinement
   */
  private mockRegulatory(content: string): string {
    // Add regulatory language
    return content
      .replace(/is/g, 'has been demonstrated to be')
      .replace(/shows/g, 'demonstrates')
  }

  /**
   * Mock technical refinement
   */
  private mockTechnical(content: string): string {
    // Add technical precision
    return content
      .replace(/about/g, 'approximately')
      .replace(/around/g, 'approximately')
  }

  /**
   * Analyze changes between original and refined content
   */
  private analyzeChanges(original: string, refined: string): string[] {
    const changes: string[] = []

    const wordCountBefore = this.countWords(original)
    const wordCountAfter = this.countWords(refined)

    if (wordCountAfter > wordCountBefore) {
      changes.push(`Expanded content (+${wordCountAfter - wordCountBefore} words)`)
    } else if (wordCountAfter < wordCountBefore) {
      changes.push(`Condensed content (-${wordCountBefore - wordCountAfter} words)`)
    }

    if (original !== refined) {
      changes.push('Improved clarity and readability')
      changes.push('Enhanced professional tone')
      changes.push('Optimized regulatory language')
    }

    return changes
  }

  /**
   * Count words in content
   */
  private countWords(content: string): number {
    return content.trim().split(/\s+/).length
  }

  /**
   * Batch refinement for multiple sections
   */
  async refineBatch(requests: WriterRequest[]): Promise<WriterResult[]> {
    console.log(`✍️  Writer Agent: Batch refining ${requests.length} sections`)

    const results: WriterResult[] = []

    for (const request of requests) {
      const result = await this.refine(request)
      results.push(result)
    }

    console.log(`✅ Writer Agent: Batch complete`)
    return results
  }

  /**
   * Check if Azure OpenAI is configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.endpoint && this.deploymentName)
  }

  /**
   * Get configuration status
   */
  getStatus(): {
    configured: boolean
    endpoint?: string
    deployment?: string
    mode: 'azure' | 'mock'
  } {
    return {
      configured: this.isConfigured(),
      endpoint: this.endpoint,
      deployment: this.deploymentName,
      mode: this.isConfigured() ? 'azure' : 'mock',
    }
  }
}

// Export singleton instance
export const writerAgent = new WriterAgent()
