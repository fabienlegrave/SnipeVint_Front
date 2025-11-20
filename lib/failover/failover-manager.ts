/**
 * Système de failover automatique pour gérer les erreurs 403
 * - Détecte les erreurs 403
 * - Change automatiquement de région ou de machine
 * - Redémarre les machines Fly
 * - Utilise plusieurs apps comme fallback
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { logger } from '@/lib/logger'

const execAsync = promisify(exec)

interface FailoverConfig {
  appName: string
  regions: string[] // Régions disponibles (ex: ['cdg', 'iad', 'lhr'])
  machines: string[] // IDs des machines disponibles
  max403BeforeFailover: number // Nombre de 403 avant failover (défaut: 3)
  failoverCooldown: number // Délai minimum entre failovers (ms)
}

interface FailoverState {
  currentRegion: string
  currentMachine: string
  currentApp: string
  lastFailover: number
  consecutive403: number
  failoverHistory: Array<{
    timestamp: number
    reason: string
    from: { region: string; machine: string; app: string }
    to: { region: string; machine: string; app: string }
  }>
}

// Configuration par défaut
const DEFAULT_CONFIG: FailoverConfig = {
  appName: process.env.FLY_APP_NAME || 'vinted-last',
  regions: (process.env.FAILOVER_REGIONS || 'cdg,iad,lhr').split(',').map(r => r.trim()),
  machines: [], // Sera rempli dynamiquement
  max403BeforeFailover: parseInt(process.env.MAX_403_BEFORE_FAILOVER || '3', 10),
  failoverCooldown: parseInt(process.env.FAILOVER_COOLDOWN_MS || '300000', 10), // 5 minutes
}

// État global du failover
let failoverState: FailoverState = {
  currentRegion: process.env.FLY_REGION || 'cdg',
  currentMachine: process.env.FLY_MACHINE_ID || '',
  currentApp: process.env.FLY_APP_NAME || 'vinted-last',
  lastFailover: 0,
  consecutive403: 0,
  failoverHistory: [],
}

/**
 * Récupère la liste des machines disponibles pour l'app
 */
async function getAvailableMachines(appName: string): Promise<string[]> {
  try {
    const { stdout } = await execAsync(`fly machines list --app ${appName} --json`)
    const machines = JSON.parse(stdout)
    return machines
      .filter((m: any) => m.state === 'started' || m.state === 'stopped')
      .map((m: any) => m.id)
  } catch (error) {
    logger.error('Erreur lors de la récupération des machines', error as Error)
    return []
  }
}

/**
 * Récupère la région d'une machine
 */
async function getMachineRegion(appName: string, machineId: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`fly machines status ${machineId} --app ${appName} --json`)
    const machine = JSON.parse(stdout)
    return machine.region || null
  } catch (error) {
    logger.error(`Erreur lors de la récupération de la région de la machine ${machineId}`, error as Error)
    return null
  }
}

/**
 * Redémarre une machine
 */
async function restartMachine(appName: string, machineId: string): Promise<boolean> {
  try {
    logger.info(`🔄 Redémarrage de la machine ${machineId}...`)
    await execAsync(`fly machines restart ${machineId} --app ${appName}`)
    logger.info(`✅ Machine ${machineId} redémarrée`)
    return true
  } catch (error) {
    logger.error(`❌ Erreur lors du redémarrage de la machine ${machineId}`, error as Error)
    return false
  }
}

/**
 * Déplace une machine vers une nouvelle région
 */
async function moveMachineToRegion(appName: string, machineId: string, region: string): Promise<boolean> {
  try {
    logger.info(`🌍 Déplacement de la machine ${machineId} vers la région ${region}...`)
    await execAsync(`fly machines move ${machineId} --region ${region} --app ${appName}`)
    logger.info(`✅ Machine ${machineId} déplacée vers ${region}`)
    return true
  } catch (error) {
    logger.error(`❌ Erreur lors du déplacement de la machine ${machineId}`, error as Error)
    return false
  }
}

/**
 * Crée une nouvelle machine dans une région spécifique
 */
