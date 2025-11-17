import { NextRequest, NextResponse } from 'next/server'
import { checkAlertsStandalone } from '@/lib/alerts/checkAlertsStandalone'

/**
 * POST /api/v1/alerts/check
 * Vérifie les alertes actives en requêtant directement l'API promoted_closets avec filtres
 * Utilise la fonction standalone pour éviter la duplication de code
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fullCookies } = await request.json()

    if (!fullCookies) {
      return NextResponse.json({ 
        error: 'Missing cookies',
        details: 'fullCookies is required to fetch items'
      }, { status: 400 })
    }

    // Utiliser la fonction standalone (réutilisable par le worker)
    const result = await checkAlertsStandalone(fullCookies)

    // Convertir le résultat en réponse HTTP
    if (!result.success) {
      return NextResponse.json({
        error: result.error || 'Unknown error',
        details: result.error
      }, { status: 500 })
    }

    return NextResponse.json(result)

  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
