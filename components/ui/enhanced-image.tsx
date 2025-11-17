'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Package } from 'lucide-react'
import { VintedPhoto } from '@/lib/types'

interface EnhancedImageProps {
  photo?: VintedPhoto
  fallbackSrc?: string
  alt: string
  width?: number
  height?: number
  className?: string
  title?: string
  showThumbnails?: boolean
  priority?: boolean
}

export function EnhancedImage({
  photo,
  fallbackSrc,
  alt,
  width = 300,
  height = 300,
  className = '',
  title,
  showThumbnails = false,
  priority = false
}: EnhancedImageProps) {
  const [hasError, setHasError] = useState(false)

  // Fonction pour choisir la meilleure taille d'image
  const getBestImageUrl = (photo: VintedPhoto, targetWidth: number): string => {
    if (!photo.thumbnails || photo.thumbnails.length === 0) {
      return photo.full_size_url || photo.url
    }

    // Trier les thumbnails par largeur
    const sortedThumbnails = [...photo.thumbnails].sort((a, b) => a.width - b.width)
    
    // Trouver le thumbnail le plus proche de la taille cible
    let bestThumbnail = sortedThumbnails[0]
    for (const thumbnail of sortedThumbnails) {
      if (thumbnail.width >= targetWidth) {
        bestThumbnail = thumbnail
        break
      }
      bestThumbnail = thumbnail
    }

    return bestThumbnail.url
  }

  // Placeholder avec couleur dominante si disponible
  const PlaceholderDiv = () => (
    <div 
      className={`${className} flex items-center justify-center border-2 border-dashed border-gray-200 rounded-lg`}
      style={{ 
        width: width, 
        height: height,
        backgroundColor: photo?.dominant_color_opaque || '#f3f4f6'
      }}
      title={title || alt}
    >
      <div className="text-center">
        <Package size={48} className="mx-auto mb-2 text-gray-400" />
        <p className="text-sm font-medium text-gray-600">Image non disponible</p>
        {title && <p className="text-xs text-gray-500">{title}</p>}
      </div>
    </div>
  )

  // Si pas de photo et pas de fallback, afficher le placeholder
  if (!photo && !fallbackSrc) {
    return <PlaceholderDiv />
  }

  // Si erreur, afficher le placeholder
  if (hasError) {
    return <PlaceholderDiv />
  }

  // Déterminer l'URL à utiliser
  const imageUrl = photo 
    ? getBestImageUrl(photo, width)
    : fallbackSrc

  if (!imageUrl) {
    return <PlaceholderDiv />
  }

  return (
    <div className="relative">
      {/* Image principale avec couleur de fond dominante */}
      <div 
        className="relative overflow-hidden rounded-lg"
        style={{ 
          backgroundColor: photo?.dominant_color_opaque || '#f3f4f6',
          width: width,
          height: height
        }}
      >
        <Image
          src={imageUrl}
          alt={alt}
          width={width}
          height={height}
          className={`${className} transition-opacity duration-300`}
          title={title}
          priority={priority}
          onError={() => {
            console.warn(`Failed to load image: ${imageUrl}`)
            setHasError(true)
          }}
          onLoad={() => setHasError(false)}
        />
        
        {/* Indicateur de qualité d'image */}
        {photo && (
          <div className="absolute bottom-1 right-1">
            {photo.high_resolution && (
              <div className="bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                HD
              </div>
            )}
          </div>
        )}
      </div>

      {/* Thumbnails additionnels si demandés */}
      {showThumbnails && photo?.thumbnails && photo.thumbnails.length > 1 && (
        <div className="mt-2 flex gap-1 overflow-x-auto">
          {photo.thumbnails
            .filter(thumb => thumb.type !== 'thumb20') // Exclure les très petites images
            .slice(0, 4)
            .map((thumbnail, index) => (
              <div
                key={`${thumbnail.type}-${index}`}
                className="relative flex-shrink-0 w-12 h-12 bg-gray-100 rounded overflow-hidden"
                title={`${thumbnail.width}x${thumbnail.height}`}
              >
                <Image
                  src={thumbnail.url}
                  alt={`${alt} - thumbnail ${index + 1}`}
                  width={48}
                  height={48}
                  className="object-cover"
                />
              </div>
            ))}
        </div>
      )}

      {/* Métadonnées de debug (optionnel) */}
      {process.env.NODE_ENV === 'development' && photo && (
        <div className="mt-1 text-xs text-gray-500">
          {photo.width}x{photo.height} • {photo.thumbnails?.length || 0} thumbnails
          {photo.dominant_color && (
            <span className="ml-2">
              • <span 
                className="inline-block w-3 h-3 rounded border" 
                style={{ backgroundColor: photo.dominant_color }}
              ></span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// Composant pour afficher une galerie de photos
interface PhotoGalleryProps {
  photos?: VintedPhoto[]
  fallbackImages?: string[]
  alt: string
  className?: string
}

export function PhotoGallery({ 
  photos, 
  fallbackImages, 
  alt, 
  className = '' 
}: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  
  // Combiner photos enrichies et images de fallback
  const allImages = [
    ...(photos || []),
    ...(fallbackImages || []).map((url, index) => ({
      id: -index - 1,
      url,
      width: 400,
      height: 400,
      thumbnails: [],
      is_main: index === 0
    } as VintedPhoto))
  ]

  if (allImages.length === 0) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 rounded-lg h-64`}>
        <div className="text-center">
          <Package size={48} className="mx-auto mb-2 text-gray-400" />
          <p className="text-sm font-medium text-gray-600">Aucune image disponible</p>
        </div>
      </div>
    )
  }

  const selectedPhoto = allImages[selectedIndex]

  return (
    <div className={`${className} flex flex-col`}>
      {/* Image principale */}
      <div className="flex-1 min-h-0 relative">
        <EnhancedImage
          photo={selectedPhoto}
          alt={alt}
          width={300}
          height={192}
          className="w-full h-full object-cover"
          priority={selectedIndex === 0}
        />
      </div>

      {/* Miniatures pour navigation (absolues en bas) */}
      {allImages.length > 1 && (
        <div className="absolute bottom-2 left-2 right-2 flex gap-1.5 z-10">
          {allImages.slice(0, 4).map((photo, index) => (
            <button
              key={photo.id}
              onClick={() => setSelectedIndex(index)}
              className={`relative w-12 h-12 bg-white/90 backdrop-blur-sm rounded overflow-hidden border-2 transition-all ${
                selectedIndex === index ? 'border-blue-500 scale-110' : 'border-white/50 hover:border-white'
              }`}
            >
              <EnhancedImage
                photo={photo}
                alt={`${alt} ${index + 1}`}
                width={48}
                height={48}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
          {allImages.length > 4 && (
            <div className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded flex items-center justify-center border-2 border-white/50">
              <span className="text-xs font-medium text-gray-700">+{allImages.length - 4}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 