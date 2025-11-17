'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '../../components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { Navigation } from '@/components/layout/Navigation'
import { EnhancedImage, PhotoGallery } from '@/components/ui/enhanced-image'
import { GPTAnalysis } from '@/components/ui/gpt-analysis'
import { VisionFactsDisplay } from '@/components/ui/vision-facts-display'
import { VisualAnalysisDisplay } from '@/components/ui/visual-analysis'
import { TagManager } from '@/components/ui/tag-manager'
import { ItemComparison } from '@/components/ui/item-comparison'
import { supabaseClient } from '@/lib/supabase'
import { formatPrice, formatDate } from '@/lib/utils'
import { downloadCSV, downloadJSON, generateExportFilename } from '@/lib/utils/export'
import type { VintedItem, VisualAnalysis } from '@/lib/types'
import { Search, ExternalLink, Package, Filter, Import as SortAsc, Dessert as SortDesc, User, Euro, Gamepad2, MapPin, Tag, Brain, Sparkles, RefreshCw, Eye, Star, Heart, X, Download, FileText, GitCompare, Bell } from 'lucide-react'

interface ItemsFilters {
  query: string
  priceMin: string
  priceMax: string
  canBuyOnly: boolean
  showFavoritesOnly: boolean
  showAlertMatchesOnly: boolean
  sortBy: 'scraped_at' | 'price_amount' | 'favourite_count'
  sortOrder: 'desc' | 'asc'
}

async function fetchItems(filters: ItemsFilters): Promise<VintedItem[]> {
  // Si on veut les items trouvés par les alertes, d'abord récupérer les IDs
  let itemIds: number[] | null = null
  if (filters.showAlertMatchesOnly) {
    const { data: matches } = await supabaseClient
      .from('alert_matches')
      .select('item_id')
    
    if (matches && matches.length > 0) {
      itemIds = matches.map(m => m.item_id)
    } else {
      // Aucun match trouvé, retourner un tableau vide
      return []
    }
  }

  let query = supabaseClient
    .from('vinted_items')
    .select('*')

  // Filter by favorites or alert matches
  if (filters.showAlertMatchesOnly && itemIds && itemIds.length > 0) {
    // Items trouvés par les alertes
    query = query.in('id', itemIds)
  } else if (filters.showFavoritesOnly) {
    // Only show favorites
    query = query.eq('is_favorite', true)
  }
  // Si les deux sont false, on affiche tous les items

  // Text search
  if (filters.query.trim()) {
    query = query.or(`title.ilike.%${filters.query}%,description.ilike.%${filters.query}%`)
  }

  // Price filters
  if (filters.priceMin) {
    query = query.gte('price_amount', Number(filters.priceMin))
  }
  if (filters.priceMax) {
    query = query.lte('price_amount', Number(filters.priceMax))
  }

  // Can buy filter
  if (filters.canBuyOnly) {
    query = query.eq('can_buy', true)
  }

  // Sorting
  query = query.order(filters.sortBy, { ascending: filters.sortOrder === 'asc' })

  // Limit results
  query = query.limit(500)

  const { data, error } = await query

  if (error) throw error
  return data || []
}