async function createMachineInRegion(appName: string, region: string, processGroup: string = 'worker'): Promise<string | null> {
  try {
    logger.info(`🆕 Création d'une nouvelle machine dans la région ${region}...`)
    const { stdout } = await execAsync(`fly machines create --region ${region} --app ${appName} --process-group ${processGroup} --json`)
    const machine = JSON.parse(stdout)
    logger.info(`✅ Nouvelle machine créée: ${machine.id}`)
    return machine.id
  } catch (error) {
    logger.error(`❌ Erreur lors de la création de la machine dans ${region}`, error as Error)
    return null
  }
}

/**
 * Sélectionne la prochaine région disponible
 */
function getNextRegion(currentRegion: string, availableRegions: string[]): string {
  const currentIndex = availableRegions.indexOf(currentRegion)
  if (currentIndex === -1 || currentIndex === availableRegions.length - 1) {
    return availableRegions[0] // Retour au début
  }
  return availableRegions[currentIndex + 1]
}

/**
 * Sélectionne la prochaine app de fallback
 */
function getNextApp(currentApp: string, fallbackApps: string[]): string {
  const currentIndex = fallbackApps.indexOf(currentApp)
  if (currentIndex === -1 || currentIndex === fallbackApps.length - 1) {
    return fallbackApps[0] // Retour au début
  }
  return fallbackApps[currentIndex + 1]
}

/**
 * Gère le failover après détection d'une erreur 403
 */
export async function handle403Failover(
  errorContext?: {
    region?: string
    machineId?: string
    appName?: string
  }
): Promise<boolean> {
  const config = DEFAULT_CONFIG
  const now = Date.now()
  
  // Vérifier le cooldown
  if (now - failoverState.lastFailover < config.failoverCooldown) {
    const remainingSeconds = Math.ceil((config.failoverCooldown - (now - failoverState.lastFailover)) / 1000)
    logger.warn(`⏸️ Failover en cooldown, attente de ${remainingSeconds}s avant le prochain failover`)
    return false
  }
  
  // Incrémenter le compteur de 403 consécutifs
  failoverState.consecutive403++
  
  logger.warn(`🚨 Erreur 403 détectée (${failoverState.consecutive403}/${config.max403BeforeFailover})`)
  
  // Si on n'a pas atteint le seuil, ne pas faire de failover
  if (failoverState.consecutive403 < config.max403BeforeFailover) {
    logger.info(`⏳ Attente de ${config.max403BeforeFailover - failoverState.consecutive403} erreur(s) 403 supplémentaire(s) avant failover`)
    return false
  }
  
  // Réinitialiser le compteur
  failoverState.consecutive403 = 0
  
  logger.info('🔄 Déclenchement du failover automatique...')
  
  const fromState = {
    region: errorContext?.region || failoverState.currentRegion,
    machine: errorContext?.machineId || failoverState.currentMachine,
    app: errorContext?.appName || failoverState.currentApp,
  }
  
  // Stratégie de failover : essayer dans l'ordre
  // 1. Redémarrer la machine actuelle
  // 2. Changer de région
  // 3. Changer d'app (si plusieurs apps configurées)
  
  let success = false
  let toState = { ...fromState }
  
  // Étape 1: Redémarrer la machine actuelle
  if (fromState.machine) {
    logger.info('📋 Étape 1: Redémarrage de la machine actuelle...')
    success = await restartMachine(fromState.app, fromState.machine)
    if (success) {
      logger.info('✅ Failover réussi: Machine redémarrée')
      toState = { ...fromState }
    }
  }
  
  // Étape 2: Si le redémarrage n'a pas fonctionné, changer de région
  if (!success && config.regions.length > 1) {
    logger.info('📋 Étape 2: Changement de région...')
    const nextRegion = getNextRegion(fromState.region, config.regions)
    
    // Récupérer les machines disponibles
    const machines = await getAvailableMachines(fromState.app)
    
    if (machines.length > 0) {
      // Essayer de déplacer une machine existante
      const machineToMove = machines[0]
      success = await moveMachineToRegion(fromState.app, machineToMove, nextRegion)
      
      if (success) {
        toState.region = nextRegion
        toState.machine = machineToMove
        logger.info(`✅ Failover réussi: Machine déplacée vers ${nextRegion}`)
      } else {
        // Si le déplacement échoue, créer une nouvelle machine
        const newMachineId = await createMachineInRegion(fromState.app, nextRegion)
        if (newMachineId) {
          toState.region = nextRegion
          toState.machine = newMachineId
          success = true
          logger.info(`✅ Failover réussi: Nouvelle machine créée dans ${nextRegion}`)
        }
      }
    } else {
      // Aucune machine existante, créer une nouvelle
      const newMachineId = await createMachineInRegion(fromState.app, nextRegion)
      if (newMachineId) {
        toState.region = nextRegion
        toState.machine = newMachineId
        success = true
        logger.info(`✅ Failover réussi: Nouvelle machine créée dans ${nextRegion}`)
      }
    }
  }
  
  // Étape 3: Si le changement de région n'a pas fonctionné, changer d'app
  if (!success) {
    const fallbackApps = (process.env.FAILOVER_APPS || fromState.app).split(',').map(a => a.trim())
    if (fallbackApps.length > 1) {
      logger.info('📋 Étape 3: Changement d\'app (fallback)...')
      const nextApp = getNextApp(fromState.app, fallbackApps)
      
      // Récupérer les machines de l'app de fallback
      const machines = await getAvailableMachines(nextApp)
      
      if (machines.length > 0) {
        // Utiliser une machine existante de l'app de fallback
        toState.app = nextApp
        toState.machine = machines[0]
        success = true
        logger.info(`✅ Failover réussi: Passage à l'app ${nextApp}`)
      } else {
        // Créer une nouvelle machine dans l'app de fallback
        const newMachineId = await createMachineInRegion(nextApp, fromState.region)
        if (newMachineId) {
          toState.app = nextApp
          toState.machine = newMachineId
          success = true
          logger.info(`✅ Failover réussi: Nouvelle machine créée dans l'app ${nextApp}`)
        }
      }
    }
  }
  
  if (success) {
    // Mettre à jour l'état
    failoverState.currentRegion = toState.region
    failoverState.currentMachine = toState.machine
    failoverState.currentApp = toState.app
    failoverState.lastFailover = now
    
    // Enregistrer dans l'historique
    failoverState.failoverHistory.push({
      timestamp: now,
      reason: '403 détecté',
      from: fromState,
      to: toState,
    })
    
    // Limiter l'historique à 50 entrées
    if (failoverState.failoverHistory.length > 50) {
      failoverState.failoverHistory.shift()
    }
    
    logger.info(`✅ Failover terminé: ${fromState.region}/${fromState.machine} → ${toState.region}/${toState.machine} (app: ${toState.app})`)
    
    // Attendre un peu pour que la machine soit prête
    logger.info('⏳ Attente de 30 secondes pour que la nouvelle machine soit prête...')
    await new Promise(resolve => setTimeout(resolve, 30000))
    
    return true
  } else {
    logger.error('❌ Échec du failover: Aucune stratégie n\'a fonctionné')
    return false
  }
}

