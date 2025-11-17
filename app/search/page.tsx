'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useSearchHistory } from '@/lib/hooks/useSearchHistory'
import { useSearchCache } from '@/lib/hooks/useSearchCache'
import { useQueryClient } from '@tanstack/react-query'
import { getSearchCacheKey } from '@/lib/utils/searchCache'
import { useToast } from '@/components/ui/toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Navigation } from '@/components/layout/Navigation'
import { TokenManager } from '@/components/TokenManager'
import { useTokenStore } from '@/lib/tokenStore.client'
import { 
  Search, 
  Sparkles, 
  TrendingUp, 
  Filter, 
  X, 
  Star,
  Euro,
  Eye,
  Heart,
  Package,
  AlertCircle,
  MapPin,
  Calendar,
  Truck,
  Zap,
  ExternalLink,
  CheckCircle2,
  Plus,
  Clock,
  Trash2
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { DEFAULT_BLUR_PLACEHOLDER, generateColorPlaceholder } from '@/lib/utils/imagePlaceholder'
import type { ApiItem, ScrapeSearchRequest } from '@/lib/types/core'
import { calculateSmartRelevanceScore } from '@/lib/scrape/smartRelevanceScorer'
import { calculateGemScore } from '@/lib/scrape/gemDetector'
import Link from 'next/link'
import Image from 'next/image'
import { logger } from '@/lib/logger'

const API_SECRET = process.env.NEXT_PUBLIC_API_SECRET || 'vinted_scraper_secure_2024'

interface SearchFilters {
  minRelevanceScore: number
  minGemScore: number
  priceFrom?: number
  priceTo?: number
  showGemsOnly: boolean
  platform?: string
}

type SortOption = 'relevance' | 'price-asc' | 'price-desc' | 'date-asc' | 'date-desc'

async function apiCall(endpoint: string, data: any) {
  const response = await fetch(`/api/v1${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_SECRET
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.details || error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<SearchFilters>({
    minRelevanceScore: 50, // Seuil de pertinence par défaut
    minGemScore: 50,
    showGemsOnly: false
  })
  const { token, fullCookies, isValid } = useTokenStore()
  const [results, setResults] = useState<ApiItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchProgress, setSearchProgress] = useState({ current: 0, total: 100, status: '' })
  const [favoritingIds, setFavoritingIds] = useState<Set<number>>(new Set())
  const [sortBy, setSortBy] = useState<SortOption>('relevance')
  const queryClient = useQueryClient()
  const toast = useToast()
  const searchHistory = useSearchHistory()
  const { cachedData, saveCache, clearCache, matchesCurrentSearch } = useSearchCache()
  const [showHistory, setShowHistory] = useState(false)

  // Calculer hasValidToken avant son utilisation
  const hasValidToken = Boolean(token && token.trim().length > 0 && isValid)

  // Restaurer le cache au chargement si disponible
  useEffect(() => {
    if (cachedData) {
      // Restaurer les paramètres de recherche
      setQuery(cachedData.query)
      setFilters(cachedData.filters)
      setSortBy(cachedData.sortBy)
      setResults(cachedData.results)
      logger.info(`📦 Restored ${cachedData.results.length} cached search results`)
      toast.success(`Restored ${cachedData.results.length} cached results`)
    }
  }, []) // Seulement au montage

  const searchMutation = useMutation({
    mutationFn: async () => {
      if (!token && !fullCookies) {
        throw new Error('Vinted token or cookies required')
      }

      setIsSearching(true)
      setResults([])
      setSearchProgress({ current: 0, total: 100, status: 'Starting search...' })

      // Construire la requête en ajoutant la plateforme si sélectionnée
      let searchQuery = query.trim()
      if (filters.platform) {
        // Ajouter la plateforme à la requête si elle n'est pas déjà présente
        const queryLower = searchQuery.toLowerCase()
        const platformLower = filters.platform.toLowerCase()
        if (!queryLower.includes(platformLower)) {
          searchQuery = `${searchQuery} ${filters.platform}`
        }
      }

      // Log pour debug
      logger.auth.token('Search auth check', {
        hasFullCookies: !!fullCookies,
        fullCookiesLength: fullCookies?.length || 0,
        hasToken: !!token
      })

      const searchRequest: ScrapeSearchRequest = {
        query: searchQuery,
        priceFrom: filters.priceFrom,
        priceTo: filters.priceTo,
        limit: 200, // Chercher plus pour avoir de meilleurs résultats après filtrage
        // Priorité: utiliser les cookies complets si disponibles (évite les erreurs 403)
        fullCookies: fullCookies && fullCookies.trim().length > 0 ? fullCookies : undefined,
        accessToken: (fullCookies && fullCookies.trim().length > 0) ? undefined : token, // Ne pas envoyer le token si on a les cookies complets
        minRelevanceScore: filters.minRelevanceScore
      }

      // Vérifier le cache avant de faire la requête
      const cacheKey = getSearchCacheKey(searchRequest)
      const cachedData = queryClient.getQueryData<ApiItem[]>(cacheKey)
      
      let searchResults: ApiItem[]
      if (cachedData) {
        logger.info('📦 Using cached search results', { query: searchQuery, count: cachedData.length })
        searchResults = cachedData
        setSearchProgress({ current: 100, total: 100, status: 'Using cached results' })
      } else {
        // Estimation de progression pour les recherches multi-pages
        // La recherche peut prendre plusieurs pages, on simule la progression
        const progressInterval = setInterval(() => {
          setSearchProgress(prev => {
            if (prev.current >= 90) return prev // Ne pas dépasser 90% avant la fin
            return {
              ...prev,
              current: Math.min(prev.current + 5, 90),
              status: prev.status || 'Searching pages...'
            }
          })
        }, 500) // Mise à jour toutes les 500ms

        try {
          setSearchProgress({ current: 10, total: 100, status: 'Fetching results from Vinted...' })
          searchResults = await apiCall('/scrape/search', searchRequest)
          
          clearInterval(progressInterval)
          setSearchProgress({ current: 100, total: 100, status: 'Processing results...' })
          
          // Mettre en cache les résultats
          queryClient.setQueryData(cacheKey, searchResults, {
            staleTime: 5 * 60 * 1000, // 5 minutes
          })
        } catch (error) {
          clearInterval(progressInterval)
          throw error
        }
      }
      
      // Exclure les items déjà en base de données
      if (searchResults.length > 0) {
        const ids = searchResults
          .map(item => {
            const id = typeof item.id === 'string' ? parseInt(item.id, 10) : item.id
            return isNaN(id) ? null : id
          })
          .filter((id): id is number => id !== null)
        
        if (ids.length > 0) {
          try {
            const missingResponse = await apiCall('/missing-ids', { ids })
            // Garder seulement les items qui ne sont PAS dans la base (missing)
            const missingIds = new Set(missingResponse.missing)
            const filteredResults = searchResults.filter(item => {
              const itemId = typeof item.id === 'string' ? parseInt(item.id, 10) : item.id
              return missingIds.has(itemId)
            })
            
            logger.info(`🔍 Filtered out ${searchResults.length - filteredResults.length} items already in database`)
            searchResults.length = 0
            searchResults.push(...filteredResults)
          } catch (error) {
            logger.warn('⚠️ Could not filter existing items', error as Error)
            // Continue with all results if filtering fails
          }
        }
      }
      
      // Calculer les scores pour chaque résultat
      const scoredResults = searchResults.map(item => {
        const relevance = calculateSmartRelevanceScore(item, query)
        const gem = calculateGemScore(item)
        return {
          item,
          relevanceScore: relevance.score,
          relevanceReasons: relevance.reasons,
          gemScore: gem.score,
          gemReasons: gem.reasons,
          gemCategory: gem.category
        }
      })

      // Filtrer par pertinence
      let filtered = scoredResults.filter(r => r.relevanceScore >= filters.minRelevanceScore)

      // Filtrer par pépite si demandé
      if (filters.showGemsOnly) {
        filtered = filtered.filter(r => r.gemScore >= filters.minGemScore)
      }

      // Trier par pertinence puis par pépite
      filtered.sort((a, b) => {
        // D'abord par pertinence
        if (Math.abs(a.relevanceScore - b.relevanceScore) > 10) {
          return b.relevanceScore - a.relevanceScore
        }
        // Puis par pépite
        return b.gemScore - a.gemScore
      })

      const finalResults = filtered.map(r => r.item)
      setResults(finalResults)
      setIsSearching(false)
      setSearchProgress({ current: 100, total: 100, status: 'Complete' })

      // Sauvegarder dans le cache persistant
      saveCache({
        query: searchQuery,
        filters,
        sortBy,
        results: finalResults
      })

      // Sauvegarder dans l'historique
      searchHistory.addToHistory({
        query: searchQuery,
        platform: filters.platform,
        priceFrom: filters.priceFrom,
        priceTo: filters.priceTo
      })

      // Notification de succès
      if (filtered.length > 0) {
        toast.success(`Found ${filtered.length} relevant item${filtered.length > 1 ? 's' : ''}`)
      } else {
        toast.warning('No results found. Try adjusting your search criteria.')
      }

      return filtered
    },
    onError: (error) => {
      setIsSearching(false)
      setSearchProgress({ current: 0, total: 100, status: 'Error' })
      logger.error('Search error', error as Error)
      
      // Notification d'erreur
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during search'
      toast.error(errorMessage)
    }
  })

  // Debounce pour éviter les recherches multiples lors de clics rapides
  const handleSearch = useCallback(() => {
    if (!isSearching && hasValidToken && query.trim()) {
      searchMutation.mutate()
    }
  }, [isSearching, hasValidToken, query, searchMutation])

  const debouncedSearchRef = useRef<NodeJS.Timeout | null>(null)
  const debouncedSearch = useCallback(() => {
    if (debouncedSearchRef.current) {
      clearTimeout(debouncedSearchRef.current)
    }
    debouncedSearchRef.current = setTimeout(() => {
      handleSearch()
    }, 300)
  }, [handleSearch])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Navigation />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-3 mb-8">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Vinted Search
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Search and filter items from Vinted
            </p>
          </div>

          {/* Token Management */}
          <TokenManager />

          {/* Search Form */}
          <Card className="border-0 shadow-xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-2xl">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md">
                  <Search className="h-5 w-5 text-white" />
                </div>
                <span className="bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  Search
                </span>
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Filter results by relevance, price, and platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Main Search */}
                <div>
                  <Label htmlFor="query">Search Query *</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <Input
                      id="query"
                      value={query}
                      onChange={(e) => {
                        setQuery(e.target.value)
                        setShowHistory(e.target.value.length === 0 && searchHistory.history.length > 0)
                      }}
                      onFocus={() => {
                        if (searchHistory.history.length > 0) {
                          setShowHistory(true)
                        }
                      }}
                      onBlur={() => {
                        // Délai pour permettre le clic sur un item de l'historique
                        setTimeout(() => setShowHistory(false), 200)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !isSearching && hasValidToken) {
                          searchMutation.mutate()
                          setShowHistory(false)
                        }
                        if (e.key === 'Escape') {
                          setShowHistory(false)
                        }
                      }}
                      placeholder="Ex: Chasm Switch, Zelda Game Boy, Pokémon 3DS..."
                      className="pl-10 h-12 text-lg"
                      disabled={isSearching}
                    />
                    {searchHistory.history.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowHistory(!showHistory)}
                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                        title="Search history"
                      >
                        <Clock className="h-5 w-5" />
                      </button>
                    )}
                    
                    {/* Dropdown Historique */}
                    {showHistory && searchHistory.history.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        <div className="p-2 border-b flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-500">Recent Searches</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              searchHistory.clearHistory()
                              toast.info('Search history cleared')
                            }}
                            className="text-xs text-gray-400 hover:text-gray-600"
                            title="Clear history"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        {searchHistory.history.map((item) => (
                          <div
                            key={item.timestamp}
                            className="w-full px-4 py-2 hover:bg-gray-100 flex items-center justify-between group"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setQuery(item.query)
                                if (item.platform) {
                                  setFilters(prev => ({ ...prev, platform: item.platform }))
                                }
                                if (item.priceFrom !== undefined) {
                                  setFilters(prev => ({ ...prev, priceFrom: item.priceFrom }))
                                }
                                if (item.priceTo !== undefined) {
                                  setFilters(prev => ({ ...prev, priceTo: item.priceTo }))
                                }
                                setShowHistory(false)
                              }}
                              onMouseDown={(e) => e.preventDefault()} // Empêcher onBlur de se déclencher
                              className="flex items-center gap-2 flex-1 min-w-0 text-left"
                            >
                              <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <span className="text-sm truncate">{searchHistory.formatHistoryItem(item)}</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                searchHistory.removeFromHistory(item.timestamp)
                                toast.info('Removed from history')
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded"
                            >
                              <X className="h-3 w-3 text-gray-400" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
                  <div>
                    <Label htmlFor="platform">Platform (optional)</Label>
                    <select
                      id="platform"
                      value={filters.platform || ''}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        platform: e.target.value || undefined 
                      }))}
                      disabled={isSearching}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">All platforms</option>
                      <option value="switch">Nintendo Switch</option>
                      <option value="3ds">Nintendo 3DS</option>
                      <option value="ds">Nintendo DS</option>
                      <option value="wii">Nintendo Wii</option>
                      <option value="wii u">Nintendo Wii U</option>
                      <option value="gamecube">Nintendo GameCube</option>
                      <option value="n64">Nintendo 64</option>
                      <option value="snes">Super Nintendo</option>
                      <option value="nes">Nintendo NES</option>
                      <option value="gameboy">Game Boy</option>
                      <option value="ps5">PlayStation 5</option>
                      <option value="ps4">PlayStation 4</option>
                      <option value="ps3">PlayStation 3</option>
                      <option value="ps2">PlayStation 2</option>
                      <option value="ps1">PlayStation 1</option>
                      <option value="xbox series">Xbox Series X/S</option>
                      <option value="xbox one">Xbox One</option>
                      <option value="xbox 360">Xbox 360</option>
                      <option value="xbox">Xbox</option>
                      <option value="pc">PC</option>
                      <option value="steam">Steam</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="priceFrom">Min Price (€)</Label>
                    <Input
                      id="priceFrom"
                      type="number"
                      value={filters.priceFrom || ''}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        priceFrom: e.target.value ? Number(e.target.value) : undefined 
                      }))}
                      placeholder="0"
                      disabled={isSearching}
                    />
                  </div>
                  <div>
                    <Label htmlFor="priceTo">Max Price (€)</Label>
                    <Input
                      id="priceTo"
                      type="number"
                      value={filters.priceTo || ''}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        priceTo: e.target.value ? Number(e.target.value) : undefined 
                      }))}
                      placeholder="1000"
                      disabled={isSearching}
                    />
                  </div>
                  <div>
                    <Label htmlFor="minRelevance">Min Relevance Score</Label>
                    <Input
                      id="minRelevance"
                      type="number"
                      min="0"
                      max="100"
                      value={filters.minRelevanceScore}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        minRelevanceScore: Number(e.target.value) 
                      }))}
                      disabled={isSearching}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={() => debouncedSearch()}
                      disabled={!query.trim() || isSearching || !hasValidToken}
                      className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
                      size="lg"
                    >
                      {isSearching ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                          Searching...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Search
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                
                {/* Progress Bar */}
                {isSearching && (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>{searchProgress.status || 'Searching...'}</span>
                      <span>{searchProgress.current}%</span>
                    </div>
                    <Progress value={searchProgress.current} className="h-2" />
                  </div>
                )}

                {/* Advanced Filters */}
                <div className="flex items-center gap-4 pt-2 border-t">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.showGemsOnly}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        showGemsOnly: e.target.checked 
                      }))}
                      className="rounded"
                    />
                    <span className="text-sm font-medium flex items-center gap-1">
                      <Sparkles className="h-4 w-4 text-yellow-500" />
                      Best deals only
                    </span>
                  </label>
                  {filters.showGemsOnly && (
                    <div className="flex items-center gap-2">
                      <Label htmlFor="minGem" className="text-sm">Min Deal Score:</Label>
                      <Input
                        id="minGem"
                        type="number"
                        min="0"
                        max="100"
                        value={filters.minGemScore}
                        onChange={(e) => setFilters(prev => ({ 
                          ...prev, 
                          minGemScore: Number(e.target.value) 
                        }))}
                        className="w-20 h-8"
                        disabled={isSearching}
                      />
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {searchMutation.isError && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-800">
                  <AlertCircle className="h-5 w-5" />
                  <span>{searchMutation.error?.message || 'Search error occurred'}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {results.length > 0 && (
            <Card className="border-0 shadow-lg bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center justify-between text-xl">
                  <span className="font-bold">Results ({results.length})</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-sm">
                      Relevance & Value
                    </Badge>
                    {/* Sort buttons */}
                    <div className="flex items-center gap-1 ml-2">
                      <Label htmlFor="sortBy" className="text-sm mr-2">Sort:</Label>
                      <select
                        id="sortBy"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="flex h-8 rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="relevance">Relevance</option>
                        <option value="price-asc">Price ↑</option>
                        <option value="price-desc">Price ↓</option>
                        <option value="date-asc">Date ↑</option>
                        <option value="date-desc">Date ↓</option>
                      </select>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Sorted results */}
                {(() => {
                  // Trier les résultats selon l'option sélectionnée
                  let sortedResults = [...results]
                  
                  switch (sortBy) {
                    case 'price-asc':
                      sortedResults.sort((a, b) => {
                        const priceA = a.price?.amount ?? Infinity
                        const priceB = b.price?.amount ?? Infinity
                        return priceA - priceB
                      })
                      break
                    case 'price-desc':
                      sortedResults.sort((a, b) => {
                        const priceA = a.price?.amount ?? 0
                        const priceB = b.price?.amount ?? 0
                        return priceB - priceA
                      })
                      break
                    case 'date-asc':
                      sortedResults.sort((a, b) => {
                        const dateA = a.added_since ? new Date(a.added_since).getTime() : 0
                        const dateB = b.added_since ? new Date(b.added_since).getTime() : 0
                        return dateA - dateB
                      })
                      break
                    case 'date-desc':
                      sortedResults.sort((a, b) => {
                        const dateA = a.added_since ? new Date(a.added_since).getTime() : Infinity
                        const dateB = b.added_since ? new Date(b.added_since).getTime() : Infinity
                        return dateB - dateA
                      })
                      break
                    case 'relevance':
                    default:
                      // Trier par pertinence (déjà fait dans la mutation)
                      break
                  }
                  
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {sortedResults.map((item) => {
                    const relevance = calculateSmartRelevanceScore(item, query)
                    const gem = calculateGemScore(item)
                    
                    const itemId = typeof item.id === 'string' ? parseInt(item.id, 10) : item.id
                    const isFavoriting = favoritingIds.has(itemId)
                    
                    return (
                      <div key={item.id} className="relative group">
                        <Link href={`/items/${item.id}`}>
                          <Card className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer h-full border-0 shadow-md bg-white dark:bg-gray-800/50 overflow-hidden">
                            <CardContent className="p-0">
                              {/* Image */}
                              <div className="relative w-full h-56 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
                                {item.photos?.[0]?.url ? (
                                  <Image
                                    src={item.photos[0].url}
                                    alt={item.title || 'Item'}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                                    loading="lazy"
                                    placeholder="blur"
                                    blurDataURL={
                                      item.photos[0].dominant_color
                                        ? generateColorPlaceholder(item.photos[0].dominant_color)
                                        : DEFAULT_BLUR_PLACEHOLDER
                                    }
                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <Package className="h-12 w-12" />
                                  </div>
                                )}
                                {/* Multiple photos indicator */}
                                {item.photos && item.photos.length > 1 && (
                                  <Badge className="absolute top-2 left-2 bg-black/60 text-white text-xs">
                                    {item.photos.length} photos
                                  </Badge>
                                )}
                                {/* Deal Badge */}
                                {gem.category === 'excellent' && (
                                  <Badge className="absolute top-2 right-2 bg-yellow-500">
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    Deal
                                  </Badge>
                                )}
                              </div>

                            {/* Title */}
                            <h3 className="font-semibold text-base mb-3 line-clamp-2 min-h-[3rem] text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {item.title}
                            </h3>

                                {/* Price */}
                                <div className="mb-3">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                                      {formatPrice(item.price?.amount || null, item.price?.currency_code)}
                                    </span>
                                {item.total_item_price && item.total_item_price.amount !== item.price?.amount && (
                                  <span className="text-xs text-gray-500">
                                    Total: {formatPrice(item.total_item_price.amount, item.total_item_price.currency_code)}
                                  </span>
                                )}
                              </div>
                              {/* Fees breakdown */}
                              {(item.shipping_fee || item.service_fee) && (
                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                  {item.shipping_fee && (
                                    <span className="flex items-center gap-1">
                                      <Truck className="h-3 w-3" />
                                      +{formatPrice(item.shipping_fee, item.price?.currency_code || 'EUR')}
                                    </span>
                                  )}
                                  {item.service_fee && (
                                    <span>
                                      +{formatPrice(
                                        typeof item.service_fee.amount === 'string' 
                                          ? parseFloat(item.service_fee.amount) 
                                          : item.service_fee.amount,
                                        item.service_fee.currency_code || item.price?.currency_code || 'EUR'
                                      )}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            
                                {/* Seller Info */}
                                {item.seller && (
                                  <div className="mb-2 space-y-1">
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  {item.seller.photo && (
                                    <div className="relative w-6 h-6 rounded-full overflow-hidden bg-gray-200">
                                      {item.seller.photo.thumbnails?.find(t => t.type === 'thumb50')?.url || item.seller.photo.url ? (
                                        <Image
                                          src={item.seller.photo.thumbnails?.find(t => t.type === 'thumb50')?.url || item.seller.photo.url || ''}
                                          alt={item.seller.login}
                                          fill
                                          className="object-cover"
                                          sizes="24px"
                                        />
                                      ) : null}
                                    </div>
                                  )}
                                  <span className="truncate">
                                    {item.seller.business && <Badge variant="outline" className="mr-1 text-xs">Pro</Badge>}
                                    {item.seller.login}
                                  </span>
                                </div>
                                {/* Location */}
                                {item.location && (item.location.city || item.location.country) && (
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <MapPin className="h-3 w-3" />
                                    <span className="truncate">
                                      {[item.location.city, item.location.country].filter(Boolean).join(', ')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            
                                {/* Condition & Status */}
                                <div className="flex flex-wrap items-center gap-2 mb-2 text-xs">
                              {item.condition && (
                                <Badge variant="outline" className="text-xs">
                                  {item.condition}
                                </Badge>
                              )}
                              {item.brand_title && (
                                <Badge variant="secondary" className="text-xs">
                                  {item.brand_title}
                                </Badge>
                              )}
                              {item.size_title && (
                                <Badge variant="secondary" className="text-xs">
                                  {item.size_title}
                                </Badge>
                              )}
                              {item.is_promoted && (
                                <Badge className="bg-purple-500 text-xs">
                                  <Star className="h-3 w-3 mr-1" />
                                  Promoted
                                </Badge>
                              )}
                              {item.can_instant_buy && (
                                <Badge className="bg-blue-500 text-xs">
                                  <Zap className="h-3 w-3 mr-1" />
                                  Instant
                                </Badge>
                              )}
                              {item.favourite_count > 0 && (
                                <span className="text-gray-500 flex items-center gap-1">
                                  <Heart className="h-3 w-3" />
                                  {item.favourite_count}
                                </span>
                              )}
                              {item.view_count > 0 && (
                                <span className="text-gray-500 flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  {item.view_count}
                                </span>
                              )}
                            </div>

                                {/* Scores */}
                                <div className="flex items-center gap-2 mb-3 text-xs">
                                  <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                                    Relevance: {relevance.score.toFixed(0)}%
                                  </Badge>
                                  {gem.score > 0 && (
                                    <Badge className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800">
                                      <Sparkles className="h-3 w-3 mr-1" />
                                      Deal: {gem.score.toFixed(0)}%
                                    </Badge>
                                  )}
                                </div>

                                {/* Availability & Date */}
                                <div className="mt-2 flex items-center justify-between">
                              <div className="flex flex-col gap-1">
                                {/* Afficher seulement "Reserved" si vraiment réservé, sinon rien */}
                                {item.is_reserved && (
                                  <Badge variant="destructive" className="text-xs">
                                    Reserved
                                  </Badge>
                                )}
                                {item.added_since && (
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                      {(() => {
                                        const date = new Date(item.added_since)
                                        const now = new Date()
                                        const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
                                        if (diffDays === 0) return 'Today'
                                        if (diffDays === 1) return 'Yesterday'
                                        if (diffDays < 7) return `${diffDays} days ago`
                                        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
                                        return `${Math.floor(diffDays / 30)} months ago`
                                      })()}
                                    </span>
                                  </div>
                                )}
                              </div>
                              {/* Link to Vinted */}
                              {item.url && (
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Vinted
                                </a>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                      
                      {/* Add to Favorites Button - Outside Link */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-500 dark:hover:border-blue-400 transition-all mt-3"
                        onClick={async (e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          
                          setFavoritingIds(prev => new Set(prev).add(itemId))
                    
                          try {
                            // First save the item to database
                            await apiCall('/upsert', [item])
                            
                            // Then mark as favorite
                            await apiCall('/favorites/toggle', {
                              id: itemId,
                              isFavorite: true
                            })
                            
                            // Remove from results (already in database)
                            setResults(prev => prev.filter(r => {
                              const rId = typeof r.id === 'string' ? parseInt(r.id, 10) : r.id
                              return rId !== itemId
                            }))
                            
                            toast.success('Item added to favorites!')
                          } catch (error) {
                            logger.error('Failed to add favorite', error as Error)
                            toast.error('Failed to add to favorites')
                          } finally {
                            setFavoritingIds(prev => {
                              const newSet = new Set(prev)
                              newSet.delete(itemId)
                              return newSet
                            })
                          }
                        }}
                        disabled={isFavoriting}
                      >
                        {isFavoriting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Add to Favorites
                          </>
                        )}
                      </Button>
                    </div>
                    )
                  })}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          )}

          {results.length === 0 && !isSearching && searchMutation.isSuccess && (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                <p>No results found with the search criteria.</p>
                <p className="text-sm mt-2">Try lowering the minimum relevance score.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

