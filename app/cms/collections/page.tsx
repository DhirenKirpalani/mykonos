'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, Edit, Trash2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Collection {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  is_visible: boolean
  product_count?: number
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchCollections()
  }, [])

  const fetchCollections = async () => {
    try {
      const response = await fetch('/api/collections')
      if (response.ok) {
        const data = await response.json()
        setCollections(data)
      }
    } catch (error) {
      console.error('Error fetching collections:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleVisibility = async (collectionId: string, currentVisibility: boolean) => {
    try {
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_visible: !currentVisibility }),
      })
      if (response.ok) {
        fetchCollections()
      }
    } catch (error) {
      console.error('Error toggling visibility:', error)
    }
  }

  const deleteCollection = async (collectionId: string) => {
    if (!confirm('Are you sure you want to delete this collection?')) return
    
    try {
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        fetchCollections()
      }
    } catch (error) {
      console.error('Error deleting collection:', error)
    }
  }

  const filteredCollections = collections.filter(collection =>
    collection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    collection.slug.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading collections...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Collections</h1>
          <p className="mt-2 text-gray-600">Organize products into collections</p>
        </div>
        <Link href="/cms/collections/new">
          <Button className="bg-luxury-gold text-luxury-navy hover:bg-luxury-gold/90">
            <Plus className="mr-2 h-4 w-4" />
            Create Collection
          </Button>
        </Link>
      </div>

      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search collections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCollections.map((collection) => (
            <div
              key={collection.id}
              className="overflow-hidden rounded-lg border border-gray-200 transition-shadow hover:shadow-md"
            >
              {collection.image_url && (
                <div className="h-48 w-full overflow-hidden bg-gray-100">
                  <img
                    src={collection.image_url}
                    alt={collection.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{collection.name}</h3>
                    <p className="mt-1 text-sm text-gray-500">{collection.slug}</p>
                    {collection.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                        {collection.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`ml-2 inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      collection.is_visible
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {collection.is_visible ? 'Visible' : 'Hidden'}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                  <span className="text-sm text-gray-500">
                    {collection.product_count || 0} products
                  </span>
                  <div className="flex items-center gap-2">
                    <Link href={`/cms/collections/${collection.id}`}>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleVisibility(collection.id, collection.is_visible)}
                    >
                      {collection.is_visible ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCollection(collection.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filteredCollections.length === 0 && (
          <div className="py-12 text-center text-gray-500">
            No collections found. Create your first collection to get started.
          </div>
        )}
      </div>
    </div>
  )
}
