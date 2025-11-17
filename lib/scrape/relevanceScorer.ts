import type { ApiItem } from '../types'

/**
 * Détecte le type de produit basé sur le titre et la description
 */
export function detectProductType(item: ApiItem): 'video_game' | 'clothing' | 'other' {
  const title = (item.title || '').toLowerCase()
  const description = (item.description || '').toLowerCase()
  const brand = (item.brand_title || '').toLowerCase()
  const text = `${title} ${description} ${brand}`

  // Mots-clés pour jeux vidéo
  const gameKeywords = [
    'jeu', 'game', 'nintendo', 'switch', 'swicth', 'swich', 'playstation', 'xbox', 'pc', 'steam',
    'ps5', 'ps4', 'ps3', 'ps2', 'ps1', 'xbox series', 'xbox one', 'xbox 360', 'wii', 'wii u',
    'gamecube', 'n64', 'snes', 'nes', 'gameboy', 'game boy', '3ds', 'ds', 
    'cartouche', 'cartridge', 'cd', 'dvd', 'blu-ray',
    'boite', 'box', 'cib', 'complet', 'loose', 'sealed', 'neuf', 'retro',
    'vintage', 'console', 'handheld', 'portable', 'big box', 'pc big box'
  ]

  // Mots-clés pour vêtements
  const clothingKeywords = [
    'veste', 'jacket', 'jean', 'pantalon', 'pants', 't-shirt', 'tshirt',
    'chemise', 'shirt', 'pull', 'sweater', 'robe', 'dress', 'chaussure',
    'shoe', 'basket', 'sneaker', 'taille', 'size', 'xs', 's', 'm', 'l', 'xl',
    'marque', 'brand', 'chasin', 'nike', 'adidas', 'zara', 'h&m'
  ]

  const gameScore = gameKeywords.filter(keyword => text.includes(keyword)).length
  const clothingScore = clothingKeywords.filter(keyword => text.includes(keyword)).length

  if (gameScore > clothingScore && gameScore > 0) {
    return 'video_game'
  }
  if (clothingScore > gameScore && clothingScore > 0) {
    return 'clothing'
  }
  return 'other'
}

/**
 * Extrait les mots-clés importants de la requête de recherche
 */
export function extractSearchKeywords(searchText: string): {
  exact: string[]
  platform: string[]
  gameTitle: string[]
} {
  const lower = searchText.toLowerCase().trim()
  const words = lower.split(/\s+/).filter(w => w.length > 2)

  // Plateformes connues (avec variantes) - ordre important : plateformes composées d'abord
  const platforms = [
    // Plateformes composées (à vérifier en premier)
    'xbox series', 'xbox one', 'xbox 360', 'wii u',
    'playstation 5', 'playstation 4', 'playstation 3', 'playstation 2', 'playstation 1',
    'game boy', 'game boy color', 'game boy advance',
    // Plateformes simples
    'switch', 'swicth', 'swich', // Gestion fautes de frappe
    'nintendo', 'playstation', 'ps5', 'ps4', 'ps3', 'ps2', 'ps1', 'xbox', 'pc', 'wii', 
    'gamecube', 'n64', 'snes', 'nes', 'gameboy', '3ds', 'ds', 'steam'
  ]
  
  // Trouver les plateformes (vérifier les composées d'abord)
  const foundPlatforms: string[] = []
  for (const platform of platforms) {
    if (lower.includes(platform)) {
      foundPlatforms.push(platform)
      // Éviter les doublons (ex: si "xbox series" est trouvé, ne pas ajouter "xbox")
      if (platform.includes(' ')) {
        const parts = platform.split(' ')
        parts.forEach(part => {
          const index = foundPlatforms.indexOf(part)
          if (index > -1 && foundPlatforms[index] === part && part.length < platform.length) {
            foundPlatforms.splice(index, 1)
          }
        })
      }
    }
  }
  
  // Normaliser les plateformes trouvées (swicth -> switch)
  const normalizedPlatforms = foundPlatforms.map(p => {
    if (p === 'swicth' || p === 'swich') return 'switch'
    if (p === 'ps5') return 'playstation 5'
    if (p === 'ps4') return 'playstation 4'
    if (p === 'ps3') return 'playstation 3'
    if (p === 'ps2') return 'playstation 2'
    if (p === 'ps1') return 'playstation 1'
    return p
  })

  // Mots qui semblent être le titre du jeu (excluant les plateformes et mots communs)
  const commonWords = ['jeu', 'game', 'pour', 'sur', 'the', 'le', 'la', 'de', 'du', 'et', 'ou', 'switch', 'swicth', 'swich', 'video', 'retro', 'vintage', 'occasion', 'bon', 'état', 'très', 'parfait']
  const gameTitleWords = words.filter(w => {
    const normalized = w === 'swicth' || w === 'swich' ? 'switch' : w
    // Vérifier si c'est une plateforme (en tenant compte des variantes)
    const isPlatform = platforms.some(p => {
      const pLower = p.toLowerCase()
      return pLower === normalized || pLower.includes(normalized) || normalized.includes(pLower)
    })
    return !isPlatform && 
           !commonWords.includes(w) &&
           w.length > 2 // Réduit à 2 pour capturer des titres courts comme "Chasm"
  })
  
  // Si on a trouvé des mots pour le titre, les regrouper
  // Ex: "chasm switch" -> gameTitle = ["chasm"]
  const gameTitle = gameTitleWords.length > 0 ? gameTitleWords.join(' ') : ''

  return {
    exact: words,
    platform: [...new Set(normalizedPlatforms)], // Dédupliquer
    gameTitle: gameTitle ? [gameTitle] : gameTitleWords // Prioriser le titre complet, sinon les mots individuels
  }
}

