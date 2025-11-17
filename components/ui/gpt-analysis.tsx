'use client'

import { Badge } from './badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Button } from './button'
import { Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle, Sparkles } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { VintedItem } from '@/lib/types'

interface GPTAnalysisProps {
  item: VintedItem
  compact?: boolean
}

export function GPTAnalysis({ item, compact = false }: GPTAnalysisProps) {
  const analysis = item.gpt_analysis
  
  if (!analysis) {
    return null
  }

  const getRecommendationConfig = (recommendation: string) => {
    switch (recommendation) {
      case 'strong_buy':
        return {
          label: 'Achat Fortement Recommandé',
          color: 'bg-green-100 text-green-800 border-green-300',
          icon: CheckCircle,
          iconColor: 'text-green-600'
        }
      case 'good_deal':
        return {
          label: 'Bon Deal',
          color: 'bg-blue-100 text-blue-800 border-blue-300',
          icon: TrendingUp,
          iconColor: 'text-blue-600'
        }
      case 'fair_price':
        return {
          label: 'Prix Correct',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
          icon: AlertTriangle,
          iconColor: 'text-yellow-600'
        }
      case 'overpriced':
        return {
          label: 'Trop Cher',
          color: 'bg-orange-100 text-orange-800 border-orange-300',
          icon: TrendingDown,
          iconColor: 'text-orange-600'
        }
      case 'avoid':
        return {
          label: 'À Éviter',
          color: 'bg-red-100 text-red-800 border-red-300',
          icon: XCircle,
          iconColor: 'text-red-600'
        }
      default:
        return {
          label: 'Non Évalué',
          color: 'bg-gray-100 text-gray-800 border-gray-300',
          icon: Brain,
          iconColor: 'text-gray-600'
        }
    }
  }

  const config = getRecommendationConfig(analysis.recommendation || '')
  const IconComponent = config.icon

  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border">
        <Brain className="h-4 w-4 text-purple-600" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge className={`text-xs ${config.color}`}>
              <IconComponent className="h-3 w-3 mr-1" />
              {config.label}
            </Badge>
            <span className="text-sm font-medium">
              Score: {analysis.dealScore || 0}/100
            </span>
          </div>
          {item.gpt_confidence && (
            <div className="text-xs text-gray-600">
              Confiance: {item.gpt_confidence}%
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            <Sparkles className="h-4 w-4 text-blue-500" />
          </div>
          Analyse GPT Intelligente
        </CardTitle>
        <CardDescription>
          Évaluation automatique par intelligence artificielle
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score et recommandation */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <IconComponent className={`h-5 w-5 ${config.iconColor}`} />
              <span className="font-semibold text-lg">{analysis.dealScore || 0}/100</span>
            </div>
            <Badge className={config.color}>
              {config.label}
            </Badge>
          </div>
          {item.gpt_confidence && (
            <div className="text-right">
              <div className="text-sm text-gray-600">Confiance</div>
              <div className="font-semibold">{item.gpt_confidence}%</div>
            </div>
          )}
        </div>

        {/* Analyse des prix */}
        {(analysis.estimatedMarketValue || analysis.savingsAmount) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.estimatedMarketValue && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-700 font-medium">Valeur Marché Estimée</div>
                <div className="text-lg font-bold text-blue-900">
                  {formatPrice(analysis.estimatedMarketValue, item.price_currency)}
                </div>
              </div>
            )}
            {analysis.savingsAmount && analysis.savingsAmount > 0 && (
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="text-sm text-green-700 font-medium">Économies Potentielles</div>
                <div className="text-lg font-bold text-green-900">
                  -{formatPrice(analysis.savingsAmount, item.price_currency)}
                  {analysis.savingsPercentage && (
                    <span className="text-sm ml-1">({analysis.savingsPercentage}%)</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Raisonnement */}
        {analysis.reasoning && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">💡 Analyse Détaillée</h4>
            <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
              {analysis.reasoning}
            </p>
          </div>
        )}

        {/* Analyse des prix */}
        {analysis.priceAnalysis && analysis.priceAnalysis !== 'Analyse indisponible' && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">📊 Analyse des Prix</h4>
            <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded-lg">
              {analysis.priceAnalysis}
            </p>
          </div>
        )}

        {/* Comparaison marché */}
        {analysis.marketComparison && analysis.marketComparison !== 'Comparaison indisponible' && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-900">🔍 Comparaison Marché</h4>
            <p className="text-sm text-gray-700 bg-yellow-50 p-3 rounded-lg">
              {analysis.marketComparison}
            </p>
          </div>
        )}

        {/* Timestamp */}
        {item.gpt_analyzed_at && (
          <div className="text-xs text-gray-500 pt-2 border-t">
            Analysé le {new Date(item.gpt_analyzed_at).toLocaleString('fr-FR')}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 