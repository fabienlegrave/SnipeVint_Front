import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { invalidateDelayCache } from '@/lib/config/delays'

const SETTINGS_KEY = 'request_delay_ms'

/**
 * GET - Récupérer le délai des requêtes
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')
    const validSecret = process.env.API_SECRET || process.env.NEXT_PUBLIC_API_SECRET

    if (!apiKey || !validSecret || apiKey !== validSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    // Essayer de récupérer depuis app_settings
    const { data: settings, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching request delay:', error)
    }

    const delay = settings?.value 
      ? parseInt(settings.value, 10) 
      : 15000 // Valeur par défaut: 15 secondes

    return NextResponse.json({ 
      requestDelayMs: delay,
      isDefault: !settings
    })
  } catch (error) {
    console.error('Error in GET /api/v1/admin/settings/request-delay:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      requestDelayMs: 15000 // Fallback
    }, { status: 500 })
  }
}

/**
 * POST - Sauvegarder le délai des requêtes
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')
    const validSecret = process.env.API_SECRET || process.env.NEXT_PUBLIC_API_SECRET

    if (!apiKey || !validSecret || apiKey !== validSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { requestDelayMs } = await request.json()

    if (!requestDelayMs || typeof requestDelayMs !== 'number') {
      return NextResponse.json({ error: 'Invalid requestDelayMs value' }, { status: 400 })
    }

    // Validation: entre 1 seconde (1000ms) et 60 secondes (60000ms)
    if (requestDelayMs < 1000 || requestDelayMs > 60000) {
      return NextResponse.json({ 
        error: 'requestDelayMs must be between 1000 and 60000 milliseconds' 
      }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    // Sauvegarder dans app_settings
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: SETTINGS_KEY,
        value: requestDelayMs.toString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      })

    if (error) {
      console.error('Error saving request delay:', error)
      return NextResponse.json({ error: 'Failed to save request delay' }, { status: 500 })
    }

    // Invalider le cache pour forcer le rechargement
    invalidateDelayCache()

    return NextResponse.json({ 
      success: true,
      requestDelayMs,
      message: 'Request delay updated successfully'
    })
  } catch (error) {
    console.error('Error in POST /api/v1/admin/settings/request-delay:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

