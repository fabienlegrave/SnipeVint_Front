/**
 * Utilitaires pour la vérification des alertes
 */

import { getClientTokenStore } from '@/lib/tokenStore.client'

/**
 * Récupère les cookies depuis le client store (pour usage côté client uniquement)
 */
export async function getCookiesForAlertCheck(): Promise<string | null> {
  if (typeof window === 'undefined') {
    throw new Error('getCookiesForAlertCheck can only be called from client-side')
  }

  try {
    const store = getClientTokenStore()
    return store.getFullCookies()
  } catch (error) {
    console.error('Error getting cookies for alert check:', error)
    return null
  }
}

/**
 * Appelle l'API de vérification des alertes
 */
export async function checkAlerts(maxPages: number = 5): Promise<{
  success: boolean
  alertsChecked: number
  itemsChecked: number
  matches: Array<{
    alertId: number
    alertTitle: string
    itemId: number
    itemTitle: string | null
    itemPrice: number | null
    itemUrl: string
    matchReason: string
  }>
  updatedAlerts: number[]
  error?: string
}> {
  const cookies = await getCookiesForAlertCheck()
  
  if (!cookies) {
    throw new Error('No cookies available. Please configure your cookies in Settings.')
  }

  const API_SECRET = process.env.NEXT_PUBLIC_API_SECRET || 'vinted_scraper_secure_2024'

  const response = await fetch('/api/v1/alerts/check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_SECRET
    },
    body: JSON.stringify({
      fullCookies: cookies,
      maxPages
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

