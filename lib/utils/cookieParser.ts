/**
 * Cookie Parser - Analyse les cookies pour extraire les informations d'expiration
 */

export interface ParsedCookie {
  name: string
  value: string
  expires?: Date
  maxAge?: number
  domain?: string
  path?: string
  secure?: boolean
  httpOnly?: boolean
  sameSite?: string
}

export interface CookieAnalysis {
  accessToken?: string
  refreshToken?: string
  expiresAt?: Date
  refreshExpiresAt?: Date
  willExpireSoon: boolean
  daysUntilExpiration?: number
  cookies: ParsedCookie[]
}

/**
 * Parse une chaîne de cookies au format "name=value; name2=value2"
 */
export function parseCookieString(cookieString: string): ParsedCookie[] {
  if (!cookieString || typeof cookieString !== 'string') {
    return []
  }

  const cookies: ParsedCookie[] = []
  const parts = cookieString.split(';').map(p => p.trim())

  for (const part of parts) {
    const [name, ...valueParts] = part.split('=')
    if (!name) continue

    const value = valueParts.join('=')
    const cookie: ParsedCookie = { name: name.trim(), value }

    // Parser les attributs (expires, max-age, domain, etc.)
    // Pour l'instant, on se concentre sur les valeurs simples
    cookies.push(cookie)
  }

  return cookies
}

/**
 * Analyse les cookies pour extraire le token et l'expiration
 */
export function analyzeCookies(cookieString: string): CookieAnalysis {
  const cookies = parseCookieString(cookieString)
  
  // Extraire access_token_web et refresh_token_web
  const accessTokenCookie = cookies.find(c => c.name === 'access_token_web')
  const refreshTokenCookie = cookies.find(c => c.name === 'refresh_token_web')
  const accessToken = accessTokenCookie?.value
  const refreshToken = refreshTokenCookie?.value

  // Fonction helper pour parser un JWT
  const parseJWT = (token: string): { exp?: number; iat?: number } | null => {
    if (!token || !token.includes('.')) return null
    try {
      const parts = token.split('.')
      if (parts.length === 3) {
        const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        )
        return JSON.parse(jsonPayload)
      }
    } catch (error) {
      // Token non-JWT ou invalide
    }
    return null
  }

  // Parser les tokens pour obtenir les expirations
  let expiresAt: Date | undefined
  let refreshExpiresAt: Date | undefined

  if (accessToken) {
    const payload = parseJWT(accessToken)
    if (payload?.exp) {
      expiresAt = new Date(payload.exp * 1000)
    }
  }

  if (refreshToken) {
    const payload = parseJWT(refreshToken)
    if (payload?.exp) {
      refreshExpiresAt = new Date(payload.exp * 1000)
    }
  }

  // Calculer si expiration proche (dans les 7 jours)
  const now = new Date()
  let willExpireSoon = false
  let daysUntilExpiration: number | undefined

  if (expiresAt) {
    const diffMs = expiresAt.getTime() - now.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    daysUntilExpiration = diffDays
    willExpireSoon = diffDays <= 7 && diffDays > 0
  }

  return {
    accessToken,
    refreshToken,
    expiresAt,
    refreshExpiresAt,
    willExpireSoon,
    daysUntilExpiration,
    cookies
  }
}

/**
 * Vérifie si les cookies sont expirés ou sur le point d'expirer
 */
export function shouldRenewCookies(analysis: CookieAnalysis): boolean {
  if (!analysis.expiresAt) {
    // Pas d'info d'expiration, on ne peut pas décider automatiquement
    return false
  }

  const now = new Date()
  const timeUntilExpiration = analysis.expiresAt.getTime() - now.getTime()
  
  // Renouveler si expiration dans moins de 7 jours
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000
  return timeUntilExpiration > 0 && timeUntilExpiration < sevenDaysInMs
}

