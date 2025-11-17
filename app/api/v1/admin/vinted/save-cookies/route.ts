import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { logger } from '@/lib/logger'
import { validateVintedCookies } from '@/lib/scrape/tokenValidator'

/**
 * POST /api/v1/admin/vinted/save-cookies
 * Sauvegarde les cookies Vinted en base de données pour utilisation par GitHub Actions
 * 
 * Requiert:
 * - x-api-key header avec API_SECRET
 * - Body: { fullCookies: string, notes?: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier l'API key
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fullCookies, notes } = await request.json()

    if (!fullCookies || typeof fullCookies !== 'string' || fullCookies.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Invalid request',
        details: 'fullCookies is required and must be a non-empty string'
      }, { status: 400 })
    }

    // Vérifier que les cookies contiennent access_token_web
    if (!fullCookies.includes('access_token_web=')) {
      return NextResponse.json({
        error: 'Invalid cookies',
        details: 'Cookies must contain access_token_web'
      }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    // Valider les cookies avant de les sauvegarder
    logger.info('🔍 Validation des cookies avant sauvegarde...')
    const validation = await validateVintedCookies(fullCookies)
    
    if (!validation.isValid) {
      logger.warn('⚠️ Cookies invalides, refus de sauvegarde', validation.error)
      return NextResponse.json({
        error: 'Invalid cookies',
        details: validation.error || 'Cookies validation failed',
        validationDetails: validation.details
      }, { status: 400 })
    }

    logger.info('✅ Cookies validés avec succès')

    // Extraire le token et autres infos des cookies
    const tokenMatch = fullCookies.match(/access_token_web=([^;]+)/)
    const refreshTokenMatch = fullCookies.match(/refresh_token_web=([^;]+)/)
    const userIdMatch = fullCookies.match(/user_id=([^;]+)/)

    const accessToken = tokenMatch ? tokenMatch[1] : null
    const refreshToken = refreshTokenMatch ? refreshTokenMatch[1] : null
    const userId = userIdMatch ? userIdMatch[1] : null

    // Désactiver les anciens credentials actifs
    const { error: deactivateError } = await supabase
      .from('vinted_credentials')
      .update({ is_active: false })
      .eq('is_active', true)

    if (deactivateError) {
      logger.warn('⚠️ Erreur lors de la désactivation des anciens credentials', deactivateError)
    }

    // Sauvegarder les nouveaux credentials
    const { data: credential, error: insertError } = await supabase
      .from('vinted_credentials')
      .insert({
        full_cookies: fullCookies.trim(),
        access_token: accessToken,
        refresh_token: refreshToken,
        user_id: userId,
        is_active: true,
        notes: notes || null,
        last_used_at: new Date().toISOString()
      })
      .select()
      .single()

    if (insertError) {
      logger.db.error('Failed to save Vinted credentials', insertError)
      return NextResponse.json({ 
        error: 'Database error',
        details: insertError.message
      }, { status: 500 })
    }

    logger.db.success('Vinted credentials saved successfully', { id: credential.id })

    return NextResponse.json({
      success: true,
      message: 'Cookies saved successfully',
      credential: {
        id: credential.id,
        userId: credential.user_id,
        isActive: credential.is_active,
        createdAt: credential.created_at,
        lastUsedAt: credential.last_used_at
      }
    })

  } catch (error) {
    logger.error('Error saving Vinted cookies', error as Error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

/**
 * GET /api/v1/admin/vinted/save-cookies
 * Récupère les credentials actifs (pour monitoring)
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

    const { data: credentials, error } = await supabase
      .from('vinted_credentials')
      .select('id, user_id, is_active, created_at, updated_at, last_used_at, notes')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      logger.db.error('Failed to fetch credentials', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      credentials: credentials || []
    })

  } catch (error) {
    logger.error('Error fetching credentials', error as Error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

