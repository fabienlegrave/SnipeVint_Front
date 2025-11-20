/**
 * Gateway central pour le Rotating Scrape Cluster
 * Route les requêtes vers les workers scraper dans différentes régions
 * Gère la rotation automatique en cas de 403
 */

import { logger } from '@/lib/logger'

export interface ScraperNode {
  id: string
  name: string
  region: string
  url: string // URL interne du worker (ex: http://scraper-fr.internal:3000)
  publicUrl?: string // URL publique si nécessaire
  isHealthy: boolean
  isBanned: boolean
  bannedUntil?: number // Timestamp jusqu'à quand le worker est banni
  lastUsed?: number
  requestCount: number
  successCount: number
  errorCount: number
  lastError?: string
}

export interface GatewayConfig {
  nodes: ScraperNode[]
  rotationStrategy: 'round-robin' | 'random' | 'least-used' | 'health-based'
  banDuration: number // Durée du ban en ms (défaut: 15 minutes)
  timeout: number // Timeout des requêtes en ms
  retryAttempts: number // Nombre de tentatives avant d'abandonner
}

// Configuration par défaut
const DEFAULT_CONFIG: GatewayConfig = {
  nodes: [
    {
      id: 'scraper-fr',
      name: 'Scraper FR',
      region: 'cdg',
      url: process.env.SCRAPER_FR_URL || 'http://scraper-fr.internal:3000',
      isHealthy: true,
      isBanned: false,
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
    },
    {
      id: 'scraper-nl',
      name: 'Scraper NL',
      region: 'lhr', // London (région Fly.io valide)
      url: process.env.SCRAPER_NL_URL || 'http://scraper-nl.internal:3000',
      isHealthy: true,
      isBanned: false,
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
    },
    {
      id: 'scraper-us',
      name: 'Scraper US',
      region: 'iad',
      url: process.env.SCRAPER_US_URL || 'http://scraper-us.internal:3000',
      isHealthy: true,
      isBanned: false,
      requestCount: 0,
      successCount: 0,
      errorCount: 0,
    },
  ],
  rotationStrategy: (process.env.GATEWAY_ROTATION_STRATEGY as any) || 'round-robin',
  banDuration: parseInt(process.env.GATEWAY_BAN_DURATION_MS || '900000', 10), // 15 minutes
  timeout: parseInt(process.env.GATEWAY_TIMEOUT_MS || '30000', 10), // 30 secondes
  retryAttempts: parseInt(process.env.GATEWAY_RETRY_ATTEMPTS || '3', 10),
}

// État global du gateway
let gatewayState = {
  config: DEFAULT_CONFIG,
  currentNodeIndex: 0, // Pour round-robin
  lastHealthCheck: 0,
}

/**
 * Vérifie si un node est disponible (non banni et healthy)
 */
function isNodeAvailable(node: ScraperNode, config: GatewayConfig): boolean {
  if (!node.isHealthy) return false
  
  if (node.isBanned) {
    const now = Date.now()
    if (node.bannedUntil && now < node.bannedUntil) {
      return false // Encore banni
    } else {
      // Le ban a expiré, le réactiver
      node.isBanned = false
      node.bannedUntil = undefined
      logger.info(`✅ Node ${node.name} (${node.region}) réactivé après expiration du ban`)
      return true
    }
  }
  
  return true
}

/**
 * Marque un node comme banni temporairement
 */
function banNode(node: ScraperNode, config: GatewayConfig): void {
  node.isBanned = true
  node.bannedUntil = Date.now() + config.banDuration
  logger.warn(`🚫 Node ${node.name} (${node.region}) banni temporairement pour ${config.banDuration / 1000}s`)
}

/**
 * Sélectionne le meilleur node selon la stratégie
 */
function selectNode(config: GatewayConfig): ScraperNode | null {
  const availableNodes = config.nodes.filter(node => isNodeAvailable(node, config))
  
  if (availableNodes.length === 0) {
    logger.error('❌ Aucun node disponible')
    return null
  }
  
  switch (config.rotationStrategy) {
    case 'round-robin': {
      // Trouver le prochain node disponible en round-robin
      let attempts = 0
      while (attempts < config.nodes.length) {
        const node = config.nodes[gatewayState.currentNodeIndex % config.nodes.length]
        gatewayState.currentNodeIndex++
        
        if (isNodeAvailable(node, config)) {
          return node
        }
        attempts++
      }
      // Fallback sur le premier disponible
      return availableNodes[0]
    }
    
    case 'random': {
      const randomIndex = Math.floor(Math.random() * availableNodes.length)
      return availableNodes[randomIndex]
    }
    
    case 'least-used': {
      return availableNodes.reduce((prev, curr) => 
        curr.requestCount < prev.requestCount ? curr : prev
      )
    }
    
    case 'health-based': {
      // Sélectionner le node avec le meilleur ratio de succès
      return availableNodes.reduce((prev, curr) => {
        const prevRatio = prev.successCount / Math.max(prev.requestCount, 1)
        const currRatio = curr.successCount / Math.max(curr.requestCount, 1)
        return currRatio > prevRatio ? curr : prev
      })
    }
    
    default:
      return availableNodes[0]
  }
}

/**
 * Envoie une requête à un node scraper
 */
