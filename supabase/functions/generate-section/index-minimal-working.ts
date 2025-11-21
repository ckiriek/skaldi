/**
 * Minimal test version to debug the issue
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    console.log('Request body:', JSON.stringify(body))

    // Test 1: Can we access env vars?
    const azureEndpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT')
    const azureKey = Deno.env.get('AZURE_OPENAI_API_KEY')
    
    console.log('Azure endpoint:', azureEndpoint ? 'SET' : 'NOT SET')
    console.log('Azure key:', azureKey ? 'SET' : 'NOT SET')

    if (!azureEndpoint || !azureKey) {
      throw new Error('Azure OpenAI not configured')
    }

    // Test 2: Can we create Supabase client?
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    console.log('Supabase URL:', supabaseUrl ? 'SET' : 'NOT SET')
    console.log('Supabase key:', supabaseKey ? 'SET' : 'NOT SET')

    if (body.useRag && (!supabaseUrl || !supabaseKey)) {
      throw new Error('Supabase not configured for RAG')
    }

    // Test 3: Simple Azure OpenAI call
    const url = `${azureEndpoint}/openai/deployments/gpt-5.1/chat/completions?api-version=2025-01-01-preview`
    
    const openaiResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': azureKey,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say "Hello from Edge Function!"' }
        ],
        max_completion_tokens: 50,
        // temperature removed - gpt-5.1 only supports default value of 1
      }),
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      throw new Error(`Azure OpenAI error: ${openaiResponse.statusText} - ${errorText}`)
    }

    const openaiData = await openaiResponse.json()
    const content = openaiData.choices?.[0]?.message?.content

    return new Response(
      JSON.stringify({ 
        success: true,
        content,
        debug: {
          azureConfigured: !!azureEndpoint && !!azureKey,
          supabaseConfigured: !!supabaseUrl && !!supabaseKey,
          useRag: body.useRag || false
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        stack: error.stack
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
