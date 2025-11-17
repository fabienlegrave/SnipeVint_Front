import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

/**
 * PATCH /api/v1/alerts/[id]
 * Met à jour une alerte (active/inactive, max_price, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid alert ID' }, { status: 400 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.is_active !== undefined) {
      updates.is_active = body.is_active
    }
    if (body.max_price !== undefined) {
      if (typeof body.max_price !== 'number' || body.max_price <= 0) {
        return NextResponse.json({ error: 'max_price must be a positive number' }, { status: 400 })
      }
      updates.max_price = body.max_price
    }
    if (body.game_title !== undefined) {
      updates.game_title = body.game_title.trim()
    }
    if (body.platform !== undefined) {
      updates.platform = body.platform?.trim() || null
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    const { data: alert, error } = await supabase
      .from('price_alerts')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
      }
      logger.db.error('Update price alert', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    logger.db.success(`Price alert ${id} updated`)
    return NextResponse.json({ alert })
  } catch (error: unknown) {
    logger.error('API error', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/v1/alerts/[id]
 * Supprime une alerte
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid alert ID' }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    const { error } = await supabase
      .from('price_alerts')
      .delete()
      .eq('id', id)

    if (error) {
      logger.db.error('Delete price alert', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    logger.db.success(`Price alert ${id} deleted`)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    logger.error('API error', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