async function forwardRequestToNode(
  node: ScraperNode,
  requestData: {
    url: string
    method?: string
    headers?: Record<string, string>
    body?: any
  },
  config: GatewayConfig
): Promise<{ success: boolean; data?: any; error?: string; statusCode?: number }> {
  node.requestCount++
  node.lastUsed = Date.now()
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.timeout)
    
    const response = await fetch(`${node.url}/api/v1/scrape/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...requestData.headers,
      },
      body: JSON.stringify({
        url: requestData.url,
        method: requestData.method || 'GET',
        body: requestData.body,
      }),
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    
    const data = await response.json()
    
    if (response.ok) {
      node.successCount++
      return { success: true, data, statusCode: response.status }
    } else {
      node.errorCount++
      node.lastError = data.error || `HTTP ${response.status}`
      
      // Si c'est un 403, bannir le node
      if (response.status === 403) {
        banNode(node, config)
      }
      
      return { 
        success: false, 
        error: data.error || `HTTP ${response.status}`,
        statusCode: response.status 
      }
    }
  } catch (error: any) {
    node.errorCount++
    node.lastError = error.message || 'Unknown error'
    
    // Timeout ou erreur réseau
    if (error.name === 'AbortError') {
      node.lastError = 'Timeout'
    }
    
    // Marquer comme unhealthy après plusieurs erreurs
    if (node.errorCount > 5 && node.errorCount > node.successCount) {
      node.isHealthy = false
      logger.warn(`⚠️ Node ${node.name} (${node.region}) marqué comme unhealthy`)
    }
    
    return { 
      success: false, 
      error: error.message || 'Unknown error' 
    }
  }
}

/**
 * Route une requête vers le cluster de scrapers avec rotation automatique
 */
export async function routeRequest(
  requestData: {
    url: string
    method?: string
    headers?: Record<string, string>
    body?: any
  }
): Promise<{ success: boolean; data?: any; error?: string; nodeUsed?: string }> {
  const config = gatewayState.config
  const maxAttempts = config.retryAttempts
  
  // Essayer avec différents nodes jusqu'à réussir
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const node = selectNode(config)
    
    if (!node) {
      return {
        success: false,
        error: 'Aucun node scraper disponible',
      }
    }
    
    logger.info(`🔄 Tentative ${attempt + 1}/${maxAttempts} avec ${node.name} (${node.region})`)
    
    const result = await forwardRequestToNode(node, requestData, config)
    
    if (result.success) {
      logger.info(`✅ Requête réussie via ${node.name} (${node.region})`)
      return {
        success: true,
        data: result.data,
        nodeUsed: node.id,
      }
    } else {
      logger.warn(`❌ Échec avec ${node.name} (${node.region}): ${result.error}`)
      
      // Si c'est un 403, essayer le node suivant
      if (result.statusCode === 403) {
        logger.info(`🔄 Rotation vers un autre node après 403...`)
        continue
      }
      
      // Pour les autres erreurs, on peut aussi essayer le suivant
      if (attempt < maxAttempts - 1) {
        logger.info(`🔄 Tentative avec un autre node...`)
        continue
      }
    }
  }
  
  return {
    success: false,
    error: `Échec après ${maxAttempts} tentatives avec différents nodes`,
  }
}

/**
 * Récupère les statistiques du cluster
 */
export function getClusterStats(): {
  totalNodes: number
  availableNodes: number
  bannedNodes: number
  unhealthyNodes: number
  nodes: Array<{
    id: string
    name: string
    region: string
    isHealthy: boolean
    isBanned: boolean
    requestCount: number
    successCount: number
    errorCount: number
    successRate: number
    lastError?: string
  }>
} {
  const config = gatewayState.config
  const availableNodes = config.nodes.filter(node => isNodeAvailable(node, config))
  const bannedNodes = config.nodes.filter(node => node.isBanned)
  const unhealthyNodes = config.nodes.filter(node => !node.isHealthy)
  
  return {
    totalNodes: config.nodes.length,
    availableNodes: availableNodes.length,
    bannedNodes: bannedNodes.length,
    unhealthyNodes: unhealthyNodes.length,
    nodes: config.nodes.map(node => ({
      id: node.id,
      name: node.name,
      region: node.region,
      isHealthy: node.isHealthy,
      isBanned: node.isBanned,
      requestCount: node.requestCount,
      successCount: node.successCount,
      errorCount: node.errorCount,
      successRate: node.requestCount > 0 
        ? (node.successCount / node.requestCount) * 100 
        : 0,
      lastError: node.lastError,
    })),
  }
}

/**
 * Réinitialise l'état d'un node (pour tests ou récupération manuelle)
 */
export function resetNode(nodeId: string): boolean {
  const node = gatewayState.config.nodes.find(n => n.id === nodeId)
  if (!node) return false
  
  node.isBanned = false
  node.bannedUntil = undefined
  node.isHealthy = true
  node.lastError = undefined
  
  logger.info(`✅ Node ${node.name} réinitialisé`)
  return true
}

/**
 * Met à jour la configuration du gateway
 */
export function updateConfig(updates: Partial<GatewayConfig>): void {
  gatewayState.config = {
    ...gatewayState.config,
    ...updates,
  }
  logger.info('✅ Configuration du gateway mise à jour')
}

