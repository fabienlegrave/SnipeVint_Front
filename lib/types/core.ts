/**
 * Types principaux de l'application - Version nettoyée
 */

// Types pour les photos Vinted avec métadonnées complètes
export interface VintedThumbnail {
  type: string
  url: string
  width: number
  height: number
  original_size?: boolean | null
  // Permet de trouver rapidement la meilleure taille pour l'affichage
}

export interface VintedPhoto {
  id: number
  image_no?: number
  width: number
  height: number
  dominant_color?: string
  dominant_color_opaque?: string
  url: string
  is_main?: boolean
  thumbnails: VintedThumbnail[]
  high_resolution?: {
    id: string
    timestamp: number
    orientation?: number | string | null // Peut être un nombre (0, 90, etc.) ou string
  }
  orientation?: number | string | null // Orientation directe de la photo
  is_suspicious?: boolean
  full_size_url?: string
  is_hidden?: boolean
  extra?: any
}

// Types pour les vendeurs
export interface VintedSeller {
  id: number
  login: string
  profile_url: string
  photo?: VintedPhoto | null
  business: boolean
}

// Item principal de l'application
export interface VintedItem {
  id: number
  url: string
  title?: string | null
  price_amount?: number | null
  price_currency?: string
  can_buy?: boolean | null
  can_instant_buy?: boolean | null
  is_reserved?: boolean | null
  is_hidden?: boolean | null
  protection_fee_amount?: number | null
  protection_fee_note?: string | null
  shipping_fee?: number | null
  condition?: string | null
  added_since?: string | null
  description?: string | null
  images?: string[] | null
  photos_data?: VintedPhoto[] | null
  view_count?: number
  favourite_count?: number
  
  // Données vendeur
  seller_id?: number | null
  seller_login?: string | null
  seller_profile_url?: string | null
  seller_photo_url?: string | null
  seller_is_business?: boolean | null
  
  // Frais et prix
  service_fee_amount?: number | null
  service_fee_currency?: string | null
  total_item_price_amount?: number | null
  total_item_price_currency?: string | null
  
  // Métadonnées Vinted
  is_visible?: boolean | null
  is_promoted?: boolean | null
  brand_title?: string | null
  size_title?: string | null
  content_source?: string | null
  
  // Métadonnées de recherche
  search_score?: number | null
  matched_queries?: string[] | null
  
  // Analyse GPT
  gpt_analysis?: any | null
  gpt_confidence?: number | null
  gpt_recommendation?: string | null
  estimated_market_value?: number | null
  gpt_analyzed_at?: string | null
  
  // Analyse visuelle GPT Vision
  visual_analysis?: VisualAnalysis | null
  visual_analyzed_at?: string | null
  
  // Champs Vision IA (nouveaux)
  ai_has_cart?: boolean | null
  ai_has_box?: boolean | null
  ai_has_manual?: boolean | null
  ai_has_plastic_case?: boolean | null
  ai_region?: string | null
  ai_platform?: string | null
  ai_variant?: string | null
  ai_completeness?: string | null
  ai_condition_grade?: string | null
  ai_authenticity_risk?: string[] | null
  ai_vision_confidence?: number | null
  ai_vision_fingerprint?: string | null
  
  // Système Peer Key
  peer_platform?: string | null
  peer_region?: string | null
  peer_completeness?: string | null
  peer_condition_bucket?: string | null
  peer_key?: string | null
  
  // Favoris
  is_favorite?: boolean | null
  
  raw?: any
  scraped_at?: string
}

// Interface pour l'API (format d'échange)
export interface ApiItem {
  id: number
  url: string
  path?: string | null // Path de l'item (ex: /items/6923345707-playstation-4-panzer-paladin)
  title?: string | null
  price?: {
    amount: number | null
    currency_code: string
  }
  can_buy?: boolean | null
  can_instant_buy?: boolean | null
  is_reserved?: boolean | null
  is_hidden?: boolean | null
  protection_fee?: {
    amount: number | null
    note: string | null
  } | null
  shipping_fee?: number | null
  condition?: string | null
  added_since?: string | null
  description?: string | null
  images?: string[]
  photos?: VintedPhoto[]
  view_count?: number
  favourite_count?: number
  seller?: VintedSeller
  service_fee?: {
    amount: string | number
    currency_code: string
  }
  total_item_price?: {
    amount: string | number
    currency_code: string
  }
  is_visible?: boolean
  is_promoted?: boolean
  brand_title?: string
  size_title?: string
  content_source?: string
  category_id?: number | null
  catalog_id?: number | null
  location?: {
    city?: string | null
    country?: string | null
    country_code?: string | null
  } | null
  search_tracking_params?: {
    score?: number
    matched_queries?: any[]
  } | null
  is_favourite?: boolean
  item_box?: {
    first_line?: string | null
    second_line?: string | null
    accessibility_label?: string | null
    item_id?: number | null
    exposures?: any[] // Exposures de l'item
    badge?: {
      title?: string | null
    } | null
  } | null
  conversion?: any | null
  raw?: any
  scraped_at?: string
}

