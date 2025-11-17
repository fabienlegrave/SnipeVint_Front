import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

/**
 * GET /api/v1/stats
 * Récupère les statistiques de l'application
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    // Statistiques générales
    const { count: totalItems } = await supabase
      .from('vinted_items')
      .select('*', { count: 'exact', head: true })

    const { count: favoriteItems } = await supabase
      .from('vinted_items')
      .select('*', { count: 'exact', head: true })
      .eq('is_favorite', true)

    const { count: availableItems } = await supabase
      .from('vinted_items')
      .select('*', { count: 'exact', head: true })
      .eq('can_buy', true)
      .eq('is_reserved', false)

    // Prix moyen
    const { data: priceData } = await supabase
      .from('vinted_items')
      .select('price_amount')
      .not('price_amount', 'is', null)

    const avgPrice = priceData && priceData.length > 0
      ? priceData.reduce((sum, item) => sum + (item.price_amount || 0), 0) / priceData.length
      : 0

    // Prix moyen par plateforme (brand_title)
    const { data: platformData } = await supabase
      .from('vinted_items')
      .select('brand_title, price_amount')
      .not('price_amount', 'is', null)
      .not('brand_title', 'is', null)

    const platformStats: Record<string, { count: number; avgPrice: number }> = {}
    if (platformData) {
      platformData.forEach(item => {
        const platform = item.brand_title || 'Unknown'
        if (!platformStats[platform]) {
          platformStats[platform] = { count: 0, avgPrice: 0 }
        }
        platformStats[platform].count++
        platformStats[platform].avgPrice += item.price_amount || 0
      })

      // Calculer les moyennes
      Object.keys(platformStats).forEach(platform => {
        const stats = platformStats[platform]
        stats.avgPrice = stats.avgPrice / stats.count
      })
    }

    // Items par mois (pour graphique)
    const { data: monthlyData } = await supabase
      .from('vinted_items')
      .select('scraped_at')
      .not('scraped_at', 'is', null)
      .order('scraped_at', { ascending: false })
      .limit(1000) // Limiter pour performance

    const monthlyStats: Record<string, number> = {}
    if (monthlyData) {
      monthlyData.forEach(item => {
        if (item.scraped_at) {
          const date = new Date(item.scraped_at)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          monthlyStats[monthKey] = (monthlyStats[monthKey] || 0) + 1
        }
      })
    }

    // Top 10 jeux les plus recherchés (par titre)
    const { data: titleData } = await supabase
      .from('vinted_items')
      .select('title')
      .not('title', 'is', null)
      .limit(1000)

    const titleCounts: Record<string, number> = {}
    if (titleData) {
      titleData.forEach(item => {
        const title = item.title || ''
        // Extraire le nom du jeu (avant la plateforme)
        const gameTitle = title.split(/switch|ps5|ps4|xbox|pc|game boy|3ds|ds/i)[0].trim()
        if (gameTitle) {
          titleCounts[gameTitle] = (titleCounts[gameTitle] || 0) + 1
        }
      })
    }

    const topGames = Object.entries(titleCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([title, count]) => ({ title, count }))

    // Statistiques des alertes
    const { count: totalAlerts } = await supabase
      .from('price_alerts')
      .select('*', { count: 'exact', head: true })

    const { count: activeAlerts } = await supabase
      .from('price_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    return NextResponse.json({
      general: {
        totalItems: totalItems || 0,
        favoriteItems: favoriteItems || 0,
        availableItems: availableItems || 0,
        avgPrice: Math.round(avgPrice * 100) / 100
      },
      platforms: platformStats,
      monthly: monthlyStats,
      topGames,
      alerts: {
        total: totalAlerts || 0,
        active: activeAlerts || 0
      }
    })
  } catch (error: unknown) {
    logger.error('API error', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

