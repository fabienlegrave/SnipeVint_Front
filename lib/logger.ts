/**
 * Système de logging structuré pour l'application
 * 
 * Remplace tous les console.log/error/warn par un système centralisé
 * qui respecte les niveaux de log et n'affiche que ce qui est nécessaire
 * selon l'environnement (dev vs production)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

const isDev = process.env.NODE_ENV === 'development'
const isServer = typeof window === 'undefined'

/**
 * Formate un message de log avec contexte
 */
function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`
  
  if (context && Object.keys(context).length > 0) {
    const contextStr = JSON.stringify(context, null, isDev ? 2 : 0)
    return `${prefix} ${message}\n${contextStr}`
  }
  
  return `${prefix} ${message}`
}

/**
 * Logger principal de l'application
 */
export const logger = {
  /**
   * Logs de debug - uniquement en développement
   */
  debug: (message: string, context?: LogContext) => {
    if (isDev) {
      console.debug(formatMessage('debug', message, context))
    }
  },

  /**
   * Logs d'information - toujours affichés
   */
  info: (message: string, context?: LogContext) => {
    if (isDev || isServer) {
      console.log(formatMessage('info', message, context))
    }
  },

  /**
   * Logs d'avertissement - toujours affichés
   */
  warn: (message: string, context?: LogContext) => {
    console.warn(formatMessage('warn', message, context))
  },

  /**
   * Logs d'erreur - toujours affichés
   */
  error: (message: string, error?: Error | unknown, context?: LogContext) => {
    const errorContext: LogContext = {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: isDev ? error.stack : undefined,
        name: error.name
      } : error
    }
    
    console.error(formatMessage('error', message, errorContext))
  },

  /**
   * Logs spécifiques pour les opérations de scraping
   */
  scrape: {
    search: (query: string, context?: LogContext) => {
      logger.info(`🔍 Starting search: "${query}"`, context)
    },
    page: (page: number, total: number, items: number) => {
      logger.info(`📄 Page ${page}/${total} - récupération de ${items} items max`)
    },
    success: (count: number, context?: LogContext) => {
      logger.info(`✅ Search completed: ${count} items found`, context)
    },
    error: (message: string, error?: Error | unknown) => {
      logger.error(`❌ Search error: ${message}`, error)
    }
  },

  /**
   * Logs spécifiques pour les opérations de base de données
   */
  db: {
    query: (operation: string, context?: LogContext) => {
      logger.debug(`💾 DB ${operation}`, context)
    },
    success: (operation: string, count?: number) => {
      logger.info(`✅ DB ${operation}${count !== undefined ? `: ${count} items` : ''}`)
    },
    error: (operation: string, error: Error | unknown) => {
      logger.error(`❌ DB ${operation} failed`, error)
    }
  },

  /**
   * Logs spécifiques pour l'authentification
   */
  auth: {
    token: (message: string, context?: LogContext) => {
      logger.info(`🔐 ${message}`, context)
    },
    cookies: (message: string, context?: LogContext) => {
      logger.info(`🍪 ${message}`, context)
    },
    error: (message: string, error?: Error | unknown) => {
      logger.error(`❌ Auth error: ${message}`, error)
    }
  },

  /**
   * Logs spécifiques pour les API
   */
  api: {
    request: (method: string, endpoint: string, context?: LogContext) => {
      logger.debug(`📡 ${method} ${endpoint}`, context)
    },
    response: (method: string, endpoint: string, status: number, context?: LogContext) => {
      const emoji = status >= 200 && status < 300 ? '✅' : status >= 400 ? '❌' : '⚠️'
      logger.info(`${emoji} ${method} ${endpoint} - ${status}`, context)
    },
    error: (method: string, endpoint: string, error: Error | unknown) => {
      logger.error(`❌ API ${method} ${endpoint} failed`, error)
    }
  }
}

/**
 * Export par défaut pour compatibilité
 */
export default logger

