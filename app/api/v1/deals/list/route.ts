import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Deals List API called')

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const minScore = parseInt(searchParams.get('min_score') || '0')

    console.log(`📊 Query params: limit=${limit}, minScore=${minScore}`)

    if (!supabase) {
      console.error('❌ Database not available')
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    // Récupérer les deals depuis votre table existante - d'abord sans filtre sur score
    let query = supabase
      .from('vinted_items')
      .select(`
        id,
        url,
        title,
        price_amount,
        price_currency,
        images,
        photos_data,
        condition,
        description,
        favourite_count,
        can_buy,
        is_reserved,
        deal_score,
        deal_reason,
        deal_detected_at,
        scraped_at
      `)
      .eq('is_deal', true)
      // Note: deal_score peut être TEXT, on filtera après
      .limit(limit * 2) // Plus large pour filtrer après

    console.log('🔍 Executing database query...')
    const { data: deals, error } = await query

    console.log(`🔍 Deals API: Found ${deals?.length || 0} deals in database`)
    console.log('📋 First deal sample:', deals?.[0] ? {
      id: deals[0].id,
      title: deals[0].title,
      deal_score: deals[0].deal_score,
      can_buy: deals[0].can_buy,
      is_reserved: deals[0].is_reserved
    } : 'No deals found')

    if (error) {
      console.error('❌ Database error:', error)
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 })
    }

    console.log('🔧 Starting filtering and transformation...')
    // Filtrer et trier les deals (car deal_score peut être TEXT)
    const filteredDeals = (deals || [])
      .map(item => ({
        ...item,
        parsedDealScore: typeof item.deal_score === 'string' ? parseFloat(item.deal_score) : item.deal_score
      }))
      .filter(item => !isNaN(item.parsedDealScore) && item.parsedDealScore >= minScore)
      .sort((a, b) => b.parsedDealScore - a.parsedDealScore)
      .slice(0, limit)

    console.log(`🔍 After filtering: ${filteredDeals.length} deals match criteria (score >= ${minScore})`)

    // Transformer en format compatible avec votre interface deals
    const transformedDeals = filteredDeals.map(item => {
      const dealScore = item.parsedDealScore
      
      return {
        id: `deal_${item.id}`,
        originalItem: {
          id: item.id,
          url: item.url,
          title: item.title,
          price: {
            amount: typeof item.price_amount === 'string' ? parseFloat(item.price_amount) : item.price_amount,
            currency_code: item.price_currency || 'EUR'
          },
          images: item.images || [],
          condition: item.condition,
          can_buy: item.can_buy,
          favourite_count: item.favourite_count,
          scraped_at: item.scraped_at
        },
        dealScore: {
          score: dealScore,
          level: getDealLevel(dealScore),
          icon: getDealIcon(dealScore),
          savings: {
            amount: 0,
            percentage: 0,
            currency: 'EUR'
          },
          factors: [item.deal_reason]
        },
        analyzedAt: item.deal_detected_at || item.scraped_at,
        needsManualReview: dealScore < 60,
        reviewReason: dealScore < 60 ? 'Score faible - vérification recommandée' : undefined
      }
    })

    console.log(`✅ Transformed ${transformedDeals.length} deals`)

    // Stats simples
    const stats = {
      totalDeals: transformedDeals.length,
      greatDeals: transformedDeals.filter(d => d.dealScore?.score >= 70).length,
      totalSavings: 0, // À implémenter plus tard
      avgScore: transformedDeals.length > 0 
        ? transformedDeals.reduce((sum, d) => sum + (d.dealScore?.score || 0), 0) / transformedDeals.length 
        : 0
    }

    console.log('📊 Final response stats:', stats)

    return NextResponse.json({
      deals: transformedDeals,
      stats
    })

  } catch (error: any) {
    console.error('❌ API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function getDealLevel(score: number): string {
  if (score >= 80) return 'incredible'
  if (score >= 70) return 'great'  
  if (score >= 60) return 'good'
  if (score >= 40) return 'fair'
  return 'overpriced'
}

function getDealIcon(score: number): string {
  if (score >= 80) return '💎'
  if (score >= 70) return '🔥'
  if (score >= 60) return '💸'
  if (score >= 40) return '⚖️'
  return '❌'
} 