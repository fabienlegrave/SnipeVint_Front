'use client'

import { useEffect, useState, useCallback } from 'react'
import { useTokenStore } from '@/lib/tokenStore.client'
import { analyzeCookies, shouldRenewCookies, CookieAnalysis } from '@/lib/utils/cookieParser'
import { shouldRenewToken, renewAccessToken } from '@/lib/utils/tokenRenewer'
import { logger } from '@/lib/logger'

export interface CookieMonitorStatus {
  isMonitoring: boolean
  analysis: CookieAnalysis | null
  needsRenewal: boolean
  shouldAutoRenew: boolean
  lastCheck: Date | null
  error: string | null
  isRenewing: boolean
}

/**
 * Hook pour monitorer automatiquement les cookies et détecter quand ils doivent être renouvelés
 */
export function useCookieMonitor(checkIntervalMinutes: number = 60) {
  const { fullCookies, tokenInfo } = useTokenStore()
  const { setToken } = useTokenStore()
  const [status, setStatus] = useState<CookieMonitorStatus>({
    isMonitoring: false,
    analysis: null,
    needsRenewal: false,
    shouldAutoRenew: false,
    lastCheck: null,
    error: null,
    isRenewing: false
  })

  const checkCookies = useCallback(async () => {
    if (!fullCookies) {
      setStatus(prev => ({
        ...prev,
        analysis: null,
        needsRenewal: false,
        error: 'No cookies available'
      }))
      return
    }

    try {
      const analysis = analyzeCookies(fullCookies)
      const needsRenewal = shouldRenewCookies(analysis)
      const shouldAutoRenew = shouldRenewToken(analysis.expiresAt)

      setStatus(prev => ({
        ...prev,
        analysis,
        needsRenewal,
        shouldAutoRenew,
        lastCheck: new Date(),
        error: null
      }))

      if (needsRenewal && analysis.daysUntilExpiration !== undefined) {
        logger.warn(`⚠️ Cookies expirent dans ${analysis.daysUntilExpiration} jours - renouvellement recommandé`)
      }

      // Renouvellement automatique si nécessaire (sera géré par useEffect)
      // On ne l'appelle pas directement ici pour éviter les problèmes de dépendances

      return analysis
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      setStatus(prev => ({
        ...prev,
        error: errorMessage
      }))
      logger.error('Cookie monitoring error', error as Error)
    }
  }, [fullCookies])

  useEffect(() => {
    if (!fullCookies) {
      setStatus(prev => ({ ...prev, isMonitoring: false }))
      return
    }

    setStatus(prev => ({ ...prev, isMonitoring: true }))

    // Vérification immédiate
    checkCookies()

    // Vérification périodique
    const intervalMs = checkIntervalMinutes * 60 * 1000
    const intervalId = setInterval(() => {
      checkCookies()
    }, intervalMs)

    return () => {
      clearInterval(intervalId)
    }
  }, [fullCookies, checkCookies, checkIntervalMinutes])

  const autoRenewToken = useCallback(async (refreshToken: string, currentCookies: string) => {
    if (status.isRenewing) return

    setStatus(prev => ({ ...prev, isRenewing: true }))
    
    try {
      logger.info('🔄 Renouvellement automatique du token...')
      const result = await renewAccessToken(refreshToken, currentCookies)
      
      if (result.success && result.newCookies && result.newAccessToken) {
        // Mettre à jour le token store avec les nouveaux cookies
        await setToken(
          result.newAccessToken,
          { isValid: true, details: { statusCode: 200, message: 'Token renouvelé automatiquement' } },
          result.newCookies
        )
        
        logger.info('✅ Token renouvelé automatiquement avec succès')
        setStatus(prev => ({ ...prev, isRenewing: false, error: null }))
        
        // Re-vérifier les cookies après renouvellement
        setTimeout(() => checkCookies(), 1000)
      } else {
        logger.warn(`⚠️ Échec du renouvellement automatique: ${result.error}`)
        setStatus(prev => ({ ...prev, isRenewing: false, error: result.error || 'Renouvellement échoué' }))
      }
    } catch (error) {
      logger.error('Erreur lors du renouvellement automatique', error as Error)
      setStatus(prev => ({ 
        ...prev, 
        isRenewing: false, 
        error: error instanceof Error ? error.message : 'Erreur inconnue' 
      }))
    }
  }, [setToken, checkCookies])

  // Effet séparé pour le renouvellement automatique
  useEffect(() => {
    if (!status.shouldAutoRenew || !status.analysis?.refreshToken || !fullCookies || status.isRenewing) {
      return
    }

    autoRenewToken(status.analysis.refreshToken, fullCookies)
  }, [status.shouldAutoRenew, status.analysis?.refreshToken, fullCookies, status.isRenewing, autoRenewToken])

  return {
    ...status,
    checkCookies,
    refreshCookies: checkCookies,
    renewToken: autoRenewToken
  }
}

