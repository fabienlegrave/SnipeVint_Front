/**
 * Token Renewer - Utilise le refresh_token_web pour renouveler automatiquement l'access_token_web
 */

import { analyzeCookies } from './cookieParser'
import { logger } from '@/lib/logger'

export interface TokenRenewalAttempt {
  endpoint: string
  body: string
  status: number
  error?: string
}

export interface TokenRenewalResult {
  success: boolean
  newAccessToken?: string
  newRefreshToken?: string
  newCookies?: string
  error?: string
  attempts?: TokenRenewalAttempt[]
}

/**
 * Renouvelle le token d'accès en utilisant le refresh token
 * Note: Vinted utilise probablement un endpoint OAuth2 standard
 */
export async function renewAccessToken(
  refreshToken: string,
  currentCookies: string
): Promise<TokenRenewalResult> {
  try {
    // Analyser les cookies actuels pour extraire les informations nécessaires
    const analysis = analyzeCookies(currentCookies)
    
    if (!refreshToken) {
      return {
        success: false,
        error: 'Refresh token manquant'
      }
    }

    // Vérifier que le refresh token n'est pas expiré
    if (analysis.refreshExpiresAt) {
      const now = new Date()
      if (now >= analysis.refreshExpiresAt) {
        return {
          success: false,
          error: 'Refresh token expiré - reconnexion nécessaire'
        }
      }
    }

    logger.info('🔄 Tentative de renouvellement du token...')

    // Vinted utilise probablement un endpoint OAuth2 standard
    // D'après les cookies, on voit une référence à /session-refresh
    // On essaie plusieurs endpoints possibles basés sur les patterns OAuth2 et Vinted
    const possibleEndpoints = [
      'https://www.vinted.fr/api/v2/auth/refresh',
      'https://www.vinted.fr/api/v2/auth/token/refresh',
      'https://www.vinted.fr/api/v2/oauth/token',
      'https://www.vinted.fr/api/v2/session/refresh',
      'https://www.vinted.fr/session-refresh', // Vu dans les cookies
      'https://www.vinted.fr/api/auth/refresh',
      'https://www.vinted.fr/oauth/token',
      'https://www.vinted.fr/api/v2/token/refresh'
    ]

    // Construire les headers similaires à une requête normale
    const headers = {
      'accept': 'application/json',
      'accept-language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      'content-type': 'application/json',
      'origin': 'https://www.vinted.fr',
      'referer': 'https://www.vinted.fr/',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
      'cookie': currentCookies // Inclure les cookies actuels (cf_clearance, datadome, etc.)
    }

    // Essayer plusieurs formats de body possibles
    const possibleBodies = [
      // Format OAuth2 standard
      JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: 'web'
      }),
      // Format alternatif
      JSON.stringify({
        refresh_token: refreshToken
      }),
      // Format avec access_token aussi
      JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        access_token: analysis.accessToken,
        client_id: 'web'
      })
    ]

    let lastError: string | undefined
    let lastEndpoint: string | undefined
    let lastBody: string | undefined
    let attempts: Array<{ endpoint: string; body: string; status: number; error?: string }> = []

    // Essayer chaque combinaison endpoint + body
    for (const endpoint of possibleEndpoints) {
      for (const body of possibleBodies) {
        try {
          lastEndpoint = endpoint
          lastBody = body
          logger.info(`🔄 Tentative ${attempts.length + 1}/${possibleEndpoints.length * possibleBodies.length} sur ${endpoint}`)
          logger.debug(`   Body: ${body.substring(0, 80)}...`)
          
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 10000) // 10s timeout
          
          const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body,
            signal: controller.signal
          })
          
          clearTimeout(timeoutId)
          
          const status = response.status
          attempts.push({ endpoint, body, status })
          
          logger.info(`📊 ${endpoint} → HTTP ${status} ${response.statusText}`)
          
          // Si c'est une erreur réseau (status 0), c'est probablement CORS ou timeout
          if (status === 0) {
            attempts[attempts.length - 1].error = 'Network error (timeout or connection)'
            continue
          }

          if (response.ok) {
            let data: any
            const contentType = response.headers.get('content-type')
            
            // Parser la réponse (peut être JSON ou autre)
            if (contentType?.includes('application/json')) {
              data = await response.json()
            } else {
              const text = await response.text()
              try {
                data = JSON.parse(text)
              } catch {
                // Si ce n'est pas du JSON, peut-être que c'est une redirection ou HTML
                // Vérifier si les nouveaux cookies sont dans les headers Set-Cookie
                const setCookieHeader = response.headers.get('set-cookie')
                if (setCookieHeader) {
                  logger.info('✅ Nouveaux cookies trouvés dans Set-Cookie header')
                  // Extraire access_token_web du header Set-Cookie
                  const accessTokenMatch = setCookieHeader.match(/access_token_web=([^;]+)/)
                  if (accessTokenMatch) {
                    const newAccessToken = accessTokenMatch[1]
                    // Construire les nouveaux cookies en mettant à jour access_token_web
                    const cookieParts = currentCookies.split(';').map(c => c.trim())
                    const updatedCookies = cookieParts
                      .filter(c => !c.startsWith('access_token_web='))
                      .concat(`access_token_web=${newAccessToken}`)
                    
                    logger.info('✅ Token renouvelé via Set-Cookie header')
                    return {
                      success: true,
                      newAccessToken,
                      newRefreshToken: refreshToken,
                      newCookies: updatedCookies.join('; ')
                    }
                  }
                }
                continue // Essayer le prochain format
              }
            }
            
            // Vérifier le format de la réponse
            // Format OAuth2 standard: { access_token, refresh_token, expires_in }
            // Ou format Vinted: { access_token_web, refresh_token_web }
            if (data.access_token || data.access_token_web || data.token) {
              const newAccessToken = data.access_token || data.access_token_web || data.token
              const newRefreshToken = data.refresh_token || data.refresh_token_web || refreshToken
            
            // Construire les nouveaux cookies
            const cookieParts = currentCookies.split(';').map(c => c.trim())
            
            // Remplacer access_token_web
            const updatedCookies = cookieParts
              .filter(c => !c.startsWith('access_token_web='))
              .concat(`access_token_web=${newAccessToken}`)
            
            // Remplacer refresh_token_web si fourni
            if (newRefreshToken && newRefreshToken !== refreshToken) {
              const updatedCookies2 = updatedCookies
                .filter(c => !c.startsWith('refresh_token_web='))
                .concat(`refresh_token_web=${newRefreshToken}`)
              
              logger.info('✅ Token renouvelé avec succès')
              return {
                success: true,
                newAccessToken,
                newRefreshToken,
                newCookies: updatedCookies2.join('; ')
              }
            }
            
            logger.info('✅ Token renouvelé avec succès')
            return {
              success: true,
              newAccessToken,
              newRefreshToken: refreshToken, // Garder l'ancien si pas de nouveau
              newCookies: updatedCookies.join('; ')
            }
          }
        } else {
          let errorText = ''
          try {
            errorText = await response.text()
          } catch {
            errorText = response.statusText
          }
          lastError = `HTTP ${response.status}: ${errorText.substring(0, 100)}`
          attempts[attempts.length - 1].error = lastError
          logger.warn(`⚠️ Échec sur ${endpoint}: ${lastError}`)
        }
        } catch (error) {
          lastError = error instanceof Error ? error.message : 'Unknown error'
          
          // Détecter le type d'erreur
          let errorType = 'Unknown error'
          if (error instanceof Error) {
            if (error.name === 'AbortError' || error.message.includes('timeout')) {
              errorType = 'Timeout (10s)'
            } else if (error.message.includes('fetch failed') || error.message.includes('Failed to fetch')) {
              errorType = 'Network error (connection refused or DNS)'
            } else if (error.message.includes('CORS')) {
              errorType = 'CORS blocked'
            } else {
              errorType = error.message
            }
          }
          
          // S'assurer que la tentative est enregistrée
          if (attempts.length === 0 || attempts[attempts.length - 1].endpoint !== endpoint) {
            attempts.push({ endpoint, body, status: 0, error: errorType })
          } else {
            attempts[attempts.length - 1] = {
              ...attempts[attempts.length - 1],
              error: errorType
            }
          }
          
          logger.warn(`⚠️ Erreur sur ${endpoint}: ${errorType}`)
        }
      }
    }

    // Si aucun endpoint n'a fonctionné, retourner l'erreur avec les détails
    const attemptsSummary = attempts
      .map(a => `  - ${a.endpoint} (${a.body.substring(0, 50)}...): HTTP ${a.status}${a.error ? ` - ${a.error}` : ''}`)
      .join('\n')
    
    logger.warn(`❌ Tous les endpoints ont échoué. Résumé:\n${attemptsSummary}`)
    
    return {
      success: false,
      error: `Aucun endpoint de refresh trouvé. Dernière erreur: ${lastError}`,
      attempts: attempts // Inclure les tentatives pour debug
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    logger.error('Erreur lors du renouvellement du token', error as Error)
    return {
      success: false,
      error: errorMessage
    }
  }
}

/**
 * Vérifie si le token doit être renouvelé (expire dans moins de 30 minutes)
 */
export function shouldRenewToken(expiresAt?: Date): boolean {
  if (!expiresAt) return false
  
  const now = new Date()
  const timeUntilExpiration = expiresAt.getTime() - now.getTime()
  const thirtyMinutesInMs = 30 * 60 * 1000
  
  return timeUntilExpiration > 0 && timeUntilExpiration < thirtyMinutesInMs
}

