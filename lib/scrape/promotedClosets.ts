/**
 * Module pour récupérer les items depuis l'API promoted_closets de Vinted
 * Cette API permet de filtrer directement par recherche, plateforme, prix, etc.
 */

import { buildVintedApiHeaders, FullVintedSession } from './fullSessionManager'
import { logger } from '@/lib/logger'
import { VintedItem, ApiItem } from '@/lib/types/core'
import { normalizeApiItem } from './searchCatalogWithFullSession'

/**
 * Mapping des noms de plateformes vers les IDs Vinted
 * Basé sur l'exemple fourni : video_game_platform_ids=1273 pour Switch
 */
const PLATFORM_IDS: Record<string, number> = {
  'switch': 1273,
  'nintendo switch': 1273,
  'ps5': 1274, // À vérifier
  'playstation 5': 1274,
  'ps4': 1275, // À vérifier
  'playstation 4': 1275,
  'ps3': 1276, // À vérifier
  'playstation 3': 1276,
  'xbox series': 1277, // À vérifier
  'xbox one': 1278, // À vérifier
  'xbox 360': 1279, // À vérifier
  'wii u': 1280, // À vérifier
  'wii': 1281, // À vérifier
  '3ds': 1282, // À vérifier
  'nintendo 3ds': 1282,
  'ds': 1283, // À vérifier
  'nintendo ds': 1283
}

/**
 * Obtient l'ID de plateforme Vinted depuis un nom de plateforme
 */
function getPlatformId(platform: string | null | undefined): number | null {
  if (!platform) return null
  
  const platformLower = platform.toLowerCase().trim()
  
  // Chercher une correspondance exacte
  if (PLATFORM_IDS[platformLower]) {
    return PLATFORM_IDS[platformLower]
  }
  
  // Chercher une correspondance partielle
  for (const [key, id] of Object.entries(PLATFORM_IDS)) {
    if (platformLower.includes(key) || key.includes(platformLower)) {
      return id
    }
  }
  
  return null
}

/**
 * Génère un search_session_id unique
 */
function generateSearchSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
}

export interface PromotedClosetsParams {
  search_text?: string
  platform?: string | null
  max_price?: number
  per_page?: number
  order?: 'newest_first' | 'price_low_to_high' | 'price_high_to_low'
  status_ids?: string // Ex: "2,1,6" pour disponible, etc.
}

export interface PromotedClosetsResponse {
  items: ApiItem[]
  totalItems: number
}

/**
 * Récupère les items depuis l'API promoted_closets avec filtres
 * 
 * @param session - Session Vinted complète
 * @param params - Paramètres de recherche (titre, plateforme, prix max, etc.)
 * @returns Les items correspondant aux critères
 */
