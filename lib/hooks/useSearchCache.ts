/**
 * Hook pour persister les résultats de recherche dans le cache
 */

import { useState, useEffect } from 'react'
import type { ApiItem } from '@/lib/types/core'

interface SearchCacheData {
  query: string
  filters: {
    minRelevanceScore: number
    minGemScore: number
    priceFrom?: number
    priceTo?: number
    showGemsOnly: boolean
    platform?: string
  }
  sortBy: 'relevance' | 'price-asc' | 'price-desc' | 'date-asc' | 'date-desc'
  results: ApiItem[]
  timestamp: number
}

const CACHE_KEY = 'vinted_search_cache'
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

export function useSearchCache() {
  const [cachedData, setCachedData] = useState<SearchCacheData | null>(null)

  // Charger le cache au montage
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const data: SearchCacheData = JSON.parse(cached)
        const now = Date.now()
        
        // Vérifier si le cache est encore valide (30 minutes)
        if (now - data.timestamp < CACHE_DURATION) {
          setCachedData(data)
        } else {
          // Cache expiré, le supprimer
          localStorage.removeItem(CACHE_KEY)
        }
      }
    } catch (error) {
      console.error('Failed to load search cache:', error)
    }
  }, [])

  // Sauvegarder dans le cache
  const saveCache = (data: Omit<SearchCacheData, 'timestamp'>) => {
    try {
      const cacheData: SearchCacheData = {
        ...data,
        timestamp: Date.now()
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
      setCachedData(cacheData)
    } catch (error) {
      console.error('Failed to save search cache:', error)
    }
  }

  // Vider le cache
  const clearCache = () => {
    try {
      localStorage.removeItem(CACHE_KEY)
      setCachedData(null)
    } catch (error) {
      console.error('Failed to clear search cache:', error)
    }
  }

  // Vérifier si le cache correspond aux paramètres actuels
  const matchesCurrentSearch = (
    query: string,
    filters: SearchCacheData['filters'],
    sortBy: SearchCacheData['sortBy']
  ): boolean => {
    if (!cachedData) return false
    
    return (
      cachedData.query === query &&
      cachedData.sortBy === sortBy &&
      cachedData.filters.minRelevanceScore === filters.minRelevanceScore &&
      cachedData.filters.minGemScore === filters.minGemScore &&
      cachedData.filters.showGemsOnly === filters.showGemsOnly &&
      cachedData.filters.platform === filters.platform &&
      cachedData.filters.priceFrom === filters.priceFrom &&
      cachedData.filters.priceTo === filters.priceTo
    )
  }

  return {
    cachedData,
    saveCache,
    clearCache,
    matchesCurrentSearch
  }
}

