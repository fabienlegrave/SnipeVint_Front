'use client'

import { Navigation } from '@/components/layout/Navigation'
import { TokenManager } from '@/components/TokenManager'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Database, Zap, Shield } from 'lucide-react'

export default function SettingsPage() {
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
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Configuré' : '❌ Non configuré'}</p>
                  <p>• Clé publique: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Configuré' : '❌ Non configuré'}</p>
                  <p>• Statut: <span className="text-green-600">Connecté</span></p>
                </div>
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
                <div className="space-y-2 text-sm text-gray-600">
                  <p>• Concurrence enrichissement: <span className="font-mono">2</span></p>
                  <p>• Délai scraping: <span className="font-mono">1200ms</span></p>
                  <p>• Mode: <span className="text-blue-600">Conservateur</span></p>
                </div>
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
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">API Secret</p>
                    <p className="text-gray-600">
                      {process.env.NEXT_PUBLIC_API_SECRET ? '✅ Configuré' : '❌ Non configuré'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">SSL/TLS</p>
                    <p className="text-gray-600">
                      {process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0' ? '⚠️ Désactivé (dev)' : '✅ Activé'}
                    </p>
                  </div>
                </div>
                
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Les modifications de configuration nécessitent un redémarrage du serveur.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}