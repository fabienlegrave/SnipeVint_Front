'use client'

import { useState, useEffect } from 'react'

interface StoredToken {
  token: string
  validatedAt: Date
  isValid: boolean
  expiresAt?: Date
  userId?: string
  error?: string
  fullCookies?: string // Cookies complets du navigateur (optionnel, pour éviter 403)
}

const TOKEN_STORAGE_KEY = 'vinted_token_data'

/**
 * Classe pour gérer les tokens de façon centralisée (client-side)
 */
export class TokenStore {
  private static instance: TokenStore
  private currentToken: StoredToken | null = null

  private constructor() {
    this.loadFromStorage()
    
    // Log du token chargé au démarrage
    if (this.currentToken) {
      console.log('🔐 TokenStore initialisé avec token:', {
        hasToken: !!this.currentToken.token,
        isValid: this.currentToken.isValid,
        tokenPreview: this.currentToken.token ? `${this.currentToken.token.substring(0, 10)}...` : 'None'
      })
    } else {
      console.log('🔐 TokenStore initialisé sans token')
    }
    
    // Écouter les changements de localStorage (pour synchronisation entre onglets)
    if (typeof window !== 'undefined') {
      this.handleStorageChange = this.handleStorageChange.bind(this)
      window.addEventListener('storage', this.handleStorageChange)
    }
  }
  
  private handleStorageChange = (e: StorageEvent) => {
    if (e.key === TOKEN_STORAGE_KEY) {
      console.log('🔄 Token mis à jour depuis un autre onglet')
      this.loadFromStorage()
      this.notifyListeners()
    }
  }

  static getInstance(): TokenStore {
    if (!TokenStore.instance) {
      TokenStore.instance = new TokenStore()
    }
    return TokenStore.instance
  }

  /**
   * Récupère le token actuel
   */
  getCurrentToken(): string | null {
    return this.currentToken?.token || null
  }

  /**
   * Récupère les cookies complets si disponibles
   */
  getFullCookies(): string | null {
    return this.currentToken?.fullCookies || null
  }

  /**
   * Récupère toutes les infos du token
   */
  getTokenInfo(): StoredToken | null {
    return this.currentToken
  }

  /**
   * Sauvegarde un nouveau token
   */
  async setToken(token: string, validationResult: any, fullCookies?: string): Promise<void> {
    this.currentToken = {
      token: token.trim(),
      validatedAt: new Date(),
      isValid: validationResult.isValid,
      expiresAt: validationResult.details?.expiresAt ? new Date(validationResult.details.expiresAt) : undefined,
      userId: validationResult.details?.userId,
      error: validationResult.error,
      fullCookies: fullCookies // Stocker les cookies complets si fournis
    }

    // Sauvegarder immédiatement et de manière synchrone
    this.saveToStorage()
    
    // Vérifier que la sauvegarde a fonctionné
    const saved = this.loadFromStorageSync()
    if (!saved || saved.token !== token.trim()) {
      console.warn('⚠️ Token pas correctement sauvegardé, nouvelle tentative...')
      // Retry avec un délai
      setTimeout(() => {
        this.saveToStorage()
        console.log('🔄 Seconde tentative de sauvegarde token')
      }, 100)
    }
    
    this.notifyListeners()
  }

  /**
   * Supprime le token actuel
   */
  clearToken(): void {
    this.currentToken = null
    this.removeFromStorage()
    this.notifyListeners()
  }

  /**
   * Vérifie si le token est valide et pas expiré
   */
  isTokenValid(): boolean {
    if (!this.currentToken || !this.currentToken.isValid) {
      return false
    }

    // Vérifier l'expiration si on a l'info
    if (this.currentToken.expiresAt) {
      const now = new Date()
      if (now >= this.currentToken.expiresAt) {
        console.log('🔐 Token expiré, invalidation automatique')
        this.currentToken.isValid = false
        this.saveToStorage()
        return false
      }
    }

    return true
  }

  /**
   * Listeners pour les changements de token
   */
  private listeners: Array<(token: StoredToken | null) => void> = []

