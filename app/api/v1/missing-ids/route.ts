import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { MissingIdsResponse } from '@/lib/types/core'

export async function POST(request: NextRequest) {
  try {
    // Check API key
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ids }: { ids: (number | string)[] } = await request.json()

    if (!Array.isArray(ids)) {
      return NextResponse.json({ 
        error: 'Invalid ids array',
        details: 'ids must be an array'
      }, { status: 400 })
    }

    // Si le tableau est vide, retourner une réponse vide (pas une erreur)
    if (ids.length === 0) {
      console.log('⚠️ Empty ids array provided, returning empty response')
      return NextResponse.json({
        existing: [],
        missing: []
      })
    }

    // Convertir tous les IDs en nombres (au cas où ils seraient des strings)
    const numericIds = ids
      .map(id => {
        const num = typeof id === 'string' ? parseInt(id, 10) : id
        return isNaN(num) ? null : num
      })
      .filter((id): id is number => id !== null)

    if (numericIds.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid ids array',
        details: 'No valid numeric IDs found in the array'
      }, { status: 400 })
    }

    // Check Supabase configuration
    if (!supabase) {
      const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      
      console.error('❌ Supabase client not initialized', {
        hasUrl: !!supabaseUrl,
        hasKey: !!supabaseKey,
        urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'missing'
      })
      
      return NextResponse.json({ 
        error: 'Database not available',
        details: 'Supabase client not initialized. Check environment variables.'
      }, { status: 500 })
    }

    console.log(`🔍 Checking ${numericIds.length} IDs in database...`)

    // Query existing IDs with better error handling
    let existingItems, error
    try {
      const result = await supabase
        .from('vinted_items')
        .select('id')
        .in('id', numericIds)
      
      existingItems = result.data
      error = result.error
    } catch (fetchError: any) {
      console.error('❌ Supabase fetch error:', {
        message: fetchError?.message,
        cause: fetchError?.cause,
        stack: fetchError?.stack?.split('\n').slice(0, 5)
      })
      
      // Check if it's a network/connection error
      if (fetchError?.message?.includes('fetch failed') || fetchError?.code === 'ECONNREFUSED') {
        return NextResponse.json({ 
          error: 'Database connection failed',
          details: 'Unable to connect to Supabase. Check your network connection and Supabase URL.',
          hint: 'Verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local'
        }, { status: 503 })
      }
      
      throw fetchError
    }

    if (error) {
      console.error('❌ Database query error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json({ 
        error: 'Database query failed',
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    const existing = existingItems?.map(item => item.id) || []
    const missing = numericIds.filter(id => !existing.includes(id))

    console.log(`✅ Found ${existing.length} existing, ${missing.length} missing`)

    const response: MissingIdsResponse = {
      existing,
      missing
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('❌ API error:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack?.split('\n').slice(0, 10)
    })
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error?.message || 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 })
  }
}