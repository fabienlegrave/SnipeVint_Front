/**
 * Affichage des faits vision extraits par l'IA
 */

import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Badge } from './badge'
import { CheckCircle, XCircle, Eye, Package, MapPin, Gamepad2, Shield, AlertTriangle } from 'lucide-react'

interface VisionFactsDisplayProps {
  item: any // Item avec champs ai_*
  compact?: boolean
}

const regionLabels = {
  'EUR': '🇪🇺 Europe (PAL)',
  'USA': '🇺🇸 Amérique (NTSC)',
  'JPN': '🇯🇵 Japon (NTSC-J)'
}

const completenessLabels = {
  'complete': '📦 Complet en boîte',
  'near_complete': '📦 Quasi-complet',
  'partial': '📦 Partiel',
  'cart_only': '🎮 Cartouche seule',
  'manual_only': '📖 Manuel seulement',
  'box_only': '📦 Boîte seulement',
  'unknown': '❓ Inconnu'
}

const conditionColors = {
  'mint': 'bg-green-100 text-green-800 border-green-200',
  'near_mint': 'bg-green-50 text-green-700 border-green-200',
  'very_good': 'bg-blue-50 text-blue-700 border-blue-200',
  'good': 'bg-yellow-50 text-yellow-700 border-yellow-200',
  'fair': 'bg-orange-50 text-orange-700 border-orange-200',
  'poor': 'bg-red-50 text-red-700 border-red-200',
  'unknown': 'bg-gray-50 text-gray-700 border-gray-200'
}

export function VisionFactsDisplay({ item, compact = false }: VisionFactsDisplayProps) {
  // Vérifier si on a des données vision fiables
  const hasVisionData = item.ai_vision_confidence && item.ai_vision_confidence >= 0.75
  
  if (!hasVisionData) {
    // Afficher un message d'attente si pas encore analysé
    if (compact) {
      return (
        <Card className="border-gray-200 bg-gray-50/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-gray-600">
              <Eye className="h-4 w-4" />
              <span className="text-sm">En attente d'analyse Vision IA</span>
            </div>
          </CardContent>
        </Card>
      )
    }
    return null
  }

  if (compact) {
    return (
      <Card className="border-purple-200 bg-purple-50/30">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">Faits Vision IA</span>
            <Badge className="bg-purple-100 text-purple-800 text-xs">
              {Math.round((item.ai_vision_confidence || 0) * 100)}%
            </Badge>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {/* Complétude */}
            {item.ai_completeness && (
              <Badge variant="outline" className="text-xs">
                {completenessLabels[item.ai_completeness] || item.ai_completeness}
              </Badge>
            )}
            
            {/* État */}
            {item.ai_condition_grade && (
              <Badge className={`text-xs ${conditionColors[item.ai_condition_grade] || conditionColors.unknown}`}>
                {item.ai_condition_grade.replace('_', ' ')}
              </Badge>
            )}
            
            {/* Région */}
            {item.ai_region && (
              <Badge variant="outline" className="text-xs">
                {regionLabels[item.ai_region] || item.ai_region}
              </Badge>
            )}
            
            {/* Plateforme */}
            {item.ai_platform && (
              <Badge variant="outline" className="text-xs">
                <Gamepad2 className="h-3 w-3 mr-1" />
                {item.ai_platform}
              </Badge>
            )}
            
            {/* Risques d'authenticité */}
            {item.ai_authenticity_risk && item.ai_authenticity_risk.length > 0 && (
              <Badge className="bg-red-100 text-red-800 text-xs">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Risques détectés
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-purple-200 bg-purple-50/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-purple-800">
          <Eye className="h-5 w-5" />
          Faits Vision IA
          <Badge className="ml-auto bg-purple-100 text-purple-800">
            Confiance: {Math.round((item.ai_vision_confidence || 0) * 100)}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Inventaire visuel */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
            <Package className="h-4 w-4" />
            Inventaire Observé
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              {item.ai_has_cart === true ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : item.ai_has_cart === false ? (
                <XCircle className="h-4 w-4 text-red-600" />
              ) : (
                <span className="h-4 w-4 text-gray-400">?</span>
              )}
              <span className="text-sm">Cartouche/CD</span>
            </div>
            
            <div className="flex items-center gap-2">
              {item.ai_has_box === true ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : item.ai_has_box === false ? (
                <XCircle className="h-4 w-4 text-red-600" />
              ) : (
                <span className="h-4 w-4 text-gray-400">?</span>
              )}
              <span className="text-sm">Boîte</span>
            </div>
            
            <div className="flex items-center gap-2">
              {item.ai_has_manual === true ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : item.ai_has_manual === false ? (
                <XCircle className="h-4 w-4 text-red-600" />
              ) : (
                <span className="h-4 w-4 text-gray-400">?</span>
              )}
              <span className="text-sm">Manuel/Notice</span>
            </div>
            
            <div className="flex items-center gap-2">
              {item.ai_has_plastic_case === true ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : item.ai_has_plastic_case === false ? (
                <XCircle className="h-4 w-4 text-red-600" />
              ) : (
                <span className="h-4 w-4 text-gray-400">?</span>
              )}
              <span className="text-sm">Boîtier plastique</span>
            </div>
          </div>
        </div>

        {/* Identification technique */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {item.ai_platform && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
              <Gamepad2 className="h-5 w-5 text-blue-600" />
              <div>
                <div className="font-medium text-blue-900">Plateforme</div>
                <div className="text-sm text-blue-700">{item.ai_platform}</div>
              </div>
            </div>
          )}
          
          {item.ai_region && (
            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <MapPin className="h-5 w-5 text-green-600" />
              <div>
                <div className="font-medium text-green-900">Région</div>
                <div className="text-sm text-green-700">
                  {regionLabels[item.ai_region] || item.ai_region}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* État et complétude */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {item.ai_completeness && (
            <div className="p-3 bg-purple-50 rounded-lg">
              <div className="font-medium text-purple-900 mb-1">Complétude</div>
              <Badge className="bg-purple-100 text-purple-800">
                {completenessLabels[item.ai_completeness] || item.ai_completeness}
              </Badge>
            </div>
          )}
          
          {item.ai_condition_grade && (
            <div className="p-3 bg-yellow-50 rounded-lg">
              <div className="font-medium text-yellow-900 mb-1">État Physique</div>
              <Badge className={conditionColors[item.ai_condition_grade] || conditionColors.unknown}>
                {item.ai_condition_grade.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          )}
        </div>

        {/* Risques d'authenticité */}
        {item.ai_authenticity_risk && item.ai_authenticity_risk.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-red-600" />
              <span className="font-medium text-red-900">Risques d'Authenticité Détectés</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {item.ai_authenticity_risk.map((risk: string, idx: number) => (
                <Badge key={idx} className="bg-red-100 text-red-800 text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {risk}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Peer Key pour debug */}
        {item.peer_key && (
          <div className="text-xs text-gray-500 bg-gray-50 rounded p-2 font-mono">
            Peer Key: {item.peer_key}
          </div>
        )}
      </CardContent>
    </Card>
  )
}