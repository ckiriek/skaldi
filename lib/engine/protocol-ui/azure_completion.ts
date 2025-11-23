/**
 * Phase H.UI v3: Azure OpenAI Completion
 * 
 * Provides AI text completion for protocol sections
 */

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT
const AZURE_OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4'
const AZURE_API_VERSION = '2024-02-15-preview'

/**
 * Generate text completion using Azure OpenAI
 */
export async function generateCompletion(
  prompt: string,
  context: {
    sectionId: string
    projectData?: any
  },
  maxTokens: number = 200
): Promise<string | null> {
  if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_API_KEY) {
    console.warn('Azure OpenAI not configured')
    return null
  }

  try {
    const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${AZURE_API_VERSION}`

    const systemPrompt = buildSystemPrompt(context)
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': AZURE_OPENAI_API_KEY
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
        top_p: 0.95,
        frequency_penalty: 0,
        presence_penalty: 0,
        stop: ['\n\n\n']
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Azure OpenAI error:', error)
      return null
    }

    const data = await response.json()
    
    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content.trim()
    }

    return null

  } catch (error) {
    console.error('Azure OpenAI completion failed:', error)
    return null
  }
}

/**
 * Build system prompt based on section context
 */
function buildSystemPrompt(context: {
  sectionId: string
  projectData?: any
}): string {
  const basePrompt = `You are a clinical trial protocol writer with expertise in ICH-GCP guidelines, FDA/EMA regulations, and clinical research best practices.

You are helping write the ${context.sectionId} section of a clinical trial protocol.`

  const contextInfo = []

  if (context.projectData?.compound) {
    contextInfo.push(`Compound: ${context.projectData.compound}`)
  }

  if (context.projectData?.indication) {
    contextInfo.push(`Indication: ${context.projectData.indication}`)
  }

  if (context.projectData?.phase) {
    contextInfo.push(`Phase: ${context.projectData.phase}`)
  }

  if (contextInfo.length > 0) {
    return `${basePrompt}

Study Context:
${contextInfo.join('\n')}

Provide clear, professional, regulatory-compliant text. Use standard clinical trial terminology. Be concise but complete.`
  }

  return basePrompt
}

/**
 * Generate inline completion (for Copilot-style suggestions)
 */
export async function generateInlineCompletion(
  currentText: string,
  cursorPosition: number,
  context: {
    sectionId: string
    projectData?: any
  }
): Promise<string | null> {
  // Get text before cursor
  const textBeforeCursor = currentText.substring(0, cursorPosition)
  
  // Build prompt
  const prompt = `Continue this protocol section text naturally and professionally:

${textBeforeCursor}`

  return await generateCompletion(prompt, context, 100)
}

/**
 * Generate section completion (for full section suggestions)
 */
export async function generateSectionCompletion(
  sectionId: string,
  currentText: string,
  context: {
    projectData?: any
  }
): Promise<string | null> {
  const sectionPrompts: Record<string, string> = {
    'objectives': 'Write clear primary and secondary objectives for this clinical trial.',
    'endpoints': 'Define primary and secondary endpoints with measurement methods and timepoints.',
    'eligibility': 'Write comprehensive inclusion and exclusion criteria.',
    'safety_assessments': 'Describe safety monitoring procedures including AE/SAE reporting, laboratory assessments, and vital signs.',
    'statistics': 'Write the statistical analysis plan including sample size calculation and analysis methods.'
  }

  const sectionPrompt = sectionPrompts[sectionId] || `Write the ${sectionId} section.`

  const prompt = currentText 
    ? `Continue and complete this ${sectionId} section:\n\n${currentText}\n\n${sectionPrompt}`
    : sectionPrompt

  return await generateCompletion(prompt, { sectionId, projectData: context.projectData }, 300)
}
