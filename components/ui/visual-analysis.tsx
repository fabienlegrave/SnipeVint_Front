'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { VisualAnalysis } from '@/lib/types'
import { 
  Eye, 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Star,
  Package,
  MapPin,
  Zap,
  Camera
} from 'lucide-react'

interface VisualAnalysisDisplayProps {
  analysis: VisualAnalysis
  compact?: boolean
}

const gradeColors = {
  mint: 'bg-green-100 text-green-800 border-green-200',
  near_mint: 'bg-green-50 text-green-700 border-green-200',
  good: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  fair: 'bg-orange-50 text-orange-700 border-orange-200',
  poor: 'bg-red-50 text-red-700 border-red-200'
}

const completenessColors = {
  complete_in_box: 'bg-green-100 text-green-800',
  cartridge_only: 'bg-blue-100 text-blue-800',
  manual_only: 'bg-purple-100 text-purple-800',
  box_only: 'bg-orange-100 text-orange-800',
  accessories_only: 'bg-gray-100 text-gray-800'
}

const completenessLabels = {
  complete_in_box: 'Complet en boîte',
  cartridge_only: 'Cartouche seule',
  manual_only: 'Manuel seulement',
  box_only: 'Boîte seulement',
  accessories_only: 'Accessoires seulement'
}

const regionLabels = {
  PAL: 'Europe (PAL)',
  NTSC: 'Amérique (NTSC)',
  'NTSC-J': 'Japon (NTSC-J)',
  UNKNOWN: 'Région inconnue'
}

const marketPositionColors = {
  common: 'bg-gray-100 text-gray-800',
  uncommon: 'bg-blue-100 text-blue-800',
  rare: 'bg-purple-100 text-purple-800',
  very_rare: 'bg-red-100 text-red-800'
}

