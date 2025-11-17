/**
 * Module standalone pour vérifier les alertes
 * Peut être utilisé par le worker GitHub Actions sans dépendre de l'API HTTP
 */

import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { getPromotedClosetsItems } from '@/lib/scrape/promotedClosets'
import { createFullSessionFromCookies } from '@/lib/scrape/fullSessionManager'
import { extractSmartKeywords } from '@/lib/scrape/smartRelevanceScorer'
import { vintedItemToApiItem } from '@/lib/utils/vintedItemToApiItem'
import type { VintedItem, ApiItem } from '@/lib/types/core'

interface PriceAlert {
  id: number
  game_title: string
  platform: string | null
  max_price: number
  is_active: boolean
  triggered_count: number
  triggered_at: string | null
}

interface AlertMatch {
  alertId: number
  alertTitle: string
  item: ApiItem | VintedItem
  matchReason: string
}

interface CheckAlertsResult {
  success: boolean
  checkedAt: string
  alertsChecked: number
  itemsChecked: number
  totalItemsChecked?: number
  matches: Array<{
    alertId: number
    alertTitle: string
    matchReason: string
    item: ApiItem
  }>
  updatedAlerts: number[]
  stats?: {
    skippedUnavailable: number
    skippedPrice: number
    skippedPlatform: number
    skippedTitle: number
  }
  debugInfo?: Array<{
    alert: string
    item: string
    reason: string
  }>
  error?: string
}

/**
 * Normalise un texte pour le matching (supprime accents, ponctuation, etc.)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprime les accents
    .replace(/[^\w\s]/g, ' ') // Remplace la ponctuation par des espaces
    .replace(/\s+/g, ' ') // Normalise les espaces
    .trim()
}

/**
 * Calcule la similarité entre deux textes (0-1)
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(normalizeText(text1).split(/\s+/))
  const words2 = new Set(normalizeText(text2).split(/\s+/))
  
  const intersection = new Set([...words1].filter(x => words2.has(x)))
  const union = new Set([...words1, ...words2])
  
  return union.size > 0 ? intersection.size / union.size : 0
}

/**
 * Vérifie si un item correspond à une alerte
 * Accepte ApiItem ou VintedItem
 */
