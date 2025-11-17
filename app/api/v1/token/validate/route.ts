import { NextRequest, NextResponse } from 'next/server'
import { validateVintedToken, validateCurrentToken } from '@/lib/scrape/tokenValidator'

export async function GET(request: NextRequest) {
  try {
    // Check API key
    const apiKey = request.headers.get('x-api-key')
    if (!apiKey || apiKey !== process.env.API_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🔐 Validation du token depuis l\'application...')
    
    // Valider le token actuel du store
    const validation = await validateCurrentToken()
    
    return NextResponse.json({
      ...validation,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Token validation API error:', error)
    return NextResponse.json({ 
      error: 'Validation failed',
      details: error.message 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check API key
    const apiKey = request.headers.get('x-api-key')
    console.log('🔐 Token validation POST - API key check:', { 
      provided: apiKey ? 'Present' : 'Missing',
      expected: process.env.API_SECRET ? 'Set' : 'Missing'
    })
    
    if (!apiKey || apiKey !== process.env.API_SECRET) {
      console.log('❌ API key validation failed in POST')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { token } = await request.json()
    
    if (!token) {
      return NextResponse.json({ error: 'Token required in request body' }, { status: 400 })
    }

    console.log('🔐 Validation du token fourni...')
    
    const validation = await validateVintedToken(token)
    
    return NextResponse.json({
      ...validation,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Token validation API error:', error)
    return NextResponse.json({ 
      error: 'Validation failed',
      details: error.message 
    }, { status: 500 })
  }
} 