/**
 * Configuration centralisée des délais entre requêtes
 * Délai unique de 7,5 secondes entre chaque requête API (par défaut)
 * Peut être modifié depuis les settings de l'app
 */

import { supabase } from '@/lib/supabase'

const DEFAULT_REQUEST_DELAY_MS = 15000 // 15 secondes par défaut (plus conservateur pour éviter les 403)
const SETTINGS_KEY = 'request_delay_ms'

// Cache pour éviter de requêter la DB à chaque fois
let cachedDelay: number | null = null
let cacheTimestamp: number = 0
const CACHE_TTL_MS = 60000 // 1 minute de cache

/**
 * Récupère le délai des requêtes depuis la base de données ou utilise la valeur par défaut
 */
export async function getRequestDelayMs(): Promise<number> {
  // Utiliser le cache si disponible et récent
  const now = Date.now()
  if (cachedDelay !== null && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedDelay
  }

  // Vérifier la variable d'environnement en premier (priorité)
  const envDelay = process.env.REQUEST_DELAY_MS
  if (envDelay) {
    const parsed = parseInt(envDelay, 10)
    if (!isNaN(parsed) && parsed >= 1000 && parsed <= 60000) {
      cachedDelay = parsed
      cacheTimestamp = now
      return parsed
    }
  }

  // Essayer de récupérer depuis la base de données
  if (supabase) {
    try {
      const { data: settings } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', SETTINGS_KEY)
        .single()

      if (settings?.value) {
        const parsed = parseInt(settings.value, 10)
        if (!isNaN(parsed) && parsed >= 1000 && parsed <= 60000) {
          cachedDelay = parsed
          cacheTimestamp = now
          return parsed
        }
      }
    } catch (error) {
      // Ignorer les erreurs, utiliser la valeur par défaut
      console.debug('Could not fetch request delay from database, using default')
    }
  }

  // Utiliser la valeur par défaut
  cachedDelay = DEFAULT_REQUEST_DELAY_MS
  cacheTimestamp = now
  return DEFAULT_REQUEST_DELAY_MS
}

/**
 * Invalide le cache (à appeler après une mise à jour)
 */
export function invalidateDelayCache(): void {
  cachedDelay = null
  cacheTimestamp = 0
}

/**
 * Génère un délai avec jitter pour éviter les patterns détectables
 * Délai entre 12 et 25 secondes (base 12s + jitter jusqu'à 13s)
 */
export async function getRequestDelayWithJitter(): Promise<number> {
  const baseDelay = await getRequestDelayMs()
  // Jitter : entre 80% et 160% du délai de base
  // Pour un délai de base de 15s : entre 12s et 24s
  const minMultiplier = 0.8
  const maxMultiplier = 1.6
  const jitter = minMultiplier + Math.random() * (maxMultiplier - minMultiplier)
  const delayWithJitter = Math.round(baseDelay * jitter)
  
  // S'assurer que le délai reste dans une plage raisonnable (12-25s)
  const minDelay = 12000
  const maxDelay = 25000
  return Math.max(minDelay, Math.min(maxDelay, delayWithJitter))
}

/**
 * Valeur par défaut (pour les cas où on ne peut pas faire d'appel async)
 */
export const REQUEST_DELAY_MS = DEFAULT_REQUEST_DELAY_MS

