/**
 * Types d'erreur spécifiques pour l'application
 * Remplace les types `any` dans les catch blocks
 */

/**
 * Erreur API standard
 */
export interface ApiError extends Error {
  message: string
  status?: number
  code?: string
  details?: unknown
}

/**
 * Erreur de scraping Vinted
 */
export interface VintedScrapingError extends Error {
  message: string
  status?: number
  code?: 'HTTP_403' | 'HTTP_401' | 'HTTP_429' | 'HTTP_500' | 'NETWORK_ERROR' | 'PARSE_ERROR'
  url?: string
  retryable?: boolean
}

/**
 * Erreur de base de données
 */
export interface DatabaseError extends Error {
  message: string
  code?: string
  details?: unknown
  query?: string
}

/**
 * Erreur d'authentification
 */
export interface AuthenticationError extends Error {
  message: string
  code?: 'INVALID_TOKEN' | 'EXPIRED_TOKEN' | 'MISSING_TOKEN' | 'INVALID_COOKIES'
  token?: string
}

/**
 * Helper pour créer une ApiError
 */
export function createApiError(
  message: string,
  status?: number,
  code?: string,
  details?: unknown
): ApiError {
  const error = new Error(message) as ApiError
  error.status = status
  error.code = code
  error.details = details
  return error
}

/**
 * Helper pour créer une VintedScrapingError
 */
export function createVintedScrapingError(
  message: string,
  status?: number,
  url?: string
): VintedScrapingError {
  const error = new Error(message) as VintedScrapingError
  error.status = status
  error.url = url
  
  if (status === 403 || status === 401) {
    error.code = status === 403 ? 'HTTP_403' : 'HTTP_401'
    error.retryable = false
  } else if (status === 429) {
    error.code = 'HTTP_429'
    error.retryable = true
  } else if (status === 500) {
    error.code = 'HTTP_500'
    error.retryable = true
  } else if (message.includes('fetch failed') || message.includes('ECONNREFUSED')) {
    error.code = 'NETWORK_ERROR'
    error.retryable = true
  } else if (message.includes('JSON') || message.includes('parse')) {
    error.code = 'PARSE_ERROR'
    error.retryable = false
  }
  
  return error
}

/**
 * Helper pour créer une DatabaseError
 */
export function createDatabaseError(
  message: string,
  code?: string,
  details?: unknown,
  query?: string
): DatabaseError {
  const error = new Error(message) as DatabaseError
  error.code = code
  error.details = details
  error.query = query
  return error
}

/**
 * Helper pour créer une AuthenticationError
 */
export function createAuthenticationError(
  message: string,
  code?: AuthenticationError['code'],
  token?: string
): AuthenticationError {
  const error = new Error(message) as AuthenticationError
  error.code = code
  error.token = token
  return error
}

/**
 * Type guard pour vérifier si une erreur est une ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error && 'status' in error
}

/**
 * Type guard pour vérifier si une erreur est une VintedScrapingError
 */
export function isVintedScrapingError(error: unknown): error is VintedScrapingError {
  return error instanceof Error && 'code' in error && typeof (error as VintedScrapingError).code === 'string'
}

/**
 * Type guard pour vérifier si une erreur est une DatabaseError
 */
export function isDatabaseError(error: unknown): error is DatabaseError {
  return error instanceof Error && 'code' in error
}

/**
 * Type guard pour vérifier si une erreur est une AuthenticationError
 */
export function isAuthenticationError(error: unknown): error is AuthenticationError {
  return error instanceof Error && 'code' in error
}

/**
 * Helper pour extraire un message d'erreur de manière sûre
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message)
  }
  return 'Unknown error'
}

/**
 * Helper pour extraire un code d'erreur de manière sûre
 */
export function getErrorCode(error: unknown): string | undefined {
  if (isApiError(error) || isVintedScrapingError(error) || isDatabaseError(error) || isAuthenticationError(error)) {
    return error.code
  }
  return undefined
}

