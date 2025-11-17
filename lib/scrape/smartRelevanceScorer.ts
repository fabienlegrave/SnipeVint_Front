import type { ApiItem } from '../types/core'

/**
 * NOUVELLE LOGIQUE DE SCORING INTELLIGENT
 * 
 * Stratégie :
 * 1. Pré-filtrage rapide basé sur titre + métadonnées (sans enrichissement)
 * 2. Scoring multi-critères avec poids intelligents
 * 3. Utilisation du score Vinted si disponible
 * 4. Détection précise du type de produit
 */

export interface SearchKeywords {
  exact: string[]
  platform: string[]
  gameTitle: string
  allWords: string[]
}

/**
 * Extrait intelligemment les mots-clés de recherche
 */
export function extractSmartKeywords(searchText: string): SearchKeywords {
  const lower = searchText.toLowerCase().trim()
  const allWords = lower.split(/\s+/).filter(w => w.length > 1)
  
  // Plateformes connues (avec variantes et fautes de frappe)
  const platformMap: Record<string, string[]> = {
    'switch': ['switch', 'swicth', 'swich', 'nintendo switch'],
    'playstation 5': ['ps5', 'playstation 5', 'playstation5'],
    'playstation 4': ['ps4', 'playstation 4', 'playstation4'],
    'playstation 3': ['ps3', 'playstation 3', 'playstation3'],
    'playstation 2': ['ps2', 'playstation 2', 'playstation2'],
    'playstation 1': ['ps1', 'playstation 1', 'playstation'],
    'xbox series': ['xbox series', 'xbox series x', 'xbox series s'],
    'xbox one': ['xbox one'],
    'xbox 360': ['xbox 360'],
    'xbox': ['xbox'],
    'wii u': ['wii u', 'wiiu'],
    'wii': ['wii'],
    '3ds': ['3ds', 'nintendo 3ds'],
    'ds': ['ds', 'nintendo ds'],
    'gamecube': ['gamecube', 'game cube'],
    'n64': ['n64', 'nintendo 64'],
    'snes': ['snes', 'super nintendo'],
    'nes': ['nes', 'nintendo'],
    'gameboy': ['gameboy', 'game boy', 'gb'],
    'pc': ['pc', 'computer'],
    'steam': ['steam']
  }
  
  // Trouver les plateformes
  const foundPlatforms: string[] = []
  for (const [normalized, variants] of Object.entries(platformMap)) {
    for (const variant of variants) {
      if (lower.includes(variant)) {
        foundPlatforms.push(normalized)
        break
      }
    }
  }
  
  // Mots communs à exclure
  const commonWords = new Set([
    'jeu', 'game', 'pour', 'sur', 'the', 'le', 'la', 'de', 'du', 'et', 'ou',
    'video', 'retro', 'vintage', 'occasion', 'bon', 'état', 'très', 'parfait',
    'neuf', 'complet', 'boite', 'box', 'cib', 'loose', 'sealed'
  ])
  
  // Extraire le titre du jeu (tout sauf plateformes et mots communs)
  // IMPORTANT: Inclure les numéros (11, XII, etc.) dans le titre du jeu
  const gameTitleWords = allWords.filter(w => {
    const isPlatform = foundPlatforms.some(p => 
      p.includes(w) || w.includes(p) || platformMap[p]?.some(v => v.includes(w))
    )
    // Inclure les numéros et les mots significatifs
    const isNumber = /^\d+$/.test(w) || /^(xii|xi|x|iv|v|vi|vii|viii|ix)$/i.test(w)
    return !isPlatform && !commonWords.has(w) && (w.length > 2 || isNumber)
  })
  
  const gameTitle = gameTitleWords.join(' ')
  
  return {
    exact: allWords,
    platform: [...new Set(foundPlatforms)],
    gameTitle,
    allWords
  }
}

/**
 * Détecte le type de produit de manière plus précise
 */