function matchesAlert(item: ApiItem | VintedItem, alert: PriceAlert): { matches: boolean; reason: string } {
  // Normaliser le prix selon le type d'item
  const itemPrice = 'price_amount' in item 
    ? (item.price_amount || 0) // VintedItem
    : (item.price?.amount || 0) // ApiItem
  if (itemPrice > alert.max_price) {
    return { matches: false, reason: `Price too high: ${itemPrice}€ > ${alert.max_price}€` }
  }

  // Vérifier si l'item est disponible
  const isReserved = 'is_reserved' in item ? item.is_reserved : item.is_reserved
  const canBuy = 'can_buy' in item ? item.can_buy : item.can_buy
  if (isReserved === true || canBuy === false) {
    return { matches: false, reason: `Item not available (reserved: ${isReserved}, can_buy: ${canBuy})` }
  }

  const itemTitle = (item.title || '').toLowerCase()
  const itemDescription = ('description' in item && item.description ? item.description : '').toLowerCase()
  const itemText = `${itemTitle} ${itemDescription}`.toLowerCase()
  const normalizedItemText = normalizeText(itemText)

  // Extraire les mots-clés de l'alerte
  const alertKeywords = extractSmartKeywords(alert.game_title)
  const alertTitleLower = alert.game_title.toLowerCase()
  const normalizedAlertTitle = normalizeText(alert.game_title)

  // Détecter la plateforme depuis l'alerte (soit depuis alert.platform, soit depuis le titre)
  const platformVariants: Record<string, string[]> = {
    'switch': ['switch', 'swicth', 'swich', 'nintendo switch'],
    'playstation 5': ['ps5', 'playstation 5', 'playstation5'],
    'playstation 4': ['ps4', 'playstation 4', 'playstation4'],
    'playstation 3': ['ps3', 'playstation 3', 'playstation3'],
    'xbox series': ['xbox series', 'xbox series x', 'xbox series s'],
    'xbox one': ['xbox one'],
    'xbox 360': ['xbox 360'],
    'wii u': ['wii u', 'wiiu'],
    'wii': ['wii'],
    '3ds': ['3ds', 'nintendo 3ds'],
    'ds': ['ds', 'nintendo ds']
  }

  // Si une plateforme est spécifiée dans l'alerte, la vérifier
  const platformToCheck = alert.platform || alertKeywords.platform[0]
  if (platformToCheck) {
    const platformLower = platformToCheck.toLowerCase()
    
    const normalizedPlatform = Object.keys(platformVariants).find(
      key => key.toLowerCase() === platformLower || platformVariants[key].includes(platformLower)
    ) || platformLower

    const variants = platformVariants[normalizedPlatform] || [platformLower]
    const platformMatch = variants.some(variant => normalizedItemText.includes(variant))

    if (!platformMatch) {
      return { matches: false, reason: `Platform doesn't match: expected "${platformToCheck}"` }
    }
  }

  // Vérifier le titre du jeu - Approche plus flexible
  let titleMatch = false
  let matchReason = ''

  // 1. Vérifier si le titre de l'alerte (sans plateforme) est présent dans l'item
  const alertWords = normalizedAlertTitle.split(/\s+/).filter(w => {
    // Exclure les plateformes et mots communs
    const commonWords = ['jeu', 'game', 'pour', 'sur', 'the', 'le', 'la', 'de', 'du', 'et', 'ou']
    const isPlatform = alertKeywords.platform.some(p => {
      const platformWords = p.split(/\s+/)
      return platformWords.some(pw => w.includes(pw) || pw.includes(w))
    })
    // Inclure les mots de 2+ caractères, les numéros, et exclure les plateformes/mots communs
    return (w.length >= 2 || /^\d+$/.test(w)) && !commonWords.includes(w) && !isPlatform
  })

  if (alertWords.length > 0) {
    // Vérifier si tous les mots significatifs de l'alerte sont présents dans l'item
    const matchingWords = alertWords.filter(word => {
      // Accepter les mots de 2+ caractères ou les numéros
      if (word.length >= 2 || /^\d+$/.test(word)) {
        return normalizedItemText.includes(word)
      }
      return false
    })

    // Si au moins 70% des mots significatifs sont présents, c'est un match
    const matchRatio = matchingWords.length / alertWords.length
    if (matchRatio >= 0.7) {
      titleMatch = true
      matchReason = `Title match: ${matchingWords.length}/${alertWords.length} words found`
    } else if (matchingWords.length >= 2) {
      // Si au moins 2 mots sont trouvés, c'est aussi un match (pour les titres courts)
      titleMatch = true
      matchReason = `Title match: ${matchingWords.length} key words found`
    }
  }

  // 2. Fallback: utiliser extractSmartKeywords si disponible
  if (!titleMatch && alertKeywords.gameTitle) {
    const gameTitleWords = alertKeywords.gameTitle.split(/\s+/).filter(w => w.length > 1)
    if (gameTitleWords.length > 0) {
      const matchingWords = gameTitleWords.filter(word => normalizedItemText.includes(word))
      // Accepter si au moins 60% des mots sont présents ou au moins 2 mots
      if (matchingWords.length >= Math.max(2, Math.ceil(gameTitleWords.length * 0.6))) {
        titleMatch = true
        matchReason = `Title match (keywords): ${matchingWords.length}/${gameTitleWords.length} words`
      }
    }
  }

  // 3. Fallback final: vérifier la similarité globale
  if (!titleMatch) {
    const similarity = calculateSimilarity(alertTitleLower, itemText)
    if (similarity >= 0.3) { // 30% de similarité minimum
      titleMatch = true
      matchReason = `Title match (similarity): ${Math.round(similarity * 100)}%`
    }
  }

  if (!titleMatch) {
    return { 
      matches: false, 
      reason: `Title doesn't match: "${item.title}" vs "${alert.game_title}" (alert words: ${alertWords.join(', ')})` 
    }
  }

  return { 
    matches: true, 
    reason: `Match found: ${item.title} at ${itemPrice}€ (max: ${alert.max_price}€) - ${matchReason}` 
  }
}

