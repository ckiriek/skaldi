import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ReferenceRetriever } from './reference-retriever.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GenerateSectionRequest {
  prompt: string
  sectionId: string
  documentType: string
  maxTokens?: number
  temperature?: number
  // RAG parameters
  useRag?: boolean
  ragQueries?: Array<{
    type: 'drug' | 'disease'
    query: string
    minChunks?: number
    maxChunks?: number
    minSimilarity?: number
  }>
  compoundName?: string
  diseaseName?: string
}

interface GenerateSectionResponse {
  success: boolean
  content?: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  latency?: number
  error?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    // Parse request
    const { 
      prompt, 
      sectionId, 
      documentType, 
      maxTokens = 2000, 
      temperature = 0.7,
      useRag = false,
      ragQueries = [],
      compoundName,
      diseaseName
    } = await req.json() as GenerateSectionRequest

    if (!prompt || !sectionId || !documentType) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: prompt, sectionId, documentType' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`🔧 Generating section: ${documentType}/${sectionId}`)
    console.log(`📊 RAG enabled: ${useRag}, Queries: ${ragQueries.length}`)

    // Retrieve references if RAG is enabled
    let referencesText = ''
    if (useRag && ragQueries.length > 0) {
      // Initialize Supabase client for RAG
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, supabaseKey)
      console.log('🔍 Retrieving references...')
      const retriever = new ReferenceRetriever(supabase)
      const allReferences = []

      for (const query of ragQueries) {
        try {
          const options = {
            query: query.query,
            compoundName: query.type === 'drug' ? compoundName : undefined,
            diseaseName: query.type === 'disease' ? diseaseName : undefined,
            topK: query.maxChunks || 5,
            minSimilarity: query.minSimilarity || 0.7
          }

          const refs = query.type === 'drug'
            ? await retriever.retrieveDrugReferences(options)
            : await retriever.retrieveDiseaseReferences(options)

          console.log(`  ✅ Retrieved ${refs.length} ${query.type} references`)
          allReferences.push(...refs)
        } catch (error) {
          console.error(`  ❌ Error retrieving ${query.type} references:`, error)
        }
      }

      // Format references for prompt
      if (allReferences.length > 0) {
        referencesText = retriever.formatReferences(allReferences)
        console.log(`📚 Total references: ${allReferences.length}`)
      } else {
        console.log('⚠️  No references found')
      }
    }

    // Inject references into prompt if available
    let finalPrompt = prompt
    if (referencesText) {
      finalPrompt = prompt.replace('{{references}}', referencesText)
      console.log('✅ References injected into prompt')
    }

    // Get Azure OpenAI credentials from environment
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT')
    const azureKey = Deno.env.get('AZURE_OPENAI_API_KEY')
    const deployment = Deno.env.get('AZURE_OPENAI_DEPLOYMENT_NAME') || 'gpt-5.1'
    const apiVersion = Deno.env.get('AZURE_OPENAI_API_VERSION') || '2025-01-01-preview'

    if (!azureEndpoint || !azureKey) {
      throw new Error('Azure OpenAI not configured. Please set AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY')
    }

    // Call Azure OpenAI API
    const url = `${azureEndpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`
    
    const openaiResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': azureKey,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: `You are a clinical documentation expert specializing in regulatory-compliant ${documentType} documents. 
Generate content that adheres to ICH-GCP guidelines, FDA regulations, and EMA standards.
Use clear, precise medical and regulatory terminology.
Ensure all statements are evidence-based and audit-ready.`
          },
          {
            role: 'user',
            content: finalPrompt
          }
        ],
        max_completion_tokens: maxTokens,
        // temperature removed - gpt-5.1 only supports default value of 1
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      throw new Error(`Azure OpenAI API error: ${openaiResponse.statusText} - ${errorText}`)
    }

    const openaiData = await openaiResponse.json()
    const content = openaiData.choices?.[0]?.message?.content

    if (!content) {
      throw new Error('No content generated from Azure OpenAI')
    }

    const latency = Date.now() - startTime

    const response: GenerateSectionResponse = {
      success: true,
      content,
      usage: {
        promptTokens: openaiData.usage?.prompt_tokens || 0,
        completionTokens: openaiData.usage?.completion_tokens || 0,
        totalTokens: openaiData.usage?.total_tokens || 0,
      },
      latency,
    }

    console.log(`✅ Section generated in ${latency}ms (${response.usage?.totalTokens} tokens)`)

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error generating section:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        latency: Date.now() - startTime,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
