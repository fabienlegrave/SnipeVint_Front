import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ApiItem, UpsertResponse } from '@/lib/types/core'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Check API key
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const items: ApiItem[] = await request.json()

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Invalid items array' }, { status: 400 })
    }

    // Remove duplicates by ID to prevent "cannot affect row a second time" error
    const uniqueItems = new Map()
    items.forEach(item => {
      uniqueItems.set(item.id, item) // Last occurrence wins
    })

    const deduplicatedItems = Array.from(uniqueItems.values())
    
    if (deduplicatedItems.length !== items.length) {
      logger.info(`🔄 Removed ${items.length - deduplicatedItems.length} duplicate items (${deduplicatedItems.length} unique items remaining)`)
    }

    // Transform API items to database format
    const dbItems = deduplicatedItems.map(item => ({
      id: item.id,
      url: item.url,
      title: item.title,
      price_amount: item.price?.amount !== null && item.price?.amount !== undefined ? 
        (typeof item.price.amount === 'string' ? parseFloat(item.price.amount) : item.price.amount) : null,
      price_currency: item.price?.currency_code || 'EUR',
      can_buy: item.can_buy,
      can_instant_buy: item.can_instant_buy,
      is_reserved: item.is_reserved,
      is_hidden: item.is_hidden,
      protection_fee_amount: item.protection_fee?.amount || null,
      protection_fee_note: item.protection_fee?.note || null,
      shipping_fee: item.shipping_fee,
      condition: item.condition,
      added_since: item.added_since,
      description: item.description,
      images: item.images || null,
      photos_data: item.photos || null, // Nouvelles données photo enrichies
      view_count: item.view_count || 0,
      favourite_count: item.favourite_count || 0,
      
      // Nouvelles données d'enrichissement
      seller_id: item.seller?.id || null,
      seller_login: item.seller?.login || null,
      seller_profile_url: item.seller?.profile_url || null,
      seller_photo_url: item.seller?.photo?.url || null,
      seller_is_business: item.seller?.business || null,
      
      service_fee_amount: item.service_fee ? 
        (typeof item.service_fee.amount === 'string' ? parseFloat(item.service_fee.amount) : item.service_fee.amount) : null,
      service_fee_currency: item.service_fee?.currency_code || null,
      total_item_price_amount: item.total_item_price ? 
        (typeof item.total_item_price.amount === 'string' ? parseFloat(item.total_item_price.amount) : item.total_item_price.amount) : null,
      total_item_price_currency: item.total_item_price?.currency_code || null,
      
      is_visible: item.is_visible || null,
      is_promoted: item.is_promoted || null,
      brand_title: item.brand_title || null,
      size_title: item.size_title || null,
      content_source: item.content_source || null,
      // Note: category_id et catalog_id ne sont pas dans le schéma de la table
      // category_id: item.category_id || null,
      // catalog_id: item.catalog_id || null,
      
      // Métadonnées de recherche
      search_score: item.search_tracking_params?.score || null,
      matched_queries: item.search_tracking_params?.matched_queries || null,
      
      // Favoris (préserver la valeur existante si l'item existe déjà)
      // is_favorite sera géré par l'API favorites/toggle
      
      raw: item.raw || null,
      scraped_at: new Date().toISOString()
    }))

    // Process items in smaller batches to avoid timeout and conflicts
    const batchSize = 50
    let totalUpserted = 0
    
    for (let i = 0; i < dbItems.length; i += batchSize) {
      const batch = dbItems.slice(i, i + batchSize)
      
      try {
        logger.db.query(`Upserting batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(dbItems.length/batchSize)}`, { batchSize: batch.length })
        
        if (!supabase) {
          logger.db.error('Supabase client not initialized', new Error('Supabase client not available'))
          continue
        }

        // For existing items, preserve is_favorite value
        const batchIds = batch.map(item => item.id)
        const { data: existingItems } = await supabase
          .from('vinted_items')
          .select('id, is_favorite')
          .in('id', batchIds)

        // Map existing is_favorite values
        const existingFavorites = new Map<number, boolean>()
        existingItems?.forEach(item => {
          if (item.is_favorite !== null && item.is_favorite !== undefined) {
            existingFavorites.set(item.id, item.is_favorite)
          }
        })

        // Preserve is_favorite for existing items
        const batchWithFavorites = batch.map(item => ({
          ...item,
          is_favorite: existingFavorites.has(item.id) ? existingFavorites.get(item.id) : false
        }))

        const { data, error } = await supabase
          .from('vinted_items')
          .upsert(batchWithFavorites, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          })
          .select('id')

        if (error) {
          logger.db.error(`Database batch upsert (batch ${Math.floor(i/batchSize) + 1})`, error)
          continue
        }

        totalUpserted += data?.length || batch.length
        
      } catch (batchError: unknown) {
        logger.db.error(`Batch processing (batch ${Math.floor(i/batchSize) + 1})`, batchError as Error)
        continue
      }
    }

    const response: UpsertResponse = {
      ok: true,
      upserted: totalUpserted
    }

    logger.db.success(`Database upsert completed: ${totalUpserted}/${dbItems.length} items saved`)
    
    return NextResponse.json(response)

  } catch (error: unknown) {
    logger.error('API error', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}