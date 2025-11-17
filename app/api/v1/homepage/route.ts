import { NextRequest, NextResponse } from 'next/server'
import { getHomepageItems, getAllHomepageItems } from '@/lib/scrape/homepageItems'
import { createFullSessionFromCookies } from '@/lib/scrape/fullSessionManager'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Check API key
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      fullCookies, 
      nextPageToken, 
      homepageSessionId,
      getAllPages = false,
      maxPages = 5
    } = body

    if (!fullCookies) {
      return NextResponse.json({ 
        error: 'Missing cookies',
        details: 'fullCookies is required'
      }, { status: 400 })
    }

    logger.info('🏠 Récupération des items homepage...')

    // Créer la session depuis les cookies
    const session = createFullSessionFromCookies(fullCookies)

    let items
    let nextToken
    let sessionId
    let hasMore

    if (getAllPages) {
      // Récupérer plusieurs pages
      items = await getAllHomepageItems(session, maxPages, homepageSessionId)
      hasMore = false
      nextToken = undefined
      sessionId = homepageSessionId
    } else {
      // Récupérer une seule page
      const result = await getHomepageItems(session, {
        nextPageToken,
        homepageSessionId,
        columnCount: 5,
        version: 4
      })
      items = result.items
      nextToken = result.nextPageToken
      sessionId = result.homepageSessionId
      hasMore = result.hasMore
    }

    logger.info(`✅ ${items.length} items homepage récupérés`)

    return NextResponse.json({
      success: true,
      items,
      nextPageToken: nextToken,
      homepageSessionId: sessionId,
      hasMore,
      totalItems: items.length
    })

  } catch (error) {
    logger.error('Erreur lors de la récupération homepage', error as Error)
    return NextResponse.json({ 
      error: 'Erreur serveur',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

