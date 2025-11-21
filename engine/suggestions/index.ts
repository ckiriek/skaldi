/**
 * Suggestion Engine
 * 
 * Generates fix suggestions for validation issues using LLM
 */

import type { ValidationIssue, ValidationSuggestion } from '../validation/types'
import type { StructuredDocument, DocumentBlock } from '../document_store/types'

export class SuggestionEngine {
  private azureEndpoint: string
  private azureKey: string
  private deployment: string

  constructor(config: {
    azureEndpoint: string
    azureKey: string
    deployment?: string
  }) {
    this.azureEndpoint = config.azureEndpoint
    this.azureKey = config.azureKey
    this.deployment = config.deployment || 'gpt-5.1'
  }

  /**
   * Generate suggestions for a validation issue
   */
  async generateSuggestions(
    issue: ValidationIssue,
    document: StructuredDocument,
    block: DocumentBlock
  ): Promise<ValidationSuggestion[]> {
    const suggestions: ValidationSuggestion[] = []

    try {
      console.log(`💡 Generating suggestions for issue: ${issue.rule_id}`)

      // Build prompt
      const prompt = this.buildPrompt(issue, document, block)

      // Call Azure OpenAI
      const response = await this.callAzureOpenAI(prompt)

      if (response) {
        suggestions.push({
          suggestion_id: `SUG_${issue.issue_id}_${Date.now()}`,
          description: `AI-generated fix for ${issue.rule_id}`,
          block_id: block.block_id,
          original_text: block.text,
          suggested_text: response,
          confidence: 0.8,
          auto_applicable: false // Require manual review
        })
      }

    } catch (error) {
      console.error('Failed to generate suggestions:', error)
    }

    return suggestions
  }

  /**
   * Build prompt for LLM
   */
  private buildPrompt(
    issue: ValidationIssue,
    document: StructuredDocument,
    block: DocumentBlock
  ): string {
    return `You are a clinical documentation expert. Fix the following validation issue:

Document Type: ${document.type}
Issue: ${issue.message}
Rule: ${issue.rule_id}
Severity: ${issue.severity}

Current Text:
"""
${block.text}
"""

Instructions:
1. Fix the issue while maintaining regulatory compliance
2. Keep the same writing style and tone
3. Preserve all factual information
4. Only modify what's necessary to fix the issue
5. Return ONLY the corrected text, no explanations

Corrected Text:`
  }

  /**
   * Call Azure OpenAI API
   */
  private async callAzureOpenAI(prompt: string): Promise<string | null> {
    try {
      const url = `${this.azureEndpoint}/openai/deployments/${this.deployment}/chat/completions?api-version=2025-01-01-preview`

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.azureKey
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a clinical documentation expert specializing in regulatory-compliant documents.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_completion_tokens: 1000
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Azure OpenAI error:', errorText)
        return null
      }

      const data = await response.json()
      return data.choices?.[0]?.message?.content || null

    } catch (error) {
      console.error('Failed to call Azure OpenAI:', error)
      return null
    }
  }

  /**
   * Generate suggestions for multiple issues
   */
  async generateBulkSuggestions(
    issues: ValidationIssue[],
    document: StructuredDocument,
    getBlock: (blockId: string) => DocumentBlock | null
  ): Promise<Map<string, ValidationSuggestion[]>> {
    const suggestionMap = new Map<string, ValidationSuggestion[]>()

    for (const issue of issues) {
      // Only generate suggestions for errors and warnings
      if (issue.severity === 'info') continue

      // Get the first location
      const location = issue.locations[0]
      if (!location) continue

      const block = getBlock(location.block_id)
      if (!block) continue

      const suggestions = await this.generateSuggestions(issue, document, block)
      suggestionMap.set(issue.issue_id, suggestions)
    }

    return suggestionMap
  }
}
