/**
 * Vision Writeback - Écriture des faits vision en base de données
 */

import type { VintedItem } from '../types'
import type { VisionFacts } from './vision'

type SupabaseClient = any // Type générique pour Supabase

/**
 * Transforme la réponse Vision en faits structurés
 */
export function visionToPatch(visual: any, fingerprint: string): VisionFacts {
  const v = visual || {}
  const idn = v.item_identification || {}
  const evd = v.vision_evidence || {}
  const comp = v.completeness_assessment || {}
  const phy = v.physical_condition || {}
  const auth = v.authenticity_assessment || {}
  const meta = v.analysis_metadata || {}

  return {
    has_cart: evd.has_cart ?? null,
    has_box: evd.has_box ?? null,
    has_manual: evd.has_manual ?? null,
    has_plastic_case: evd.has_plastic_case ?? null,
    region: idn.region ?? null,
    platform: idn.platform ?? null,
    variant: idn.variant_type ?? null,
    completeness: comp.cib_status ?? "unknown",
    condition_grade: phy.overall_grade ?? "unknown",
    authenticity_risk: Array.isArray(evd.reproduction_risks) ? evd.reproduction_risks : [],
    vision_confidence: Number(auth.confidence_level ?? meta.analysis_confidence ?? 0) || 0,
    raw: v
  }
}

/**
 * Convertit le grade de condition en bucket simple
 */
function conditionGradeToBucket(grade: string | undefined | null): string {
  switch ((grade || "").toLowerCase()) {
    case "mint": return "tb"
    case "near_mint": return "tb"
    case "very_good": return "bon"
    case "good": return "bon"
    case "fair": return "correct"
    case "poor": return "mauvais"
    default: return "bon"
  }
}

/**
 * Convertit la complétude en format peer
 */
function completenessToPeer(completeness: string | undefined | null): string {
  const v = (completeness || "").toLowerCase()
  if (["complete", "near_complete"].includes(v)) return "complete"
  if (["cart_only", "manual_only", "box_only"].includes(v)) return v
  return "partial"
}

/**
 * Construit la peer_key en donnant la priorité aux champs IA si confiance élevée
 */
export function buildPeerKey(item: any, vf: VisionFacts | null) {
  const useVision = vf && (vf.vision_confidence ?? 0) >= 0.75
  
  // PRIORITÉ ABSOLUE aux données Vision - pas de fallback heuristique
  const platform = useVision ? vf!.platform : null
  const region = useVision ? vf!.region : null
  const comp = useVision ? completenessToPeer(vf!.completeness) : (item.completeness || "partial")
  const bucket = useVision ? conditionGradeToBucket(vf!.condition_grade) : "unknown"
  
  // Pour le nom du jeu, extraire proprement du titre sans heuristiques
  const game = extractGameNameFromTitle(item.title) || "unknown"

  const key = [game, platform || "unknown", region || "unknown", comp, bucket]
    .join("|")
    .toLowerCase()

  return {
    peer_platform: platform,
    peer_region: region,
    peer_completeness: comp,
    peer_condition_bucket: bucket,
    peer_key: key
  }
}

/**
 * Extrait le nom du jeu du titre sans heuristiques approximatives
 */
function extractGameNameFromTitle(title: string | null): string | null {
  if (!title) return null
  
  // Nettoyer le titre en gardant seulement l'essentiel
  let cleanTitle = title.toLowerCase()
    // Supprimer les mots-clés de condition/état
    .replace(/\b(complet|cib|complete|boite|boîte|box|neuf|new|sealed|loose|très bon état|bon état|parfait état)\b/g, '')
    // Supprimer les mots-clés génériques
    .replace(/\b(jeu|game|video|retro|vintage|rare|occasion|original|pal|fra|eur|nintendo)\b/g, '')
    // Nettoyer les espaces
    .replace(/\s+/g, ' ')
    .trim()
  
  // Garder seulement les mots significatifs (3+ caractères)
  const words = cleanTitle.split(' ').filter(word => word.length >= 3)
  
  return words.length > 0 ? words.join(' ') : null
}

/**
 * Applique le patch vision en base (idempotent)
 */
export async function applyVisionToItem(
  supabase: SupabaseClient,
  item: any,
  visual: any,
  fingerprint: string
): Promise<number> {
  const vf = visionToPatch(visual, fingerprint)
  const peer = buildPeerKey(item, vf)

  const patch: any = {
    ai_has_cart: vf.has_cart,
    ai_has_box: vf.has_box,
    ai_has_manual: vf.has_manual,
    ai_has_plastic_case: vf.has_plastic_case,
    ai_region: vf.region,
    ai_platform: vf.platform,
    ai_variant: vf.variant,
    ai_completeness: vf.completeness,
    ai_condition_grade: vf.condition_grade,
    ai_authenticity_risk: vf.authenticity_risk,
    ai_vision_confidence: vf.vision_confidence,
    ai_vision_fingerprint: fingerprint,
    visual_analysis: vf.raw,
    ...peer
  }

  console.log(`💾 Applying vision patch for item ${item.id}:`, {
    platform: vf.platform,
    region: vf.region,
    completeness: vf.completeness,
    condition: vf.condition_grade,
    confidence: vf.vision_confidence,
    peer_key: peer.peer_key
  })

  const { data, error } = await supabase
    .from("vinted_items")
    .update(patch)
    .eq("id", item.id)
    .select("id")
    .single()

  if (error) {
    console.error(`Error applying vision patch for item ${item.id}:`, error)
    throw new Error(error.message)
  }

  return data?.id
}

/**
 * Récupère les items similaires basés sur la peer_key
 */
export async function getSimilarItemsByPeerKey(
  supabase: SupabaseClient,
  peerKey: string,
  excludeId?: number,
  limit = 25
): Promise<any[]> {
  if (!peerKey) return []

  let query = supabase
    .from("vinted_items")
    .select("title, price_amount as price, condition, peer_platform as platform, peer_region as region, ai_condition_grade, ai_completeness")
    .eq("peer_key", peerKey)
    .not("price_amount", "is", null)
    .gt("price_amount", 0)
    .limit(limit)

  if (excludeId) {
    query = query.neq("id", excludeId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching similar items by peer key:', error)
    return []
  }

  console.log(`📊 Found ${data?.length || 0} similar items for peer key: ${peerKey}`)
  return data || []
}

/**
 * Vérifie si un item a déjà été analysé visuellement
 */
export function hasValidVisionAnalysis(item: any): boolean {
  return !!(
    item.visual_analysis &&
    item.ai_vision_confidence >= 0.75 &&
    item.ai_vision_fingerprint
  )
}