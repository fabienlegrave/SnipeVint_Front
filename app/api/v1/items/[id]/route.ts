import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

/**
 * DELETE /api/v1/items/[id]
 * Supprime un item de la base de données
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Vérifier l'API key
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = params.id

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 })
    }

    logger.info(`🗑️ Suppression de l'item ${id}...`)

    // Supprimer l'item de la base de données
    const { error } = await supabase
      .from('vinted_items')
      .delete()
      .eq('id', Number(id))

    if (error) {
      logger.db.error('Delete item', error)
      return NextResponse.json(
        { error: 'Failed to delete item', details: error.message },
        { status: 500 }
      )
    }

    logger.info(`✅ Item ${id} supprimé avec succès`)

    return NextResponse.json({
      success: true,
      message: `Item ${id} deleted successfully`
    })

  } catch (error) {
    logger.error('Error deleting item', error as Error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

