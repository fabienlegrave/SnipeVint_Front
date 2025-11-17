import { NextRequest, NextResponse } from 'next/server'
import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import { logger } from '@/lib/logger'

/**
 * GET /api/v1/debug/api-response
 * Liste les fichiers de debug des réponses API
 */
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('file')

    const debugDir = join(process.cwd(), 'search-results', 'debug')

    // Si un fichier spécifique est demandé, le retourner
    if (filename) {
      try {
        const filePath = join(debugDir, filename)
        const content = await readFile(filePath, 'utf-8')
        const data = JSON.parse(content)
        return NextResponse.json(data)
      } catch (error) {
        logger.error('Failed to read debug file', error as Error)
        return NextResponse.json({ error: 'File not found' }, { status: 404 })
      }
    }

    // Sinon, lister tous les fichiers de debug
    try {
      const files = await readdir(debugDir)
      const debugFiles = files
        .filter(f => f.endsWith('.json'))
        .sort()
        .reverse() // Plus récents en premier
        .slice(0, 20) // Limiter à 20 fichiers

      return NextResponse.json({ files: debugFiles })
    } catch (error) {
      // Le dossier n'existe pas encore
      return NextResponse.json({ files: [] })
    }
  } catch (error: unknown) {
    logger.error('API error', error as Error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

