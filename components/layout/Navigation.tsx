'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search, Package, Settings, Database, Sparkles, Bell, Heart, BarChart3, Bug } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ui/theme-toggle'

const navItems = [
  {
    href: '/search',
    label: 'Search',
    icon: Sparkles,
    description: 'Smart search',
    className: 'text-purple-600 hover:text-purple-700'
  },
  {
    href: '/homepage',
    label: 'Recommandations',
    icon: Search,
    description: 'Items recommandés par Vinted',
    className: 'text-green-600 hover:text-green-700'
  },
  {
    href: '/items',
    label: 'Items',
    icon: Package,
    description: 'Browse favorites'
  },
  {
    href: '/alerts',
    label: 'Alerts',
    icon: Bell,
    description: 'Price alerts'
  },
  {
    href: '/stats',
    label: 'Stats',
    icon: BarChart3,
    description: 'Statistics'
  },
  {
    href: '/debug',
    label: 'Debug',
    icon: Bug,
    description: 'API Debug'
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: Settings,
    description: 'Configuration'
  }
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm border-b border-gray-200/50 dark:border-gray-800/50 sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <Database className="h-7 w-7 text-blue-600 dark:text-blue-400 transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 bg-blue-600/10 dark:bg-blue-400/10 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              VintedScrap
            </span>
          </Link>
          
          <div className="flex items-center space-x-3">
            <ThemeToggle />
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname.startsWith(item.href)
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative",
                    isActive
                      ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 text-blue-700 dark:text-blue-300 shadow-sm"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/50",
                    item.className
                  )}
                  title={item.description}
                >
                  {typeof Icon === 'string' ? (
                    <span className="text-lg">{Icon}</span>
                  ) : (
                    <Icon className={cn("h-4 w-4 transition-transform", isActive && "scale-110")} />
                  )}
                  <span className="hidden lg:inline">{item.label}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 rounded-full" />
                  )}
                </Link>
              )
              })}
            </div>
            {/* Mobile menu button - à implémenter si nécessaire */}
          </div>
        </div>
      </div>
    </nav>
  )
}