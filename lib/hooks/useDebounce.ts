import { useEffect, useState, useRef } from 'react'

/**
 * Hook personnalisé pour debouncer une valeur
 * 
 * @param value - La valeur à debouncer
 * @param delay - Le délai en millisecondes (défaut: 500ms)
 * @returns La valeur debouncée
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Créer un timer qui met à jour la valeur après le délai
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Nettoyer le timer si la valeur change avant la fin du délai
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * Hook pour debouncer une fonction callback
 * 
 * @param callback - La fonction à debouncer
 * @param delay - Le délai en millisecondes (défaut: 500ms)
 * @returns La fonction debouncée
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const debouncedCallback = ((...args: Parameters<T>) => {
    // Annuler le timer précédent
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Créer un nouveau timer
    timeoutRef.current = setTimeout(() => {
      callback(...args)
      timeoutRef.current = null
    }, delay)
  }) as T

  // Nettoyer le timer au démontage
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return debouncedCallback
}

