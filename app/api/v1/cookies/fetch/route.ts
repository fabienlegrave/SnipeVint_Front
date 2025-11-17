import { NextRequest, NextResponse } from 'next/server'
import { createFullSessionFromCookies } from '@/lib/scrape/fullSessionManager'
import { logger } from '@/lib/logger'

/**
 * Extrait la valeur d'un cookie depuis un header Set-Cookie
 */
function extractCookieValue(header: string, name: string): string | null {
  const regex = new RegExp(`${name}=([^;]+)`)
  const match = header.match(regex)
  return match ? match[1] : null
}

/**
 * Récupère automatiquement les cookies depuis Vinted en faisant une requête HEAD
 * vers /how_it_works et en extrayant les cookies depuis les headers Set-Cookie
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier la clé API
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fullCookies } = await request.json()

    if (!fullCookies || typeof fullCookies !== 'string') {
      return NextResponse.json(
        { error: 'fullCookies is required' },
        { status: 400 }
      )
    }

    logger.auth.cookies('🔄 Début récupération automatique des cookies...')

    // Créer une session depuis les cookies existants
    let session
    try {
      session = createFullSessionFromCookies(fullCookies)
    } catch (error) {
      logger.auth.error('Erreur parsing cookies existants', error as Error)
      return NextResponse.json(
        { error: 'Invalid cookies format', details: (error as Error).message },
        { status: 400 }
      )
    }

    // Faire une requête HEAD vers /how_it_works pour récupérer les nouveaux cookies
    const { buildVintedApiHeaders } = await import('@/lib/scrape/fullSessionManager')
    const headers = buildVintedApiHeaders(session)

    const fetchUrl = 'https://www.vinted.fr/how_it_works'
    
    logger.auth.cookies(`📡 Requête HEAD vers ${fetchUrl}...`)

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout

    let response: Response
    try {
      response = await fetch(fetchUrl, {
        method: 'HEAD',
        headers: {
          ...headers,
          'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
        redirect: 'follow'
      })
      clearTimeout(timeoutId)
    } catch (error: any) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        logger.auth.error('Timeout lors de la récupération des cookies', error)
        return NextResponse.json(
          { error: 'Request timeout', details: 'La requête a pris trop de temps' },
          { status: 408 }
        )
      }
      throw error
    }

    // Récupérer les headers Set-Cookie
    // Note: getSetCookie() est disponible dans Node.js 18+
    let setCookieHeaders: string[] = []
    
    try {
      // Essayer getSetCookie() (Node.js 18+)
      if (typeof response.headers.getSetCookie === 'function') {
        setCookieHeaders = response.headers.getSetCookie()
      } else {
        // Fallback pour versions antérieures : parser manuellement
        const setCookieHeader = response.headers.get('set-cookie')
        if (setCookieHeader) {
          // Si c'est un tableau, l'utiliser directement
          if (Array.isArray(setCookieHeader)) {
            setCookieHeaders = setCookieHeader
          } else {
            // Sinon, c'est une chaîne unique
            setCookieHeaders = [setCookieHeader]
          }
        }
      }
    } catch (error) {
      logger.auth.error('Erreur lors de la récupération des Set-Cookie headers', error as Error)
      // Essayer le fallback manuel
      const setCookieHeader = response.headers.get('set-cookie')
      if (setCookieHeader) {
        setCookieHeaders = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader]
      }
    }
    
    logger.auth.cookies(`📦 ${setCookieHeaders.length} headers Set-Cookie reçus`)

    if (!setCookieHeaders || setCookieHeaders.length === 0) {
      logger.auth.warn('⚠️ Aucun header Set-Cookie dans la réponse')
      // Logger tous les headers pour debug
      const allHeaders = Object.fromEntries(response.headers.entries())
      logger.auth.debug('Headers de la réponse:', allHeaders)
      
      return NextResponse.json(
        { 
          error: 'No Set-Cookie headers',
          details: 'La réponse ne contient pas de cookies à mettre à jour',
          statusCode: response.status,
          headersReceived: Object.keys(allHeaders).length > 0
        },
        { status: 400 }
      )
    }

    // Vérifier si on a un access_token_web dans les nouveaux cookies
    const cookieHeader = setCookieHeaders
      .map(cookie => cookie.split(';')[0].trim())
      .join('; ')

    const hasAccessToken = setCookieHeaders.some(cookie => 
      cookie.includes('access_token_web')
    )

    if (!hasAccessToken) {
      logger.auth.warn('⚠️ Aucun access_token_web dans les nouveaux cookies')
      // On continue quand même, peut-être que les autres cookies sont utiles
    } else {
      logger.auth.cookies('✅ access_token_web trouvé dans les nouveaux cookies')
    }

    // Extraire les cookies importants
    const cookieObject = {
      refresh: extractCookieValue(cookieHeader, 'refresh_token_web'),
      access: extractCookieValue(cookieHeader, 'access_token_web'),
      vinted: extractCookieValue(cookieHeader, '_vinted_fr_session'),
    }

    // Construire la chaîne de cookies complète pour compatibilité avec notre système
    // On combine les nouveaux cookies avec les anciens pour garder tous les cookies (cf_clearance, datadome, etc.)
    const existingCookies = fullCookies.split(';').map(c => c.trim())
    const newCookies = cookieHeader.split(';').map(c => c.trim())
    
    // Fusionner : nouveaux cookies écrasent les anciens s'ils existent
    const cookieMap = new Map<string, string>()
    
    // D'abord, ajouter tous les cookies existants
    existingCookies.forEach(cookie => {
      const [name] = cookie.split('=')
      if (name) {
        cookieMap.set(name, cookie)
      }
    })
    
    // Ensuite, mettre à jour avec les nouveaux cookies
    newCookies.forEach(cookie => {
      const [name] = cookie.split('=')
      if (name) {
        cookieMap.set(name, cookie)
      }
    })
    
    // Construire la chaîne finale
    const updatedCookieString = Array.from(cookieMap.values()).join('; ')

    logger.auth.cookies(`✅ Cookies mis à jour: ${cookieMap.size} cookies au total`)

    return NextResponse.json({
      success: true,
      message: 'Cookies récupérés avec succès',
      cookies: {
        refresh: cookieObject.refresh,
        access: cookieObject.access,
        vinted: cookieObject.vinted,
      },
      fullCookieString: updatedCookieString,
      extractedToken: cookieObject.access,
      statusCode: response.status,
      cookieCount: cookieMap.size
    })

  } catch (error: any) {
    logger.auth.error('Erreur lors de la récupération automatique des cookies', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch cookies',
        details: error.message || 'Erreur inconnue',
        type: error.name || 'UnknownError'
      },
      { status: 500 }
    )
  }
}