export function detectProductTypeSmart(item: ApiItem): 'video_game' | 'clothing' | 'other' {
  const title = (item.title || '').toLowerCase()
  const description = (item.description || '').toLowerCase()
  const brand = (item.brand_title || '').toLowerCase()
  const size = (item.size_title || '').toLowerCase()
  const text = `${title} ${description} ${brand} ${size}`.toLowerCase()
  
  // Mots-clés forts pour jeux vidéo (priorité au titre)
  const strongGameKeywords = [
    'nintendo', 'switch', 'swicth', 'playstation', 'xbox', 'ps5', 'ps4', 'ps3', 'ps2', 'ps1',
    'wii', 'gamecube', 'n64', 'snes', 'nes', 'gameboy', '3ds', 'ds',
    'cartouche', 'cartridge', 'cd', 'dvd', 'blu-ray', 'game card',
    'boite', 'box', 'cib', 'complet', 'loose', 'sealed', 'neuf',
    'console', 'handheld', 'portable', 'retro', 'vintage game',
    'jeu', 'game', 'video game', 'vg', 'lrg', 'limited run'
  ]
  
  // Mots-clés forts pour vêtements
  const strongClothingKeywords = [
    'veste', 'jacket', 'jean', 'pantalon', 'pants', 't-shirt', 'tshirt',
    'chemise', 'shirt', 'pull', 'sweater', 'robe', 'dress',
    'chaussure', 'shoe', 'basket', 'sneaker', 'boot',
    'taille', 'size', 'xs', 's', 'm', 'l', 'xl', 'xxl',
    'nike', 'adidas', 'zara', 'h&m', 'uniqlo', 'hm'
  ]
  
  // Vérifier d'abord dans le titre (plus fiable)
  const titleGameScore = strongGameKeywords.filter(kw => title.includes(kw)).length
  const titleClothingScore = strongClothingKeywords.filter(kw => title.includes(kw)).length
  
  // Si le titre contient des indices clairs de jeu vidéo, c'est un jeu
  if (titleGameScore > 0 && titleGameScore >= titleClothingScore) {
    return 'video_game'
  }
  
  // Si le titre contient des indices clairs de vêtement, c'est un vêtement
  if (titleClothingScore > 0 && titleClothingScore > titleGameScore) {
    return 'clothing'
  }
  
  // Sinon, vérifier dans tout le texte
  const gameScore = strongGameKeywords.filter(kw => text.includes(kw)).length
  const clothingScore = strongClothingKeywords.filter(kw => text.includes(kw)).length
  
  // Si on a des indices forts, les utiliser
  if (gameScore > 0 && gameScore > clothingScore) return 'video_game'
  if (clothingScore > 0 && clothingScore > gameScore) return 'clothing'
  
  // Sinon, vérifier la présence de marques de vêtements connues
  const clothingBrands = ['nike', 'adidas', 'zara', 'h&m', 'uniqlo', 'hm', 'puma', 'reebok']
  if (clothingBrands.some(brand => text.includes(brand))) return 'clothing'
  
  return 'other'
}

/**
 * Calcule un score de pertinence intelligent (0-100)
 * 
 * Critères (avec poids) :
 * - Score Vinted (si disponible) : 30%
 * - Correspondance titre exacte : 25%
 * - Correspondance titre du jeu : 20%
 * - Correspondance plateforme : 15%
 * - Correspondance description : 10%
 * - Cohérence type produit : bonus/malus
 */
