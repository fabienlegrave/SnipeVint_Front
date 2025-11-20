'use client'

import { Navigation } from '@/components/layout/Navigation'
import { TokenManager } from '@/components/TokenManager'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Database, Zap, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ConfigStatus {
  database: {
    url: boolean
    publicKey: boolean
    serviceKey: boolean
  }
  api: {
    secret: boolean
    publicSecret: boolean
  }
  puppeteer: {
    executablePath: boolean
  }
  telegram: {
    botToken: boolean
    chatId: boolean
  }
  vinted: {
    email: boolean
    password: boolean
  }
  performance: {
    scrapeDelay: string
    enrichConcurrency: string
    requestDelayMs: number
  }
  security: {
    tlsRejectUnauthorized: boolean
  }
}

export default function SettingsPage() {
  const [config, setConfig] = useState<ConfigStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [requestDelay, setRequestDelay] = useState<number>(15000)
  const [savingDelay, setSavingDelay] = useState(false)
  const [delaySaved, setDelaySaved] = useState(false)

  useEffect(() => {
    async function fetchConfig() {
      try {
        const apiSecret = process.env.NEXT_PUBLIC_API_SECRET
        
        // Debug: vérifier les variables NEXT_PUBLIC_* disponibles
        console.log('🔍 Variables NEXT_PUBLIC_* disponibles:', {
          hasApiSecret: !!apiSecret,
          hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        })
        
        // Fallback: utiliser les variables NEXT_PUBLIC_* directement si disponibles
        const fallbackConfig: ConfigStatus = {
          database: {
            url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            publicKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            serviceKey: false, // Pas accessible côté client
          },
          api: {
            secret: false, // Pas accessible côté client
            publicSecret: !!process.env.NEXT_PUBLIC_API_SECRET,
          },
          puppeteer: {
            executablePath: false, // Pas accessible côté client
          },
          telegram: {
            botToken: false, // Pas accessible côté client
            chatId: false, // Pas accessible côté client
          },
          vinted: {
            email: false, // Pas accessible côté client
            password: false, // Pas accessible côté client
          },
          performance: {
            scrapeDelay: '1200',
            enrichConcurrency: '2',
            requestDelayMs: 15000,
          },
          security: {
            tlsRejectUnauthorized: false,
          },
        }

        if (!apiSecret) {
          console.warn('NEXT_PUBLIC_API_SECRET non configuré, utilisation des valeurs NEXT_PUBLIC_* uniquement')
          setConfig(fallbackConfig)
          setLoading(false)
          return
        }

        const response = await fetch('/api/v1/admin/config', {
          headers: {
            'x-api-key': apiSecret,
          },
        })

        if (response.ok) {
          const data = await response.json()
          console.log('✅ Config récupérée depuis l\'API:', data)
          setConfig(data)
          
          // Récupérer le délai des requêtes
          try {
            const delayResponse = await fetch('/api/v1/admin/settings/request-delay', {
              headers: {
                'x-api-key': apiSecret,
              },
            })
            if (delayResponse.ok) {
              const delayData = await delayResponse.json()
              setRequestDelay(delayData.requestDelayMs || 15000)
            }
          } catch (error) {
            console.error('Erreur lors de la récupération du délai:', error)
          }
        } else {
          const errorData = await response.json().catch(() => ({}))
          console.error('❌ Erreur lors de la récupération de la config:', response.status, errorData)
          // En cas d'erreur, utiliser le fallback
          setConfig(fallbackConfig)
        }
      } catch (error) {
        console.error('Erreur lors de la récupération de la config:', error)
        // En cas d'erreur, utiliser les valeurs NEXT_PUBLIC_* disponibles
        setConfig({
          database: {
            url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            publicKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            serviceKey: false,
          },
          api: {
            secret: false,
            publicSecret: !!process.env.NEXT_PUBLIC_API_SECRET,
          },
          puppeteer: {
            executablePath: false,
          },
          telegram: {
            botToken: false,
            chatId: false,
          },
          vinted: {
            email: false,
            password: false,
          },
          performance: {
            scrapeDelay: '1200',
            enrichConcurrency: '2',
            requestDelayMs: 15000,
          },
          security: {
            tlsRejectUnauthorized: false,
          },
        })
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="h-8 w-8 text-blue-500" />
              Paramètres
            </h1>
            <p className="text-gray-600 mt-1">Gérez votre configuration et vos tokens d'accès</p>
          </div>

          {/* Token Management */}
          <TokenManager />

          {/* Other Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Base de données
                </CardTitle>
                <CardDescription>
                  Configuration Supabase et données
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-sm text-gray-500">Chargement...</div>
                ) : (
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>• URL: {config?.database.url ? '✅ Configuré' : '❌ Non configuré'}</p>
                    <p>• Clé publique: {config?.database.publicKey ? '✅ Configuré' : '❌ Non configuré'}</p>
                    <p>• Clé service: {config?.database.serviceKey ? '✅ Configuré' : '❌ Non configuré'}</p>
                    <p>• Statut: <span className="text-green-600">Connecté</span></p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Performance
                </CardTitle>
                <CardDescription>
                  Paramètres de scraping et rate limiting
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-sm text-gray-500">Chargement...</div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2 text-sm text-gray-600">
                      <p>• Concurrence enrichissement: <span className="font-mono">{config?.performance.enrichConcurrency || '2'}</span></p>
                      <p>• Délai scraping: <span className="font-mono">{config?.performance.scrapeDelay || '1200'}ms</span></p>
                      <p>• Mode: <span className="text-blue-600">Conservateur</span></p>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Délai entre requêtes (ms)
                      </label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          min="1000"
                          max="60000"
                          step="100"
                          value={requestDelay}
                          onChange={(e) => {
                            const value = parseInt(e.target.value, 10)
                            if (!isNaN(value) && value >= 1000 && value <= 60000) {
                              setRequestDelay(value)
                              setDelaySaved(false)
                            }
                          }}
                          className="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        />
                        <span className="text-sm text-gray-500">
                          ({requestDelay / 1000}s)
                        </span>
                        <button
                          onClick={async () => {
                            setSavingDelay(true)
                            setDelaySaved(false)
                            try {
                              const apiSecret = process.env.NEXT_PUBLIC_API_SECRET
                              if (!apiSecret) {
                                alert('API Secret non configuré')
                                return
                              }
                              
                              const response = await fetch('/api/v1/admin/settings/request-delay', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'x-api-key': apiSecret,
                                },
                                body: JSON.stringify({ requestDelayMs: requestDelay }),
                              })
                              
                              if (response.ok) {
                                setDelaySaved(true)
                                setTimeout(() => setDelaySaved(false), 3000)
                              } else {
                                const error = await response.json()
                                alert(`Erreur: ${error.error || 'Impossible de sauvegarder'}`)
                              }
                            } catch (error) {
                              console.error('Erreur lors de la sauvegarde:', error)
                              alert('Erreur lors de la sauvegarde')
                            } finally {
                              setSavingDelay(false)
                            }
                          }}
                          disabled={savingDelay}
                          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {savingDelay ? 'Sauvegarde...' : delaySaved ? '✓ Sauvegardé' : 'Sauvegarder'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Délai entre chaque requête API (1000-60000 ms). Valeur actuelle: {requestDelay}ms ({requestDelay / 1000}s)
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Sécurité et API
              </CardTitle>
              <CardDescription>
                Configuration des clés API et sécurité
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-gray-500">Chargement...</div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium">API Secret</p>
                      <p className="text-gray-600">
                        {config?.api.secret ? '✅ Configuré' : '❌ Non configuré'}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">SSL/TLS</p>
                      <p className="text-gray-600">
                        {config?.security.tlsRejectUnauthorized ? '⚠️ Désactivé (dev)' : '✅ Activé'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Les modifications de configuration nécessitent un redémarrage du serveur.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}