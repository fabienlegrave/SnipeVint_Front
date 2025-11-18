/**
 * Utilitaire pour upsert des items dans la table vinted_items
 * Peut être utilisé par les API routes et les fonctions standalone
 */

import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { ApiItem } from '@/lib/types/core'
import { vintedItemToApiItem } from './vintedItemToApiItem'
import type { VintedItem } from '@/lib/types/core'

/**
 * Convertit un ApiItem ou VintedItem en format DB
 */
function itemToDbFormat(item: ApiItem | VintedItem): any {
  // Convertir VintedItem en ApiItem si nécessaire
  const apiItem: ApiItem = 'price_amount' in item
    ? vintedItemToApiItem(item as VintedItem)
    : item as ApiItem

  return {
    id: apiItem.id,
    url: apiItem.url,
    title: apiItem.title,
    price_amount: apiItem.price?.amount !== null && apiItem.price?.amount !== undefined ? 
      (typeof apiItem.price.amount === 'string' ? parseFloat(apiItem.price.amount) : apiItem.price.amount) : null,
    price_currency: apiItem.price?.currency_code || 'EUR',
    can_buy: apiItem.can_buy,
    can_instant_buy: apiItem.can_instant_buy,
    is_reserved: apiItem.is_reserved,
    is_hidden: apiItem.is_hidden,
    protection_fee_amount: apiItem.protection_fee?.amount || null,
    protection_fee_note: apiItem.protection_fee?.note || null,
    shipping_fee: apiItem.shipping_fee,
    condition: apiItem.condition,
    added_since: apiItem.added_since,
    description: apiItem.description,
    images: apiItem.images || null,
    photos_data: apiItem.photos || null,
    view_count: apiItem.view_count || 0,
    favourite_count: apiItem.favourite_count || 0,
    
    // Données vendeur
    seller_id: apiItem.seller?.id || null,
    seller_login: apiItem.seller?.login || null,
    seller_profile_url: apiItem.seller?.profile_url || null,
    seller_photo_url: apiItem.seller?.photo?.url || null,
    seller_is_business: apiItem.seller?.business || null,
    
    service_fee_amount: apiItem.service_fee ? 
      (typeof apiItem.service_fee.amount === 'string' ? parseFloat(apiItem.service_fee.amount) : apiItem.service_fee.amount) : null,
    service_fee_currency: apiItem.service_fee?.currency_code || null,
    total_item_price_amount: apiItem.total_item_price ? 
      (typeof apiItem.total_item_price.amount === 'string' ? parseFloat(apiItem.total_item_price.amount) : apiItem.total_item_price.amount) : null,
    total_item_price_currency: apiItem.total_item_price?.currency_code || null,
    
    is_visible: apiItem.is_visible || null,
    is_promoted: apiItem.is_promoted || null,
    brand_title: apiItem.brand_title || null,
    size_title: apiItem.size_title || null,
    content_source: apiItem.content_source || null,
    
    // Métadonnées de recherche
    search_score: apiItem.search_tracking_params?.score || null,
    matched_queries: apiItem.search_tracking_params?.matched_queries || null,
    
    // Note: is_favorite n'est pas dans le schéma de la table, il est géré par l'API favorites/toggle
    
    raw: apiItem.raw || null,
    scraped_at: new Date().toISOString()
  }
}

/**
 * Upsert des items dans la table vinted_items
 * Préserve les valeurs existantes de is_favorite
 */
export async function upsertItemsToDb(items: (ApiItem | VintedItem)[]): Promise<{ success: boolean; upserted: number; errors: Error[] }> {
  if (!supabase) {
    logger.db.error('Supabase client not initialized', new Error('Supabase client not available'))
    return { success: false, upserted: 0, errors: [new Error('Database not available')] }
  }

  if (!items || items.length === 0) {
    return { success: true, upserted: 0, errors: [] }
  }

  // Dédupliquer par ID
  const uniqueItems = new Map<number, ApiItem | VintedItem>()
  items.forEach(item => {
    uniqueItems.set(item.id, item)
  })

  const deduplicatedItems = Array.from(uniqueItems.values())
  
  if (deduplicatedItems.length !== items.length) {
    logger.info(`🔄 Removed ${items.length - deduplicatedItems.length} duplicate items (${deduplicatedItems.length} unique items remaining)`)
  }

  // Convertir en format DB
  const dbItems = deduplicatedItems.map(item => itemToDbFormat(item))

  // Traiter par batch pour éviter les timeouts
  const batchSize = 50
  let totalUpserted = 0
  const errors: Error[] = []

  for (let i = 0; i < dbItems.length; i += batchSize) {
    const batch = dbItems.slice(i, i + batchSize)
    
    try {
      logger.db.query(`Upserting batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(dbItems.length/batchSize)}`, { batchSize: batch.length })
      
      // Note: is_favorite n'est pas dans le schéma de la table, il est géré par l'API favorites/toggle
      // On peut donc directement upsert sans préserver is_favorite
      const { data, error } = await supabase
        .from('vinted_items')
        .upsert(batch, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select('id')

      if (error) {
        logger.db.error(`Failed to upsert batch ${Math.floor(i/batchSize) + 1}`, error)
        errors.push(new Error(`Batch ${Math.floor(i/batchSize) + 1}: ${error.message}`))
      } else {
        totalUpserted += data?.length || 0
        logger.db.success(`Upserted batch ${Math.floor(i/batchSize) + 1}: ${data?.length || 0} items`)
      }
    } catch (error) {
      logger.db.error(`Exception during batch upsert ${Math.floor(i/batchSize) + 1}`, error as Error)
      errors.push(error as Error)
    }
  }

  return {
    success: errors.length === 0,
    upserted: totalUpserted,
    errors
  }
}

