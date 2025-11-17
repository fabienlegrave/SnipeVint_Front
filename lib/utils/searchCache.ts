/**
 * Utilitaires pour le cache des recherches
 * Permet de générer des clés de cache cohérentes pour React Query
 */

import type { ScrapeSearchRequest } from '../types/core'

/**
 * Génère une clé de cache pour une recherche
 * Utilise les paramètres de recherche pour créer une clé unique
 */
export function getSearchCacheKey(request: ScrapeSearchRequest): string[] {
  const key: string[] = ['search', request.query]
  
  if (request.priceFrom !== undefined) {
    key.push(`priceFrom:${request.priceFrom}`)
  }
  if (request.priceTo !== undefined) {
    key.push(`priceTo:${request.priceTo}`)
  }
  if (request.minRelevanceScore !== undefined) {
    key.push(`minRelevance:${request.minRelevanceScore}`)
  }
  if (request.limit !== undefined) {
    key.push(`limit:${request.limit}`)
  }
  
  return key
}

/**
 * Vérifie si une recherche est en cache
 */
export function isSearchCached(
  queryClient: any,
  request: ScrapeSearchRequest
): boolean {
  const cacheKey = getSearchCacheKey(request)
  const cached = queryClient.getQueryData(cacheKey)
  return cached !== undefined
}

/**
 * Récupère une recherche depuis le cache
 */
export function getCachedSearch(
  queryClient: any,
  request: ScrapeSearchRequest
): any {
  const cacheKey = getSearchCacheKey(request)
  return queryClient.getQueryData(cacheKey)
}

