/**
 * Vision d'abord - Analyse visuelle prioritaire avec faits observables
 */

import type { VintedItem, VintedPhoto, VisualAnalysis } from '../types'

export interface VisionFacts {
  has_cart: boolean | null
  has_box: boolean | null
  has_manual: boolean | null
  has_plastic_case: boolean | null
  region: "EUR" | "USA" | "JPN" | null
  platform: string | null
  variant: "standard" | "platinum" | "players_choice" | "collector" | null
  completeness: "complete" | "near_complete" | "partial" | "cart_only" | "manual_only" | "box_only" | "unknown"
  condition_grade: "mint" | "near_mint" | "very_good" | "good" | "fair" | "poor" | "unknown"
  authenticity_risk: string[]
  vision_confidence: number // 0..1
  raw: any // JSON complet renvoyé par la vision
}

/**
 * Génère un fingerprint unique pour éviter les ré-analyses
 */
export function generateVisionFingerprint(item: VintedItem): string {
  const photoUrls = (item.photos_data || [])
    .slice(0, 5)
    .map(p => p.url)
    .join('|')
  
  const components = [
    item.title || '',
    item.price_amount || 0,
    photoUrls
  ]
  
  return Buffer.from(components.join('§')).toString('base64').substring(0, 32)
}

/**
 * Sélectionne les meilleures photos pour l'analyse (jusqu'à 5 photos)
 */
function selectPhotosForVision(photos: VintedPhoto[]): string[] {
  if (!photos || photos.length === 0) return []

  // Prioriser les photos principales et haute résolution
  const sortedPhotos = photos
    .filter(photo => photo.url && photo.width && photo.height)
    .sort((a, b) => {
      // Photo principale en premier
      if (a.is_main && !b.is_main) return -1
      if (!a.is_main && b.is_main) return 1

      // Puis par résolution (favorise haute qualité)
      return (b.width * b.height) - (a.width * a.height)
    })
    .slice(0, 5) // Max 5 photos (balance coût/qualité d'analyse)
  
  return sortedPhotos.map(photo => photo.url)
}

/**
 * Génère le prompt Vision optimisé pour extraire des faits observables
 */
function generateVisionFactsPrompt(item: VintedItem): string {
  return `
ANALYSE VISUELLE MULTI-PHOTOS - EXTRACTION DE FAITS OBSERVABLES

Tu es un expert en objets de collection. Analyse ces photos pour extraire UNIQUEMENT des faits observables et mesurables.

ITEM À ANALYSER :
- Titre: "${item.title}"
- Prix: ${item.price_amount}€
- État annoncé: "${item.condition}"
${item.description ? `- Description vendeur: "${item.description}"` : ''}

INSTRUCTIONS STRICTES :

🔍 **FAITS OBSERVABLES UNIQUEMENT** :
- Ne fais PAS d'interprétations subjectives
- Rapporte SEULEMENT ce que tu vois clairement sur les photos
- Si incertain, marque comme "unknown" ou null
- Privilégie la précision sur la complétude

📝 **UTILISATION DE LA DESCRIPTION** (si fournie) :
- Utilise la description pour CONFIRMER ce que tu vois dans les photos
- Si la description mentionne des éléments visibles, valide-les visuellement
- Si la description mentionne des éléments NON visibles, ne les valide PAS (marque comme null)
- Note les incohérences entre description et photos dans authenticity_risk
- Exemples :
  * Description dit "complet boîte + notice" mais photos montrent seulement la cartouche → has_box: null, has_manual: null, reproduction_risk: ["description incohérente avec photos"]
  * Description dit "jeu japonais" et photos montrent texte japonais → region: "JPN" (confirmé)

👁️ **INVENTAIRE VISUEL** :
- Cartouche/CD présent ? (has_cart: true/false/null si pas visible)
- Boîte présente ? (has_box: true/false/null)
- Manuel/notice visible ? (has_manual: true/false/null)
- Boîtier plastique cartouche ? (has_plastic_case: true/false/null)

🌍 **IDENTIFICATION TECHNIQUE** :
- Région détectable par logos/textes/codes ? (EUR/USA/JPN ou null)
- Plateforme exacte visible ? (Game Boy Color, Nintendo DS, etc. ou null)
- Variante détectable ? (standard/platinum/players_choice/collector ou null)

📊 **ÉTAT PHYSIQUE OBSERVABLE** :
- Grade global basé sur l'usure visible (mint→poor ou unknown)
- Complétude apparente (complete/near_complete/partial/cart_only/manual_only/box_only/unknown)

🛡️ **SIGNAUX D'AUTHENTICITÉ** :
- Signaux de reproduction visibles ? (liste des risques ou array vide)
- Qualité d'impression, alignement logos, matériaux

🎯 **CONFIANCE** :
- Évalue ta confiance globale (0.0 à 1.0)
- Basée sur la qualité des photos et la visibilité des éléments

RÉPONDS UNIQUEMENT EN JSON VALIDE SANS BALISES MARKDOWN :

{
  "item_identification": {
    "platform": "Game Boy Color" | null,
    "region": "EUR" | "USA" | "JPN" | null,
    "variant_type": "standard" | "platinum" | "players_choice" | "collector" | null
  },
  "vision_evidence": {
    "has_cart": true | false | null,
    "has_box": true | false | null,
    "has_manual": true | false | null,
    "has_plastic_case": true | false | null,
    "reproduction_risks": ["signal1", "signal2"] | []
  },
  "completeness_assessment": {
    "cib_status": "complete" | "near_complete" | "partial" | "cart_only" | "manual_only" | "box_only" | "unknown"
  },
  "physical_condition": {
    "overall_grade": "mint" | "near_mint" | "very_good" | "good" | "fair" | "poor" | "unknown"
  },
  "authenticity_assessment": {
    "confidence_level": 0.85
  },
  "analysis_metadata": {
    "analysis_confidence": 0.90,
    "photos_analyzed": 2,
    "key_observations": ["observation1", "observation2"]
  }
}

IMPORTANT : Sois conservateur. Si tu n'es pas sûr, utilise null ou "unknown".
`
}

