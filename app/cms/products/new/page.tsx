'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function NewProductPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [videoFiles, setVideoFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [videoPreviews, setVideoPreviews] = useState<string[]>([])
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([])
  const [uploadedVideoUrls, setUploadedVideoUrls] = useState<string[]>([])
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    price_idr: '',
    price_eur: '',
    stock_quantity: '',
    category: '',
    fragrance_family: '',
    collection: '',
    in_stock: true,
    volume_ml: '',
    weight_mg: '',
    shelf_life_months: '',
    formulation: '',
    gender: '',
    edition_type: '',
    bpom_number: '',
    ships_from: 'KOTA JAKARTA TIMUR',
    is_visible: true,
  })

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setImageFiles(prev => [...prev, ...files])
    
    // Create previews
    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setVideoFiles(prev => [...prev, ...files])
    
    // Create previews
    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setVideoPreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const removeVideo = (index: number) => {
    setVideoFiles(prev => prev.filter((_, i) => i !== index))
    setVideoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const uploadMedia = async (session: any, productName: string) => {
    const allFiles = [...imageFiles, ...videoFiles]
    if (allFiles.length === 0) return []

    setUploadingMedia(true)
    try {
      const formData = new FormData()
      allFiles.forEach(file => {
        formData.append('files', file)
      })
      formData.append('productName', productName)

      const response = await fetch('/api/upload/product-media', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload media')
      }

      const data = await response.json()
      return data.urls || []
    } finally {
      setUploadingMedia(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('Authentication required', {
          description: 'You must be logged in to create products'
        })
        setLoading(false)
        return
      }

      // Upload media files first (pass product name for folder)
      const mediaUrls = await uploadMedia(session, formData.name)

      const response = await fetch('/api/products/admin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...formData,
          price: parseFloat(formData.price),
          price_idr: parseFloat(formData.price_idr),
          price_eur: parseFloat(formData.price_eur),
          stock_quantity: parseInt(formData.stock_quantity),
          volume_ml: formData.volume_ml ? parseInt(formData.volume_ml) : null,
          weight_mg: formData.weight_mg ? parseInt(formData.weight_mg) : null,
          shelf_life_months: formData.shelf_life_months ? parseInt(formData.shelf_life_months) : null,
          image_urls: mediaUrls,
        }),
      })

      if (response.ok) {
        toast.success('Product created successfully!', {
          description: 'Redirecting to products page...'
        })
        setTimeout(() => router.push('/cms/products'), 1000)
      } else {
        const errorData = await response.json()
        toast.error('Failed to create product', {
          description: errorData.error || 'Unknown error occurred'
        })
      }
    } catch (error: any) {
      console.error('Error creating product:', error)
      toast.error('An error occurred', {
        description: error.message || 'Please try again'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const generateSlug = () => {
    const slug = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    setFormData(prev => ({ ...prev, slug }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/cms/products">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
          <p className="mt-2 text-gray-600">Create a new product in your catalog</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Product Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={generateSlug}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Slug *
              </label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
            />
          </div>

          {/* Pricing Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Pricing</h3>
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Price (USD) *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Price (IDR) *
                </label>
                <input
                  type="number"
                  name="price_idr"
                  value={formData.price_idr}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  required
                  placeholder="Indonesian Rupiah"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Price (EUR) *
                </label>
                <input
                  type="number"
                  name="price_eur"
                  value={formData.price_eur}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  required
                  placeholder="Euro"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>
            </div>
          </div>

          {/* Inventory Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Inventory</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Stock Quantity *
                </label>
                <input
                  type="number"
                  name="stock_quantity"
                  value={formData.stock_quantity}
                  onChange={handleChange}
                  min="0"
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  In Stock
                </label>
                <select
                  name="in_stock"
                  value={formData.in_stock.toString()}
                  onChange={(e) => setFormData(prev => ({ ...prev, in_stock: e.target.value === 'true' }))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                >
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
          </div>

          {/* Product Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Product Details</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                >
                  <option value="">Select Category</option>
                  <option value="Fragrances">Fragrances</option>
                  <option value="Perfumes">Perfumes</option>
                  <option value="Body Care">Body Care</option>
                  <option value="Gift Sets">Gift Sets</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Fragrance Family
                </label>
                <select
                  name="fragrance_family"
                  value={formData.fragrance_family}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                >
                  <option value="">Select Fragrance Family</option>
                  <option value="Oriental">Oriental</option>
                  <option value="Powdery Elegance">Powdery Elegance</option>
                  <option value="Aqua & Aromatic">Aqua & Aromatic</option>
                  <option value="Gourmand Galore">Gourmand Galore</option>
                  <option value="Floral Fantasy">Floral Fantasy</option>
                  <option value="Fresh Fruity">Fresh Fruity</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Collection
                </label>
                <select
                  name="collection"
                  value={formData.collection}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                >
                  <option value="">Select Collection</option>
                  <option value="Extrait de Parfum">Extrait de Parfum</option>
                  <option value="Eau de Parfum">Eau de Parfum</option>
                  <option value="Eau de Toilette">Eau de Toilette</option>
                  <option value="Eau de Cologne">Eau de Cologne</option>
                  <option value="Parfum">Parfum</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Formulation
                </label>
                <select
                  name="formulation"
                  value={formData.formulation}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                >
                  <option value="">Select Formulation</option>
                  <option value="Spray">Spray</option>
                  <option value="Roll-on">Roll-on</option>
                  <option value="Splash">Splash</option>
                  <option value="Solid">Solid</option>
                  <option value="Oil">Oil</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Gender
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                >
                  <option value="">Select Gender</option>
                  <option value="Unisex">Unisex</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Edition Type
                </label>
                <select
                  name="edition_type"
                  value={formData.edition_type}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                >
                  <option value="">Select Edition Type</option>
                  <option value="Regular Edition">Regular Edition</option>
                  <option value="Limited Edition">Limited Edition</option>
                  <option value="Special Edition">Special Edition</option>
                  <option value="Collector's Edition">Collector's Edition</option>
                </select>
              </div>
            </div>
          </div>

          {/* Specifications Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Specifications</h3>
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Volume (ml)
                </label>
                <select
                  name="volume_ml"
                  value={formData.volume_ml}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                >
                  <option value="">Select Volume</option>
                  <option value="5">5 ml</option>
                  <option value="10">10 ml</option>
                  <option value="15">15 ml</option>
                  <option value="30">30 ml</option>
                  <option value="50">50 ml</option>
                  <option value="75">75 ml</option>
                  <option value="100">100 ml</option>
                  <option value="125">125 ml</option>
                  <option value="150">150 ml</option>
                  <option value="200">200 ml</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Weight (mg)
                </label>
                <select
                  name="weight_mg"
                  value={formData.weight_mg}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                >
                  <option value="">Select Weight</option>
                  <option value="50">50 mg</option>
                  <option value="100">100 mg</option>
                  <option value="150">150 mg</option>
                  <option value="200">200 mg</option>
                  <option value="250">250 mg</option>
                  <option value="300">300 mg</option>
                  <option value="500">500 mg</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Shelf Life (months)
                </label>
                <select
                  name="shelf_life_months"
                  value={formData.shelf_life_months}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                >
                  <option value="">Select Shelf Life</option>
                  <option value="12">12 months</option>
                  <option value="18">18 months</option>
                  <option value="24">24 months</option>
                  <option value="36">36 months</option>
                  <option value="48">48 months</option>
                  <option value="60">60 months</option>
                </select>
              </div>
            </div>
          </div>

          {/* Regulatory & Shipping Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Regulatory & Shipping</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Official Distribution Authorization No. (BPOM, PIRT)
                </label>
                <input
                  type="text"
                  name="bpom_number"
                  value={formData.bpom_number}
                  onChange={handleChange}
                  placeholder="e.g., NA18201234567"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Ships From
                </label>
                <input
                  type="text"
                  name="ships_from"
                  value={formData.ships_from}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>
            </div>
          </div>

          {/* Media Upload Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Product Media</h3>
            
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Images
              </label>
              <div className="mt-1">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-8 transition-colors hover:border-luxury-gold">
                  <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="mt-2 text-sm text-gray-600">Click to upload images</span>
                  <span className="mt-1 text-xs text-gray-500">PNG, JPG, WEBP up to 10MB</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>
              
              {/* Image Previews */}
              {imagePreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="h-32 w-full rounded-lg object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Video Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Videos
              </label>
              <div className="mt-1">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-8 transition-colors hover:border-luxury-gold">
                  <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="mt-2 text-sm text-gray-600">Click to upload videos</span>
                  <span className="mt-1 text-xs text-gray-500">MP4, WEBM up to 50MB</span>
                  <input
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={handleVideoChange}
                    className="hidden"
                  />
                </label>
              </div>
              
              {/* Video Previews */}
              {videoPreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
                  {videoPreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <video
                        src={preview}
                        className="h-32 w-full rounded-lg object-cover"
                        controls
                      />
                      <button
                        type="button"
                        onClick={() => removeVideo(index)}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_visible"
              checked={formData.is_visible}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold"
            />
            <label className="text-sm font-medium text-gray-700">
              Make product visible on store
            </label>
          </div>

          <div className="flex gap-4 border-t border-gray-200 pt-6">
            <Button
              type="submit"
              disabled={loading || uploadingMedia}
              className="bg-luxury-gold text-luxury-navy hover:bg-luxury-gold/90"
            >
              {uploadingMedia ? 'Uploading Media...' : loading ? 'Creating...' : 'Create Product'}
            </Button>
            <Link href="/cms/products">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
          </div>
        </div>
      </form>
    </div>
  )
}
