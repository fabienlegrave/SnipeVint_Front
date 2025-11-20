/**
 * Fonction pour générer des cookies via Cookie Factory (appel interne)
 * Utilisée par le worker backend
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { join } from 'path'
import { logger } from '@/lib/logger'

const execAsync = promisify(exec)

export interface CookieFactoryResult {
  success: boolean
  cookies?: string
  error?: string
  details?: any
}

/**
 * Génère des cookies frais via le script generateCookiesStandalone
 */
export async function generateCookiesViaFactory(): Promise<CookieFactoryResult> {
  try {
    logger.info('🏭 Cookie Factory: Génération de cookies frais (worker backend)...')

    const scriptPath = join(process.cwd(), 'scripts', 'generateCookiesStandalone.js')
    const env = {
      ...process.env,
      PUPPETEER_EXECUTABLE_PATH: process.env.PUPPETEER_EXECUTABLE_PATH,
    }

    const { stdout, stderr } = await execAsync(`node "${scriptPath}"`, {
      env,
      maxBuffer: 10 * 1024 * 1024,
      timeout: 300000, // 5 minutes
    })

    // Parser le résultat JSON
    const lines = stdout.trim().split('\n')
    const jsonLine = lines[lines.length - 1]
    
    let result
    try {
      result = JSON.parse(jsonLine)
    } catch (error) {
      const jsonMatch = stdout.match(/\{[\s\S]*"success"[\s\S]*\}/)
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0])
      } else {
        throw new Error(`Failed to parse script output: ${stdout}`)
      }
    }

    if (stderr && stderr.trim()) {
      logger.warn('⚠️ Script stderr:', stderr)
    }

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to generate cookies',
        details: result.details
      }
    }

    logger.info('✅ Cookies générés avec succès via Cookie Factory')
    return {
      success: true,
      cookies: result.cookies,
      details: result.details
    }

  } catch (error) {
    logger.error('Error in Cookie Factory (worker)', error as Error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: { message: 'Failed to generate cookies with Puppeteer' }
    }
  }
}

