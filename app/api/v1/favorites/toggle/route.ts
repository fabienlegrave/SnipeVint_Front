import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Check API key
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, isFavorite }: { id: number; isFavorite: boolean } = await request.json()

    if (!id || typeof isFavorite !== 'boolean') {
      return NextResponse.json({ 
        error: 'Invalid request',
        details: 'id (number) and isFavorite (boolean) are required'
      }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json({ 
        error: 'Database not available',
        details: 'Supabase client not initialized'
      }, { status: 500 })
    }

    // Update or insert the item with is_favorite flag
    // First check if item exists
    const { data: existingItem } = await supabase
      .from('vinted_items')
      .select('id')
      .eq('id', id)
      .single()

    if (existingItem) {
      // Update existing item
      const { data, error } = await supabase
        .from('vinted_items')
        .update({ is_favorite: isFavorite })
        .eq('id', id)
        .select('id, is_favorite')
        .single()

      if (error) {
        console.error('❌ Database update error:', error)
        return NextResponse.json({ 
          error: 'Database update failed',
          details: error.message
        }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true,
        id: data.id,
        is_favorite: data.is_favorite
      })
    } else {
      // Item doesn't exist yet - we need to save it first
      // This shouldn't happen if we filter correctly, but handle it anyway
      return NextResponse.json({ 
        error: 'Item not found',
        details: 'Item must be saved to database before adding to favorites'
      }, { status: 404 })
    }

  } catch (error: any) {
    console.error('❌ API error:', {
      message: error?.message,
      name: error?.name,
      stack: error?.stack?.split('\n').slice(0, 10)
    })
    
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error?.message || 'Unknown error'
    }, { status: 500 })
  }
}

