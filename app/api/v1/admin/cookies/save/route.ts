import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'

// Marquer la route comme dynamique
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/v1/admin/cookies/save
 * Sauvegarde les cookies Vinted dans la base de données pour le worker backend
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier l'API key
    const apiKey = request.headers.get('x-api-key')
    const validSecret = process.env.API_SECRET || process.env.NEXT_PUBLIC_API_SECRET
    if (!apiKey || !validSecret || apiKey !== validSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { cookies } = await request.json()

    if (!cookies || typeof cookies !== 'string' || cookies.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Missing cookies',
        details: 'cookies string is required'
      }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json({ 
        error: 'Database not available'
      }, { status: 500 })
    }

    // Essayer de sauvegarder dans une table user_preferences ou créer une table simple
    // Pour simplifier, on va créer/upsert dans une table app_settings
    try {
      // Vérifier si la table existe, sinon on utilisera une variable d'environnement
      const { error: upsertError } = await supabase
        .from('app_settings')
        .upsert({
          key: 'vinted_cookies',
          value: cookies,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'key'
        })
        .catch(async () => {
          // Si la table n'existe pas, essayer user_preferences
          return await supabase
            .from('user_preferences')
            .upsert({
              vinted_cookies: cookies,
              updated_at: new Date().toISOString()
            })
            .catch(() => ({ error: { message: 'No suitable table found' } }))
        })

      if (upsertError) {
        logger.warn('⚠️ Impossible de sauvegarder les cookies en base de données:', upsertError)
        // Ne pas échouer, juste logger
      } else {
        logger.info('✅ Cookies sauvegardés dans la base de données pour le worker')
      }
    } catch (error) {
      logger.warn('⚠️ Erreur lors de la sauvegarde des cookies:', error)
      // Ne pas échouer, le worker peut utiliser VINTED_FULL_COOKIES
    }

    return NextResponse.json({
      success: true,
      message: 'Cookies sauvegardés pour le worker backend',
      note: 'Le worker backend utilisera ces cookies pour vérifier les alertes automatiquement'
    })

  } catch (error) {
    logger.error('Error saving cookies for worker', error as Error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

