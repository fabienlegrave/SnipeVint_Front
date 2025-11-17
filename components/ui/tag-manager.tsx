'use client'

import { useState, useEffect } from 'react'
import { Badge } from './badge'
import { Button } from './button'
import { Input } from './input'
import { X, Plus, Tag } from 'lucide-react'
import { useToast } from './toast'
import { logger } from '@/lib/logger'

interface ItemTag {
  tag_name: string
  color: string
}

interface TagManagerProps {
  itemId: number
  onTagsChange?: (tags: ItemTag[]) => void
}

const PREDEFINED_TAGS = [
  { name: 'À acheter', color: '#10B981' },
  { name: 'Cher', color: '#EF4444' },
  { name: 'Rare', color: '#F59E0B' },
  { name: 'Bon deal', color: '#3B82F6' },
  { name: 'À négocier', color: '#8B5CF6' },
  { name: 'Complet', color: '#06B6D4' },
  { name: 'Loose', color: '#6B7280' }
]

const API_SECRET = process.env.NEXT_PUBLIC_API_SECRET || 'vinted_scraper_secure_2024'

export function TagManager({ itemId, onTagsChange }: TagManagerProps) {
  const [tags, setTags] = useState<ItemTag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#3B82F6')
  const toast = useToast()

  // Charger les tags au montage
  useEffect(() => {
    loadTags()
  }, [itemId])

  const loadTags = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/v1/items/${itemId}/tags`, {
        headers: {
          'x-api-key': API_SECRET
        }
      })

      if (!response.ok) {
        throw new Error('Failed to load tags')
      }

      const data = await response.json()
      setTags(data.tags || [])
      onTagsChange?.(data.tags || [])
    } catch (error) {
      logger.error('Failed to load tags', error as Error)
    } finally {
      setIsLoading(false)
    }
  }

  const addTag = async (tagName: string, color: string) => {
    // Vérifier si le tag existe déjà
    if (tags.some(t => t.tag_name.toLowerCase() === tagName.toLowerCase())) {
      toast.warning('Tag already exists')
      return
    }

    setIsAdding(true)
    try {
      const response = await fetch(`/api/v1/items/${itemId}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_SECRET
        },
        body: JSON.stringify({
          tag_name: tagName,
          color: color
        })
      })

      if (!response.ok) {
        throw new Error('Failed to add tag')
      }

      toast.success(`Tag "${tagName}" added`)
      await loadTags()
      setNewTagName('')
    } catch (error) {
      logger.error('Failed to add tag', error as Error)
      toast.error('Failed to add tag')
    } finally {
      setIsAdding(false)
    }
  }

  const removeTag = async (tagName: string) => {
    try {
      const response = await fetch(`/api/v1/items/${itemId}/tags?tag_name=${encodeURIComponent(tagName)}`, {
        method: 'DELETE',
        headers: {
          'x-api-key': API_SECRET
        }
      })

      if (!response.ok) {
        throw new Error('Failed to remove tag')
      }

      toast.success(`Tag "${tagName}" removed`)
      await loadTags()
    } catch (error) {
      logger.error('Failed to remove tag', error as Error)
      toast.error('Failed to remove tag')
    }
  }

  const handlePredefinedTagClick = (tag: typeof PREDEFINED_TAGS[0]) => {
    addTag(tag.name, tag.color)
  }

  const handleCustomTagSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newTagName.trim()) {
      addTag(newTagName.trim(), newTagColor)
    }
  }

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading tags...</div>
  }

  return (
    <div className="space-y-3">
      {/* Tags existants */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge
              key={tag.tag_name}
              style={{ backgroundColor: tag.color + '20', borderColor: tag.color, color: tag.color }}
              className="flex items-center gap-1 px-2 py-1"
            >
              <Tag className="h-3 w-3" />
              {tag.tag_name}
              <button
                onClick={() => removeTag(tag.tag_name)}
                className="ml-1 hover:opacity-70"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Tags prédéfinis */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-gray-600">Quick Tags:</label>
        <div className="flex flex-wrap gap-2">
          {PREDEFINED_TAGS.map((tag) => (
            <Button
              key={tag.name}
              variant="outline"
              size="sm"
              onClick={() => handlePredefinedTagClick(tag)}
              disabled={isAdding || tags.some(t => t.tag_name.toLowerCase() === tag.name.toLowerCase())}
              className="text-xs"
              style={{ borderColor: tag.color, color: tag.color }}
            >
              <Plus className="h-3 w-3 mr-1" />
              {tag.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Tag personnalisé */}
      <form onSubmit={handleCustomTagSubmit} className="flex gap-2">
        <Input
          value={newTagName}
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="Custom tag name"
          className="flex-1 text-sm"
          maxLength={50}
          disabled={isAdding}
        />
        <input
          type="color"
          value={newTagColor}
          onChange={(e) => setNewTagColor(e.target.value)}
          className="w-10 h-10 rounded border cursor-pointer"
          disabled={isAdding}
          title="Tag color"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!newTagName.trim() || isAdding}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </form>
    </div>
  )
}

