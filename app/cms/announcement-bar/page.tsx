'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Save, X } from 'lucide-react'
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

interface AnnouncementMessage {
  id: string
  message: string
  display_order: number
  is_active: boolean
  created_at: string
}

interface HeroMedia {
  id: string
  media_type: 'video' | 'image'
  media_url: string
  is_active: boolean
  created_at: string
}

export default function AnnouncementBarPage() {
  const [messages, setMessages] = useState<AnnouncementMessage[]>([])
  const [heroMedia, setHeroMedia] = useState<HeroMedia | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingMessage, setEditingMessage] = useState<string>('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [uploadingHero, setUploadingHero] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch announcement messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('announcement_messages')
        .select('*')
        .order('display_order', { ascending: true })

      if (messagesError) throw messagesError
      setMessages(messagesData || [])

      // Fetch active hero media
      const { data: heroData, error: heroError } = await supabase
        .from('hero_media')
        .select('*')
        .eq('is_active', true)
        .single()

      if (!heroError && heroData) {
        setHeroMedia(heroData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const handleAddMessage = async () => {
    if (!newMessage.trim()) {
      toast.error('Message cannot be empty')
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Authentication required')
        return
      }

      const maxOrder = messages.length > 0 ? Math.max(...messages.map(m => m.display_order)) : 0

      const response = await fetch('/api/admin/announcement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          message: newMessage.trim(),
          display_order: maxOrder + 1,
          is_active: true
        })
      })

      if (!response.ok) throw new Error('Failed to add message')

      toast.success('Message added successfully')
      setNewMessage('')
      setShowAddForm(false)
      fetchData()
    } catch (error) {
      console.error('Error adding message:', error)
      toast.error('Failed to add message')
    }
  }

  const handleUpdateMessage = async (id: string) => {
    if (!editingMessage.trim()) {
      toast.error('Message cannot be empty')
      return
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Authentication required')
        return
      }

      const response = await fetch(`/api/admin/announcement/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ message: editingMessage.trim() })
      })

      if (!response.ok) throw new Error('Failed to update message')

      toast.success('Message updated successfully')
      setEditingId(null)
      setEditingMessage('')
      fetchData()
    } catch (error) {
      console.error('Error updating message:', error)
      toast.error('Failed to update message')
    }
  }

  const handleDeleteMessage = async () => {
    if (!messageToDelete) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Authentication required')
        return
      }

      const response = await fetch(`/api/admin/announcement/${messageToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) throw new Error('Failed to delete message')

      toast.success('Message deleted successfully')
      setDeleteDialogOpen(false)
      setMessageToDelete(null)
      fetchData()
    } catch (error) {
      console.error('Error deleting message:', error)
      toast.error('Failed to delete message')
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Authentication required')
        return
      }

      const response = await fetch(`/api/admin/announcement/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ is_active: !currentStatus })
      })

      if (!response.ok) throw new Error('Failed to toggle message')

      toast.success(`Message ${!currentStatus ? 'activated' : 'deactivated'}`)
      fetchData()
    } catch (error) {
      console.error('Error toggling message:', error)
      toast.error('Failed to toggle message')
    }
  }

  const handleHeroMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isVideo = file.type.startsWith('video/')
    const isImage = file.type.startsWith('image/')

    if (!isVideo && !isImage) {
      toast.error('Please upload a video or image file')
      return
    }

    setUploadingHero(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Authentication required')
        return
      }

      // Upload file to storage
      const fileExt = file.name.split('.').pop()
      const fileName = `hero-${Date.now()}.${fileExt}`
      const filePath = `hero/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath)

      // Update hero media via API (handles deactivation and insertion)
      const response = await fetch('/api/admin/hero-media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          media_type: isVideo ? 'video' : 'image',
          media_url: publicUrl
        })
      })

      if (!response.ok) throw new Error('Failed to update hero media')

      toast.success('Hero media uploaded successfully')
      fetchData()
    } catch (error) {
      console.error('Error uploading hero media:', error)
      toast.error('Failed to upload hero media')
    } finally {
      setUploadingHero(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Announcement Bar Messages */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Announcement Bar Messages</h1>
            <p className="mt-2 text-gray-600">Manage rotating messages in the black announcement bar</p>
          </div>
          <Button 
            onClick={() => setShowAddForm(true)}
            className="bg-luxury-gold text-luxury-navy hover:bg-luxury-gold/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Message
          </Button>
        </div>

        {showAddForm && (
          <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">New Message</label>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="e.g., Free shipping on orders over $100"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAddMessage} className="bg-luxury-gold text-luxury-navy hover:bg-luxury-gold/90">
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </Button>
                <Button variant="outline" onClick={() => {
                  setShowAddForm(false)
                  setNewMessage('')
                }}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200"
            >
              {editingId === message.id ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={editingMessage}
                    onChange={(e) => setEditingMessage(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => handleUpdateMessage(message.id)} size="sm" className="bg-luxury-gold text-luxury-navy hover:bg-luxury-gold/90">
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => {
                      setEditingId(null)
                      setEditingMessage('')
                    }}>
                      <X className="mr-2 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-gray-900">{message.message}</p>
                    <p className="mt-1 text-xs text-gray-500">Order: {message.display_order}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        message.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {message.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingId(message.id)
                        setEditingMessage(message.message)
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(message.id, message.is_active)}
                    >
                      {message.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMessageToDelete(message.id)
                        setDeleteDialogOpen(true)
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {messages.length === 0 && !showAddForm && (
            <div className="rounded-lg bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
              <p className="text-gray-500">No messages found. Add your first message to get started.</p>
            </div>
          )}
        </div>
      </div>

      {/* Hero Section Media */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hero Section Media</h2>
          <p className="mt-2 text-gray-600">Upload video or image for the hero section</p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Hero Video or Image
              </label>
              <input
                type="file"
                accept="video/*,image/*"
                onChange={handleHeroMediaUpload}
                disabled={uploadingHero}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-luxury-gold file:text-luxury-navy hover:file:bg-luxury-gold/90"
              />
              <p className="mt-2 text-xs text-gray-500">Recommended: Video (MP4) or Image (JPG, PNG) - Max 50MB</p>
            </div>

            {heroMedia && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Current Hero Media:</p>
                {heroMedia.media_type === 'video' ? (
                  <video
                    src={heroMedia.media_url}
                    className="h-48 w-full rounded-lg object-cover"
                    controls
                  />
                ) : (
                  <img
                    src={heroMedia.media_url}
                    alt="Hero"
                    className="h-48 w-full rounded-lg object-cover"
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this message? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setMessageToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteMessage}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