export function calculateSmartRelevanceScore(
  item: ApiItem,
  searchText: string
): { score: number; reasons: string[]; confidence: 'high' | 'medium' | 'low' } {
  const title = (item.title || '').toLowerCase().trim()
  const description = (item.description || '').toLowerCase().trim()
  const searchLower = searchText.toLowerCase().trim()
  const keywords = extractSmartKeywords(searchText)
  const productType = detectProductTypeSmart(item)
  
  let score = 0
  const reasons: string[] = []
  
  // SYSTÈME INTELLIGENT : Vérification mot par mot de la recherche
  // Extraire tous les mots importants de la recherche (sauf mots communs)
  const commonWords = new Set(['le', 'la', 'de', 'du', 'et', 'ou', 'pour', 'sur', 'the', 'a', 'an', 'jeu', 'game'])
  const allSearchWords = searchLower.split(/\s+/).filter(w => w.length > 1 && !commonWords.has(w))
  
  // Identifier les catégories de mots
  const platformWords = keywords.platform.flatMap(p => p.split(/\s+/))
  const gameTitleWords = keywords.gameTitle ? keywords.gameTitle.toLowerCase().split(/\s+/).filter(w => w.length > 1) : []
  const numberWords = allSearchWords.filter(w => /^\d+$/.test(w) || /^(xii|xi|x|iv|v|vi|vii|viii|ix)$/i.test(w))
  
  // Vérifier la présence de chaque mot dans le titre/description
  const fullText = (title + ' ' + description).toLowerCase()
  
  // Vérifier chaque mot individuellement
  const wordChecks = allSearchWords.map(word => {
    const wordLower = word.toLowerCase()
    const inTitle = title.includes(wordLower)
    const inDesc = description.includes(wordLower)
    const isPresent = inTitle || inDesc
    
    // Identifier le type de mot
    const isPlatform = platformWords.some(p => p.includes(wordLower) || wordLower.includes(p))
    const isGameTitle = gameTitleWords.some(gt => gt.includes(wordLower) || wordLower.includes(gt))
    const isNumber = numberWords.includes(word)
    
    return {
      word,
      present: isPresent,
      inTitle,
      inDesc,
      isPlatform,
      isGameTitle,
      isNumber,
      importance: isNumber ? 'critical' : (isGameTitle ? 'high' : (isPlatform ? 'medium' : 'low'))
    }
  })
  
  // Calculer le score basé sur la présence
  const presentWords = wordChecks.filter(wc => wc.present)
  const missingWords = wordChecks.filter(wc => !wc.present)
  const presenceRatio = allSearchWords.length > 0 ? presentWords.length / allSearchWords.length : 0
  
  // Score de base : 50 points si 100% des mots présents, dégressif sinon
  if (presenceRatio === 1.0) {
    score += 50
    reasons.push(`✅ 100% des mots-clés présents (${allSearchWords.length}/${allSearchWords.length})`)
  } else {
    const baseScore = presenceRatio * 50
    score += baseScore
    const missingList = missingWords.map(wc => wc.word).join(', ')
    reasons.push(`${presenceRatio >= 0.75 ? '✅' : presenceRatio >= 0.5 ? '⚠️' : '❌'} ${(presenceRatio * 100).toFixed(0)}% des mots-clés présents (${presentWords.length}/${allSearchWords.length}) - Manquants: ${missingList}`)
  }
  
  // PÉNALITÉS FORTES pour mots critiques manquants
  const missingNumbers = missingWords.filter(wc => wc.isNumber)
  const missingGameTitle = missingWords.filter(wc => wc.isGameTitle)
  const missingPlatform = missingWords.filter(wc => wc.isPlatform)
  
  // Pénalité CRITIQUE si numéro recherché mais absent (jeu différent)
  if (missingNumbers.length > 0) {
    const penalty = missingNumbers.length * 25
    score -= penalty
    reasons.push(`PÉNALITÉ CRITIQUE: Numéro(s) recherché(s) absent(s): ${missingNumbers.map(wc => wc.word).join(', ')} → jeu différent (-${penalty} points)`)
  }
  
  // Pénalité FORTE si mots essentiels du titre du jeu manquants (ex: "quest" dans "dragon quest 11")
  if (missingGameTitle.length > 0) {
    const penalty = missingGameTitle.length * 20
    score -= penalty
    reasons.push(`PÉNALITÉ FORTE: Mots essentiels du jeu manquants: ${missingGameTitle.map(wc => wc.word).join(', ')} (-${penalty} points)`)
  }
  
  // Pénalité si plateforme recherchée mais absente
  if (missingPlatform.length > 0) {
    score -= 15
    reasons.push(`PÉNALITÉ: Plateforme recherchée absente: ${missingPlatform.map(wc => wc.word).join(', ')} (-15 points)`)
  }
  
  // Bonus si tous les mots critiques sont présents
  if (missingNumbers.length === 0 && missingGameTitle.length === 0) {
    score += 10
    reasons.push('✅ Bonus: Tous les mots critiques présents')
  }
  
  // Détecter les jeux différents (titre alternatif au lieu du numéro)
  if (numberWords.length > 0 && presentWords.some(wc => wc.isNumber)) {
    // Numéro présent, c'est bon
  } else if (gameTitleWords.length > 0 && presentWords.some(wc => wc.isGameTitle)) {
    // Vérifier si un titre alternatif est présent (treasures, monsters, etc.)
    const fullTextLower = fullText.toLowerCase()
    const hasAlternateTitle = /\b(treasures?|treasury|monsters?|heroes?|builders?|warriors?|adventure|adventures)\b/i.test(fullTextLower)
    
    if (hasAlternateTitle && missingNumbers.length > 0) {
      score -= 25
      reasons.push(`PÉNALITÉ CRITIQUE: Jeu différent détecté (titre alternatif présent mais numéro recherché absent) (-25 points)`)
    }
  }
  
  // 1. Score Vinted (20 points max) - Si Vinted a déjà calculé un score, l'utiliser
  // Réduit de 30 à 20 pour donner plus de poids aux correspondances réelles
  const vintedScore = item.search_tracking_params?.score
  if (vintedScore !== undefined && vintedScore !== null) {
    // Normaliser le score Vinted (supposé entre 0-1 ou 0-100)
    const normalizedVintedScore = vintedScore > 1 ? vintedScore / 100 : vintedScore
    const vintedPoints = normalizedVintedScore * 20
    score += vintedPoints
    reasons.push(`Score Vinted: ${(normalizedVintedScore * 100).toFixed(0)}%`)
  }
  
  // 2. Correspondance exacte du titre (30 points max) - Augmenté pour être plus permissif
  // Mais vérifier que ce n'est pas juste un match partiel trompeur
  if (title.includes(searchLower)) {
    // Vérifier que ce n'est pas juste "dragon" ou "switch" seul
    const searchWords = searchLower.split(/\s+/).filter(w => w.length > 2)
    const matchedWords = searchWords.filter(sw => title.includes(sw))
    
    // Si on a au moins 3 mots de la recherche, c'est un bon match
    if (matchedWords.length >= 3) {
      score += 30
      reasons.push('Titre contient la recherche exacte')
    } else {
      // Match partiel, score réduit
      score += 15
      reasons.push(`Match partiel dans le titre (${matchedWords.length}/${searchWords.length} mots)`)
    }
  }
  
  // 3. Bonus pour correspondance titre du jeu complet (15 points max)
  if (keywords.gameTitle && keywords.gameTitle.length > 2) {
    const gameTitleLower = keywords.gameTitle.toLowerCase()
    const titleLower = title.toLowerCase()
    const descLower = (description || '').toLowerCase()
    
    // Extraire les numéros du titre du jeu recherché
    const gameTitleNumbers = gameTitleLower.match(/\b(\d+|xii|xi|x|iv|v|vi|vii|viii|ix)\b/gi) || []
    const gameTitleBase = gameTitleLower.replace(/\b(\d+|xii|xi|x|iv|v|vi|vii|viii|ix)\b/gi, '').trim()
    
    // Correspondance exacte complète (titre + numéro si présent)
    if (titleLower.includes(gameTitleLower)) {
      score += 25
      reasons.push(`Titre du jeu trouvé: "${keywords.gameTitle}"`)
    }
    // Correspondance exacte du titre de base + numéro
    else if (gameTitleBase && gameTitleNumbers.length > 0) {
      const hasBase = titleLower.includes(gameTitleBase) || descLower.includes(gameTitleBase)
      const hasNumber = gameTitleNumbers.some(num => {
        const numLower = num.toLowerCase()
        return titleLower.includes(numLower) || descLower.includes(numLower)
      })
      
      if (hasBase && hasNumber) {
        score += 25
        reasons.push(`Titre du jeu complet trouvé: "${keywords.gameTitle}" (base + numéro)`)
      }
      // Si seulement la base sans le numéro, pénaliser FORTEMENT (jeu différent)
      else if (hasBase && !hasNumber) {
        // Vérifier si l'item contient un autre titre de jeu (ex: "Treasures", "Monsters", etc.)
        // Détection améliorée pour capturer "treasure", "treasures", "treasury", etc.
        const fullText = (titleLower + ' ' + descLower).toLowerCase()
        const hasOtherGameTitle = /\b(treasures?|treasury|monsters?|heroes?|builders?|warriors?|adventure|adventures|of\s+the|definitive|edition|remake|remastered?)\b/i.test(fullText)
        
        // Vérifier aussi si le numéro recherché est explicitement absent
        const hasSearchedNumber = gameTitleNumbers.some(num => {
          const numStr = num.toLowerCase()
          // Vérifier que le numéro n'est PAS présent (ni en chiffre ni en romain)
          return !fullText.includes(numStr) && 
                 !fullText.includes(numStr.replace('11', 'xi').replace('11', 'eleven'))
        })
        
        if (hasOtherGameTitle || hasSearchedNumber) {
          // Pénalité FORTE pour jeux différents avec titre alternatif ou numéro manquant
          score -= 20 // Pénalité négative plus forte
          const reason = hasOtherGameTitle ? 
            `PÉNALITÉ: Jeu différent détecté (titre alternatif au lieu de "${keywords.gameTitle}")` :
            `PÉNALITÉ: Numéro recherché (${gameTitleNumbers.join(', ')}) manquant → jeu différent`
          reasons.push(reason)
        } else {
          // Pénalité modérée si juste la base sans numéro ni titre alternatif
          score += 3 // Bonus très réduit (de 5 à 3)
          reasons.push(`Titre de base trouvé mais numéro manquant: "${keywords.gameTitle}" → jeu différent possible`)
        }
      }
      // Si seulement le numéro sans la base
      else if (!hasBase && hasNumber) {
        score += 5
        reasons.push(`Numéro trouvé mais titre de base manquant`)
      }
    }
    // Correspondance partielle (mots individuels) - seulement si pas de numéro dans la recherche
    else if (gameTitleNumbers.length === 0) {
      const gameWords = gameTitleLower.split(/\s+/).filter(w => w.length > 2)
      const matchedGameWords = gameWords.filter(gw => titleLower.includes(gw))
      
      if (matchedGameWords.length > 0) {
        const gameScore = (matchedGameWords.length / gameWords.length) * 20
        score += gameScore
        reasons.push(`${matchedGameWords.length}/${gameWords.length} mots du jeu trouvés`)
      }
      
      // Aussi vérifier dans la description si disponible
      if (description && description.length > 10) {
        if (descLower.includes(gameTitleLower)) {
          score += 15
          reasons.push(`Titre du jeu trouvé dans la description: "${keywords.gameTitle}"`)
        } else {
          const descMatchedWords = gameWords.filter(gw => descLower.includes(gw))
          if (descMatchedWords.length > 0) {
            const descGameScore = (descMatchedWords.length / gameWords.length) * 10
            score += descGameScore
            reasons.push(`${descMatchedWords.length}/${gameWords.length} mots du jeu dans la description`)
          }
        }
      }
    }
  }
  
  // 4. Correspondance plateforme (20 points max) - Augmenté et plus permissif
  if (keywords.platform.length > 0) {
    const normalizedTitle = title
      .replace(/swicth|swich/gi, 'switch')
      .replace(/\bps5\b/gi, 'playstation 5')
      .replace(/\bps4\b/gi, 'playstation 4')
      .replace(/\bps3\b/gi, 'playstation 3')
      .replace(/\bps2\b/gi, 'playstation 2')
      .replace(/\bps1\b/gi, 'playstation 1')
    
    const platformMatch = keywords.platform.some(p => {
      return normalizedTitle.includes(p) || (description && description.includes(p))
    })
    
    if (platformMatch) {
      score += 20 // Augmenté de 15 à 20
      reasons.push(`Plateforme détectée: ${keywords.platform.join(', ')}`)
    } else {
      // Bonus même si plateforme pas dans titre mais dans recherche
      // (certains items peuvent avoir la plateforme dans la description seulement)
      score += 5
      reasons.push(`Plateforme recherchée: ${keywords.platform.join(', ')}`)
    }
  }
  
  // 5. Correspondance description (15 points max) - Augmenté
  if (description && description.length > 10) {
    // Correspondance exacte de la recherche
    if (description.includes(searchLower)) {
      score += 15 // Augmenté de 10 à 15
      reasons.push('Recherche trouvée dans la description')
    }
    // Correspondance titre du jeu dans description
    else if (keywords.gameTitle && description.includes(keywords.gameTitle.toLowerCase())) {
      score += 12 // Augmenté de 8 à 12
      reasons.push('Titre du jeu trouvé dans la description')
    }
    // Correspondance plateforme dans description
    else if (keywords.platform.length > 0 && keywords.platform.some(p => description.includes(p))) {
      score += 8 // Augmenté de 5 à 8
      reasons.push('Plateforme trouvée dans la description')
    }
    // Correspondance partielle des mots-clés dans description
    else {
      const matchedKeywords = keywords.allWords.filter(kw => 
        kw.length > 3 && description.includes(kw)
      )
      if (matchedKeywords.length > 0) {
        const keywordScore = Math.min(10, (matchedKeywords.length / keywords.allWords.length) * 10)
        score += keywordScore
        reasons.push(`${matchedKeywords.length} mots-clés dans la description`)
      }
    }
  }
  
  // 6. Cohérence type produit (bonus/malus) - Amélioré
  const isSearchingGame = keywords.platform.length > 0 || keywords.gameTitle.length > 2
  
  // Détecter les items non pertinents plus précisément
  const isConsole = title.includes('console') || title.includes('oled') || title.includes('lite') || 
                    title.includes('pro controller') || title.includes('manette') ||
                    title.includes('joy-con') || title.includes('dock') || title.includes('charger')
  const isManga = title.includes('manga') || title.includes('comic') || title.includes('livre') ||
                  title.includes('book') || title.includes('roman') || title.includes('novel')
  const isAccessory = title.includes('coque') || title.includes('housse') || title.includes('étui') ||
                      title.includes('case') || title.includes('protecteur') || title.includes('screen protector')
  const isCollectible = title.includes('figurine') || title.includes('statue') || title.includes('collector') ||
                        title.includes('pop') || title.includes('funko')
  
  if (isSearchingGame) {
    if (productType === 'video_game') {
      // Bonus pour cohérence, mais vérifier qu'on ne cherche pas un jeu spécifique
      if (!isConsole && !isManga && !isAccessory && !isCollectible) {
        score += 5
        reasons.push('Type de produit cohérent (jeu vidéo)')
      }
    } else if (productType === 'clothing') {
      score -= 30 // Malus fort pour incohérence
      reasons.push('PÉNALITÉ: Recherche jeu mais résultat vêtement')
    } else if (productType === 'other') {
      // Pénalités spécifiques selon le type d'item non pertinent
      if (isConsole) {
        score -= 30 // Malus fort pour console
        reasons.push('PÉNALITÉ: Recherche jeu mais résultat console')
      } else if (isManga) {
        score -= 30 // Malus fort pour manga/livre
        reasons.push('PÉNALITÉ: Recherche jeu mais résultat manga/livre')
      } else if (isAccessory) {
        score -= 25 // Malus pour accessoire
        reasons.push('PÉNALITÉ: Recherche jeu mais résultat accessoire')
      } else if (isCollectible) {
        score -= 20 // Malus modéré pour figurine/collectible
        reasons.push('PÉNALITÉ: Recherche jeu mais résultat figurine/collectible')
      } else {
        score -= 10 // Malus modéré pour autre type
        reasons.push('Type de produit incohérent')
      }
    }
  }
  
  // Normaliser le score
  score = Math.max(0, Math.min(100, score))
  
  // Déterminer la confiance (seuils ajustés)
  let confidence: 'high' | 'medium' | 'low' = 'low'
  if (score >= 50) confidence = 'high' // Réduit de 60 à 50
  else if (score >= 25) confidence = 'medium' // Réduit de 35 à 25
  
  return { score, reasons, confidence }
}