export function VisualAnalysisDisplay({ analysis, compact = false }: VisualAnalysisDisplayProps) {
  if (compact) {
    return (
      <Card className="border-purple-200 bg-purple-50/50">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-800">Analyse Visuelle IA</span>
          </div>
          
          <div className="flex flex-wrap gap-1">
            <Badge className={gradeColors[analysis.physical_condition.overall_grade]}>
              {analysis.physical_condition.overall_grade.replace('_', ' ')}
            </Badge>
            
            <Badge className={completenessColors[analysis.completeness.type]}>
              {completenessLabels[analysis.completeness.type]}
            </Badge>
            
            {analysis.authenticity.is_authentic ? (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Authentique
              </Badge>
            ) : (
              <Badge className="bg-red-100 text-red-800">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Suspect
              </Badge>
            )}
            
            <Badge className={marketPositionColors[analysis.price_signals.market_position]}>
              {analysis.price_signals.market_position.replace('_', ' ')}
            </Badge>
          </div>
          
          <div className="mt-2 text-xs text-gray-600">
            Confiance: {Math.round(analysis.analysis_metadata.analysis_confidence * 100)}% • 
            {analysis.analysis_metadata.photos_analyzed} photos analysées
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <Card className="border-purple-200 bg-purple-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <Eye className="h-5 w-5" />
            Analyse Visuelle IA
            <Badge className="ml-auto bg-purple-100 text-purple-800">
              GPT Vision
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-4 text-sm text-purple-700">
            <div className="flex items-center gap-1">
              <Camera className="h-4 w-4" />
              {analysis.analysis_metadata.photos_analyzed} photos
            </div>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4" />
              {Math.round(analysis.analysis_metadata.analysis_confidence * 100)}% confiance
            </div>
            <div className="flex items-center gap-1">
              <Zap className="h-4 w-4" />
              {analysis.analysis_metadata.main_photo_quality}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* État physique */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-blue-600" />
            État Physique
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <Badge className={`${gradeColors[analysis.physical_condition.overall_grade]} text-base px-3 py-1`}>
                {analysis.physical_condition.overall_grade.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            
            {analysis.physical_condition.wear_details.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-1">Usure détectée :</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {analysis.physical_condition.wear_details.map((detail, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <span className="text-orange-500 mt-1">•</span>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {analysis.physical_condition.damage_notes && analysis.physical_condition.damage_notes.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-red-700 mb-1">Dommages :</h4>
                <ul className="text-sm text-red-600 space-y-1">
                  {analysis.physical_condition.damage_notes.map((damage, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <span className="text-red-500 mt-1">•</span>
                      {damage}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Complétude */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Package className="h-5 w-5 text-green-600" />
            Complétude
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className={`${completenessColors[analysis.completeness.type]} text-base px-3 py-1`}>
                {completenessLabels[analysis.completeness.type]}
              </Badge>
              <span className="text-sm text-gray-600">
                ({Math.round(analysis.completeness.confidence * 100)}% confiance)
              </span>
            </div>
            
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-1">Éléments inclus :</h4>
              <div className="flex flex-wrap gap-1">
                {analysis.completeness.included_items.map((item, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
            
            {analysis.completeness.missing_items && analysis.completeness.missing_items.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-1">Éléments manquants :</h4>
                <div className="flex flex-wrap gap-1">
                  {analysis.completeness.missing_items.map((item, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs text-red-600 border-red-200">
                      <XCircle className="h-3 w-3 mr-1" />
                      {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Authenticité */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-purple-600" />
            Authenticité
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {analysis.authenticity.is_authentic ? (
                <Badge className="bg-green-100 text-green-800 text-base px-3 py-1">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Original Authentique
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800 text-base px-3 py-1">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Reproduction Suspectée
                </Badge>
              )}
              <span className="text-sm text-gray-600">
                ({Math.round(analysis.authenticity.authenticity_confidence * 100)}% confiance)
              </span>
            </div>
            
            {analysis.authenticity.reproduction_signals && analysis.authenticity.reproduction_signals.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-red-700 mb-1">Signaux de reproduction :</h4>
                <ul className="text-sm text-red-600 space-y-1">
                  {analysis.authenticity.reproduction_signals.map((signal, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <span className="text-red-500 mt-1">•</span>
                      {signal}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Région et variante */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5 text-blue-600" />
            Région & Variante
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-base px-3 py-1">
                {regionLabels[analysis.region_variant.detected_region]}
              </Badge>
                             {analysis.region_variant.variant_type && analysis.region_variant.variant_type !== 'standard' && (
                 <Badge className="bg-purple-100 text-purple-800">
                   {analysis.region_variant.variant_type.replace('_', ' ')}
                 </Badge>
               )}
            </div>
            
            {analysis.region_variant.region_indicators.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-1">Indicateurs régionaux :</h4>
                <div className="flex flex-wrap gap-1">
                  {analysis.region_variant.region_indicators.map((indicator, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {indicator}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {analysis.region_variant.variant_details && (
              <p className="text-sm text-gray-600">{analysis.region_variant.variant_details}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Signaux de prix */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Star className="h-5 w-5 text-yellow-600" />
            Signaux de Marché
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <Badge className={`${marketPositionColors[analysis.price_signals.market_position]} text-base px-3 py-1`}>
                {analysis.price_signals.market_position.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
            
            {analysis.price_signals.rarity_indicators.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-1">Indicateurs de rareté :</h4>
                <div className="flex flex-wrap gap-1">
                  {analysis.price_signals.rarity_indicators.map((indicator, idx) => (
                    <Badge key={idx} className="bg-yellow-100 text-yellow-800 text-xs">
                      {indicator}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {analysis.price_signals.demand_signals.length > 0 && (
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-1">Signaux de demande :</h4>
                <div className="flex flex-wrap gap-1">
                  {analysis.price_signals.demand_signals.map((signal, idx) => (
                    <Badge key={idx} className="bg-blue-100 text-blue-800 text-xs">
                      {signal}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Observations clés */}
      {analysis.analysis_metadata.key_observations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Eye className="h-5 w-5 text-gray-600" />
              Observations Clés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {analysis.analysis_metadata.key_observations.map((observation, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-blue-500 mt-1">•</span>
                  <span className="text-gray-700">{observation}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 