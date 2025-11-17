/**
 * Utilitaires pour la gestion des images Vinted
 */

import { VintedPhoto, VintedThumbnail } from '@/lib/types/core'

/**
 * Trouve la meilleure taille de thumbnail pour un affichage donné
 * Priorise les thumbnails avec original_size: true
 */
export function getBestThumbnail(
  photo: VintedPhoto | undefined,
  minWidth: number = 300,
  preferOriginal: boolean = true
): string | null {
  if (!photo) return null

  // Si on préfère l'original et qu'il existe
  if (preferOriginal && photo.full_size_url) {
    return photo.full_size_url
  }

  // Chercher un thumbnail avec original_size: true qui correspond
  if (preferOriginal) {
    const originalThumb = photo.thumbnails.find(
      (thumb) => thumb.original_size === true && thumb.width >= minWidth
    )
    if (originalThumb) return originalThumb.url
  }

  // Chercher le thumbnail le plus proche de la taille désirée
  const suitableThumbs = photo.thumbnails.filter(
    (thumb) => thumb.width >= minWidth
  )

  if (suitableThumbs.length > 0) {
    // Trier par taille croissante et prendre le plus petit qui dépasse minWidth
    suitableThumbs.sort((a, b) => a.width - b.width)
    return suitableThumbs[0].url
  }

  // Fallback sur l'URL principale
  return photo.url || null
}

/**
 * Trouve le thumbnail le plus adapté pour un avatar (petite taille)
 */
export function getAvatarThumbnail(
  photo: VintedPhoto | undefined
): string | null {
  if (!photo) return null

  // Prioriser thumb50 ou thumb100 pour les avatars
  const avatarThumb = photo.thumbnails.find(
    (thumb) => thumb.type === 'thumb50' || thumb.type === 'thumb100'
  )

  if (avatarThumb) return avatarThumb.url

  // Sinon prendre le plus petit disponible
  if (photo.thumbnails.length > 0) {
    const sorted = [...photo.thumbnails].sort((a, b) => a.width - b.width)
    return sorted[0].url
  }

  return photo.url || null
}

/**
 * Obtient la couleur dominante pour un placeholder
 */
export function getDominantColor(photo: VintedPhoto | undefined): string | null {
  return photo?.dominant_color || null
}

/**
 * Obtient la couleur dominante opaque pour un placeholder
 */
export function getDominantColorOpaque(
  photo: VintedPhoto | undefined
): string | null {
  return photo?.dominant_color_opaque || null
}

