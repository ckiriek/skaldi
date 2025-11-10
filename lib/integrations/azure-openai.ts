/**
 * Azure OpenAI API Client
 * API Documentation: https://learn.microsoft.com/en-us/azure/ai-services/openai/
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface GenerationOptions {
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
}

export interface GenerationResponse {
  content: string
  finishReason: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export class AzureOpenAIClient {
  private endpoint: string
  private apiKey: string
  private deploymentName: string
  private apiVersion: string

  constructor() {
    this.endpoint = process.env.AZURE_OPENAI_ENDPOINT || ''
    this.apiKey = process.env.AZURE_OPENAI_API_KEY || ''
    this.deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4.1'
    this.apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview'

    if (!this.endpoint || !this.apiKey) {
      console.warn('Azure OpenAI credentials not configured')
    }
  }

  /**
   * Generate completion using chat API
   */
  async generateCompletion(
    messages: ChatMessage[],
    options: GenerationOptions = {}
  ): Promise<GenerationResponse> {
    if (!this.endpoint || !this.apiKey) {
      throw new Error('Azure OpenAI not configured. Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY')
    }

    try {
      const url = `${this.endpoint}/openai/deployments/${this.deploymentName}/chat/completions?api-version=${this.apiVersion}`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4000,
          top_p: options.topP ?? 0.95,
          frequency_penalty: options.frequencyPenalty ?? 0,
          presence_penalty: options.presencePenalty ?? 0,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Azure OpenAI API error: ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      const choice = data.choices?.[0]

      if (!choice) {
        throw new Error('No completion returned from Azure OpenAI')
      }

      return {
        content: choice.message?.content || '',
        finishReason: choice.finish_reason || 'unknown',
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
      }
    } catch (error) {
      console.error('Azure OpenAI generation error:', error)
      throw error
    }
  }

  /**
   * Generate document content with structured context
   */
  async generateDocument(
    documentType: string,
    context: any,
    systemPrompt: string
  ): Promise<string> {
    const contextString = JSON.stringify(context, null, 2)
    
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `Generate a ${documentType} document based on the following context:\n\n${contextString}\n\nProvide a complete, well-structured document following regulatory guidelines.`,
      },
    ]

    // Token limits based on target document lengths
    // Synopsis: ~6 pages, IB: ~120 pages, Protocol: ~224 pages, ICF: ~30 pages
    const tokenLimits: Record<string, number> = {
      'Synopsis': 4000,      // ~3,000 words, ~6 pages
      'IB': 80000,           // ~60,000 words, ~120 pages  
      'Protocol': 150000,    // ~112,000 words, ~224 pages
      'ICF': 20000,          // ~15,000 words, ~30 pages
    }

    const maxTokens = tokenLimits[documentType] || 8000

    console.log(`Generating ${documentType} with max ${maxTokens} tokens (~${Math.round(maxTokens * 0.75)} words, ~${Math.round(maxTokens * 0.75 / 500)} pages)`)

    const response = await this.generateCompletion(messages, {
      temperature: 0.3, // Lower temperature for more consistent regulatory documents
      maxTokens,
    })

    return response.content
  }

  /**
   * Check if Azure OpenAI is configured
   */
  isConfigured(): boolean {
    return !!(this.endpoint && this.apiKey)
  }
}

export const azureOpenAIClient = new AzureOpenAIClient()
