/**
 * Smart Filter - Version simplifiée pour l'analyse de pertinence
 * Utilisé uniquement par les anciens systèmes en transition
 */

function buildIntent(query) {
  const queryLower = query.toLowerCase().trim()
  
  return {
    originalQuery: query,
    normalizedQuery: queryLower,
    gameKeywords: extractGameKeywords(queryLower),
    platformKeywords: extractPlatformKeywords(queryLower),
    conditionKeywords: extractConditionKeywords(queryLower)
  }
}

function extractGameKeywords(query) {
  // Extraire les mots-clés de jeu principaux
  const words = query.split(' ').filter(word => word.length > 2)
  return words.filter(word => !isPlatformWord(word) && !isConditionWord(word))
}

function extractPlatformKeywords(query) {
  const platforms = ['nes', 'snes', 'gameboy', 'n64', 'gamecube', 'wii', 'switch', 'ds', '3ds', 'playstation', 'xbox']
  return platforms.filter(platform => query.includes(platform))
}

function extractConditionKeywords(query) {
  const conditions = ['neuf', 'complet', 'loose', 'cib', 'sealed']
  return conditions.filter(condition => query.includes(condition))
}

function isPlatformWord(word) {
  const platforms = ['nes', 'snes', 'gameboy', 'nintendo', 'playstation', 'xbox', 'switch']
  return platforms.includes(word)
}

function isConditionWord(word) {
  const conditions = ['neuf', 'complet', 'loose', 'cib', 'sealed', 'bon', 'état']
  return conditions.includes(word)
}

function calculateRelevanceScore(item, intent) {
  const title = (item.title || '').toLowerCase()
  const description = (item.description || '').toLowerCase()
  const fullText = `${title} ${description}`
  
  let score = 0
  
  // Score basé sur les mots-clés du jeu
  for (const keyword of intent.gameKeywords) {
    if (title.includes(keyword)) score += 0.4
    else if (description.includes(keyword)) score += 0.2
  }
  
  // Score basé sur la plateforme
  for (const platform of intent.platformKeywords) {
    if (fullText.includes(platform)) score += 0.3
  }
  
  // Score basé sur la condition
  for (const condition of intent.conditionKeywords) {
    if (fullText.includes(condition)) score += 0.1
  }
  
  return Math.min(score, 1.0)
}

module.exports = {
  buildIntent,
  calculateRelevanceScore
}