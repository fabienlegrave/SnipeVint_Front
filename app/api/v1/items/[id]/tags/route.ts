import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

/**
 * GET /api/v1/items/[id]/tags
 * Récupère tous les tags d'un item
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Les IDs Vinted sont des bigint, utiliser directement la string ou BigInt
    const itemId = params.id
    if (!itemId || isNaN(Number(itemId))) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    // Utiliser directement la string pour les bigint (Supabase gère la conversion)
    const { data: tags, error } = await supabase
      .from('item_tags')
      .select('tag_name, color')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })

    if (error) {
      logger.db.error('Get item tags', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ tags: tags || [] })
  } catch (error: unknown) {
    logger.error('API error', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/v1/items/[id]/tags
 * Ajoute un tag à un item
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Les IDs Vinted sont des bigint, utiliser directement la string
    const itemId = params.id
    if (!itemId || isNaN(Number(itemId))) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 })
    }

    const { tag_name, color } = await request.json()

    if (!tag_name || typeof tag_name !== 'string' || tag_name.trim().length === 0) {
      return NextResponse.json({ error: 'tag_name is required' }, { status: 400 })
    }

    if (tag_name.length > 50) {
      return NextResponse.json({ error: 'tag_name must be 50 characters or less' }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    // Vérifier que l'item existe
    const { data: item, error: itemError } = await supabase
      .from('vinted_items')
      .select('id')
      .eq('id', itemId)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Ajouter le tag (upsert pour éviter les doublons)
    const { data: tag, error } = await supabase
      .from('item_tags')
      .upsert({
        item_id: itemId,
        tag_name: tag_name.trim(),
        color: color || '#3B82F6'
      }, {
        onConflict: 'item_id,tag_name'
      })
      .select()
      .single()

    if (error) {
      logger.db.error('Add item tag', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    logger.db.success(`Tag "${tag_name}" added to item ${itemId}`)
    return NextResponse.json({ tag })
  } catch (error: unknown) {
    logger.error('API error', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/v1/items/[id]/tags
 * Supprime un tag d'un item
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

    // Les IDs Vinted sont des bigint, utiliser directement la string
    const itemId = params.id
    if (!itemId || isNaN(Number(itemId))) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const tag_name = searchParams.get('tag_name')

    if (!tag_name) {
      return NextResponse.json({ error: 'tag_name query parameter is required' }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    const { error } = await supabase
      .from('item_tags')
      .delete()
      .eq('item_id', itemId)
      .eq('tag_name', tag_name)

    if (error) {
      logger.db.error('Delete item tag', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    logger.db.success(`Tag "${tag_name}" removed from item ${itemId}`)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    logger.error('API error', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

