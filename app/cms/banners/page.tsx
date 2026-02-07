'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, MoveUp, MoveDown, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Banner {
  id: string
  title: string
  subtitle: string | null
  image_url: string
  link_url: string | null
  button_text: string | null
  display_order: number
  is_active: boolean
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchBanners()
  }, [])

  const fetchBanners = async () => {
    try {
      const response = await fetch('/api/homepage')
      if (response.ok) {
        const data = await response.json()
        setBanners(data.banners || [])
      }
    } catch (error) {
      console.error('Error fetching banners:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleBanner = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/homepage/banners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      })
      if (response.ok) {
        fetchBanners()
      }
    } catch (error) {
      console.error('Error toggling banner:', error)
    }
  }

  const deleteBanner = async (id: string) => {
    if (!confirm('Are you sure you want to delete this banner?')) return
    
    try {
      const response = await fetch(`/api/homepage/banners/${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        fetchBanners()
      }
    } catch (error) {
      console.error('Error deleting banner:', error)
    }
  }

  const reorderBanner = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = banners.findIndex(b => b.id === id)
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === banners.length - 1)
    ) {
      return
    }

    const newOrder = direction === 'up' 
      ? banners[currentIndex].display_order - 1
      : banners[currentIndex].display_order + 1

    try {
      const response = await fetch(`/api/homepage/banners/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_order: newOrder }),
      })
      if (response.ok) {
        fetchBanners()
      }
    } catch (error) {
      console.error('Error reordering banner:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading banners...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Homepage Banners</h1>
          <p className="mt-2 text-gray-600">Manage carousel banners on the homepage</p>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="bg-luxury-gold text-luxury-navy hover:bg-luxury-gold/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Banner
        </Button>
      </div>

      <div className="grid gap-6">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200"
          >
            <div className="flex gap-6">
              <div className="h-32 w-48 flex-shrink-0 overflow-hidden rounded-lg">
                <img
                  src={banner.image_url}
                  alt={banner.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{banner.title}</h3>
                    {banner.subtitle && (
                      <p className="mt-1 text-sm text-gray-600">{banner.subtitle}</p>
                    )}
                    {banner.link_url && (
                      <p className="mt-2 text-xs text-gray-500">
                        Link: {banner.link_url}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      banner.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {banner.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reorderBanner(banner.id, 'up')}
                    disabled={index === 0}
                  >
                    <MoveUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => reorderBanner(banner.id, 'down')}
                    disabled={index === banners.length - 1}
                  >
                    <MoveDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingBanner(banner)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleBanner(banner.id, banner.is_active)}
                  >
                    {banner.is_active ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteBanner(banner.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {banners.length === 0 && (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
            <p className="text-gray-500">No banners found. Create your first banner to get started.</p>
          </div>
        )}
      </div>
    </div>
  )
}