/**
 * Calcule un score de pertinence pour un item par rapport à une requête de recherche
 * Score de 0 à 100
 */
export function calculateRelevanceScore(item: ApiItem, searchText: string): {
  score: number
  reasons: string[]
} {
  const title = (item.title || '').toLowerCase()
  const description = (item.description || '').toLowerCase()
  const brand = (item.brand_title || '').toLowerCase()
  const searchLower = searchText.toLowerCase().trim()
  const keywords = extractSearchKeywords(searchText)
  const productType = detectProductType(item)

  let score = 0
  const reasons: string[] = []

  // 1. Correspondance exacte du titre (40 points max)
  if (title.includes(searchLower)) {
    score += 40
    reasons.push('Titre contient la recherche exacte')
  } else {
    // Correspondance partielle des mots-clés avec gestion des fautes de frappe
    const titleWords = title.split(/\s+/)
    const searchWords = searchLower.split(/\s+/).filter(w => w.length > 2)
    
    let matchedWords = 0
    let exactMatches = 0
    let partialMatches = 0
    
    for (const word of searchWords) {
      // Correspondance exacte
      if (titleWords.some(tw => tw === word)) {
        exactMatches++
        matchedWords++
      }
      // Correspondance partielle (contient)
      else if (titleWords.some(tw => tw.includes(word) || word.includes(tw))) {
        partialMatches++
        matchedWords++
      }
      // Correspondance avec faute de frappe (similarité > 0.8)
      else {
        const similarWord = titleWords.find(tw => {
          const similarity = calculateSimilarity(word, tw)
          return similarity > 0.75 // Plus permissif pour les fautes de frappe
        })
        if (similarWord) {
          partialMatches++
          matchedWords++
          reasons.push(`Correspondance approximative: "${word}" ≈ "${similarWord}"`)
        }
      }
    }
    
    if (matchedWords > 0) {
      // Score basé sur le ratio de mots trouvés, avec bonus pour les correspondances exactes
      const baseScore = (matchedWords / searchWords.length) * 35
      const exactBonus = (exactMatches / searchWords.length) * 5
      const partialScore = baseScore + exactBonus
      score += partialScore
      reasons.push(`${matchedWords}/${searchWords.length} mots-clés trouvés (${exactMatches} exacts, ${partialMatches} partiels)`)
    }
  }

  // 2. Correspondance du titre du jeu (si détecté) (35 points max) - AMÉLIORÉ
  if (keywords.gameTitle.length > 0) {
    let gameTitleScore = 0
    
    for (const gt of keywords.gameTitle) {
      // Vérifier correspondance exacte
      if (title.includes(gt)) {
        gameTitleScore = Math.max(gameTitleScore, 35)
        reasons.push(`Titre du jeu détecté dans le titre: "${gt}"`)
        break
      }
      
      // Vérifier correspondance partielle (mots individuels)
      const gtWords = gt.split(/\s+/).filter(w => w.length > 3)
      const matchedWords = gtWords.filter(gw => title.includes(gw))
      if (matchedWords.length > 0) {
        const partialScore = (matchedWords.length / gtWords.length) * 25
        gameTitleScore = Math.max(gameTitleScore, partialScore)
        reasons.push(`Correspondance partielle du titre du jeu: ${matchedWords.length}/${gtWords.length} mots`)
      }
      
      // Vérifier correspondance avec similarité (fautes de frappe)
      const titleWords = title.split(/\s+/)
      for (const gw of gtWords) {
        const similarWord = titleWords.find(tw => {
          const similarity = calculateSimilarity(gw, tw)
          return similarity > 0.7
        })
        if (similarWord) {
          gameTitleScore = Math.max(gameTitleScore, 18)
          reasons.push(`Correspondance approximative: "${gw}" ≈ "${similarWord}"`)
        }
      }
    }
    
    if (gameTitleScore > 0) {
      score += gameTitleScore
    }
  }

  // 3. Correspondance de la plateforme (20 points max)
  if (keywords.platform.length > 0) {
    // Normaliser le titre pour la recherche (swicth -> switch, ps5 -> playstation 5, etc.)
    let normalizedTitle = title
      .replace(/swicth|swich/gi, 'switch')
      .replace(/\bps5\b/gi, 'playstation 5')
      .replace(/\bps4\b/gi, 'playstation 4')
      .replace(/\bps3\b/gi, 'playstation 3')
      .replace(/\bps2\b/gi, 'playstation 2')
      .replace(/\bps1\b/gi, 'playstation 1')
    
    let normalizedDescription = description
      .replace(/swicth|swich/gi, 'switch')
      .replace(/\bps5\b/gi, 'playstation 5')
      .replace(/\bps4\b/gi, 'playstation 4')
      .replace(/\bps3\b/gi, 'playstation 3')
      .replace(/\bps2\b/gi, 'playstation 2')
      .replace(/\bps1\b/gi, 'playstation 1')
    
    const platformMatch = keywords.platform.some(p => {
      // Normaliser la plateforme recherchée
      let normalizedP = p
      if (p === 'swicth' || p === 'swich') normalizedP = 'switch'
      if (p === 'ps5') normalizedP = 'playstation 5'
      if (p === 'ps4') normalizedP = 'playstation 4'
      if (p === 'ps3') normalizedP = 'playstation 3'
      if (p === 'ps2') normalizedP = 'playstation 2'
      if (p === 'ps1') normalizedP = 'playstation 1'
      
      // Vérifier correspondance exacte ou partielle
      return normalizedTitle.includes(normalizedP) || 
             normalizedDescription.includes(normalizedP) ||
             normalizedTitle.includes(p) || 
             normalizedDescription.includes(p)
    })
    if (platformMatch) {
      score += 20
      reasons.push('Plateforme détectée')
    }
  }

  // 4. Type de produit cohérent (10 points max)
  // Si on cherche un jeu et qu'on trouve un jeu, bonus
  const isSearchingGame = keywords.platform.length > 0 || 
                          keywords.gameTitle.length > 0 ||
                          searchLower.includes('jeu') ||
                          searchLower.includes('game')
  
  if (isSearchingGame && productType === 'video_game') {
    score += 10
    reasons.push('Type de produit cohérent (jeu vidéo)')
  } else if (isSearchingGame && productType !== 'video_game') {
    // Pénalité si on cherche un jeu mais qu'on trouve autre chose
    score -= 30
    reasons.push('PÉNALITÉ: Type de produit incohérent (recherche jeu, résultat autre)')
  }

  // 5. Correspondance dans la description (30 points max) - AMÉLIORÉ
  if (description && description.length > 0) {
    const descLower = description.toLowerCase()
    
    // Correspondance exacte de la recherche complète dans la description
    if (descLower.includes(searchLower)) {
      score += 30
      reasons.push('Recherche complète trouvée dans la description')
    } else {
      // Vérifier correspondance du titre du jeu dans la description (avec fuzzy matching)
      if (keywords.gameTitle.length > 0) {
        let gameTitleScore = 0
        for (const gt of keywords.gameTitle) {
          // Correspondance exacte
          if (descLower.includes(gt)) {
            gameTitleScore = Math.max(gameTitleScore, 20)
            continue
          }
          
          // Correspondance partielle (mots individuels)
          const gtWords = gt.split(/\s+/).filter(w => w.length > 3)
          const matchedWords = gtWords.filter(gw => descLower.includes(gw))
          if (matchedWords.length > 0) {
            gameTitleScore = Math.max(gameTitleScore, (matchedWords.length / gtWords.length) * 15)
          }
          
          // Fuzzy matching pour fautes de frappe dans la description
          const descWords = descLower.split(/\s+/)
          for (const gw of gtWords) {
            const similarWord = descWords.find(dw => {
              const similarity = calculateSimilarity(gw, dw)
              return similarity > 0.7 // Tolérance pour fautes de frappe
            })
            if (similarWord) {
              gameTitleScore = Math.max(gameTitleScore, 12)
              reasons.push(`Titre du jeu trouvé (fuzzy): "${gw}" ≈ "${similarWord}"`)
            }
          }
        }
        if (gameTitleScore > 0) {
          score += gameTitleScore
          reasons.push('Titre du jeu trouvé dans la description')
        }
      }
      
      // Vérifier correspondance de la plateforme dans la description
      if (keywords.platform.length > 0) {
        const platformInDesc = keywords.platform.some(p => {
          let normalizedP = p
          if (p === 'swicth' || p === 'swich') normalizedP = 'switch'
          if (p === 'ps5') normalizedP = 'playstation 5'
          if (p === 'ps4') normalizedP = 'playstation 4'
          if (p === 'ps3') normalizedP = 'playstation 3'
          if (p === 'ps2') normalizedP = 'playstation 2'
          if (p === 'ps1') normalizedP = 'playstation 1'
          
          return descLower.includes(normalizedP) || descLower.includes(p)
        })
        if (platformInDesc) {
          score += 15
          reasons.push('Plateforme trouvée dans la description')
        }
      }
      
      // Vérifier correspondance des mots-clés individuels (avec fuzzy matching)
      const matchedKeywords: string[] = []
      const descWords = descLower.split(/\s+/)
      
      for (const kw of keywords.exact) {
        if (kw.length <= 3) continue
        
        // Correspondance exacte
        if (descLower.includes(kw)) {
          matchedKeywords.push(kw)
          continue
        }
        
        // Fuzzy matching pour fautes de frappe
        const similarWord = descWords.find(dw => {
          const similarity = calculateSimilarity(kw, dw)
          return similarity > 0.75 // Tolérance pour fautes de frappe
        })
        if (similarWord) {
          matchedKeywords.push(kw)
          reasons.push(`Mot-clé trouvé (fuzzy): "${kw}" ≈ "${similarWord}"`)
        }
      }
      
      if (matchedKeywords.length > 0) {
        const keywordScore = Math.min(15, (matchedKeywords.length / keywords.exact.length) * 15)
        score += keywordScore
        reasons.push(`${matchedKeywords.length}/${keywords.exact.length} mots-clés trouvés dans la description`)
      }
    }
  }

  // 6. Pénalités pour les correspondances trompeuses (seulement si vraiment trompeur)
  // Si le titre contient des mots similaires mais pas exacts (ex: "chasm" vs "chasin'")
  const searchWords = searchLower.split(/\s+/).filter(w => w.length > 4) // Seulement mots longs pour éviter faux positifs
  const titleWords = title.split(/\s+/)
  
  for (const word of searchWords) {
    // Vérifier d'abord si le mot exact est présent
    const exactMatch = titleWords.some(tw => {
      const normalizedTw = tw.replace(/[''"]/g, '').toLowerCase()
      const normalizedWord = word.replace(/[''"]/g, '').toLowerCase()
      return normalizedTw === normalizedWord || normalizedTw.includes(normalizedWord) || normalizedWord.includes(normalizedTw)
    })
    
    if (!exactMatch) {
      // Chercher des mots similaires mais vraiment différents (pas juste une faute de frappe)
      const similarWords = titleWords.filter(tw => {
        // Normaliser pour la comparaison (enlever apostrophes, caractères spéciaux)
        const normalizedTw = tw.replace(/[''"]/g, '').toLowerCase()
        const normalizedWord = word.replace(/[''"]/g, '').toLowerCase()
        
        // Distance de Levenshtein approximative
        const similarity = calculateSimilarity(normalizedWord, normalizedTw)
        // Seulement pénaliser si vraiment différent (similarité entre 0.5 et 0.85)
        // Si > 0.85, c'est probablement juste une faute de frappe
        return similarity > 0.5 && similarity < 0.85
      })
      
      if (similarWords.length > 0) {
        score -= 20 // Pénalité réduite
        reasons.push(`PÉNALITÉ: Correspondance trompeuse ("${word}" vs "${similarWords[0]}")`)
      }
    }
  }
  
  // 7. Pénalité spéciale pour les marques de vêtements quand on cherche un jeu
  if (isSearchingGame && productType === 'clothing') {
    score -= 40
    reasons.push('PÉNALITÉ FORTE: Recherche jeu mais résultat vêtement')
  }
  
  // 8. Bonus si le titre contient le mot principal même avec faute de frappe
  // Ex: "chasm" dans "Chasm Switch" même si recherche "chasm swicth"
  const allSearchWords = searchLower.split(/\s+/).filter(w => w.length > 3)
  const mainSearchWord = allSearchWords[0]
  if (mainSearchWord && mainSearchWord.length > 3) {
    const mainWordInTitle = titleWords.some(tw => {
      const similarity = calculateSimilarity(mainSearchWord, tw)
      return similarity > 0.8 // Très similaire = probablement le même mot avec faute
    })
    if (mainWordInTitle && !title.includes(mainSearchWord)) {
      score += 10
      reasons.push(`Bonus: mot principal détecté avec faute de frappe`)
    }
  }

  // Normaliser le score entre 0 et 100
  score = Math.max(0, Math.min(100, score))

  return { score, reasons }
}

/**
 * Calcule une similarité approximative entre deux chaînes (0 à 1)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1
  
  if (longer.length === 0) return 1.0
  
  // Distance de Levenshtein simplifiée
  const distance = levenshteinDistance(longer, shorter)
  return (longer.length - distance) / longer.length
}

/**
 * Calcule la distance de Levenshtein entre deux chaînes
 */
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
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j] + 1       // deletion
        )
      }
    }
  }
  
  return matrix[str2.length][str1.length]
}

/**
 * Filtre et trie les items par pertinence
 */
export function filterAndSortByRelevance(
  items: ApiItem[],
  searchText: string,
  options: {
    minScore?: number
    maxResults?: number
  } = {}
): ApiItem[] {
  const { minScore = 20, maxResults = 100 } = options

  // Calculer les scores pour tous les items
  const scoredItems = items.map(item => {
    const { score, reasons } = calculateRelevanceScore(item, searchText)
    return {
      item,
      score,
      reasons
    }
  })

  // Filtrer par score minimum
  const filtered = scoredItems.filter(scored => scored.score >= minScore)

  // Trier par score décroissant
  filtered.sort((a, b) => b.score - a.score)

  // Limiter le nombre de résultats
  const limited = filtered.slice(0, maxResults)

  // Log pour debug
  console.log(`🎯 Pertinence: ${items.length} items → ${filtered.length} pertinents (score >= ${minScore})`)
  
  // Log TOUS les items avec leurs scores pour debug
  if (items.length > 0 && filtered.length === 0) {
    console.log(`⚠️ Aucun item ne passe le filtre ! Détails de tous les items:`)
    scoredItems.slice(0, 10).forEach((scored, i) => {
      console.log(`  ${i + 1}. Score ${scored.score.toFixed(1)}: "${scored.item.title}"`)
      console.log(`     Raisons: ${scored.reasons.join(', ')}`)
    })
  }
  
  if (limited.length > 0) {
    console.log(`📊 Top 3 résultats:`)
    limited.slice(0, 3).forEach((scored, i) => {
      console.log(`  ${i + 1}. Score ${scored.score.toFixed(1)}: "${scored.item.title}"`)
      console.log(`     Raisons: ${scored.reasons.join(', ')}`)
    })
  }

  return limited.map(scored => scored.item)
}

