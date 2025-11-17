'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Button } from './button'
import { Badge } from './badge'
import { X, ExternalLink, Trophy, Euro, Package, User, Eye, Heart, CheckCircle2, XCircle } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import type { VintedItem } from '@/lib/types'
import Image from 'next/image'
import Link from 'next/link'

interface ItemComparisonProps {
  items: VintedItem[]
  onClose: () => void
}

export function ItemComparison({ items, onClose }: ItemComparisonProps) {
  if (items.length === 0) {
    return null
  }

  // Calculer le meilleur deal
  const calculateBestDeal = () => {
    if (items.length === 0) return null

    // Score basé sur prix total, condition, disponibilité
    const scored = items.map(item => {
      let score = 0
      
      // Prix total (plus bas = mieux)
      const totalPrice = item.total_item_price_amount || item.price_amount || Infinity
      const minPrice = Math.min(...items.map(i => i.total_item_price_amount || i.price_amount || Infinity))
      score += (minPrice / totalPrice) * 50 // 50 points max pour le prix
      
      // Condition (neuf = mieux)
      if (item.condition?.toLowerCase().includes('new') || item.condition?.toLowerCase().includes('neuf')) {
        score += 20
      } else if (item.condition?.toLowerCase().includes('good') || item.condition?.toLowerCase().includes('bon')) {
        score += 10
      }
      
      // Disponibilité
      if (item.can_buy && !item.is_reserved) {
        score += 15
      } else if (item.is_reserved) {
        score -= 10
      }
      
      // Popularité (favoris)
      score += Math.min((item.favourite_count || 0) / 10, 10) // Max 10 points
      
      // Vendeur pro (peut être moins fiable)
      if (item.seller_is_business) {
        score -= 5
      }
      
      return { item, score, totalPrice }
    })

    return scored.sort((a, b) => b.score - a.score)[0]
  }

  const bestDeal = calculateBestDeal()

  const getComparisonValue = (item: VintedItem, field: keyof VintedItem) => {
    return item[field] ?? 'N/A'
  }

  const formatCondition = (condition: string | null | undefined) => {
    if (!condition) return 'N/A'
    return condition
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Compare Items ({items.length})
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Best Deal Banner */}
            {bestDeal && (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
                <Trophy className="h-6 w-6 text-yellow-600" />
                <div className="flex-1">
                  <p className="font-semibold text-yellow-900">Best Deal</p>
                  <p className="text-sm text-yellow-700">
                    {bestDeal.item.title} - Score: {bestDeal.score.toFixed(1)}/100
                  </p>
                </div>
                <Badge className="bg-yellow-600">Recommended</Badge>
              </div>
            )}

            {/* Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold">Image</th>
                    {items.map((item, idx) => (
                      <th key={item.id} className="text-center p-3 font-semibold min-w-[200px]">
                        {bestDeal?.item.id === item.id && (
                          <Trophy className="h-4 w-4 text-yellow-600 mx-auto mb-1" />
                        )}
                        <div className="line-clamp-2 text-sm">{item.title || 'No title'}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Images */}
                  <tr className="border-b">
                    <td className="p-3 font-medium">Image</td>
                    {items.map((item) => (
                      <td key={item.id} className="p-3 text-center">
                        <div className="relative w-24 h-24 mx-auto">
                          <Image
                            src={item.images?.[0] || '/placeholder.png'}
                            alt={item.title || 'Item'}
                            fill
                            className="object-cover rounded"
                          />
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Price */}
                  <tr className="border-b bg-gray-50">
                    <td className="p-3 font-medium flex items-center gap-2">
                      <Euro className="h-4 w-4" />
                      Price
                    </td>
                    {items.map((item) => {
                      const totalPrice = item.total_item_price_amount || item.price_amount
                      const isBest = bestDeal?.item.id === item.id && bestDeal.totalPrice === totalPrice
                      return (
                        <td key={item.id} className={`p-3 text-center ${isBest ? 'bg-yellow-50 font-semibold' : ''}`}>
                          <div className="space-y-1">
                            <div className="text-lg font-bold text-blue-600">
                              {formatPrice(item.price_amount, item.price_currency)}
                            </div>
                            {item.total_item_price_amount && item.total_item_price_amount !== item.price_amount && (
                              <div className="text-xs text-gray-500">
                                Total: {formatPrice(item.total_item_price_amount, item.total_item_price_currency || 'EUR')}
                              </div>
                            )}
                          </div>
                        </td>
                      )
                    })}
                  </tr>

                  {/* Condition */}
                  <tr className="border-b">
                    <td className="p-3 font-medium">Condition</td>
                    {items.map((item) => (
                      <td key={item.id} className="p-3 text-center">
                        <Badge variant="outline">
                          {formatCondition(item.condition)}
                        </Badge>
                      </td>
                    ))}
                  </tr>

                  {/* Availability */}
                  <tr className="border-b bg-gray-50">
                    <td className="p-3 font-medium">Availability</td>
                    {items.map((item) => (
                      <td key={item.id} className="p-3 text-center">
                        {item.can_buy && !item.is_reserved ? (
                          <Badge className="bg-green-600 flex items-center gap-1 justify-center">
                            <CheckCircle2 className="h-3 w-3" />
                            Available
                          </Badge>
                        ) : item.is_reserved ? (
                          <Badge className="bg-red-600 flex items-center gap-1 justify-center">
                            <XCircle className="h-3 w-3" />
                            Reserved
                          </Badge>
                        ) : (
                          <Badge variant="outline">N/A</Badge>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Seller */}
                  <tr className="border-b">
                    <td className="p-3 font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Seller
                    </td>
                    {items.map((item) => (
                      <td key={item.id} className="p-3 text-center">
                        <div className="space-y-1">
                          <div className="text-sm">{item.seller_login || 'N/A'}</div>
                          {item.seller_is_business && (
                            <Badge variant="outline" className="text-xs">PRO</Badge>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Engagement */}
                  <tr className="border-b bg-gray-50">
                    <td className="p-3 font-medium">Engagement</td>
                    {items.map((item) => (
                      <td key={item.id} className="p-3 text-center">
                        <div className="flex items-center justify-center gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <Eye className="h-4 w-4 text-gray-500" />
                            {item.view_count || 0}
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="h-4 w-4 text-red-500" />
                            {item.favourite_count || 0}
                          </div>
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Actions */}
                  <tr className="border-b">
                    <td className="p-3 font-medium">Actions</td>
                    {items.map((item) => (
                      <td key={item.id} className="p-3 text-center">
                        <div className="flex gap-2 justify-center">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/items/${item.id}`}>
                              Details
                            </Link>
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <a href={item.url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

