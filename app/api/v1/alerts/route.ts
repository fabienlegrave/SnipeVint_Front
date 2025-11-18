import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

/**
 * GET /api/v1/alerts
 * Récupère toutes les alertes actives
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active_only') !== 'false'

    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    let query = supabase
      .from('price_alerts')
      .select('*')
      .order('created_at', { ascending: false })

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data: alerts, error } = await query

    if (error) {
      logger.db.error('Get price alerts', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ alerts: alerts || [] })
  } catch (error: unknown) {
    logger.error('API error', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/v1/alerts
 * Crée une nouvelle alerte de prix
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { game_title, platform, max_price, condition } = await request.json()

    if (!game_title || typeof game_title !== 'string' || game_title.trim().length === 0) {
      return NextResponse.json({ error: 'game_title is required' }, { status: 400 })
    }

    if (!max_price || typeof max_price !== 'number' || max_price <= 0) {
      return NextResponse.json({ error: 'max_price must be a positive number' }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    const { data: alert, error } = await supabase
      .from('price_alerts')
      .insert({
        game_title: game_title.trim(),
        platform: platform?.trim() || null,
        max_price: max_price,
        condition: condition?.trim() || null,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      logger.db.error('Create price alert', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    logger.db.success(`Price alert created: ${game_title} (${platform || 'any'}) <= ${max_price}€`)
    return NextResponse.json({ alert })
  } catch (error: unknown) {
    logger.error('API error', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

