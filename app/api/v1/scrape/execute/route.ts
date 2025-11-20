/**
 * Endpoint pour les Scraper Nodes
 * Exécute une requête de scraping
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, method = 'GET', body: requestBody, headers: customHeaders } = body
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }
    
    const region = process.env.FLY_REGION || 'unknown'
    logger.info(`🌐 Scraper Node (${region}): Scraping ${url}`)
    
    // Headers par défaut pour éviter la détection
    const defaultHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0',
    }
    
    const headers = {
      ...defaultHeaders,
      ...customHeaders,
    }
    
    // Faire la requête
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout
    
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: requestBody ? JSON.stringify(requestBody) : undefined,
        signal: controller.signal,
      })
      
      clearTimeout(timeoutId)
      
      const contentType = response.headers.get('content-type') || ''
      let data: any
      
      if (contentType.includes('application/json')) {
        data = await response.json()
      } else if (contentType.includes('text/html') || contentType.includes('text/plain')) {
        data = await response.text()
      } else {
        data = await response.arrayBuffer()
      }
      
      if (response.ok) {
        logger.info(`✅ Scraper Node (${region}): Succès (${response.status})`)
        return NextResponse.json({
          success: true,
          data,
          statusCode: response.status,
          headers: Object.fromEntries(response.headers.entries()),
        })
      } else {
        logger.warn(`⚠️ Scraper Node (${region}): Erreur ${response.status}`)
        return NextResponse.json(
          {
            success: false,
            error: `HTTP ${response.status}`,
            statusCode: response.status,
            data,
          },
          { status: response.status }
        )
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      
      if (fetchError.name === 'AbortError') {
        logger.error(`❌ Scraper Node (${region}): Timeout`)
        return NextResponse.json(
          {
            success: false,
            error: 'Request timeout',
          },
          { status: 504 }
        )
      }
      
      throw fetchError
    }
  } catch (error: any) {
    logger.error(`❌ Scraper Node (${process.env.FLY_REGION || 'unknown'}): Erreur`, error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}

