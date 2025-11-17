'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Package } from 'lucide-react'

interface ImageWithFallbackProps {
  src: string | undefined
  alt: string
  width?: number
  height?: number
  className?: string
  title?: string
}

export function ImageWithFallback({
  src,
  alt,
  width = 300,
  height = 300,
  className = '',
  title
}: ImageWithFallbackProps) {
  const [imgSrc, setImgSrc] = useState(src)
  const [hasError, setHasError] = useState(false)

  // Fallback placeholder
  const PlaceholderDiv = () => (
    <div 
      className={`${className} flex items-center justify-center bg-gray-100 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg`}
      style={{ width: width, height: height }}
      title={title || alt}
    >
      <div className="text-center">
        <Package size={48} className="mx-auto mb-2" />
        <p className="text-sm font-medium">Image non disponible</p>
        {title && <p className="text-xs">{title}</p>}
      </div>
    </div>
  )

  // Si pas de src ou erreur, afficher le placeholder
  if (!imgSrc || hasError) {
    return <PlaceholderDiv />
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      title={title}
      onError={() => {
        console.warn(`Failed to load image: ${imgSrc}`)
        setHasError(true)
      }}
      onLoad={() => setHasError(false)}
    />
  )
} 