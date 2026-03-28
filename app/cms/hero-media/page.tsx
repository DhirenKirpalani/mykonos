'use client'

import { useState, useEffect } from 'react'
import { Upload, GripVertical, Trash2, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface HeroMedia {
  id: string
  media_type: 'video' | 'image'
  media_url: string
  mobile_media_url: string | null
  link_url: string | null
  title: string | null
  subtitle: string | null
  show_button: boolean
  button_text: string
  overlay_opacity: number
  sort_order: number
  is_active: boolean
  created_at: string
}

interface HeroItemProps {
  item: HeroMedia
  onUpdate: (id: string, updates: Partial<HeroMedia>) => void
  onDelete: (id: string) => void
  onToggleExpand: (id: string) => void
  isExpanded: boolean
}

function HeroItem({ item, onUpdate, onDelete, onToggleExpand, isExpanded }: HeroItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const [localItem, setLocalItem] = useState(item)
  const [uploadingDesktop, setUploadingDesktop] = useState(false)
  const [uploadingMobile, setUploadingMobile] = useState(false)

  useEffect(() => {
    setLocalItem(item)
  }, [item])

  const handleFileUpload = async (file: File, isMobile: boolean) => {
    const isVideo = file.type.startsWith('video/')
    const isImage = file.type.startsWith('image/')

    if (!isVideo && !isImage) {
      toast.error('Please upload a video or image file')
      return
    }

    if (isMobile) setUploadingMobile(true)
    else setUploadingDesktop(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Authentication required')
        return
      }

      const fileExt = file.name.split('.').pop()
      const fileName = `hero-${Date.now()}-${isMobile ? 'mobile' : 'desktop'}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('hero-media')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('hero-media')
        .getPublicUrl(fileName)

      const updates: Partial<HeroMedia> = isMobile 
        ? { mobile_media_url: publicUrl }
        : { media_url: publicUrl, media_type: (isVideo ? 'video' : 'image') as 'video' | 'image' }

      setLocalItem(prev => ({ ...prev, ...updates as any }))
      onUpdate(item.id, updates)
      toast.success(`${isMobile ? 'Mobile' : 'Desktop'} media uploaded successfully`)
    } catch (error) {
      console.error('Error uploading media:', error)
      toast.error('Failed to upload media')
    } finally {
      if (isMobile) setUploadingMobile(false)
      else setUploadingDesktop(false)
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <div className="flex-1 flex items-center gap-3">
          <div className="flex-shrink-0 w-24 h-16 rounded overflow-hidden bg-gray-100">
            {item.media_type === 'video' ? (
              <video src={item.media_url} className="w-full h-full object-cover" />
            ) : (
              <img src={item.media_url} alt="" className="w-full h-full object-cover" />
            )}
          </div>
          <div className="flex-1">
            <div className="font-medium text-gray-900">Hero Item #{item.sort_order + 1}</div>
            <div className="text-sm text-gray-500">
              {item.media_type === 'video' ? 'Video' : 'Image'} • 
              {item.mobile_media_url ? ' Desktop + Mobile' : ' Desktop only'}
            </div>
          </div>
        </div>

        <button
          onClick={() => onUpdate(item.id, { is_active: !item.is_active })}
          className={`p-2 rounded-lg transition-colors ${
            item.is_active 
              ? 'bg-green-50 text-green-600 hover:bg-green-100' 
              : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
          }`}
          title={item.is_active ? 'Active' : 'Inactive'}
        >
          {item.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>

        <button
          onClick={() => onToggleExpand(item.id)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        <button
          onClick={() => onDelete(item.id)}
          className="p-2 rounded-lg hover:bg-red-50 text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Media Upload Section */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Desktop Media (Required)
              </label>
              <div className="space-y-2">
                <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300">
                  {item.media_type === 'video' ? (
                    <video src={item.media_url} className="w-full h-full object-cover" controls />
                  ) : (
                    <img src={item.media_url} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <input
                  type="file"
                  accept="video/*,image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], false)}
                  disabled={uploadingDesktop}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-luxury-gold file:text-luxury-navy hover:file:bg-luxury-gold/90"
                />
                <p className="text-xs text-gray-500">Recommended: 1920×800 (landscape)</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mobile Media (Optional)
              </label>
              <div className="space-y-2">
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300">
                  {localItem.mobile_media_url ? (
                    item.media_type === 'video' ? (
                      <video src={localItem.mobile_media_url} className="w-full h-full object-cover" controls />
                    ) : (
                      <img src={localItem.mobile_media_url} alt="" className="w-full h-full object-cover" />
                    )
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                      No mobile media<br />Uses desktop fallback
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="video/*,image/*"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], true)}
                  disabled={uploadingMobile}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-luxury-gold file:text-luxury-navy hover:file:bg-luxury-gold/90"
                />
                <p className="text-xs text-gray-500">Recommended: 1080×1350 (portrait)</p>
              </div>
            </div>
          </div>

          {/* Content Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title (Optional)</label>
              <input
                type="text"
                value={localItem.title || ''}
                onChange={(e) => setLocalItem(prev => ({ ...prev, title: e.target.value }))}
                onBlur={() => onUpdate(item.id, { title: localItem.title })}
                placeholder="New Collection"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Subtitle (Optional)</label>
              <input
                type="text"
                value={localItem.subtitle || ''}
                onChange={(e) => setLocalItem(prev => ({ ...prev, subtitle: e.target.value }))}
                onBlur={() => onUpdate(item.id, { subtitle: localItem.subtitle })}
                placeholder="Discover our latest fragrances"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
              />
            </div>
          </div>

          {/* CTA Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Link URL</label>
              <input
                type="url"
                value={localItem.link_url || ''}
                onChange={(e) => setLocalItem(prev => ({ ...prev, link_url: e.target.value }))}
                onBlur={() => onUpdate(item.id, { link_url: localItem.link_url })}
                placeholder="https://example.com/products/featured"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
              />
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`show-button-${item.id}`}
                  checked={localItem.show_button}
                  onChange={(e) => {
                    setLocalItem(prev => ({ ...prev, show_button: e.target.checked }))
                    onUpdate(item.id, { show_button: e.target.checked })
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold"
                />
                <label htmlFor={`show-button-${item.id}`} className="text-sm font-medium text-gray-700">
                  Show Button
                </label>
              </div>

              {localItem.show_button && (
                <div className="flex-1">
                  <input
                    type="text"
                    value={localItem.button_text}
                    onChange={(e) => setLocalItem(prev => ({ ...prev, button_text: e.target.value }))}
                    onBlur={() => onUpdate(item.id, { button_text: localItem.button_text })}
                    placeholder="Shop Now"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Overlay Opacity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overlay Opacity: {localItem.overlay_opacity}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={localItem.overlay_opacity}
              onChange={(e) => {
                const value = parseInt(e.target.value)
                setLocalItem(prev => ({ ...prev, overlay_opacity: value }))
              }}
              onMouseUp={() => onUpdate(item.id, { overlay_opacity: localItem.overlay_opacity })}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">Dark overlay for better text readability</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function HeroMediaPage() {
  const [heroItems, setHeroItems] = useState<HeroMedia[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingBulk, setUploadingBulk] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    fetchHeroItems()
  }, [])

  const fetchHeroItems = async () => {
    try {
      const { data, error } = await supabase
        .from('hero_media')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) throw error
      setHeroItems(data || [])
    } catch (error) {
      console.error('Error fetching hero items:', error)
      toast.error('Failed to load hero items')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingBulk(true)
    setUploadProgress({ current: 0, total: files.length })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Authentication required')
        return
      }

      let successCount = 0
      let failCount = 0

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        setUploadProgress({ current: i + 1, total: files.length })
        
        const isVideo = file.type.startsWith('video/')
        const isImage = file.type.startsWith('image/')

        if (!isVideo && !isImage) {
          failCount++
          continue
        }

        try {
          const fileExt = file.name.split('.').pop()
          const fileName = `hero-${Date.now()}-${i}.${fileExt}`

          const { error: uploadError } = await supabase.storage
            .from('hero-media')
            .upload(fileName, file)

          if (uploadError) throw uploadError

          const { data: { publicUrl } } = supabase.storage
            .from('hero-media')
            .getPublicUrl(fileName)

          const response = await fetch('/api/admin/hero-media', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              media_type: isVideo ? 'video' : 'image',
              media_url: publicUrl,
            })
          })

          if (!response.ok) throw new Error('Failed to add hero media')
          successCount++
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error)
          failCount++
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} file${successCount > 1 ? 's' : ''}`)
      }
      if (failCount > 0) {
        toast.error(`Failed to upload ${failCount} file${failCount > 1 ? 's' : ''}`)
      }

      fetchHeroItems()
      e.target.value = ''
    } catch (error) {
      console.error('Error uploading hero media:', error)
      toast.error('Failed to upload hero media')
    } finally {
      setUploadingBulk(false)
      setUploadProgress({ current: 0, total: 0 })
    }
  }

  const handleUpdate = async (id: string, updates: Partial<HeroMedia>) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Authentication required')
        return
      }

      const response = await fetch('/api/admin/hero-media', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ id, ...updates })
      })

      if (!response.ok) throw new Error('Failed to update hero media')

      setHeroItems(prev => prev.map(item => 
        item.id === id ? { ...item, ...updates } : item
      ))
    } catch (error) {
      console.error('Error updating hero item:', error)
      toast.error('Failed to update hero item')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('hero_media')
        .delete()
        .eq('id', id)

      if (error) throw error

      setHeroItems(prev => prev.filter(item => item.id !== id))
      toast.success('Hero item deleted')
    } catch (error) {
      console.error('Error deleting hero item:', error)
      toast.error('Failed to delete hero item')
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over || active.id === over.id) return

    const oldIndex = heroItems.findIndex(item => item.id === active.id)
    const newIndex = heroItems.findIndex(item => item.id === over.id)

    const newItems = arrayMove(heroItems, oldIndex, newIndex)
    
    // Update sort_order for all items
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      sort_order: index
    }))

    setHeroItems(updatedItems)

    // Update in database
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      for (const item of updatedItems) {
        await fetch('/api/admin/hero-media', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ id: item.id, sort_order: item.sort_order })
        })
      }

      toast.success('Order updated')
    } catch (error) {
      console.error('Error updating order:', error)
      toast.error('Failed to update order')
      fetchHeroItems() // Revert on error
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Hero Media Management</h1>
          <p className="mt-2 text-gray-600">Manage carousel slides with desktop and mobile media</p>
        </div>
      </div>

      {/* Bulk Upload */}
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="flex items-center gap-4">
          <Upload className="h-5 w-5 text-gray-400" />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bulk Upload Media
            </label>
            <input
              type="file"
              accept="video/*,image/*"
              multiple
              onChange={handleBulkUpload}
              disabled={uploadingBulk}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-luxury-gold file:text-luxury-navy hover:file:bg-luxury-gold/90 disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-gray-500">
              Select multiple images/videos to create hero items. Edit each item below to add mobile versions and configure settings.
            </p>
            
            {/* Upload Progress */}
            {uploadingBulk && uploadProgress.total > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Uploading {uploadProgress.current} of {uploadProgress.total} files...
                  </span>
                  <span className="text-sm text-gray-500">
                    {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-luxury-gold h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hero Items List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Hero Items ({heroItems.length})
          </h2>
          <div className="text-sm text-gray-500">
            Drag to reorder • Click to expand/edit
          </div>
        </div>

        {heroItems.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-semibold text-gray-900">No hero items</h3>
            <p className="mt-1 text-sm text-gray-500">Upload media files to get started</p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={heroItems.map(item => item.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {heroItems.map((item) => (
                  <HeroItem
                    key={item.id}
                    item={item}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    onToggleExpand={toggleExpand}
                    isExpanded={expandedItems.has(item.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  )
}
