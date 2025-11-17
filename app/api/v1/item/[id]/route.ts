import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { ApiItem } from '@/lib/types/core'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    const { data: item, error } = await supabase
      .from('vinted_items')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Transform to API format
    const apiItem: ApiItem = {
      id: item.id,
      url: item.url,
      title: item.title,
      price: {
        amount: item.price_amount,
        currency_code: item.price_currency || 'EUR'
      },
      can_buy: item.can_buy,
      can_instant_buy: item.can_instant_buy,
      is_reserved: item.is_reserved,
      is_hidden: item.is_hidden,
      protection_fee: {
        amount: item.protection_fee_amount,
        note: item.protection_fee_note
      },
      shipping_fee: item.shipping_fee,
      condition: item.condition,
      added_since: item.added_since,
      description: item.description,
      images: item.images,
      photos: item.photos_data,
      view_count: item.view_count,
      favourite_count: item.favourite_count,
      scraped_at: item.scraped_at
    }

    return NextResponse.json(apiItem)

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}