import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'

const execAsync = promisify(exec)

// Marquer la route comme dynamique pour éviter l'analyse statique de Puppeteer
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/v1/admin/vinted/generate-cookies
 * Génère automatiquement les cookies Vinted via Puppeteer
 * 
 * Cette route utilise un script standalone exécuté via child_process pour éviter
 * les problèmes d'analyse statique Next.js avec Puppeteer.
 * 
 * ⚠️ Nécessite Puppeteer installé et Chrome/Chromium disponible
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier l'API key
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { autoSave = true } = await request.json().catch(() => ({ autoSave: true }))

    logger.info('🔄 Génération automatique des cookies via Puppeteer (script standalone)...')

    // Exécuter le script standalone via child_process
    const scriptPath = join(process.cwd(), 'scripts', 'generateCookiesStandalone.js')
    
    // Préparer les variables d'environnement
    const env = {
      ...process.env,
      PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH,
    }

    const { stdout, stderr } = await execAsync(`node "${scriptPath}"`, {
      env,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      timeout: 60000, // 60 secondes timeout
    })

    // Le script output du JSON à la fin
    const lines = stdout.trim().split('\n')
    const jsonLine = lines[lines.length - 1]
    
    let result
    try {
      result = JSON.parse(jsonLine)
    } catch (error) {
      // Si le parsing échoue, essayer de trouver le JSON dans toute la sortie
      const jsonMatch = stdout.match(/\{[\s\S]*"success"[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      } else {
        throw new Error(`Failed to parse script output: ${stdout}`)
      }
    }

    // Log les erreurs stderr si présentes
    if (stderr && stderr.trim()) {
      logger.warn('⚠️ Script stderr:', stderr)
    }

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error || 'Failed to generate cookies',
        details: result.details
      }, { status: 500 })
    }

    logger.info('✅ Cookies générés avec succès')

    // Sauvegarder en DB si demandé
    if (autoSave && result.cookies) {
      try {
        const { supabase } = await import('@/lib/supabase')
        if (supabase) {
          const { error: saveError } = await supabase
            .from('vinted_credentials')
            .upsert({
              full_cookies: result.cookies,
              notes: 'Auto-generated via Puppeteer',
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'id',
              ignoreDuplicates: false
            })

          if (saveError) {
            logger.warn('⚠️ Erreur lors de la sauvegarde des cookies en DB', saveError)
          } else {
            logger.info('✅ Cookies sauvegardés en base de données')
          }
        }
      } catch (error) {
        logger.warn('⚠️ Erreur lors de la sauvegarde des cookies', error as Error)
        // Ne pas faire échouer la génération si la sauvegarde échoue
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Cookies generated successfully',
      cookies: result.cookies,
      details: result.details,
      note: autoSave 
        ? 'Cookies have been automatically saved to database'
        : 'Cookies generated but not saved (use autoSave=true to save)'
    })

  } catch (error) {
    logger.error('Error generating cookies', error as Error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

