/**
 * Utilitaires pour les placeholders d'images
 * Génère des placeholders blur pour améliorer le perçu de performance
 */

/**
 * Génère un placeholder blur SVG simple
 * Utilisé comme placeholder pendant le chargement des images
 * Compatible client-side (pas de Buffer)
 */
export function generateBlurPlaceholder(width: number = 300, height: number = 300): string {
  // Créer un SVG simple avec un gradient pour le placeholder
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f3f4f6;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#e5e7eb;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" />
    </svg>
  `.trim()

  // Convertir en base64 pour l'utiliser comme data URL (compatible client-side)
  if (typeof window !== 'undefined') {
    // Client-side: utiliser btoa
    const base64 = btoa(unescape(encodeURIComponent(svg)))
    return `data:image/svg+xml;base64,${base64}`
  } else {
    // Server-side: utiliser Buffer
    const base64 = Buffer.from(svg).toString('base64')
    return `data:image/svg+xml;base64,${base64}`
  }
}

/**
 * Placeholder blur par défaut pour les images de produits
 * Format optimisé pour les images de 300x300px
 */
export const DEFAULT_BLUR_PLACEHOLDER = generateBlurPlaceholder(300, 300)

/**
 * Génère un placeholder basé sur la couleur dominante de l'image
 * (si disponible dans les métadonnées Vinted)
 * Compatible client-side
 */
export function generateColorPlaceholder(dominantColor?: string): string {
  if (!dominantColor) {
    return DEFAULT_BLUR_PLACEHOLDER
  }

  // Créer un SVG avec la couleur dominante
  const svg = `
    <svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${dominantColor};stop-opacity:0.1" />
          <stop offset="100%" style="stop-color:${dominantColor};stop-opacity:0.3" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" />
    </svg>
  `.trim()

  // Convertir en base64 (compatible client-side)
  if (typeof window !== 'undefined') {
    const base64 = btoa(unescape(encodeURIComponent(svg)))
    return `data:image/svg+xml;base64,${base64}`
  } else {
    const base64 = Buffer.from(svg).toString('base64')
    return `data:image/svg+xml;base64,${base64}`
  }
}

