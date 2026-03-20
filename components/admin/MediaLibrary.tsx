'use client'

import { useState, useEffect } from 'react'
import { X, Trash2, ExternalLink, Image as ImageIcon, Video, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface MediaItem {
  url: string
  type: 'image' | 'video'
  selected?: boolean
}

interface MediaLibraryProps {
  entityType: 'product' | 'collection'
  entityId: string
  imageUrls?: string[]
  videoUrls?: string[]
  onUpdate?: (imageUrls: string[], videoUrls: string[]) => void
  maxImages?: number
  maxVideos?: number
}

export function MediaLibrary({
  entityType,
  entityId,
  imageUrls = [],
  videoUrls = [],
  onUpdate,
  maxImages = 10,
  maxVideos = 5,
}: MediaLibraryProps) {
  const [images, setImages] = useState<string[]>(imageUrls)
  const [videos, setVideos] = useState<string[]>(videoUrls)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setImages(imageUrls)
    setVideos(videoUrls)
  }, [imageUrls, videoUrls])

  const toggleSelection = (url: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(url)) {
        newSet.delete(url)
      } else {
        newSet.add(url)
      }
      return newSet
    })
  }

  const selectAll = () => {
    setSelectedItems(new Set([...images, ...videos]))
  }

  const clearSelection = () => {
    setSelectedItems(new Set())
  }

  const handleDelete = async () => {
    if (selectedItems.size === 0) return

    setDeleting(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Authentication required')
        return
      }

      // Separate images and videos to delete
      const imagesToDelete = images.filter((url) => selectedItems.has(url))
      const videosToDelete = videos.filter((url) => selectedItems.has(url))

      // Update database
      const newImages = images.filter((url) => !selectedItems.has(url))
      const newVideos = videos.filter((url) => !selectedItems.has(url))

      if (entityType === 'product') {
        const { error } = await supabase
          .from('products')
          .update({
            image_urls: newImages,
            video_urls: newVideos,
          })
          .eq('id', entityId)

        if (error) throw error
      } else if (entityType === 'collection') {
        // For collections, update the main image if it's being deleted
        if (imagesToDelete.length > 0) {
          const { error } = await supabase
            .from('collections')
            .update({
              image_url: newImages[0] || null,
            })
            .eq('id', entityId)

          if (error) throw error
        }
      }

      // Delete from storage (optional - files can remain in storage)
      // You may want to implement a cleanup job instead
      const filesToDelete = [...imagesToDelete, ...videosToDelete].map((url) => {
        const urlObj = new URL(url)
        const path = urlObj.pathname.split('/product-media/')[1]
        return path
      }).filter(Boolean)

      if (filesToDelete.length > 0) {
        await supabase.storage
          .from('product-media')
          .remove(filesToDelete)
      }

      // Update local state
      setImages(newImages)
      setVideos(newVideos)
      setSelectedItems(new Set())
      setDeleteDialogOpen(false)

      toast.success(`Deleted ${selectedItems.size} item(s)`)

      // Notify parent
      if (onUpdate) {
        onUpdate(newImages, newVideos)
      }
    } catch (error: any) {
      console.error('Delete error:', error)
      toast.error(error.message || 'Failed to delete media')
    } finally {
      setDeleting(false)
    }
  }

  const reorderMedia = async (type: 'image' | 'video', fromIndex: number, toIndex: number) => {
    const items = type === 'image' ? [...images] : [...videos]
    const [removed] = items.splice(fromIndex, 1)
    items.splice(toIndex, 0, removed)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Authentication required')
        return
      }

      if (entityType === 'product') {
        const updateData = type === 'image' 
          ? { image_urls: items }
          : { video_urls: items }

        const { error } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', entityId)

        if (error) throw error
      }

      if (type === 'image') {
        setImages(items)
      } else {
        setVideos(items)
      }

      toast.success('Order updated')

      if (onUpdate) {
        onUpdate(type === 'image' ? items : images, type === 'video' ? items : videos)
      }
    } catch (error: any) {
      console.error('Reorder error:', error)
      toast.error('Failed to update order')
    }
  }

  const allMedia = [
    ...images.map((url) => ({ url, type: 'image' as const })),
    ...videos.map((url) => ({ url, type: 'video' as const })),
  ]

  return (
    <div className="space-y-4">
      {/* Actions Bar */}
      {allMedia.length > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">
              {selectedItems.size > 0 ? `${selectedItems.size} selected` : `${allMedia.length} items`}
            </span>
            {selectedItems.size > 0 && (
              <Button
                type="button"
                onClick={clearSelection}
                variant="ghost"
                size="sm"
              >
                Clear
              </Button>
            )}
            {selectedItems.size === 0 && allMedia.length > 0 && (
              <Button
                type="button"
                onClick={selectAll}
                variant="ghost"
                size="sm"
              >
                Select All
              </Button>
            )}
          </div>

          {selectedItems.size > 0 && (
            <Button
              type="button"
              onClick={() => setDeleteDialogOpen(true)}
              variant="destructive"
              size="sm"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Selected
            </Button>
          )}
        </div>
      )}

      {/* Media Grid */}
      {allMedia.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
          <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">No media uploaded yet</p>
          <p className="text-xs text-gray-500">Upload images and videos to get started</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {allMedia.map((item, index) => {
            const isSelected = selectedItems.has(item.url)
            
            return (
              <div
                key={item.url}
                className={`group relative overflow-hidden rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-luxury-gold ring-2 ring-luxury-gold/20'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Media Preview */}
                <div className="relative aspect-square bg-gray-100">
                  {item.type === 'image' ? (
                    <img
                      src={item.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <video
                      src={item.url}
                      className="h-full w-full object-cover"
                      controls
                    />
                  )}

                  {/* Selection Overlay */}
                  <button
                    type="button"
                    onClick={() => toggleSelection(item.url)}
                    className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/10"
                  >
                    {isSelected && (
                      <div className="rounded-full bg-luxury-gold p-2">
                        <Check className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </button>

                  {/* Type Badge */}
                  <div className="absolute left-2 top-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-xs font-medium text-white">
                      {item.type === 'image' ? (
                        <ImageIcon className="h-3 w-3" />
                      ) : (
                        <Video className="h-3 w-3" />
                      )}
                      {item.type}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full bg-white p-1.5 shadow-sm hover:bg-gray-100"
                    >
                      <ExternalLink className="h-4 w-4 text-gray-600" />
                    </a>
                  </div>
                </div>

                {/* Order Indicator */}
                <div className="absolute bottom-2 left-2">
                  <span className="inline-flex items-center rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-700 shadow-sm">
                    #{index + 1}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Limits Info */}
      <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
        <p>
          <strong>Images:</strong> {images.length} / {maxImages} •{' '}
          <strong>Videos:</strong> {videos.length} / {maxVideos}
        </p>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Media</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedItems.size} item(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