export default function ItemsPage() {
  const [filters, setFilters] = useState<ItemsFilters>({
    query: '',
    priceMin: '',
    priceMax: '',
    canBuyOnly: false,
    showFavoritesOnly: true, // Par défaut, afficher les favoris
    showAlertMatchesOnly: false,
    sortBy: 'scraped_at',
    sortOrder: 'desc'
  })

  // États pour l'analyse GPT
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectionProgress, setDetectionProgress] = useState(0)
  const [detectionStatus, setDetectionStatus] = useState('')

  const {
    data: items = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['items', filters],
    queryFn: () => fetchItems(filters),
    refetchOnWindowFocus: false,
    staleTime: 30 * 1000 // 30 seconds
  })

  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set())
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())
  const [showComparison, setShowComparison] = useState(false)

  const removeFavorite = async (itemId: number) => {
    setRemovingIds(prev => new Set(prev).add(itemId))
    
    try {
      const API_SECRET = process.env.NEXT_PUBLIC_API_SECRET || 'vinted_scraper_secure_2024'
      const response = await fetch('/api/v1/favorites/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_SECRET
        },
        body: JSON.stringify({
          id: itemId,
          isFavorite: false
        })
      })

      if (!response.ok) {
        throw new Error('Failed to remove favorite')
      }

      // Refresh the list
      refetch()
    } catch (error) {
      console.error('Failed to remove favorite:', error)
    } finally {
      setRemovingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(itemId)
        return newSet
      })
    }
  }

  const stats = useMemo(() => {
    const total = items.length
    const canBuy = items.filter(item => item.can_buy === true).length
    const reserved = items.filter(item => item.is_reserved === true).length
    const avgPrice = items.length > 0 
      ? items.reduce((sum, item) => sum + (item.price_amount || 0), 0) / items.length
      : 0

    return { total, canBuy, reserved, avgPrice }
  }, [items])

  const toggleSort = (field: typeof filters.sortBy) => {
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'desc' ? 'asc' : 'desc'
    }))
  }

  const analyzeWithGPT = async (forceReanalyze = false) => {
    setIsDetecting(true)
    setDetectionProgress(0)
    setDetectionStatus('👁️ Initialisation de l\'analyse Vision-First...')
    
    try {
      // Récupérer les items à analyser (seulement les favoris)
      let query = supabaseClient
        .from('vinted_items')
        .select('id, title, gpt_analyzed_at')
        .eq('is_favorite', true) // Seulement les favoris
        .not('title', 'is', null)
        .order('scraped_at', { ascending: false })
        .limit(50) // Limiter à 50 items pour éviter des coûts trop élevés
      
      // Si pas de force re-analyse, seulement les items pas encore analysés
      if (!forceReanalyze) {
        query = query.or('gpt_analysis.is.null,ai_vision_confidence.lt.0.75')
      }
      
      const { data: itemsToAnalyze, error } = await query
      
      if (error || !itemsToAnalyze || itemsToAnalyze.length === 0) {
        const message = forceReanalyze 
          ? 'Aucun item trouvé dans la base' 
          : 'Aucun nouvel item à analyser (tous déjà analysés)'
        throw new Error(message)
      }

      const itemIds = itemsToAnalyze.map((item: any) => item.id)
      
      const statusPrefix = forceReanalyze ? '🔄 Re-analyse Vision-First' : '👁️ Analyse Vision-First'
      setDetectionStatus(`${statusPrefix} de ${itemIds.length} items en cours...`)
      setDetectionProgress(10)
      
      const response = await fetch('/api/v1/vision/enrich', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.NEXT_PUBLIC_API_SECRET || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemIds, forceReanalyze })
      })
      
      if (response.ok) {
        const result = await response.json()
        setDetectionProgress(100)
        setDetectionStatus(`✨ Analyse Vision-First terminée: ${result.dealsFound} deals trouvés, ${result.visionAnalyses} analyses visuelles sur ${result.processed} items`)
        
        // Attendre un peu pour montrer le succès
        setTimeout(() => {
          refetch() // Recharger les items
          setIsDetecting(false)
          setDetectionProgress(0)
          setDetectionStatus('')
        }, 3000)
      } else {
        const error = await response.json()
        throw new Error(error.details || 'Erreur lors de l\'analyse Vision-First')
      }
    } catch (error) {
      console.error('Error with Vision-First analysis:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setDetectionStatus(`❌ Erreur Vision-First: ${errorMessage}`)
      setTimeout(() => {
        setIsDetecting(false)
        setDetectionProgress(0)
        setDetectionStatus('')
      }, 5000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                {filters.showAlertMatchesOnly ? (
                  <>
                    <Bell className="h-8 w-8 text-green-500" />
                    Alert Matches
                  </>
                ) : filters.showFavoritesOnly ? (
                  <>
                    <Star className="h-8 w-8 text-yellow-500" />
                    Favorite Items
                  </>
                ) : (
                  <>
                    <Package className="h-8 w-8 text-blue-500" />
                    All Items
                  </>
                )}
              </h1>
              <p className="text-gray-600 mt-1">
                {filters.showAlertMatchesOnly 
                  ? 'Items found by your price alerts'
                  : filters.showFavoritesOnly
                  ? 'Browse and manage your favorite items from search results'
                  : 'All items in database'}
              </p>
            </div>
            
            {/* Boutons d'analyse GPT */}
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => analyzeWithGPT()}
                disabled={isDetecting}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
              >
                <Eye className="h-4 w-4 mr-2" />
                {isDetecting ? 'Analyse Vision...' : 'Analyser Nouveaux Items'}
              </Button>
              
              <Button 
                onClick={() => analyzeWithGPT(true)}
                disabled={isDetecting}
                variant="outline"
                className="border-purple-200 text-purple-700 hover:bg-purple-50"
              >
                <Brain className="h-4 w-4 mr-2" />
                Re-analyser Tout
              </Button>

              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              
              {/* Export Buttons */}
              {items.length > 0 && (
                <>
                  <Button 
                    variant="outline"
                    onClick={() => downloadCSV(items, generateExportFilename('favorites', 'csv'))}
                    className="border-green-200 text-green-700 hover:bg-green-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => downloadJSON(items, generateExportFilename('favorites', 'json'))}
                    className="border-blue-200 text-blue-700 hover:bg-blue-50"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Export JSON
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Barre de progression pour l'analyse GPT */}
          {isDetecting && (
            <Card className="border-purple-200 bg-purple-50/50">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-purple-800">
                      {detectionStatus}
                    </span>
                    <span className="text-xs text-purple-600">
                      {detectionProgress}%
                    </span>
                  </div>
                  <Progress value={detectionProgress} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Items</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.canBuy}</div>
                <div className="text-sm text-gray-600">Available</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{stats.reserved}</div>
                <div className="text-sm text-gray-600">Reserved</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatPrice(stats.avgPrice).replace(/[^\d.,]/g, '')}€
                </div>
                <div className="text-sm text-gray-600">Avg Price</div>
              </CardContent>
            </Card>
          </div>

          {/* View Toggle */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                <span className="text-sm font-medium text-gray-700">View:</span>
                <Button
                  variant={filters.showFavoritesOnly && !filters.showAlertMatchesOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilters(prev => ({ 
                    ...prev, 
                    showFavoritesOnly: true, 
                    showAlertMatchesOnly: false 
                  }))}
                >
                  <Star className="h-4 w-4 mr-2" />
                  Favorites
                </Button>
                <Button
                  variant={filters.showAlertMatchesOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilters(prev => ({ 
                    ...prev, 
                    showFavoritesOnly: false, 
                    showAlertMatchesOnly: true 
                  }))}
                  className={filters.showAlertMatchesOnly ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  Alert Matches
                </Button>
                <Button
                  variant={!filters.showFavoritesOnly && !filters.showAlertMatchesOnly ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilters(prev => ({ 
                    ...prev, 
                    showFavoritesOnly: false, 
                    showAlertMatchesOnly: false 
                  }))}
                >
                  <Package className="h-4 w-4 mr-2" />
                  All Items
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 items-end">
                <div>
                  <label className="text-sm font-medium mb-1 block">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search title, description..."
                      value={filters.query}
                      onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Min Price (€)</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.priceMin}
                    onChange={(e) => setFilters(prev => ({ ...prev, priceMin: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Max Price (€)</label>
                  <Input
                    type="number"
                    placeholder="1000"
                    value={filters.priceMax}
                    onChange={(e) => setFilters(prev => ({ ...prev, priceMax: e.target.value }))}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="canBuyOnly"
                    checked={filters.canBuyOnly}
                    onChange={(e) => setFilters(prev => ({ ...prev, canBuyOnly: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="canBuyOnly" className="text-sm font-medium">
                    Available only
                  </label>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant={filters.sortBy === 'scraped_at' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleSort('scraped_at')}
                    className="flex items-center gap-1"
                  >
                    Date
                    {filters.sortBy === 'scraped_at' && (
                      filters.sortOrder === 'desc' ? <SortDesc className="h-3 w-3" /> : <SortAsc className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant={filters.sortBy === 'price_amount' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleSort('price_amount')}
                    className="flex items-center gap-1"
                  >
                    Price
                    {filters.sortBy === 'price_amount' && (
                      filters.sortOrder === 'desc' ? <SortDesc className="h-3 w-3" /> : <SortAsc className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array(6).fill(0).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-48 w-full mb-4 rounded" />
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-4 w-1/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="text-red-600 mb-2">Failed to load items</div>
                <p className="text-sm text-gray-600 mb-4">{error.message}</p>
                <Button onClick={() => refetch()}>Try Again</Button>
              </CardContent>
            </Card>
          )}

          {/* Comparison Mode Banner */}
          {selectedItems.size > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GitCompare className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-900">
                    {selectedItems.size} item{selectedItems.size > 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const selected = items.filter(i => selectedItems.has(i.id))
                      if (selected.length >= 2) {
                        setShowComparison(true)
                      }
                    }}
                    disabled={selectedItems.size < 2}
                  >
                    Compare ({selectedItems.size})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedItems(new Set())}
                  >
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Items Grid */}
          {!isLoading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => {
                const isSelected = selectedItems.has(item.id)
                return (
                  <Card 
                  key={item.id} 
                  className={`overflow-hidden hover:shadow-lg transition-shadow ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
                >
                  {/* Selection Checkbox */}
                  <div className="absolute top-2 right-2 z-10">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        const newSet = new Set(selectedItems)
                        if (e.target.checked) {
                          newSet.add(item.id)
                        } else {
                          newSet.delete(item.id)
                        }
                        setSelectedItems(newSet)
                      }}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <div className="relative h-48 overflow-hidden">
                    <PhotoGallery
                      photos={item.photos_data || undefined}
                      fallbackImages={item.images || undefined}
                      alt={item.title || 'Item image'}
                      className="w-full h-full"
                    />
                    {item.is_reserved && (
                      <Badge className="absolute top-2 left-2 bg-red-600">
                        Reserved
                      </Badge>
                    )}
                    {item.can_buy && !item.is_reserved && (
                      <Badge className="absolute top-2 left-2 bg-green-600">
                        Available
                      </Badge>
                    )}
                  </div>
                  
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <h3 className="font-medium line-clamp-2 min-h-[2.5rem]">
                        {item.title || 'No title'}
                      </h3>
                      
                      {/* Prix et frais */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-bold text-blue-600">
                            {formatPrice(item.price_amount, item.price_currency)}
                          </span>
                          {item.condition && (
                            <Badge variant="outline">
                              {item.condition}
                            </Badge>
                          )}
                        </div>
                        {item.total_item_price_amount && item.total_item_price_amount !== item.price_amount && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Euro className="h-3 w-3" />
                            <span>Total: {formatPrice(item.total_item_price_amount, item.total_item_price_currency || 'EUR')}</span>
                            {item.service_fee_amount && (
                              <span>(+{formatPrice(item.service_fee_amount, item.service_fee_currency || 'EUR')} frais)</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Métadonnées enrichies */}
                      <div className="flex flex-wrap gap-1">
                        {/* Prioriser les données IA Vision */}
                        {((item.ai_vision_confidence >= 0.75 && item.ai_platform) || 
                          (!item.ai_platform && item.detected_platform && item.detected_platform !== 'unknown')) && (
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            <Gamepad2 className="h-3 w-3" />
                            {item.ai_platform || item.detected_platform}
                          </Badge>
                        )}
                        {((item.ai_vision_confidence >= 0.75 && item.ai_condition_grade) || 
                          (!item.ai_condition_grade && item.condition_bucket && item.condition_bucket !== 'unknown')) && (
                          <Badge variant="outline" className="text-xs">
                            {item.ai_condition_grade || item.condition_bucket}
                          </Badge>
                        )}
                        {((item.ai_vision_confidence >= 0.75 && item.ai_region) || 
                          (!item.ai_region && item.detected_region && item.detected_region !== 'unknown')) && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {item.ai_region || item.detected_region}
                          </Badge>
                        )}
                        {item.brand_title && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            {item.brand_title}
                          </Badge>
                        )}
                      </div>

                      {/* Vendeur */}
                      {item.seller_login && (
                        <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded p-2">
                          <User className="h-3 w-3" />
                          <span className="font-medium">{item.seller_login}</span>
                          {item.seller_is_business && (
                            <Badge variant="outline" className="text-xs">PRO</Badge>
                          )}
                        </div>
                      )}

                      {/* Analyse GPT */}
                      {item.ai_vision_confidence >= 0.75 && (
                        <VisionFactsDisplay item={item} compact={true} />
                      )}
                      
                      {item.gpt_analysis && (
                        <GPTAnalysis item={item} compact={true} />
                      )}

                      {/* Analyse GPT compacte */}

                      {/* Jeu normalisé (pour debug) */}
                      {/* Afficher seulement si pas d'analyse IA */}
                      {item.normalized_game_title && !item.gpt_analysis && (!item.ai_vision_confidence || item.ai_vision_confidence < 0.75) && (
                        <div className="text-xs text-gray-500 bg-blue-50 rounded p-1 px-2">
                          🎮 {item.normalized_game_title} (heuristique)
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>♥ {item.favourite_count || 0}</span>
                        <div className="flex items-center gap-2">
                          {item.search_score && (
                            <span className="text-xs">Score: {item.search_score.toFixed(1)}</span>
                          )}
                          <span>{formatDate(item.scraped_at || null)}</span>
                        </div>
                      </div>

                      {/* Tags */}
                      <TagManager itemId={item.id} />

                      <div className="flex gap-2 pt-2">
                        <Button asChild size="sm" variant="outline" className="flex-1">
                          <Link href={`/items/${item.id}`}>
                            View Details
                          </Link>
                        </Button>
                        <Button
                          onClick={(e) => {
                            e.preventDefault()
                            removeFavorite(item.id)
                          }}
                          disabled={removingIds.has(item.id)}
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {removingIds.has(item.id) ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                        <Button asChild size="sm" variant="ghost">
                          <a href={item.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                )
              })}
            </div>
          )}

          {/* No Results */}
          {!isLoading && !error && items.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No favorite items yet</h3>
                <p className="text-gray-600 mb-4">Add items to favorites from search results to see them here.</p>
                <Button asChild>
                  <Link href="/search">Go to Search</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Comparison Modal */}
          {showComparison && (
            <ItemComparison
              items={items.filter(i => selectedItems.has(i.id))}
              onClose={() => {
                setShowComparison(false)
                setSelectedItems(new Set())
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}