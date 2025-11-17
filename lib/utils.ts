import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

import { VintedItem } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: number | null | undefined, currency: string = "EUR"): string {
  if (amount == null) return "N/A"
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency,
  }).format(amount)
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "N/A"
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

export function idFromUrl(url: string): number | null {
  const match = url.match(/\/items\/(\d+)/)
  return match ? Number(match[1]) : null
}