// Interface pour l'analyse visuelle
export interface VisualAnalysis {
  item_identification: {
    platform: string
    region: 'PAL' | 'NTSC' | 'NTSC-J' | 'UNKNOWN'
    title_detected?: string
    variant_type: 'standard' | 'special_edition' | 'players_choice' | 'greatest_hits' | 'collectors_edition' | 'other'
    variant_details?: string
    cover_variant?: string
  }
  
  vision_evidence: {
    has_cart: boolean
    has_box: boolean
    has_manual: boolean
    has_plastic_case?: boolean
    extra_inserts: string[]
    missing_candidates: string[]
    condition_signs: string[]
    authenticity_markers: string[]
    reproduction_risks: string[]
    technical_details: string[]
  }
  
  completeness_assessment: {
    cib_status: 'complete_cib' | 'near_complete' | 'partial' | 'loose_only' | 'box_only' | 'manual_only'
    completeness_percentage: number
    critical_missing?: string[]
    bonus_items?: string[]
  }
  
  physical_condition: {
    overall_grade: 'mint' | 'near_mint' | 'very_good' | 'good' | 'fair' | 'poor'
    cartridge_condition?: {
      grade: 'mint' | 'near_mint' | 'very_good' | 'good' | 'fair' | 'poor'
      label_condition: string
      contacts_condition: string
      shell_condition: string
    }
    box_condition?: {
      grade: 'mint' | 'near_mint' | 'very_good' | 'good' | 'fair' | 'poor'
      corners_condition: string
      spine_condition: string
      artwork_condition: string
    }
    manual_condition?: {
      grade: 'mint' | 'near_mint' | 'very_good' | 'good' | 'fair' | 'poor'
      pages_condition: string
      binding_condition: string
    }
    wear_patterns: string[]
    damage_inventory: string[]
  }
  
  authenticity_assessment: {
    is_authentic: boolean
    confidence_level: number
    logo_alignment: 'correct' | 'suspect' | 'unknown'
    print_quality: 'original' | 'reproduction' | 'unknown'
    material_quality: 'authentic' | 'cheap_repro' | 'unknown'
    positive_signs: string[]
    warning_signs: string[]
    verification_needed: string[]
  }
  
  rarity_assessment: {
    market_position: 'common' | 'uncommon' | 'rare' | 'very_rare' | 'grail'
    rarity_factors: string[]
    condition_premium: number
    regional_premium: number
    completeness_premium: number
  }
  
  expert_recommendations: {
    things_to_verify: string[]
    red_flags: string[]
    value_drivers: string[]
    collector_notes: string[]
  }
  
  analysis_metadata: {
    photos_analyzed: number
    photo_quality_scores: number[]
    analysis_confidence: number
    analysis_depth: 'basic' | 'detailed' | 'expert'
    key_observations: string[]
    analysis_limitations: string[]
  }
}

// Interfaces pour les requêtes API
export interface SearchParams {
  query: string
  priceFrom?: number
  priceTo?: number
  limit?: number
}

export interface MissingIdsResponse {
  missing: number[]
  existing: number[]
}

export interface UpsertResponse {
  ok: boolean
  upserted: number
}

export interface ScrapeSearchRequest {
  query: string
  priceFrom?: number
  priceTo?: number
  limit?: number
  token?: string
  fullCookies?: string // Cookies complets du navigateur (recommandé pour éviter 403)
  minRelevanceScore?: number
}

export interface ScrapeEnrichRequest {
  ids: number[]
  searchResults?: ApiItem[]
}