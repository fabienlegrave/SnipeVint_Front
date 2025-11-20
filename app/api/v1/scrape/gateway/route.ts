/**
 * Gateway API endpoint
 * Route les requêtes vers le cluster de scrapers
 */

import { NextRequest, NextResponse } from 'next/server'
import { routeRequest, getClusterStats } from '@/lib/scraper/gateway'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Vérifier l'API key
    const apiKey = request.headers.get('x-api-key')
    const expectedKey = process.env.API_SECRET || process.env.NEXT_PUBLIC_API_SECRET
    
    if (!apiKey || apiKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { url, method, headers, body: requestBody } = body
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      )
    }
    
    logger.info(`🌐 Gateway: Routage de la requête vers ${url}`)
    
    const result = await routeRequest({
      url,
      method: method || 'GET',
      headers,
      body: requestBody,
    })
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        data: result.data,
        nodeUsed: result.nodeUsed,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    logger.error('Erreur dans le gateway', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Vérifier l'API key
    const apiKey = request.headers.get('x-api-key')
    const expectedKey = process.env.API_SECRET || process.env.NEXT_PUBLIC_API_SECRET
    
    if (!apiKey || apiKey !== expectedKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Récupérer les stats du cluster
    const stats = getClusterStats()
    
    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error: any) {
    logger.error('Erreur lors de la récupération des stats', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error',
      },
      { status: 500 }
    )
  }
}

