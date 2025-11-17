import type { ApiItem } from '../types/core'
import { buildFullVintedHeaders, type FullVintedSession } from './fullSessionManager'

/**
 * Enrichit un item en récupérant sa description complète depuis la page Vinted
 * Avec retry et gestion des erreurs 429
 */
async function enrichItemWithDescriptionWithRetry(
  item: ApiItem,
  session?: FullVintedSession,
  maxRetries: number = 3
): Promise<ApiItem> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const vintedItemUrl = `https://www.vinted.fr/items/${item.id}`
      
      const headers = session ? buildFullVintedHeaders(session) : {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 Edg/132.0.0.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }

      const response = await fetch(vintedItemUrl, { headers })

      // Gestion spéciale pour 429 (Too Many Requests)
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After')
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : (attempt + 1) * 2000 // 2s, 4s, 6s
        console.warn(`⚠️ Rate limited (429) for item ${item.id}, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        continue // Réessayer
      }

      if (!response.ok) {
        console.warn(`⚠️ Failed to enrich item ${item.id}: HTTP ${response.status}`)
        return item // Retourner l'item original si l'enrichissement échoue
      }

      const html = await response.text()
      
      // Essayer plusieurs patterns pour extraire le JSON
      let initialState: any = null
      const patterns = [
        /window\.__INITIAL_STATE__\s*=\s*({.*?});/s,
        /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/,
        /__INITIAL_STATE__\s*=\s*({.*?});/s,
      ]
      
      for (const pattern of patterns) {
        const jsonMatch = html.match(pattern)
        if (jsonMatch) {
          try {
            initialState = JSON.parse(jsonMatch[1])
            break
          } catch (e) {
            // Essayer le pattern suivant
            continue
          }
        }
      }
      
      if (!initialState) {
        // Essayer de trouver dans d'autres formats
        const scriptMatch = html.match(/<script[^>]*>[\s\S]*?__INITIAL_STATE__[\s\S]*?({[\s\S]*?})[\s\S]*?<\/script>/i)
        if (scriptMatch) {
          try {
            initialState = JSON.parse(scriptMatch[1])
          } catch (e) {
            // Ignorer
          }
        }
      }
      
      if (!initialState) {
        // Si on ne trouve toujours pas, essayer d'extraire directement depuis le HTML
        // Certains items peuvent avoir la description dans un autre format
        const descMatch = html.match(/<div[^>]*class="[^"]*description[^"]*"[^>]*>([\s\S]*?)<\/div>/i)
        if (descMatch) {
          // Au moins on a trouvé quelque chose dans le HTML
          return item // Pour l'instant, on retourne l'item original
        }
        
        console.warn(`⚠️ Could not find initial state for item ${item.id}`)
        return item
      }
      
      // Chercher les données de l'item dans l'état initial
      let itemData: any = null
      if (initialState.items && initialState.items.items) {
        itemData = Object.values(initialState.items.items).find((i: any) => i.id === item.id)
      }
      
      // Essayer d'autres chemins possibles
      if (!itemData && initialState.catalog && initialState.catalog.items) {
        itemData = Object.values(initialState.catalog.items).find((i: any) => i.id === item.id)
      }

      if (!itemData) {
        console.warn(`⚠️ Item data not found in initial state for item ${item.id}`)
        return item
      }

      // Enrichir avec la description complète
      const enrichedItem: ApiItem = {
        ...item,
        description: itemData.description || item.description, // Description complète
        title: itemData.title || item.title, // Titre complet (au cas où)
      }

      return enrichedItem

    } catch (error) {
      if (attempt === maxRetries - 1) {
        console.warn(`⚠️ Error enriching item ${item.id} after ${maxRetries} attempts:`, error)
        return item
      }
      // Attendre avant de réessayer
      await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 1000))
    }
  }
  
  return item
}

/**
 * Enrichit un item (wrapper pour compatibilité)
 */
export async function enrichItemWithDescription(
  item: ApiItem,
  session?: FullVintedSession
): Promise<ApiItem> {
  return enrichItemWithDescriptionWithRetry(item, session, 2) // 2 tentatives max
}

/**
 * Enrichit plusieurs items en parallèle (avec limite de concurrence réduite)
 */
export async function enrichItemsBatch(
  items: ApiItem[],
  session?: FullVintedSession,
  concurrency: number = 2 // Réduit à 2 pour éviter les 429
): Promise<ApiItem[]> {
  const enriched: ApiItem[] = []
  
  // Traiter par batch avec délais plus longs pour éviter les 429
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency)
    
    console.log(`📦 Enriching batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(items.length / concurrency)} (${batch.length} items)...`)
    
    // Traiter les items séquentiellement dans le batch pour éviter les 429
    const batchResults: ApiItem[] = []
    for (const item of batch) {
      const result = await enrichItemWithDescription(item, session)
      batchResults.push(result)
      
      // Délai entre chaque item pour éviter le rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500)) // 1-1.5s aléatoire
    }
    
    enriched.push(...batchResults)
    
    // Pause plus longue entre les batches
    if (i + concurrency < items.length) {
      const delay = 1500 + Math.random() * 1000 // 1.5-2.5s aléatoire
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  return enriched
}

