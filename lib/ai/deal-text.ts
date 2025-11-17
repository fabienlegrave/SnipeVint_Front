/**
 * Analyse Deal Textuelle - Se base sur les faits vision + peer stats
 */

import type { VintedItem } from '../types'
import { getSimilarItemsByPeerKey } from './vision-writeback'

export interface DealAnalysisRequest {
  item: VintedItem & any // Item avec champs IA
  similarItems?: Array<{
    title: string
    price: number
    condition: string
    platform?: string
    region?: string
    ai_condition_grade?: string
    ai_completeness?: string
  }>
}

export interface GPTDealAnalysis {
  isDeal: boolean
  confidence: number // 0-100
  dealScore: number // 0-100
  reasoning: string
  priceAnalysis: string
  marketComparison: string
  recommendation: 'strong_buy' | 'good_deal' | 'fair_price' | 'overpriced' | 'avoid'
  estimatedMarketValue?: number
  savingsAmount?: number
  savingsPercentage?: number
  visionFactsUsed?: boolean // Indique si les faits vision ont été utilisés
}

/**
 * Prépare le contexte enrichi avec les faits vision
 */
function prepareDealContextWithVision(request: DealAnalysisRequest): string {
  const { item, similarItems = [] } = request
  
  // Utiliser les faits vision si disponibles et fiables
  const useVisionFacts = item.ai_vision_confidence >= 0.75
  
  const context = {
    // Item principal avec faits vision prioritaires
    title: item.title,
    description: item.description || null,
    price: item.price_amount,
    currency: item.price_currency || 'EUR',
    totalPrice: item.total_item_price_amount,
    condition: item.condition,
    
    // FAITS VISION (prioritaires si confiance élevée)
    visionFacts: useVisionFacts ? {
      has_cart: item.ai_has_cart,
      has_box: item.ai_has_box,
      has_manual: item.ai_has_manual,
      has_plastic_case: item.ai_has_plastic_case,
      region: item.ai_region,
      platform: item.ai_platform,
      variant: item.ai_variant,
      completeness: item.ai_completeness,
      condition_grade: item.ai_condition_grade,
      authenticity_risk: item.ai_authenticity_risk || [],
      vision_confidence: item.ai_vision_confidence
    } : null,
    
    // SUPPRIMÉ: Plus de fallback heuristique
    // Si pas de Vision, on attend l'analyse IA
    fallbackData: !useVisionFacts ? {
      note: "Analyse heuristique supprimée - En attente d'analyse Vision IA"
    } : null,
    
    // Vendeur
    seller: {
      login: item.seller_login,
      isBusiness: item.seller_is_business,
    },
    
    // Popularité
    favouriteCount: item.favourite_count,
    viewCount: item.view_count,
    
    // Items similaires avec données vision si disponibles
    similarItems: similarItems.map(similar => ({
      title: similar.title,
      price: similar.price,
      condition: similar.condition,
      platform: similar.platform,
      region: similar.region,
      // Données vision si disponibles
      ai_condition_grade: similar.ai_condition_grade,
      ai_completeness: similar.ai_completeness
    })).slice(0, 10),
    
    // Métadonnées
    scrapedAt: item.scraped_at,
    isPromoted: item.is_promoted,
    peerKey: item.peer_key
  }
  
  return JSON.stringify(context, null, 2)
}

/**
 * Génère le prompt pour l'analyse deal avec priorité aux faits vision
 */
