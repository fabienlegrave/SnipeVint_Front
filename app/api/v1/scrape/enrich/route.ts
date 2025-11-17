import { NextRequest, NextResponse } from 'next/server'
import { fetchWithRetry } from '@/lib/scrape/fetchHtml'
import { mapWithConcurrency, delay } from '@/lib/scrape/concurrency'
import { ScrapeEnrichRequest } from '@/lib/types/core'
import { mergeApiWithEnriched } from '@/lib/scrape/mergeAndPrune'

async function parseHtmlViaApi(html: string, id: number) {
  // Use server-only parser directly
  const { parseItemFromHtml } = require('@/lib/scrape/serverOnlyParser.js')
  return parseItemFromHtml(html, id)
}

// Enhanced fetch with better rate limiting for enrichment
async function fetchWithEnhancedRetry(url: string, attempt: number = 1): Promise<string> {
  const maxRetries = 5
  const baseDelay = 1000
  
  try {
    return await fetchWithRetry(url, {
      retries: 1, // Single attempt per call, we handle retries here
      backoffMs: 0,
      timeout: 15000
    })
  } catch (error: any) {
    if (error.message?.includes('HTTP 429') && attempt <= maxRetries) {
      // Exponential backoff with jitter for 429 errors
      const delay = Math.min(baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000, 10000)
      console.warn(`⚠️ HTTP 429 - Attempt ${attempt}/${maxRetries} → waiting ${Math.round(delay)}ms`)
      await new Promise(resolve => setTimeout(resolve, delay))
      return fetchWithEnhancedRetry(url, attempt + 1)
    }
    
    if (error.message?.includes('HTTP 429')) {
      throw new Error(`Rate limit exceeded after ${maxRetries} attempts`)
    }
    
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check API key
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { ids, searchResults }: ScrapeEnrichRequest = await request.json()

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Invalid ids array' }, { status: 400 })
    }

    // Create a map of search results by ID for merging
    const searchResultsMap = new Map()
    if (searchResults) {
      searchResults.forEach(item => {
        searchResultsMap.set(item.id, item)
      })
    }

    // Reduce concurrency to avoid rate limits - be more conservative
    const concurrency = Math.min(Number(process.env.ENRICH_CONCURRENCY) || 2, 2)
    const delayMs = Number(process.env.SCRAPE_DELAY_MS) || 1200

    console.log(`🔍 Enriching ${ids.length} items with conservative concurrency ${concurrency} (delay: ${delayMs}ms)`)

    const enrichedItems = await mapWithConcurrency(ids, concurrency, async (id, index) => {
      console.log(`🔍 Enriching ${index + 1}/${ids.length} → ${id}`)
      
      try {
        const url = `https://www.vinted.fr/items/${id}`
        const html = await fetchWithEnhancedRetry(url)
        const enrichedData = await parseHtmlViaApi(html, id)

        // Progressive delay - longer delays as we process more items
        const progressiveDelay = delayMs + Math.floor(Math.random() * 400)
        if (index < ids.length - 1) {
          await delay(progressiveDelay)
        }

        const baseItem = {
          id,
          url,
          ...enrichedData,
          scraped_at: new Date().toISOString()
        }

        // Merge with search result if available
        const searchResult = searchResultsMap.get(id)
        if (searchResult) {
          return mergeApiWithEnriched(searchResult, enrichedData)
        }

        return baseItem

      } catch (error: any) {
        console.warn(`⚠️ Failed to enrich item ${id}:`, error.message)
        return null
      }
    })

    const successful = enrichedItems.filter(Boolean)
    console.log(`✅ Enrichment completed: ${successful.length}/${ids.length} successful`)

    return NextResponse.json(successful)

  } catch (error: any) {
    console.error('Enrich API error:', error)
    return NextResponse.json({ 
      error: 'Enrichment failed',
      details: error.message 
    }, { status: 500 })
  }
}