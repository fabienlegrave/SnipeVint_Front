'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { ToastProvider } from '@/components/ui/toast'
import { ThemeProvider } from '@/components/ui/theme-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes - données considérées fraîches pendant 5 min
        gcTime: 30 * 60 * 1000, // 30 minutes - cache gardé en mémoire pendant 30 min (anciennement cacheTime)
        refetchOnWindowFocus: false,
        refetchOnMount: false, // Ne pas refetch automatiquement au montage si les données sont fraîches
        retry: 1, // Retry une seule fois en cas d'erreur
        retryDelay: 1000, // Attendre 1 seconde avant de retry
      },
      mutations: {
        retry: 1, // Retry une seule fois pour les mutations
        retryDelay: 1000,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ToastProvider>
          {children}
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}