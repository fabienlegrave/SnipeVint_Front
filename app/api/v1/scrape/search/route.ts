import { NextRequest, NextResponse } from 'next/server'
import { searchAllPagesWithFullSession } from '@/lib/scrape/searchCatalogWithFullSession'
import { ScrapeSearchRequest } from '@/lib/types/core'
import { createFullSessionFromCookies, createSimpleSession } from '@/lib/scrape/fullSessionManager'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Check API key
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { query, priceFrom, priceTo, limit = 100, fullCookies, accessToken, minRelevanceScore }: ScrapeSearchRequest & {fullCookies?: string; accessToken?: string; minRelevanceScore?: number} = await request.json()

    if (!query?.trim()) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    logger.scrape.search(query, { limit })
    logger.auth.token('Auth check', {
      hasFullCookies: !!fullCookies,
      fullCookiesLength: fullCookies?.length || 0,
      hasAccessToken: !!accessToken
    })
    
    let session = undefined
    
    // PRIORITÉ : fullCookies d'abord (contient cf_clearance, datadome, etc.)
    // Puis accessToken si pas de cookies complets
    if (fullCookies && fullCookies.trim().length > 0) {
      try {
        session = createFullSessionFromCookies(fullCookies)
        logger.auth.cookies('Utilisation des cookies complets (avec cf_clearance, datadome, etc.)')
      } catch (error) {
        logger.auth.error('Erreur parsing cookies', error as Error)
        return NextResponse.json({ error: 'Invalid cookies format' }, { status: 400 })
      }
    } else {
      // Fallback : utiliser le token (mais moins fiable car pas de cookies Cloudflare)
      const tokenToUse = accessToken || process.env.VINTED_ACCESS_TOKEN
      
      if (tokenToUse) {
        session = createSimpleSession(tokenToUse)
        logger.auth.token('Utilisation du token d\'accès (mode simple - peut échouer avec Cloudflare)')
      } else {
        logger.auth.error('Aucun token disponible - authentification requise')
        return NextResponse.json({
          error: 'Authentication required',
          details: 'Vinted access token or fullCookies is required for scraping',
          suggestion: 'Fournissez fullCookies (recommandé) ou accessToken dans la requête.'
        }, { status: 401 })
      }
    }

    const items = await searchAllPagesWithFullSession(query, {
      priceFrom,
      priceTo,
      limit,
      session,
      minRelevanceScore
    })

    logger.scrape.success(items.length)

    return NextResponse.json(items)

  } catch (error: unknown) {
    logger.scrape.error('Search API error', error as Error)
    
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('HTTP 403') || errorMessage.includes('HTTP 401')) {
      return NextResponse.json({
        error: 'Authentication failed',
        details: errorMessage,
        suggestion: 'Vérifiez votre token Vinted dans les paramètres.'
      }, { status: 403 })
    }

    return NextResponse.json({ 
      error: 'Search failed',
      details: errorMessage 
    }, { status: 500 })
  }
}