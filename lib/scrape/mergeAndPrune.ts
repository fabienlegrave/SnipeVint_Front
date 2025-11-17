import { ApiItem } from '../types'

function isPlainObject(obj: any): boolean {
  return obj && typeof obj === "object" && !Array.isArray(obj)
}

export function pruneNullsDeep(obj: any): any {
  function prune(val: any): any {
    if (val === null || val === undefined) return undefined

    if (Array.isArray(val)) {
      const arr = val.map(prune).filter(v => v !== undefined)
      return arr.length ? arr : undefined
    }

    if (isPlainObject(val)) {
      // Special handling for price objects
      if ("amount" in val && "currency_code" in val) {
        if (val.amount == null) return undefined
      }

      // Special handling for protection fee objects
      if ("amount" in val && "note" in val && Object.keys(val).length === 2) {
        if ((val.amount == null) && (val.note == null || val.note === "")) {
          return undefined
        }
      }

      const out: any = {}
      for (const [k, v] of Object.entries(val)) {
        const pruned = prune(v)
        if (pruned !== undefined) out[k] = pruned
      }

      return Object.keys(out).length ? out : undefined
    }

    return val // Keep 0/false/strings
  }

  const pruned = prune(obj)
  return isPlainObject(pruned) ? pruned : {}
}

export function mergeApiWithEnriched(apiItem: ApiItem, enrichedData: any): ApiItem {
  // Start with API data as base
  const merged: ApiItem = { ...apiItem }

  console.log('🔍 Merging API item:', {
    id: apiItem.id,
    apiPrice: apiItem.price,
    enrichedPrice: enrichedData?.price_amount
  })

  if (enrichedData) {
    // Update title if enriched version is better
    if (enrichedData.title) {
      merged.title = enrichedData.title
    }

    // Update description
    if (enrichedData.description) {
      merged.description = enrichedData.description
    }

    // Update condition
    if (enrichedData.condition) {
      merged.condition = enrichedData.condition
    }

    // CRITICAL: Always preserve API price data as it's more reliable
    // Only override if enriched data has a valid price AND API doesn't
    const hasValidApiPrice = merged.price?.amount !== null && merged.price?.amount !== undefined
    const hasValidEnrichedPrice = enrichedData?.price_amount !== null && enrichedData?.price_amount !== undefined
    
    if (!hasValidApiPrice && hasValidEnrichedPrice) {
      console.log('🔄 Using enriched price since API has none')
      merged.price = {
        amount: enrichedData.price_amount,
        currency_code: enrichedData.price_currency || merged.price?.currency_code || 'EUR'
      }
    } else if (hasValidApiPrice) {
      console.log('✅ Keeping API price:', merged.price)
    }

    // Add enriched boolean flags
    if (enrichedData.can_buy !== undefined) merged.can_buy = enrichedData.can_buy
    if (enrichedData.can_instant_buy !== undefined) merged.can_instant_buy = enrichedData.can_instant_buy
    if (enrichedData.is_reserved !== undefined) merged.is_reserved = enrichedData.is_reserved
    if (enrichedData.is_hidden !== undefined) merged.is_hidden = enrichedData.is_hidden

    // Add protection fee
    if (enrichedData.protection_fee_amount !== undefined || enrichedData.protection_fee_note) {
      merged.protection_fee = {
        amount: enrichedData.protection_fee_amount || null,
        note: enrichedData.protection_fee_note || null
      }
    }

    // Add shipping fee
    if (enrichedData.shipping_fee !== undefined) {
      merged.shipping_fee = enrichedData.shipping_fee
    }

    // Add temporal data
    if (enrichedData.added_since) {
      merged.added_since = enrichedData.added_since
    }

    // Update images if enriched has more/better images
    if (enrichedData.images && Array.isArray(enrichedData.images) && enrichedData.images.length > 0) {
      merged.images = enrichedData.images
    }

    // Update photos_data (used by Vision API) if enriched has more photos
    if (enrichedData.photos_data && Array.isArray(enrichedData.photos_data) && enrichedData.photos_data.length > 0) {
      merged.photos_data = enrichedData.photos_data
    }

    // Update favourite count if enriched has data
    if (typeof enrichedData.favourite_count === 'number') {
      merged.favourite_count = enrichedData.favourite_count
    }
  }

  return pruneNullsDeep(merged)
}