  onTokenChange(listener: (token: StoredToken | null) => void): () => void {
    this.listeners.push(listener)
    return () => {
      const index = this.listeners.indexOf(listener)
      if (index > -1) {
        this.listeners.splice(index, 1)
      }
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentToken))
  }

  /**
   * Sauvegarde dans localStorage
   */
  private saveToStorage(): void {
    if (typeof window !== 'undefined' && this.currentToken) {
      try {
        const dataToSave = {
          ...this.currentToken,
          validatedAt: this.currentToken.validatedAt.toISOString(),
          expiresAt: this.currentToken.expiresAt?.toISOString()
        }
        
        localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(dataToSave))
        
        // Vérification immédiate
        const verification = localStorage.getItem(TOKEN_STORAGE_KEY)
        if (!verification) {
          console.error('❌ Échec sauvegarde localStorage - token non persisté')
        } else {
          console.log('✅ Token sauvegardé avec succès dans localStorage')
        }
      } catch (error) {
        console.error('Erreur sauvegarde token:', error)
      }
    }
  }

  /**
   * Chargement depuis localStorage
   */
  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(TOKEN_STORAGE_KEY)
        console.log('🔍 Tentative de chargement token depuis localStorage:', stored ? 'Données trouvées' : 'Aucune donnée')
        
        if (stored) {
          const parsed = JSON.parse(stored)
          this.currentToken = {
            ...parsed,
            validatedAt: new Date(parsed.validatedAt),
            expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined
          }
          
          console.log('🔐 Token chargé depuis le storage:', {
            hasToken: !!this.currentToken.token,
            hasFullCookies: !!this.currentToken.fullCookies,
            fullCookiesLength: this.currentToken.fullCookies?.length || 0,
            isValid: this.currentToken.isValid,
            tokenPreview: this.currentToken.token ? `${this.currentToken.token.substring(0, 10)}...` : 'None'
          })
        } else {
          console.log('❌ Aucun token trouvé dans localStorage')
          this.currentToken = null
        }
      } catch (error) {
        console.error('Erreur chargement token:', error)
        this.currentToken = null
        this.removeFromStorage()
      }
    }
  }

  /**
   * Suppression du localStorage
   */
  private removeFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(TOKEN_STORAGE_KEY)
      } catch (error) {
        console.error('Erreur suppression token:', error)
      }
    }
  }

  /**
   * Chargement synchrone pour vérification
   */
  private loadFromStorageSync(): StoredToken | null {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(TOKEN_STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          return {
            ...parsed,
            validatedAt: new Date(parsed.validatedAt),
            expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined
          }
        }
      } catch (error) {
        console.error('Erreur chargement sync token:', error)
      }
    }
    return null
  }

  /**
   * Met à jour le statut de validité (après une validation)
   */
  updateValidationStatus(validationResult: any): void {
    if (this.currentToken) {
      this.currentToken.isValid = validationResult.isValid
      this.currentToken.validatedAt = new Date()
      this.currentToken.error = validationResult.error
      if (validationResult.details?.expiresAt) {
        this.currentToken.expiresAt = new Date(validationResult.details.expiresAt)
      }
      if (validationResult.details?.userId) {
        this.currentToken.userId = validationResult.details.userId
      }
      
      this.saveToStorage()
      this.notifyListeners()
    }
  }
}

// Instance globale pour le client
let clientTokenStore: TokenStore | null = null

export function getClientTokenStore(): TokenStore {
  if (typeof window !== 'undefined' && !clientTokenStore) {
    clientTokenStore = TokenStore.getInstance()
  }
  return clientTokenStore!
}

/**
 * Hook React pour utiliser le token store
 */
export function useTokenStore() {
  const [tokenInfo, setTokenInfo] = useState<StoredToken | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const store = getClientTokenStore()
      
      // Chargement initial avec vérification
      const initialToken = store.getTokenInfo()
      setTokenInfo(initialToken)
      setIsLoaded(true)
      
      if (initialToken) {
        console.log('🔐 Token initial chargé:', {
          hasToken: !!initialToken.token,
          isValid: initialToken.isValid,
          validatedAt: initialToken.validatedAt
        })
      } else {
        console.log('❌ Aucun token initial trouvé')
      }
      
      const unsubscribe = store.onTokenChange(setTokenInfo)
      
      // Écouter les changements de localStorage depuis d'autres onglets
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === TOKEN_STORAGE_KEY) {
          console.log('🔄 Token changé dans un autre onglet, rechargement...')
          // Force le rechargement du store
          const freshStore = TokenStore.getInstance()
          freshStore.loadFromStorage()
          setTokenInfo(store.getTokenInfo())
        }
      }
      
      window.addEventListener('storage', handleStorageChange)
      
      return () => {
        unsubscribe()
        window.removeEventListener('storage', handleStorageChange)
      }
    }
  }, [isLoaded])

  return {
    token: tokenInfo?.token || null,
    fullCookies: tokenInfo?.fullCookies || null,
    tokenInfo,
    isValid: tokenInfo ? (typeof window !== 'undefined' ? getClientTokenStore().isTokenValid() : false) : false,
    isLoaded,
    setToken: async (token: string, validation: any, fullCookies?: string) => {
      if (typeof window !== 'undefined') {
        await getClientTokenStore().setToken(token, validation, fullCookies)
      }
    },
    clearToken: () => {
      if (typeof window !== 'undefined') {
        getClientTokenStore().clearToken()
      }
    },
    updateValidation: (validation: any) => {
      if (typeof window !== 'undefined') {
        getClientTokenStore().updateValidationStatus(validation)
      }
    }
  }
} 