'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Navigation } from '@/components/layout/Navigation'
import { BarChart3, TrendingUp, Package, Heart, Euro, Bell, Calendar } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

const API_SECRET = process.env.NEXT_PUBLIC_API_SECRET || 'vinted_scraper_secure_2024'

interface Stats {
  general: {
    totalItems: number
    favoriteItems: number
    availableItems: number
    avgPrice: number
  }
  platforms: Record<string, { count: number; avgPrice: number }>
  monthly: Record<string, number>
  topGames: Array<{ title: string; count: number }>
  alerts: {
    total: number
    active: number
  }
}

async function fetchStats(): Promise<Stats> {
  const response = await fetch('/api/v1/stats', {
    headers: {
      'x-api-key': API_SECRET
    }
  })

  if (!response.ok) {
    throw new Error('Failed to fetch stats')
  }

  return response.json()
}

export default function StatsPage() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-8 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array(4).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-red-600 mb-2">Failed to load statistics</div>
              <p className="text-sm text-gray-600">{error.message}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  // Préparer les données pour les graphiques
  const monthlyData = Object.entries(stats.monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12) // 12 derniers mois
    .map(([month, count]) => ({ month, count }))

  const platformData = Object.entries(stats.platforms)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([platform, data]) => ({
      platform,
      count: data.count,
      avgPrice: Math.round(data.avgPrice * 100) / 100
    }))

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              Statistics & Analytics
            </h1>
            <p className="text-gray-600 mt-1">
              Insights about your Vinted items collection
            </p>
          </div>

          {/* General Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Items</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.general.totalItems}</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-600 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Favorites</p>
                    <p className="text-3xl font-bold text-pink-600">{stats.general.favoriteItems}</p>
                  </div>
                  <Heart className="h-8 w-8 text-pink-600 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Available</p>
                    <p className="text-3xl font-bold text-green-600">{stats.general.availableItems}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-600 opacity-50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Avg Price</p>
                    <p className="text-3xl font-bold text-purple-600">{stats.general.avgPrice.toFixed(2)}€</p>
                  </div>
                  <Euro className="h-8 w-8 text-purple-600 opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Alerts Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Price Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Alerts</span>
                  <span className="font-semibold">{stats.alerts.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Alerts</span>
                  <span className="font-semibold text-green-600">{stats.alerts.active}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Platforms */}
          {platformData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Platforms</CardTitle>
                <CardDescription>Most common platforms and their average prices</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {platformData.map(({ platform, count, avgPrice }) => (
                    <div key={platform} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex-1">
                        <p className="font-semibold">{platform}</p>
                        <p className="text-sm text-gray-600">{count} items</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-blue-600">{avgPrice.toFixed(2)}€</p>
                        <p className="text-xs text-gray-500">avg price</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top Games */}
          {stats.topGames.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Most Searched Games</CardTitle>
                <CardDescription>Top 10 games in your collection</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.topGames.map(({ title, count }, index) => (
                    <div key={title} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 font-semibold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{title}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-700">{count}</p>
                        <p className="text-xs text-gray-500">items</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Monthly Activity */}
          {monthlyData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Monthly Activity
                </CardTitle>
                <CardDescription>Items added per month (last 12 months)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {monthlyData.map(({ month, count }) => (
                    <div key={month} className="flex items-center gap-3">
                      <div className="w-24 text-sm text-gray-600">{month}</div>
                      <div className="flex-1">
                        <div className="h-6 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full flex items-center justify-end pr-2"
                            style={{
                              width: `${(count / Math.max(...monthlyData.map(d => d.count))) * 100}%`
                            }}
                          >
                            <span className="text-xs text-white font-semibold">{count}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