/**
 * Analyse visuelle d'un item avec extraction de faits observables
 */
export async function analyzeItemVisually(item: VintedItem): Promise<VisualAnalysis | null> {
  try {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      console.error('OPENAI_API_KEY not configured')
      return null
    }

    // Sélectionner les meilleures photos à analyser (jusqu'à 5)
    const photoUrls = selectPhotosForVision(item.photos_data || [])
    if (photoUrls.length === 0) {
      console.log(`No photos available for visual analysis of item ${item.id}`)
      return null
    }

    console.log(`👁️ Starting vision analysis for item ${item.id} with ${photoUrls.length} photo(s)`)

    // Construire le prompt optimisé pour les faits
    const prompt = generateVisionFactsPrompt(item)
    
    // Construire les messages avec les images
    const messages = [
      {
        role: 'system',
        content: 'Tu es un expert en évaluation d\'objets de collection. Tu extrais UNIQUEMENT des faits observables depuis les photos. RÉPONDS TOUJOURS EN JSON VALIDE SANS BALISES MARKDOWN.'
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...photoUrls.map(url => ({
            type: 'image_url',
            image_url: { url, detail: 'low' } // Utiliser 'low' pour optimiser les coûts
          }))
        ]
      }
    ]

    // Appel à l'API OpenAI Vision
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        max_tokens: 800, // Réduit car on veut juste des faits
        temperature: 0.1, // Très peu de créativité
        response_format: { type: "json_object" }
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI Vision API error:', response.status, errorText)
      return null
    }

    const data = await response.json()
    const analysisText = data.choices[0]?.message?.content

    if (!analysisText) {
      console.error('No analysis content received from OpenAI Vision')
      return null
    }

    // Parser la réponse JSON
    const analysis = JSON.parse(analysisText) as VisualAnalysis
    
    console.log(`✅ Vision analysis complete for item ${item.id}:`, {
      platform: analysis.item_identification?.platform,
      region: analysis.item_identification?.region,
      completeness: analysis.completeness_assessment?.cib_status,
      condition: analysis.physical_condition?.overall_grade,
      confidence: analysis.analysis_metadata?.analysis_confidence
    })

    return analysis

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Error in vision analysis for item ${item.id}:`, errorMessage)
    return null
  }
}

/**
 * Vérifie si un item a besoin d'une analyse visuelle
 */
export function needsVisionAnalysis(item: VintedItem, forceReanalyze = false): boolean {
  // Force re-analyse si demandé
  if (forceReanalyze) return true
  
  // Pas de photos = pas d'analyse possible
  if (!item.photos_data || item.photos_data.length === 0) return false
  
  // Déjà analysé avec bonne confiance = pas besoin
  if (item.visual_analysis && (item as any).ai_vision_confidence >= 0.75) {
    return false
  }
  
  // Vérifier si le fingerprint a changé
  const currentFingerprint = generateVisionFingerprint(item)
  const storedFingerprint = (item as any).ai_vision_fingerprint
  
  if (storedFingerprint && storedFingerprint === currentFingerprint) {
    return false // Déjà analysé avec ce contenu
  }
  
  return true
}