/**
 * Vérifie les alertes actives en utilisant les cookies fournis
 * Version standalone qui peut être utilisée par le worker GitHub Actions
 */
export async function checkAlertsStandalone(fullCookies: string): Promise<CheckAlertsResult> {
  try {
    if (!fullCookies) {
      return {
        success: false,
        checkedAt: new Date().toISOString(),
        alertsChecked: 0,
        itemsChecked: 0,
        matches: [],
        updatedAlerts: [],
        error: 'Missing cookies: fullCookies is required'
      }
    }

    if (!supabase) {
      return {
        success: false,
        checkedAt: new Date().toISOString(),
        alertsChecked: 0,
        itemsChecked: 0,
        matches: [],
        updatedAlerts: [],
        error: 'Database not available'
      }
    }

    logger.info('🔔 Début de la vérification des alertes (standalone)...')

    // 1. Récupérer les alertes actives
    const { data: alerts, error: alertsError } = await supabase
      .from('price_alerts')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (alertsError) {
      logger.db.error('Get active alerts', alertsError)
      return {
        success: false,
        checkedAt: new Date().toISOString(),
        alertsChecked: 0,
        itemsChecked: 0,
        matches: [],
        updatedAlerts: [],
        error: 'Database error: ' + alertsError.message
      }
    }

    if (!alerts || alerts.length === 0) {
      logger.info('ℹ️ Aucune alerte active trouvée')
      return {
        success: true,
        checkedAt: new Date().toISOString(),
        alertsChecked: 0,
        itemsChecked: 0,
        matches: [],
        updatedAlerts: []
      }
    }

    logger.info(`📋 ${alerts.length} alertes actives à vérifier`)

    // 2. Créer la session
    const session = createFullSessionFromCookies(fullCookies)

    // 3. Pour chaque alerte, requêter directement l'API promoted_closets avec les filtres appropriés
    const matches: AlertMatch[] = []
    const updatedAlerts: number[] = []
    const debugLogs: Array<{ alert: string; item: string; reason: string }> = []

    let totalChecked = 0
    let skippedUnavailable = 0
    let skippedPrice = 0
    let skippedTitle = 0
    let skippedPlatform = 0

    for (const alert of alerts) {
      logger.info(`🔍 Vérification alerte: "${alert.game_title}" (platform: ${alert.platform || 'any'}, max: ${alert.max_price}€)`)
      
      try {
        // Construire les paramètres de recherche pour cette alerte
        const searchParams = {
          search_text: alert.game_title,
          platform: alert.platform,
          max_price: alert.max_price,
          per_page: 50, // Récupérer jusqu'à 50 items par alerte
          order: 'newest_first' as const,
          status_ids: '2,1,6' // Disponible
        }

        // Récupérer les items filtrés depuis l'API
        const { items } = await getPromotedClosetsItems(session, searchParams)
        
        logger.info(`📦 ${items.length} items récupérés pour l'alerte "${alert.game_title}"`)

        // Vérifier chaque item (le matching est déjà largement fait par l'API, mais on vérifie quand même)
        for (const item of items) {
          totalChecked++
          const matchResult = matchesAlert(item, alert)
          
          // Compter les raisons de non-match pour statistiques
          if (!matchResult.matches) {
            if (matchResult.reason.includes('not available')) {
              skippedUnavailable++
            } else if (matchResult.reason.includes('Price too high')) {
              skippedPrice++
            } else if (matchResult.reason.includes("Platform doesn't match")) {
              skippedPlatform++
            } else if (matchResult.reason.includes("Title doesn't match")) {
              skippedTitle++
            }
          }
          
          // Log pour debug (limité aux 20 premiers non-matches pour éviter trop de logs)
          if (!matchResult.matches && debugLogs.length < 20) {
            debugLogs.push({
              alert: alert.game_title,
              item: item.title || 'No title',
              reason: matchResult.reason
            })
          }
          
          if (matchResult.matches) {
            // Vérifier si cet item n'a pas déjà été ajouté (déduplication par ID)
            const existingMatch = matches.find(m => m.item.id === item.id)
            if (!existingMatch) {
              matches.push({
                alertId: alert.id,
                alertTitle: alert.game_title,
                item,
                matchReason: matchResult.reason
              })

              // Enregistrer le match dans la table de liaison
              try {
                const { error: matchError } = await supabase
                  .from('alert_matches')
                  .upsert({
                    alert_id: alert.id,
                    item_id: item.id,
                    match_reason: matchResult.reason
                  }, {
                    onConflict: 'alert_id,item_id',
                    ignoreDuplicates: false
                  })

                if (matchError) {
                  logger.warn(`⚠️ Failed to save alert match for alert ${alert.id} / item ${item.id}`, matchError)
                }
              } catch (error) {
                logger.warn(`⚠️ Error saving alert match`, error as Error)
              }
            } else {
              logger.debug(`🔄 Item ${item.id} (${item.title}) déjà dans les matches, ignoré`)
            }

            // Mettre à jour l'alerte (incrémenter triggered_count et mettre à jour triggered_at)
            const { error: updateError } = await supabase
              .from('price_alerts')
              .update({
                triggered_count: (alert.triggered_count || 0) + 1,
                triggered_at: new Date().toISOString()
              })
              .eq('id', alert.id)

            if (updateError) {
              logger.db.error(`Failed to update alert ${alert.id}`, updateError)
            } else {
              updatedAlerts.push(alert.id)
              const itemPrice = 'price_amount' in item ? item.price_amount : item.price?.amount
              logger.info(`✅ Alerte "${alert.game_title}" déclenchée pour item: ${item.title} (${itemPrice || 'N/A'}€) - ${matchResult.reason}`)
            }
          }
        }
      } catch (error) {
        logger.error(`❌ Erreur lors de la vérification de l'alerte "${alert.game_title}"`, error as Error)
        // Continuer avec les autres alertes même si une échoue
      }
    }

    logger.info(`📊 Statistiques de vérification: ${totalChecked} items vérifiés - ${skippedUnavailable} non-disponibles, ${skippedPrice} prix trop élevés, ${skippedPlatform} plateforme non-match, ${skippedTitle} titre non-match, ${matches.length} matches`)

    logger.info(`🎯 Vérification terminée: ${matches.length} match(s) trouvé(s) pour ${alerts.length} alerte(s)`)
    
    // Log quelques exemples de non-matches pour debug
    if (matches.length === 0 && debugLogs.length > 0) {
      logger.warn(`⚠️ Aucun match trouvé. Exemples de vérifications:`, debugLogs.slice(0, 5))
    }

    return {
      success: true,
      checkedAt: new Date().toISOString(),
      alertsChecked: alerts.length,
      itemsChecked: totalChecked,
      totalItemsChecked: totalChecked,
      matches: matches.map(m => ({
        alertId: m.alertId,
        alertTitle: m.alertTitle,
        matchReason: m.matchReason,
        item: 'price_amount' in m.item 
          ? vintedItemToApiItem(m.item as VintedItem) // Convertir VintedItem en ApiItem
          : m.item as ApiItem // Déjà un ApiItem
      })),
      updatedAlerts,
      stats: {
        skippedUnavailable,
        skippedPrice,
        skippedPlatform,
        skippedTitle
      },
      debugInfo: matches.length === 0 ? debugLogs.slice(0, 10) : undefined // Inclure des infos de debug si aucun match
    }

  } catch (error) {
    logger.error('Erreur lors de la vérification des alertes (standalone)', error as Error)
    return {
      success: false,
      checkedAt: new Date().toISOString(),
      alertsChecked: 0,
      itemsChecked: 0,
      matches: [],
      updatedAlerts: [],
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