/**
 * Calcule la similarité entre deux chaînes (Levenshtein)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  const distance = levenshteinDistance(longer, shorter)
  return (longer.length - distance) / longer.length
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

/**
 * Filtre et trie intelligemment les items
 * 
 * Stratégie :
 * 1. Pré-filtrage rapide (score >= 20) pour réduire le nombre d'items
 * 2. Tri par score décroissant
 * 3. Limite intelligente basée sur la confiance
 */
export function filterAndSortSmart(
  items: ApiItem[],
  searchText: string,
  options: {
    minScore?: number
    maxResults?: number
    requireHighConfidence?: boolean
  } = {}
): ApiItem[] {
  const { minScore = 25, maxResults = 50, requireHighConfidence = false } = options
  
  // Calculer les scores pour tous les items
  const scoredItems = items.map(item => {
    const { score, reasons, confidence } = calculateSmartRelevanceScore(item, searchText)
    return { item, score, reasons, confidence }
  })
  
  // Filtrer par score minimum
  let filtered = scoredItems.filter(scored => scored.score >= minScore)
  
  // Filtrer par confiance si demandé
  if (requireHighConfidence) {
    filtered = filtered.filter(scored => scored.confidence === 'high')
  }
  
  // Trier par score décroissant
  filtered.sort((a, b) => {
    // Prioriser les scores élevés
    if (Math.abs(a.score - b.score) > 5) {
      return b.score - a.score
    }
    // En cas d'égalité, prioriser la confiance
    const confidenceOrder = { high: 3, medium: 2, low: 1 }
    return confidenceOrder[b.confidence] - confidenceOrder[a.confidence]
  })
  
  // Limiter les résultats
  const limited = filtered.slice(0, maxResults)
  
  // Logging détaillé pour debug et affinement
  console.log(`\n🎯 Smart filtering: ${items.length} items → ${filtered.length} pertinents (score >= ${minScore})`)
  
  // Extraire les mots-clés pour les logs
  const keywords = extractSmartKeywords(searchText)
  console.log(`\n🔍 Mots-clés extraits de "${searchText}":`)
  console.log(`   - Exact: ${keywords.exact.join(', ') || 'aucun'}`)
  console.log(`   - Plateforme: ${keywords.platform.join(', ') || 'aucune'}`)
  console.log(`   - Titre du jeu: ${keywords.gameTitle || 'aucun'}`)
  console.log(`   - Tous les mots: ${keywords.allWords.join(', ')}`)
  
  // Afficher TOUS les items avec détails complets (pour affiner la recherche)
  console.log(`\n📋 Détails de scoring pour TOUS les items (${items.length}):`)
  scoredItems
    .sort((a, b) => b.score - a.score) // Trier par score décroissant
    .forEach((scored, i) => {
      const item = scored.item
      const isPassing = scored.score >= minScore
      const icon = isPassing ? '✅' : '❌'
      
      console.log(`\n${icon} ${i + 1}. [ID: ${item.id}] Score: ${scored.score.toFixed(1)} (${scored.confidence})`)
      console.log(`   📝 Titre: "${item.title || 'N/A'}"`)
      console.log(`   💰 Prix: ${item.price?.amount ? `${item.price.amount} ${item.price.currency_code}` : 'N/A'}`)
      console.log(`   🎮 Plateforme détectée: ${item.detected_platform || 'N/A'}`)
      console.log(`   📦 Type produit: ${detectProductTypeSmart(item)}`)
      
      // Détails des raisons du score
      if (scored.reasons.length > 0) {
        console.log(`   📊 Raisons du score:`)
        scored.reasons.forEach(reason => {
          console.log(`      • ${reason}`)
        })
      }
      
      // Correspondances détaillées
      const titleLower = (item.title || '').toLowerCase()
      const descLower = (item.description || '').toLowerCase()
      const searchLower = searchText.toLowerCase()
      
      console.log(`   🔎 Correspondances:`)
      
      // Correspondances exactes
      const exactMatches = keywords.exact.filter(kw => 
        titleLower.includes(kw.toLowerCase()) || descLower.includes(kw.toLowerCase())
      )
      if (exactMatches.length > 0) {
        console.log(`      ✓ Exactes: ${exactMatches.join(', ')}`)
      }
      
      // Correspondances plateforme
      const platformMatches = keywords.platform.filter(p => 
        titleLower.includes(p.toLowerCase()) || descLower.includes(p.toLowerCase())
      )
      if (platformMatches.length > 0) {
        console.log(`      ✓ Plateforme: ${platformMatches.join(', ')}`)
      }
      
      // Correspondance titre du jeu
      if (keywords.gameTitle) {
        const gameInTitle = titleLower.includes(keywords.gameTitle.toLowerCase())
        const gameInDesc = descLower.includes(keywords.gameTitle.toLowerCase())
        if (gameInTitle || gameInDesc) {
          console.log(`      ✓ Titre du jeu "${keywords.gameTitle}": ${gameInTitle ? 'titre' : ''}${gameInTitle && gameInDesc ? ' + ' : ''}${gameInDesc ? 'description' : ''}`)
        }
      }
      
      // Score Vinted si disponible
      if (item.search_tracking_params?.score !== undefined) {
        console.log(`   ⭐ Score Vinted: ${item.search_tracking_params.score}`)
      }
      
      // Description (premiers 150 caractères)
      if (item.description) {
        console.log(`   📄 Description: ${item.description.substring(0, 150)}${item.description.length > 150 ? '...' : ''}`)
      }
    })
  
  // Résumé des résultats
  if (limited.length > 0) {
    console.log(`\n✅ ${limited.length} items passent le filtre (score >= ${minScore}):`)
    limited.slice(0, 10).forEach((scored, i) => {
      console.log(`   ${i + 1}. Score ${scored.score.toFixed(1)} (${scored.confidence}): "${scored.item.title}"`)
    })
  } else {
    console.log(`\n⚠️ Aucun item ne passe le filtre strict (score >= ${minScore})`)
    console.log(`   Meilleurs scores: ${scoredItems.sort((a, b) => b.score - a.score).slice(0, 3).map(s => `${s.score.toFixed(1)}`).join(', ')}`)
  }
  
  return limited.map(scored => scored.item)
}

