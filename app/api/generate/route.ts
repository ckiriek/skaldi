import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { projectId, documentType } = body

    if (!projectId || !documentType) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, documentType' },
        { status: 400 }
      )
    }

    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('generate-document', {
      body: {
        projectId,
        documentType,
        userId: user.id,
      },
    })

    if (error) {
      console.error('Edge function error:', error)
      return NextResponse.json({ 
        error: error.message,
        details: error,
        context: 'Edge function invocation failed'
      }, { status: 500 })
    }

    // If data contains an error, it means the Edge Function returned 400
    if (data && data.error) {
      console.error('Edge function returned error:', data)
      return NextResponse.json({
        error: data.error,
        details: data.details,
        context: 'Edge function execution failed'
      }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
