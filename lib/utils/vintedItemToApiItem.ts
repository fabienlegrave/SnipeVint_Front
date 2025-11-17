/**
 * Convertit un VintedItem (format base de données) vers ApiItem (format frontend)
 */

import type { VintedItem, ApiItem, VintedPhoto, VintedSeller } from '@/lib/types/core'

export function vintedItemToApiItem(item: VintedItem): ApiItem {
  // Convertir les photos
  const photos: VintedPhoto[] = item.photos_data || []
  const images: string[] = photos.map(p => p.url).filter(Boolean)

  // Convertir le seller
  const seller: VintedSeller | undefined = item.seller_id ? {
    id: item.seller_id,
    login: item.seller_login || undefined,
    profile_url: item.seller_profile_url || undefined,
    business: item.seller_is_business || false,
    photo: item.seller_photo_url ? {
      id: 0,
      image_no: 1,
      width: 50,
      height: 50,
      dominant_color: null,
      dominant_color_opaque: null,
      url: item.seller_photo_url,
      is_main: true,
      thumbnails: [{
        type: 'thumb50',
        url: item.seller_photo_url,
        width: 50,
        height: 50,
        original_size: null
      }],
      high_resolution: undefined,
      is_suspicious: false,
      full_size_url: item.seller_photo_url,
      is_hidden: false,
      extra: {}
    } : undefined
  } : undefined

  return {
    id: item.id,
    url: item.url,
    title: item.title || null,
    price: {
      amount: item.price_amount,
      currency_code: item.price_currency || 'EUR'
    },
    can_buy: item.can_buy,
    can_instant_buy: item.can_instant_buy,
    is_reserved: item.is_reserved,
    is_hidden: item.is_hidden,
    protection_fee: item.protection_fee_amount ? {
      amount: item.protection_fee_amount,
      note: item.protection_fee_note || null
    } : null,
    shipping_fee: item.shipping_fee,
    condition: item.condition || null,
    added_since: item.added_since || null,
    description: item.description || null,
    images,
    photos,
    view_count: item.view_count,
    favourite_count: item.favourite_count,
    seller,
    service_fee: item.service_fee_amount ? {
      amount: item.service_fee_amount,
      currency_code: item.service_fee_currency || 'EUR'
    } : undefined,
    total_item_price: item.total_item_price_amount ? {
      amount: item.total_item_price_amount,
      currency_code: item.total_item_price_currency || 'EUR'
    } : undefined,
    is_visible: item.is_visible,
    is_promoted: item.is_promoted,
    brand_title: item.brand_title || null,
    size_title: item.size_title || null,
    content_source: item.content_source || null,
    item_box: item.item_box || null,
    is_favourite: item.is_favorite || false,
    scraped_at: item.scraped_at
  }
}