/**
 * Réinitialise le compteur de 403 (appelé après un succès)
 */
export function reset403Counter(): void {
  if (failoverState.consecutive403 > 0) {
    logger.info(`✅ Réinitialisation du compteur 403 (était à ${failoverState.consecutive403})`)
    failoverState.consecutive403 = 0
  }
}

/**
 * Récupère l'état actuel du failover
 */
export function getFailoverState(): FailoverState {
  return { ...failoverState }
}

/**
 * Initialise le système de failover
 */
export async function initializeFailover(): Promise<void> {
  logger.info('🚀 Initialisation du système de failover...')
  
  const config = DEFAULT_CONFIG
  
  // Récupérer les machines disponibles
  const machines = await getAvailableMachines(config.appName)
  config.machines = machines
  
  if (machines.length > 0) {
    // Déterminer la machine actuelle
    const currentMachineId = process.env.FLY_MACHINE_ID || machines[0]
    failoverState.currentMachine = currentMachineId
    
    // Récupérer la région de la machine actuelle
    const region = await getMachineRegion(config.appName, currentMachineId)
    if (region) {
      failoverState.currentRegion = region
    }
    
    logger.info(`✅ Failover initialisé: ${failoverState.currentRegion}/${failoverState.currentMachine}`)
    logger.info(`📋 Régions disponibles: ${config.regions.join(', ')}`)
    logger.info(`📋 Machines disponibles: ${machines.length}`)
    
    // Afficher les apps de fallback si configurées
    const fallbackApps = process.env.FAILOVER_APPS
    if (fallbackApps) {
      logger.info(`📋 Apps de fallback: ${fallbackApps}`)
    }
  } else {
    logger.warn('⚠️ Aucune machine trouvée, le failover sera limité')
  }
}

