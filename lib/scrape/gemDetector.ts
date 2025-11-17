import type { ApiItem } from '../types'

/**
 * Détecte les "pépites" - bonnes affaires basées sur plusieurs critères
 */
export interface GemScore {
  score: number // 0-100
  reasons: string[]
  category: 'excellent' | 'good' | 'fair' | 'poor'
}

/**
 * Calcule un score de "pépite" pour un item
 * Basé sur : prix, rareté, état, complétude, vues/favoris
 */
export function calculateGemScore(item: ApiItem): GemScore {
  const reasons: string[] = []
  let score = 50 // Score de base

  const price = item.price?.amount || 0
  const views = item.view_count || 0
  const favourites = item.favourite_count || 0
  const title = (item.title || '').toLowerCase()
  const condition = (item.condition || '').toLowerCase()

  // 1. Prix attractif (30 points max)
  // Si prix bas pour un item recherché = pépite
  if (price > 0 && price < 50) {
    score += 15
    reasons.push('Prix très attractif (< 50€)')
  } else if (price >= 50 && price < 100) {
    score += 10
    reasons.push('Prix raisonnable (50-100€)')
  } else if (price >= 100 && price < 200) {
    score += 5
    reasons.push('Prix modéré (100-200€)')
  } else if (price >= 200) {
    score -= 5
    reasons.push('Prix élevé')
  }

  // 2. Faible visibilité = moins de concurrence (20 points max)
  // Si peu de vues/favoris, c'est peut-être une pépite non découverte
  if (views < 10 && favourites < 3) {
    score += 20
    reasons.push('💎 Pépite cachée (peu de vues/favoris)')
  } else if (views < 50 && favourites < 10) {
    score += 10
    reasons.push('Peu de visibilité (opportunité)')
  } else if (views > 500 || favourites > 50) {
    score -= 10
    reasons.push('Très populaire (concurrence élevée)')
  }

  // 3. État excellent (15 points max)
  if (condition.includes('neuf') || condition.includes('new') || condition.includes('sealed')) {
    score += 15
    reasons.push('État neuf/sealed')
  } else if (condition.includes('très bon') || condition.includes('excellent')) {
    score += 10
    reasons.push('État très bon')
  } else if (condition.includes('bon')) {
    score += 5
    reasons.push('État bon')
  } else if (condition.includes('moyen') || condition.includes('fair')) {
    score -= 5
    reasons.push('État moyen')
  }

  // 4. Complétude (15 points max)
  // Items complets sont plus rares et valent plus
  if (title.includes('complet') || title.includes('cib') || title.includes('complete')) {
    score += 15
    reasons.push('Complet (boîte + manuel)')
  } else if (title.includes('boite') || title.includes('box')) {
    score += 8
    reasons.push('Avec boîte')
  } else if (title.includes('loose') || title.includes('cartouche seule')) {
    score -= 5
    reasons.push('Cartouche seule')
  }

  // 5. Rareté/Spécial (10 points max)
  // Éditions spéciales, jeux rares
  const rareKeywords = ['rare', 'limited', 'édition limitée', 'collector', 'special', 'platinum', 'players choice']
  const hasRareKeyword = rareKeywords.some(keyword => title.includes(keyword))
  if (hasRareKeyword) {
    score += 10
    reasons.push('Édition spéciale/rare détectée')
  }

  // 6. Disponibilité immédiate (10 points max)
  if (item.can_buy === true && item.is_reserved !== true) {
    score += 10
    reasons.push('Disponible immédiatement')
  } else if (item.is_reserved === true) {
    score -= 15
    reasons.push('Réservé')
  } else if (item.can_buy !== true) {
    score -= 5
    reasons.push('Non disponible')
  }

  // Normaliser le score
  score = Math.max(0, Math.min(100, score))

  // Catégoriser
  let category: 'excellent' | 'good' | 'fair' | 'poor'
  if (score >= 75) {
    category = 'excellent'
  } else if (score >= 60) {
    category = 'good'
  } else if (score >= 40) {
    category = 'fair'
  } else {
    category = 'poor'
  }

  return { score, reasons, category }
}

/**
 * Filtre et trie les items par score de pépite
 */
export function filterGems(
  items: ApiItem[],
  options: {
    minGemScore?: number
    maxResults?: number
  } = {}
): ApiItem[] {
  const { minGemScore = 50, maxResults = 50 } = options

  // Calculer les scores pour tous les items
  const scoredItems = items.map(item => ({
    item,
    gemScore: calculateGemScore(item)
  }))

  // Filtrer par score minimum
  const filtered = scoredItems.filter(scored => scored.gemScore.score >= minGemScore)

  // Trier par score décroissant
  filtered.sort((a, b) => b.gemScore.score - a.gemScore.score)

  // Limiter le nombre de résultats
  const limited = filtered.slice(0, maxResults)

  console.log(`💎 Pépites: ${items.length} items → ${filtered.length} pépites (score >= ${minGemScore})`)
  if (limited.length > 0) {
    console.log(`📊 Top 3 pépites:`)
    limited.slice(0, 3).forEach((scored, i) => {
      console.log(`  ${i + 1}. Score ${scored.gemScore.score.toFixed(1)} (${scored.gemScore.category}): "${scored.item.title}"`)
      console.log(`     Raisons: ${scored.gemScore.reasons.join(', ')}`)
    })
  }

  return limited.map(scored => scored.item)
}

