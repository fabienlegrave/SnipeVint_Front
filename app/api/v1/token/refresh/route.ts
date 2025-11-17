import { NextRequest, NextResponse } from 'next/server'
import { renewAccessToken } from '@/lib/utils/tokenRenewer'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Check API key
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { refreshToken, currentCookies } = await request.json()

    if (!refreshToken || !currentCookies) {
      return NextResponse.json({ 
        error: 'Missing parameters',
        details: 'refreshToken and currentCookies are required'
      }, { status: 400 })
    }

    logger.info('🔄 Renouvellement de token via API serveur (pas de CORS)...')
    logger.info(`📋 Refresh token: ${refreshToken.substring(0, 20)}...`)
    logger.info(`📋 Cookies length: ${currentCookies.length} chars`)
    
    // Appeler la fonction de renouvellement depuis le serveur (pas de problème CORS)
    const result = await renewAccessToken(refreshToken, currentCookies)
    
    logger.info(`📊 Résultat: ${result.success ? 'SUCCÈS' : 'ÉCHEC'}`)
    if (result.attempts) {
      logger.info(`📈 ${result.attempts.length} tentatives effectuées`)
      result.attempts.forEach((attempt, index) => {
        if (attempt.status === 200) {
          logger.info(`  ✅ ${index + 1}. ${attempt.endpoint} → HTTP ${attempt.status} (SUCCÈS!)`)
        } else {
          logger.warn(`  ❌ ${index + 1}. ${attempt.endpoint} → HTTP ${attempt.status}${attempt.error ? ` - ${attempt.error}` : ''}`)
        }
      })
    }
    
    if (result.success) {
      logger.info('✅ Token renouvelé avec succès via API')
      return NextResponse.json({
        success: true,
        ...result
      })
    } else {
      logger.warn(`⚠️ Échec du renouvellement: ${result.error}`)
      return NextResponse.json({
        success: false,
        ...result
      }, { status: 400 })
    }

  } catch (error) {
    logger.error('Erreur lors du renouvellement de token', error as Error)
    return NextResponse.json({ 
      error: 'Erreur serveur',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

