import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { vintedItemToApiItem } from '@/lib/utils/vintedItemToApiItem'
import type { ApiItem } from '@/lib/types/core'

/**
 * GET /api/v1/alerts/matches
 * Récupère les matches trouvés par les alertes
 * 
 * Query params:
 * - alertId?: number - Filtrer par alerte spécifique
 * - limit?: number - Limite de résultats (défaut: 100)
 * - offset?: number - Offset pour pagination
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const alertId = searchParams.get('alertId')
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Construire la requête
    let query = supabase
      .from('alert_matches')
      .select(`
        id,
        alert_id,
        item_id,
        matched_at,
        match_reason,
        price_alerts!inner(game_title, platform, max_price),
        vinted_items(*)
      `)
      .order('matched_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filtrer par alerte si spécifié
    if (alertId) {
      query = query.eq('alert_id', parseInt(alertId, 10))
    }

    const { data: matches, error } = await query

    if (error) {
      logger.db.error('Failed to fetch alert matches', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Transformer les résultats pour le frontend
    const formattedMatches = (matches || []).map((match: any) => {
      const item = match.vinted_items
      const alert = match.price_alerts

      return {
        id: match.id,
        alertId: match.alert_id,
        alertTitle: alert?.game_title || 'Unknown',
        alertPlatform: alert?.platform,
        alertMaxPrice: alert?.max_price,
        matchedAt: match.matched_at,
        matchReason: match.match_reason,
        item: item ? vintedItemToApiItem(item) : null
      }
    })

    // Compter le total (pour pagination)
    let countQuery = supabase
      .from('alert_matches')
      .select('id', { count: 'exact', head: true })

    if (alertId) {
      countQuery = countQuery.eq('alert_id', parseInt(alertId, 10))
    }

    const { count } = await countQuery

    logger.info(`📊 Retrieved ${formattedMatches.length} alert matches`)

    return NextResponse.json({
      success: true,
      matches: formattedMatches,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })

  } catch (error) {
    logger.error('Error fetching alert matches', error as Error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

