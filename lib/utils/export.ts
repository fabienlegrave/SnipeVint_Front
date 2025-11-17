/**
 * Utilitaires pour exporter les données
 * Support CSV et JSON
 */

import type { VintedItem } from '../types'

/**
 * Convertit un tableau d'items en CSV
 */
export function exportToCSV(items: VintedItem[]): string {
  if (items.length === 0) {
    return ''
  }

  // En-têtes CSV
  const headers = [
    'ID',
    'Title',
    'Price (€)',
    'Total Price (€)',
    'Condition',
    'Platform',
    'URL',
    'Can Buy',
    'Is Reserved',
    'View Count',
    'Favorite Count',
    'Added Since',
    'Description'
  ]

  // Lignes de données
  const rows = items.map(item => {
    const description = (item.description || '').replace(/"/g, '""').replace(/\n/g, ' ')
    return [
      item.id,
      `"${(item.title || '').replace(/"/g, '""')}"`,
      item.price_amount || '',
      item.total_item_price_amount || '',
      item.condition || '',
      item.brand_title || '',
      item.url,
      item.can_buy ? 'Yes' : 'No',
      item.is_reserved ? 'Yes' : 'No',
      item.view_count || 0,
      item.favourite_count || 0,
      item.added_since || '',
      `"${description}"`
    ].join(',')
  })

  // Combiner en-têtes et lignes
  return [headers.join(','), ...rows].join('\n')
}

/**
 * Télécharge un fichier CSV
 */
export function downloadCSV(items: VintedItem[], filename: string = 'favorites.csv'): void {
  const csv = exportToCSV(items)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Convertit un tableau d'items en JSON formaté
 */
export function exportToJSON(items: VintedItem[]): string {
  return JSON.stringify(items, null, 2)
}

/**
 * Télécharge un fichier JSON
 */
export function downloadJSON(items: VintedItem[], filename: string = 'favorites.json'): void {
  const json = exportToJSON(items)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Génère un nom de fichier avec timestamp
 */
export function generateExportFilename(prefix: string = 'favorites', extension: string = 'csv'): string {
  const date = new Date()
  const timestamp = date.toISOString().replace(/[:.]/g, '-').slice(0, -5)
  return `${prefix}_${timestamp}.${extension}`
}