export async function getPromotedClosetsItems(
  session: FullVintedSession,
  params: PromotedClosetsParams = {}
): Promise<PromotedClosetsResponse> {
  const {
    search_text = '',
    platform,
    max_price,
    per_page = 20,
    order = 'newest_first',
    status_ids = '2,1,6' // Disponible par défaut
  } = params

  // Construire l'URL avec les paramètres
  const urlParams = new URLSearchParams()
  urlParams.append('per_page', per_page.toString())
  urlParams.append('screen_name', 'catalog')
  urlParams.append('exclude_member_ids', '')
  urlParams.append('search_session_id', generateSearchSessionId())
  urlParams.append('catalog_ids', '3026') // 3026 = jeux vidéo
  urlParams.append('order', order)
  
  // Ajouter le texte de recherche si fourni
  if (search_text.trim()) {
    urlParams.append('search_text', search_text.trim())
  }
  
  // Ajouter le filtre de plateforme si fourni
  const platformId = getPlatformId(platform)
  if (platformId) {
    urlParams.append('video_game_platform_ids', platformId.toString())
  }
  
  // Ajouter les statuts (disponible, etc.)
  if (status_ids) {
    urlParams.append('status_ids', status_ids)
  }
  
  // Ajouter le filtre de prix max si fourni
  if (max_price && max_price > 0) {
    urlParams.append('price_to', max_price.toString())
  }

  const url = `https://www.vinted.fr/api/v2/promoted_closets?${urlParams.toString()}`
  
  logger.info(`🔍 Promoted closets API: ${url}`)

  try {
    const headers = buildVintedApiHeaders(session)
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
      cache: 'no-store'
    })

    if (!response.ok) {
      const errorText = await response.text()
      logger.error(`❌ Promoted closets API error: ${response.status} ${response.statusText}`, new Error(errorText))
      throw new Error(`API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // La réponse contient promoted_closets avec des items
    // Utiliser une Map pour dédupliquer par ID (le même item peut apparaître dans plusieurs closets)
    const itemsMap = new Map<number, ApiItem>()
    
    if (data.promoted_closets && Array.isArray(data.promoted_closets)) {
      for (const closet of data.promoted_closets) {
        if (closet.items && Array.isArray(closet.items)) {
          for (const item of closet.items) {
            try {
              // Normaliser l'item au format ApiItem
              const apiItem = normalizePromotedClosetItem(item)
              const normalizedItem = normalizeApiItem(apiItem)
              
              // Dédupliquer par ID (garder le premier trouvé)
              if (!itemsMap.has(normalizedItem.id)) {
                itemsMap.set(normalizedItem.id, normalizedItem)
              } else {
                logger.debug(`🔄 Item ${normalizedItem.id} déjà présent, ignoré (doublon dans promoted_closets)`)
              }
            } catch (error) {
              logger.warn(`⚠️ Failed to normalize item ${item.id}`, error as Error)
            }
          }
        }
      }
    }

    const allItems = Array.from(itemsMap.values())
    const duplicatesRemoved = itemsMap.size < (data.promoted_closets?.reduce((acc: number, closet: any) => acc + (closet.items?.length || 0), 0) || 0)
    
    if (duplicatesRemoved) {
      logger.info(`✅ Promoted closets: ${allItems.length} items uniques récupérés (doublons supprimés)`)
    } else {
      logger.info(`✅ Promoted closets: ${allItems.length} items récupérés`)
    }

    return {
      items: allItems,
      totalItems: allItems.length
    }
  } catch (error) {
    logger.error('❌ Error fetching promoted closets', error as Error)
    throw error
  }
}

/**
 * Normalise un item de promoted_closets vers le format ApiItem
 * Basé sur le format réel de l'API promoted_closets
 */
function normalizePromotedClosetItem(item: any): any {
  // Le format de l'item dans promoted_closets selon l'exemple fourni :
  // - price est une string (ex: "27.0")
  // - service_fee est une string (ex: "2.05")
  // - total_item_price est une string (ex: "29.05")
  // - currency est "EUR"
  // - status est la condition (ex: "Très bon état")
  // - photos est un array d'objets photo
  // - photo est l'image principale
  
  const price = parseFloat(item.price || '0')
  const serviceFee = parseFloat(item.service_fee || '0')
  const totalPrice = parseFloat(item.total_item_price || '0')
  
  // Convertir les photos au format attendu
  const photos: any[] = []
  if (item.photos && Array.isArray(item.photos)) {
    photos.push(...item.photos)
  }
  if (item.photo && !photos.find(p => p.id === item.photo.id)) {
    photos.unshift(item.photo) // Ajouter la photo principale en premier
  }
  
  return {
    id: item.id,
    title: item.title,
    url: item.url || `https://www.vinted.fr${item.path || ''}`,
    path: item.path || null,
    price: {
      amount: price,
      currency_code: item.currency || 'EUR'
    },
    service_fee: serviceFee > 0 ? {
      amount: serviceFee,
      currency_code: item.currency || 'EUR'
    } : undefined,
    total_item_price: totalPrice > 0 ? {
      amount: totalPrice,
      currency_code: item.currency || 'EUR'
    } : undefined,
    condition: item.status || null,
    photos: photos,
    photo: item.photo || (photos.length > 0 ? photos[0] : null),
    favourite_count: item.favourite_count || 0,
    is_favourite: item.is_favourite || false,
    view_count: 0, // Pas disponible dans promoted_closets
    user: {
      id: item.user_id,
      login: null, // Pas disponible dans promoted_closets
      profile_url: null,
      business: item.business_user || false,
      photo: null
    },
    can_buy: true, // On assume disponible si dans les résultats filtrés
    can_instant_buy: false,
    is_reserved: false,
    is_hidden: false,
    is_visible: true,
    is_promoted: false,
    brand_title: item.brand_title || null,
    size_title: item.size_title || null,
    item_box: item.item_box || null,
    description: null, // Pas disponible dans promoted_closets
    added_since: null, // Pas disponible dans promoted_closets
    protection_fee: null,
    shipping_fee: null
  }
}

