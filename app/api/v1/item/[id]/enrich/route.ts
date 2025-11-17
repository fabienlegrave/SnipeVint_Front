import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import type { VintedPhoto } from '@/lib/types/core'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid item ID' }, { status: 400 })
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 })
    }

    // Récupérer l'item depuis la base de données
    const { data: item, error: itemError } = await supabase
      .from('vinted_items')
      .select('*')
      .eq('id', id)
      .single()

    if (itemError) {
      if (itemError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }
      console.error('Database error:', itemError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Construire l'URL de l'API Vinted pour récupérer toutes les photos
    const vintedItemUrl = `https://www.vinted.fr/items/${id}`
    
    try {
      // Faire une requête à l'API Vinted pour récupérer toutes les photos
      const response = await fetch(vintedItemUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const html = await response.text()
      
      // Extraire les données JSON depuis la page HTML
      const jsonMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*({.*?});/)
      if (!jsonMatch) {
        throw new Error('Could not find initial state in HTML')
      }

      const initialState = JSON.parse(jsonMatch[1])
      
      // Chercher les données de l'item dans l'état initial
      let itemData: any = null
      if (initialState.items && initialState.items.items) {
        itemData = Object.values(initialState.items.items).find((item: any) => item.id === id)
      }

      if (!itemData) {
        throw new Error('Item data not found in initial state')
      }

      // Extraire toutes les photos de l'item
      const photos: VintedPhoto[] = []
      
      if (itemData.photos && Array.isArray(itemData.photos)) {
        // Si l'item a plusieurs photos
        itemData.photos.forEach((photo: any) => {
          photos.push({
            id: photo.id,
            image_no: photo.image_no || 1,
            width: photo.width,
            height: photo.height,
            dominant_color: photo.dominant_color,
            dominant_color_opaque: photo.dominant_color_opaque,
            url: photo.url,
            is_main: photo.is_main || false,
            thumbnails: photo.thumbnails || [],
            high_resolution: photo.high_resolution,
            is_suspicious: photo.is_suspicious || false,
            full_size_url: photo.full_size_url,
            is_hidden: photo.is_hidden || false,
            extra: photo.extra || {}
          })
        })
      } else if (itemData.photo) {
        // Si l'item n'a qu'une seule photo (format actuel)
        const photo = itemData.photo
        photos.push({
          id: photo.id,
          image_no: photo.image_no || 1,
          width: photo.width,
          height: photo.height,
          dominant_color: photo.dominant_color,
          dominant_color_opaque: photo.dominant_color_opaque,
          url: photo.url,
          is_main: photo.is_main || true,
          thumbnails: photo.thumbnails || [],
          high_resolution: photo.high_resolution,
          is_suspicious: photo.is_suspicious || false,
          full_size_url: photo.full_size_url,
          is_hidden: photo.is_hidden || false,
          extra: photo.extra || {}
        })
      }

      // Mettre à jour l'item dans la base de données avec toutes les photos
      const { error: updateError } = await supabase
        .from('vinted_items')
        .update({
          photos_data: photos,
          enriched_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) {
        console.error('Error updating item with photos:', updateError)
        return NextResponse.json({ error: 'Failed to update item with photos' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: `Item enriched with ${photos.length} photos`,
        photos_count: photos.length,
        photos: photos
      })

    } catch (apiError) {
      console.error('Error fetching photos from Vinted API:', apiError)
      return NextResponse.json({ 
        error: 'Failed to fetch photos from Vinted API',
        details: apiError instanceof Error ? apiError.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