function generateDealAnalysisPrompt(context: string): string {
  return `Tu es un expert en objets de collection et d'occasion, spécialisé dans l'évaluation de prix sur le marché secondaire.

Analyse cet item Vinted pour déterminer s'il s'agit d'un bon deal :

${context}

INSTRUCTIONS PRIORITAIRES :

0. **DESCRIPTION VENDEUR** - Si description est fournie :
   - Utilise-la pour détecter des détails mentionnés mais pas visibles sur les photos
   - Vérifie la cohérence entre la description et les faits vision
   - Identifie les éléments qui augmentent la valeur (état mentionné, accessoires inclus, etc.)
   - Attention aux descriptions vagues ou incohérentes avec les photos

1. **FAITS VISION EN PRIORITÉ** - Si visionFacts est fourni avec vision_confidence >= 0.75 :
   - Utilise EXCLUSIVEMENT les données vision pour l'état et la complétude
   - Ignore les données fallbackData (heuristiques moins fiables)
   - Base ton analyse sur les faits observés visuellement
   - Tiens compte des risques d'authenticité détectés

2. **ÉVALUATION BASÉE SUR LES FAITS** :
   - État physique : utilise ai_condition_grade si disponible
   - Complétude : utilise ai_completeness (complete/cart_only/etc.)
   - Région : utilise ai_region pour ajuster les prix de référence
   - Authenticité : pénalise si ai_authenticity_risk non vide

3. **COMPARAISON PEER INTELLIGENTE** :
   - Compare avec les similarItems qui ont le même peer_key
   - Privilégie les items avec données vision (ai_condition_grade, ai_completeness)
   - Ajuste les prix selon la complétude et l'état réels

4. **RÈGLES DE SCORING** :
   - Si authenticity_risk non vide : score max 60, recommendation max "fair_price"
   - Si completeness = "complete" : utilise prix de référence complet
   - Si completeness = "cart_only" : utilise 40-60% du prix complet
   - Si completeness = "manual_only" : utilise 5-15% du prix complet

5. **ESTIMATION DE VALEUR PRÉCISE** :
   - Base-toi sur l'état et complétude réels (vision)
   - Ajuste selon la région (JPN/USA peuvent valoir plus/moins)
   - Considère la variante (collector/platinum = premium)

Réponds UNIQUEMENT avec un JSON valide dans ce format exact :
{
  "isDeal": boolean,
  "confidence": number (0-100),
  "dealScore": number (0-100),
  "reasoning": "Explication détaillée basée sur les faits vision",
  "priceAnalysis": "Analyse du prix avec données vision",
  "marketComparison": "Comparaison avec peers similaires",
  "recommendation": "strong_buy|good_deal|fair_price|overpriced|avoid",
  "estimatedMarketValue": number,
  "savingsAmount": number,
  "savingsPercentage": number,
  "visionFactsUsed": boolean
}

CRITÈRES DE SCORING AJUSTÉS :
- 90-100 : Deal exceptionnel (état excellent + prix très bas)
- 70-89 : Bon deal (bon état + prix intéressant)
- 50-69 : Prix correct pour l'état réel
- 30-49 : Un peu cher pour l'état observé
- 0-29 : Overpriced ou problèmes d'authenticité

Sois précis et factuel, base-toi sur les faits observés visuellement.`
}

/**
 * Analyse deal textuelle enrichie avec faits vision
 */
export async function analyzeDealText(
  request: DealAnalysisRequest,
  includeVisionContext = true
): Promise<GPTDealAnalysis> {
  const openaiApiKey = process.env.OPENAI_API_KEY
  
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY not configured')
  }
  
  const context = prepareDealContextWithVision(request)
  const prompt = generateDealAnalysisPrompt(context)
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en jeux vidéo rétro et évaluation de prix. Tu analyses en priorité les faits observés visuellement. Réponds uniquement avec du JSON valide.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2, // Peu de créativité, plus de précision
        max_tokens: 800,
        response_format: { type: "json_object" }
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${error}`)
    }
    
    const data = await response.json()
    const content = data.choices[0]?.message?.content
    
    if (!content) {
      throw new Error('No response content from OpenAI')
    }
    
    // Parser la réponse JSON
    const analysis: GPTDealAnalysis = JSON.parse(content)
    
    // Validation des données
    if (typeof analysis.isDeal !== 'boolean' || 
        typeof analysis.confidence !== 'number' ||
        typeof analysis.dealScore !== 'number') {
      throw new Error('Invalid response format from GPT')
    }
    
    // Assurer que les scores sont dans les bonnes plages
    analysis.confidence = Math.max(0, Math.min(100, analysis.confidence))
    analysis.dealScore = Math.max(0, Math.min(100, analysis.dealScore))
    
    // Indiquer si les faits vision ont été utilisés
    const useVisionFacts = request.item.ai_vision_confidence >= 0.75
    analysis.visionFactsUsed = useVisionFacts
    
    console.log(`✅ Deal analysis complete for item ${request.item.id}:`, {
      isDeal: analysis.isDeal,
      score: analysis.dealScore,
      recommendation: analysis.recommendation,
      visionUsed: analysis.visionFactsUsed
    })
    
    return analysis
    
  } catch (error) {
    console.error('GPT Deal Analysis Error:', error)
    
    // Fallback en cas d'erreur
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      isDeal: false,
      confidence: 0,
      dealScore: 0,
      reasoning: `Erreur lors de l'analyse GPT: ${errorMessage}`,
      priceAnalysis: 'Analyse indisponible',
      marketComparison: 'Comparaison indisponible',
      recommendation: 'fair_price',
      estimatedMarketValue: request.item.price_amount || 0,
      savingsAmount: 0,
      savingsPercentage: 0,
      visionFactsUsed: false
    }
  }
}