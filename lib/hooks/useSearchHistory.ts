'use client'

import { useState, useEffect, useCallback } from 'react'

export interface SearchHistoryItem {
  query: string
  platform?: string
  priceFrom?: number
  priceTo?: number
  timestamp: number
}

const SEARCH_HISTORY_KEY = 'vinted_search_history'
const MAX_HISTORY_ITEMS = 20

/**
 * Hook pour gérer l'historique de recherches
 * Sauvegarde automatiquement dans localStorage
 */
export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([])

  // Charger l'historique au montage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(SEARCH_HISTORY_KEY)
        if (stored) {
          const parsed = JSON.parse(stored) as SearchHistoryItem[]
          setHistory(parsed)
        }
      } catch (error) {
        console.error('Error loading search history:', error)
      }
    }
  }, [])

  /**
   * Ajouter une recherche à l'historique
   */
  const addToHistory = useCallback((item: Omit<SearchHistoryItem, 'timestamp'>) => {
    if (typeof window === 'undefined') return

    setHistory(prev => {
      // Retirer les doublons (même query + platform + priceFrom + priceTo)
      const filtered = prev.filter(h => 
        h.query !== item.query ||
        h.platform !== item.platform ||
        h.priceFrom !== item.priceFrom ||
        h.priceTo !== item.priceTo
      )

      // Ajouter le nouvel item en premier
      const newHistory: SearchHistoryItem[] = [
        {
          ...item,
          timestamp: Date.now()
        },
        ...filtered
      ].slice(0, MAX_HISTORY_ITEMS) // Limiter à MAX_HISTORY_ITEMS

      // Sauvegarder dans localStorage
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory))
      } catch (error) {
        console.error('Error saving search history:', error)
      }

      return newHistory
    })
  }, [])

  /**
   * Supprimer un item de l'historique
   */
  const removeFromHistory = useCallback((timestamp: number) => {
    if (typeof window === 'undefined') return

    setHistory(prev => {
      const newHistory = prev.filter(h => h.timestamp !== timestamp)
      
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory))
      } catch (error) {
        console.error('Error saving search history:', error)
      }

      return newHistory
    })
  }, [])

  /**
   * Vider tout l'historique
   */
  const clearHistory = useCallback(() => {
    if (typeof window === 'undefined') return

    setHistory([])
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY)
    } catch (error) {
      console.error('Error clearing search history:', error)
    }
  }, [])

  /**
   * Formater un item d'historique pour affichage
   */
  const formatHistoryItem = useCallback((item: SearchHistoryItem): string => {
    let formatted = item.query
    if (item.platform) {
      formatted += ` (${item.platform})`
    }
    if (item.priceFrom || item.priceTo) {
      const priceRange = []
      if (item.priceFrom) priceRange.push(`≥${item.priceFrom}€`)
      if (item.priceTo) priceRange.push(`≤${item.priceTo}€`)
      formatted += ` [${priceRange.join(' ')}]`
    }
    return formatted
  }, [])

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
    formatHistoryItem
  }
}

