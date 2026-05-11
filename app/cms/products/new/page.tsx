'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, GripVertical, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { VariantStockModal } from '@/components/VariantStockModal'

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
    sku: '',
    description: '',
    price_usd: '',
    price_idr: '',
    cost_price: '',
    cost_price_idr: '',
    stock_quantity: '',
    low_stock_threshold: '',
    allow_backorder: false,
    fragrance_family: '',
    collection: '',
    in_stock: true,
    volume_ml: '',
    weight_grams: '',
    shipping_weight_grams: '',
    package_length_cm: '',
    package_width_cm: '',
    package_height_cm: '',
    shelf_life_months: '',
    formulation: '',
    gender: '',
    country_of_origin: '',
    top_notes: '',
    middle_notes: '',
    base_notes: '',
    bpom_number: '',
    shipping_period_days: '4',
    manufacturing_date: '',
    expiration_date: '',
    ships_from: 'KOTA JAKARTA TIMUR',
    status: 'draft',
    is_featured: false,
    min_purchase_quantity: '1',
    max_purchase_quantity: '',
    is_pre_order: true,
    pre_order_duration_days: '30',
    scheduled_publish_date: '',
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
    tags: '',
    pilih_lokal: false,
    rating: '',
    products_sold: '',
    is_popular: false,
    is_best_selling: false,
    new_product_duration_days: '30',
    tax_enabled: true,
  })
  const [imageAltTexts, setImageAltTexts] = useState<string[]>([])
  const [variants, setVariants] = useState<Array<{
    name: string
    sku: string
    price_usd: string
    price_idr: string
    stock_quantity: string
    low_stock_threshold: string
    in_stock: boolean
    min_purchase_quantity: string
    max_purchase_quantity: string
    image_files: File[]
    image_previews: string[]
    video_files: File[]
    video_previews: string[]
  }>>([])
  const [variantStockModalOpen, setVariantStockModalOpen] = useState(false)
  const [savedProductId, setSavedProductId] = useState<string | null>(null)

  const dragImgFrom = useRef<number | null>(null)
  const dragImgOver = useRef<number | null>(null)
  const [dragImgOverIdx, setDragImgOverIdx] = useState<number | null>(null)
  const dragVidFrom = useRef<number | null>(null)
  const dragVidOver = useRef<number | null>(null)
  const [dragVidOverIdx, setDragVidOverIdx] = useState<number | null>(null)

  const removeVariantNewImage = (varIdx: number, imgIdx: number) => {
    setVariants(prev => prev.map((v, i) =>
      i === varIdx ? { ...v, image_previews: v.image_previews.filter((_, j) => j !== imgIdx), image_files: v.image_files.filter((_, j) => j !== imgIdx) } : v
    ))
  }
  const removeVariantNewVideo = (varIdx: number, vidIdx: number) => {
    setVariants(prev => prev.map((v, i) =>
      i === varIdx ? { ...v, video_previews: v.video_previews.filter((_, j) => j !== vidIdx), video_files: v.video_files.filter((_, j) => j !== vidIdx) } : v
    ))
  }

  const reorderVariantImages = (varIdx: number, from: number, to: number) => {
    setVariants(prev => prev.map((v, i) => {
      if (i !== varIdx) return v
      const previews = [...v.image_previews], files = [...v.image_files]
      const [p] = previews.splice(from, 1); previews.splice(to, 0, p)
      const [f] = files.splice(from, 1); files.splice(to, 0, f)
      return { ...v, image_previews: previews, image_files: files }
    }))
  }

  const reorderVariantVideos = (varIdx: number, from: number, to: number) => {
    setVariants(prev => prev.map((v, i) => {
      if (i !== varIdx) return v
      const previews = [...v.video_previews], files = [...v.video_files]
      const [p] = previews.splice(from, 1); previews.splice(to, 0, p)
      const [f] = files.splice(from, 1); files.splice(to, 0, f)
      return { ...v, video_previews: previews, video_files: files }
    }))
  }

  const reorderImages = (from: number, to: number) => {
    const imgs = [...imagePreviews], files = [...imageFiles], alts = [...imageAltTexts]
    const [img] = imgs.splice(from, 1); imgs.splice(to, 0, img)
    const [file] = files.splice(from, 1); files.splice(to, 0, file)
    const [alt] = alts.splice(from, 1); alts.splice(to, 0, alt)
    setImagePreviews(imgs); setImageFiles(files); setImageAltTexts(alts)
  }

  const reorderVideos = (from: number, to: number) => {
    const vids = [...videoPreviews], files = [...videoFiles]
    const [vid] = vids.splice(from, 1); vids.splice(to, 0, vid)
    const [file] = files.splice(from, 1); files.splice(to, 0, file)
    setVideoPreviews(vids); setVideoFiles(files)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setImageFiles(prev => [...prev, ...files])
    
    // Create previews and initialize alt texts
    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, reader.result as string])
        setImageAltTexts(prev => [...prev, ''])
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
    setImageAltTexts(prev => prev.filter((_, i) => i !== index))
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

  const uploadVariantMedia = async (session: any, productName: string, variantName: string, imageFiles: File[], videoFiles: File[]) => {
    const files = [...imageFiles, ...videoFiles]
    if (files.length === 0) return { imageUrls: [], videoUrls: [] }
    try {
      const fd = new FormData()
      files.forEach(file => fd.append('files', file))
      fd.append('productName', `${productName}-${variantName}`)
      const response = await fetch('/api/upload/product-media', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: fd,
      })
      if (!response.ok) throw new Error('Failed to upload variant media')
      const data = await response.json()
      const urls = data.urls || []
      return {
        imageUrls: urls.slice(0, imageFiles.length) as string[],
        videoUrls: urls.slice(imageFiles.length) as string[]
      }
    } catch (error) {
      console.error('Error uploading variant media:', error)
      return { imageUrls: [], videoUrls: [] }
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
      const imageUrls = mediaUrls.slice(0, imageFiles.length)
      const videoUrls = mediaUrls.slice(imageFiles.length)

      // Upload variant media files
      const variantsWithMedia = await Promise.all(
        variants.filter(v => v.name).map(async (v) => {
          let imageUrls: string[] = []
          let videoUrls: string[] = []
          if (v.image_files.length > 0 || v.video_files.length > 0) {
            const { imageUrls: newImgs, videoUrls: newVids } = await uploadVariantMedia(
              session, formData.name, v.name, v.image_files, v.video_files
            )
            imageUrls = newImgs
            videoUrls = newVids
          }
          return {
            name: v.name,
            sku: v.sku,
            price_usd: parseFloat(v.price_usd) || 0,
            price_idr: parseFloat(v.price_idr) || 0,
            stock_quantity: parseInt(v.stock_quantity) || 0,
            low_stock_threshold: v.low_stock_threshold ? parseInt(v.low_stock_threshold) : null,
            in_stock: v.in_stock !== undefined ? v.in_stock : true,
            min_purchase_quantity: v.min_purchase_quantity ? parseInt(v.min_purchase_quantity) : 1,
            max_purchase_quantity: v.max_purchase_quantity ? parseInt(v.max_purchase_quantity) : null,
            image_url: imageUrls,
            video_url: videoUrls
          }
        })
      )

      const response = await fetch('/api/products/admin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...formData,
          price_usd: formData.price_usd ? parseFloat(formData.price_usd) : null,
          price_idr: formData.price_idr ? parseFloat(formData.price_idr) : null,
          cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
          cost_price_idr: formData.cost_price_idr ? parseFloat(formData.cost_price_idr) : null,
          stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : 0,
          low_stock_threshold: formData.low_stock_threshold ? parseInt(formData.low_stock_threshold) : null,
          volume_ml: formData.volume_ml ? parseInt(formData.volume_ml) : null,
          weight_grams: formData.weight_grams ? parseFloat(formData.weight_grams) : null,
          shipping_weight_grams: formData.shipping_weight_grams ? parseFloat(formData.shipping_weight_grams) : null,
          package_length_cm: formData.package_length_cm ? parseFloat(formData.package_length_cm) : null,
          package_width_cm: formData.package_width_cm ? parseFloat(formData.package_width_cm) : null,
          package_height_cm: formData.package_height_cm ? parseFloat(formData.package_height_cm) : null,
          shelf_life_months: formData.shelf_life_months ? parseInt(formData.shelf_life_months) : null,
          min_purchase_quantity: parseInt(formData.min_purchase_quantity) || 1,
          max_purchase_quantity: formData.max_purchase_quantity ? parseInt(formData.max_purchase_quantity) : null,
          pre_order_duration_days: formData.pre_order_duration_days ? parseInt(formData.pre_order_duration_days) : null,
          scheduled_publish_date: formData.scheduled_publish_date || null,
          manufacturing_date: formData.manufacturing_date || null,
          expiration_date: formData.expiration_date || null,
          allow_backorder: Boolean(formData.allow_backorder),
          in_stock: Boolean(formData.in_stock),
          is_featured: Boolean(formData.is_featured),
          is_pre_order: Boolean(formData.is_pre_order),
          tax_enabled: Boolean(formData.tax_enabled),
          pilih_lokal: Boolean(formData.pilih_lokal),
          is_popular: Boolean(formData.is_popular),
          is_best_selling: Boolean(formData.is_best_selling),
          rating: formData.rating ? parseFloat(formData.rating) : null,
          products_sold: formData.products_sold ? parseInt(formData.products_sold) : null,
          new_product_duration_days: formData.new_product_duration_days ? parseInt(formData.new_product_duration_days.toString()) : 30,
          image_urls: imageUrls,
          video_urls: videoUrls,
          image_alt_texts: imageAltTexts,
          variants: variantsWithMedia,
        })
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


  return (
    <div className="space-y-6">
      <div className="mb-4 sm:mb-6 flex items-center gap-2 sm:gap-4">
        <Link href="/cms/products">
          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Add New Product</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">Create a new product in your catalog</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg bg-white p-3 sm:p-6 shadow-sm ring-1 ring-gray-200">
        <div className="space-y-12">
          {/* Basic Info Section */}
          <div id="section-basic">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
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
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Product SKU
                </label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  placeholder="e.g., MYK-OUD-001"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Category (Fragrance Family)
                </label>
                <select
                  name="fragrance_family"
                  value={formData.fragrance_family}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                >
                  <option value="">Select Category</option>
                  <option value="Aqua & Aromatic">Aqua & Aromatic</option>
                  <option value="Floral Fantasy">Floral Fantasy</option>
                  <option value="Oriental">Oriental</option>
                  <option value="Fresh Fruity">Fresh Fruity</option>
                  <option value="Powdery Elegance">Powdery Elegance</option>
                  <option value="Gourmand Galore">Gourmand Galore</option>
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
                  <option value="Men">Men</option>
                  <option value="Women">Women</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <RichTextEditor
                value={formData.description}
                onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
                placeholder="Enter product description with formatting..."
                className="min-h-[200px]"
              />
            </div>
          </div>
          </div>

          {/* Pricing & Inventory Tab */}
          <div id="section-pricing">
          {/* Pricing Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Pricing</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Base Price (USD)
                </label>
                <input
                  type="number"
                  name="price_usd"
                  value={formData.price_usd}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="Auto-calculated from variants if not set"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Base Price (IDR)
                </label>
                <input
                  type="number"
                  name="price_idr"
                  value={formData.price_idr}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="Auto-calculated from variants if not set"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cost Price (USD)
                </label>
                <input
                  type="number"
                  name="cost_price"
                  value={formData.cost_price}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="For profit calculation"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cost Price (IDR)
                </label>
                <input
                  type="number"
                  name="cost_price_idr"
                  value={formData.cost_price_idr}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="Cost in Indonesian Rupiah"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>

            </div>

            <div className="pt-4">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Tax Configuration</h4>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="tax_enabled"
                  name="tax_enabled"
                  checked={formData.tax_enabled}
                  onChange={(e) => {
                    console.log('Tax enabled checkbox changed:', e.target.checked)
                    setFormData(prev => {
                      const updated = { ...prev, tax_enabled: e.target.checked }
                      console.log('Updated formData.tax_enabled:', updated.tax_enabled)
                      return updated
                    })
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold"
                />
                <label htmlFor="tax_enabled" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Include Tax in Pricing
                </label>
              </div>
              <p className="mt-2 text-xs text-gray-500">When disabled, prices will be displayed without tax on the public website</p>
            </div>
          </div>

          {/* Inventory Section */}
          <div className="space-y-4 pt-8">
            <h3 className="text-lg font-semibold text-gray-900">Inventory</h3>
            <div className="grid gap-6 md:grid-cols-3">
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
                  Low Stock Threshold
                </label>
                <input
                  type="number"
                  name="low_stock_threshold"
                  value={formData.low_stock_threshold}
                  onChange={handleChange}
                  min="0"
                  placeholder="Alert when stock below this"
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

          {/* Purchase Limits Section */}
          <div className="space-y-4 pt-8">
            <h3 className="text-lg font-semibold text-gray-900">Purchase Limits</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Minimum Purchase Quantity *
                </label>
                <input
                  type="number"
                  name="min_purchase_quantity"
                  value={formData.min_purchase_quantity}
                  onChange={handleChange}
                  min="1"
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Maximum Purchase Quantity
                </label>
                <input
                  type="number"
                  name="max_purchase_quantity"
                  value={formData.max_purchase_quantity}
                  onChange={handleChange}
                  min="1"
                  placeholder="Leave empty for no limit"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>
            </div>
          </div>
          </div>

          {/* Fragrance Details Tab */}
          <div id="section-fragrance">
          {/* Fragrance Notes Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Fragrance Notes</h3>
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Top Notes
                </label>
                <input
                  type="text"
                  name="top_notes"
                  value={formData.top_notes}
                  onChange={handleChange}
                  placeholder="e.g., Bergamot, Lemon"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Middle Notes
                </label>
                <input
                  type="text"
                  name="middle_notes"
                  value={formData.middle_notes}
                  onChange={handleChange}
                  placeholder="e.g., Rose, Jasmine"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Base Notes
                </label>
                <input
                  type="text"
                  name="base_notes"
                  value={formData.base_notes}
                  onChange={handleChange}
                  placeholder="e.g., Oud, Amber"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>
            </div>
          </div>

          {/* Product Specifications Section */}
          <div className="space-y-4 pt-8">
            <h3 className="text-lg font-semibold text-gray-900">Product Specifications</h3>
            <div className="grid gap-6 md:grid-cols-3">
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
                  Country of Origin
                </label>
                <select
                  name="country_of_origin"
                  value={formData.country_of_origin}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                >
                  <option value="">Select Country</option>
                  <option value="France">France</option>
                  <option value="United Arab Emirates">United Arab Emirates</option>
                  <option value="Italy">Italy</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Indonesia">Indonesia</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Shelf Life (months)
                </label>
                <input
                  type="number"
                  name="shelf_life_months"
                  value={formData.shelf_life_months}
                  onChange={handleChange}
                  min="0"
                  placeholder="e.g., 36"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>
            </div>
          </div>
          </div>

          {/* SEO Tab */}
          <div id="section-seo">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">SEO & Marketing</h3>
            <div className="grid gap-6 md:grid-cols-1">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Meta Title
                </label>
                <input
                  type="text"
                  name="meta_title"
                  value={formData.meta_title}
                  onChange={handleChange}
                  placeholder="e.g., Mykonos Oud Royale Eau de Parfum"
                  maxLength={60}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
                <p className="mt-1 text-xs text-gray-500">Recommended: 50-60 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Meta Description
                </label>
                <textarea
                  name="meta_description"
                  value={formData.meta_description}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Luxury oud fragrance with amber and sandalwood notes."
                  maxLength={160}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
                <p className="mt-1 text-xs text-gray-500">Recommended: 150-160 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Meta Keywords
                </label>
                <input
                  type="text"
                  name="meta_keywords"
                  value={formData.meta_keywords}
                  onChange={handleChange}
                  placeholder="e.g., oud, luxury perfume, arabic fragrance"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tags / Keywords
                </label>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="e.g., oud, luxury, arabic, winter (comma-separated)"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>
            </div>
          </div>
          </div>

          {/* Shipping Tab */}
          <div id="section-shipping">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Shipping & Package Dimensions</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Product Weight (grams)
                </label>
                <input
                  type="number"
                  name="weight_grams"
                  value={formData.weight_grams}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="e.g., 150"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Shipping Weight (grams)
                </label>
                <input
                  type="number"
                  name="shipping_weight_grams"
                  value={formData.shipping_weight_grams}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="Includes packaging"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Package Length (cm)
                </label>
                <input
                  type="number"
                  name="package_length_cm"
                  value={formData.package_length_cm}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="Package length"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Package Width (cm)
                </label>
                <input
                  type="number"
                  name="package_width_cm"
                  value={formData.package_width_cm}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="Package width"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Package Height (cm)
                </label>
                <input
                  type="number"
                  name="package_height_cm"
                  value={formData.package_height_cm}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="Package height"
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
                  placeholder="e.g., KOTA JAKARTA TIMUR"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Shipping Period (days)
                </label>
                <input
                  type="number"
                  name="shipping_period_days"
                  value={formData.shipping_period_days}
                  onChange={handleChange}
                  min="0"
                  placeholder="e.g., 3-5 days"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
                <p className="mt-1 text-xs text-gray-500">Estimated delivery time in days</p>
              </div>
            </div>
          </div>
          </div>

          {/* Pre-Order Settings */}
          <div id="section-preorder">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Pre-Order Settings</h3>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <p className="text-sm text-blue-800">All products are on pre-order basis by default</p>
            </div>
            <div className="max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Pre-Order Duration (days) *
                </label>
                <input
                  type="number"
                  name="pre_order_duration_days"
                  value={formData.pre_order_duration_days}
                  onChange={handleChange}
                  min="1"
                  required
                  placeholder="e.g., 30"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
                <p className="mt-1 text-xs text-gray-500">Number of days for pre-order processing (default: 30 days)</p>
              </div>
            </div>
          </div>
          </div>

          {/* Publishing & Status */}
          <div id="section-publishing">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Publishing & Status</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Scheduled Publish Date
                </label>
                <input
                  type="datetime-local"
                  name="scheduled_publish_date"
                  value={formData.scheduled_publish_date}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="is_featured"
                checked={formData.is_featured}
                onChange={(e) => setFormData(prev => ({ ...prev, is_featured: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold"
              />
              <label className="text-sm font-medium text-gray-700">
                Featured Product
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                New Badge Duration (days)
              </label>
              <input
                type="number"
                name="new_product_duration_days"
                value={formData.new_product_duration_days || 30}
                onChange={handleChange}
                min="0"
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
              />
              <p className="mt-1 text-xs text-gray-500">
                Number of days this product shows the "NEW" badge after creation (default: 30 days)
              </p>
            </div>
          </div>
          </div>

          {/* Variants Tab */}
          <div id="section-variants">
          {/* Product Variants Section */}
          <div className="space-y-4 pt-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Product Variants</h3>
              <div className="flex gap-2">
                {variants.length > 0 && savedProductId && (
                  <Button
                    type="button"
                    onClick={() => setVariantStockModalOpen(true)}
                    variant="outline"
                    size="sm"
                    className="border-luxury-navy text-luxury-navy hover:bg-luxury-navy hover:text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Manage Variant Stock
                  </Button>
                )}
                {variants.length > 0 && !savedProductId && (
                  <Button
                    type="button"
                    onClick={() => toast.info('Save the product first to manage variant stock')}
                    variant="outline"
                    size="sm"
                    className="border-gray-300 text-gray-400"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Manage Variant Stock
                  </Button>
                )}
                <Button
                  type="button"
                  onClick={() => setVariants([...variants, { name: '', sku: '', price_usd: '', price_idr: '', stock_quantity: '', low_stock_threshold: '', in_stock: true, min_purchase_quantity: '1', max_purchase_quantity: '', image_files: [], image_previews: [], video_files: [], video_previews: [] }])}
                  variant="outline"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Variant
                </Button>
              </div>
            </div>
            {variants.map((variant, index) => (
              <div key={index} className="rounded-lg border border-gray-200 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Variant {index + 1}</h4>
                  <Button
                    type="button"
                    onClick={() => setVariants(variants.filter((_, i) => i !== index))}
                    variant="ghost"
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Variant Name</label>
                    <input
                      type="text"
                      value={variant.name}
                      onChange={(e) => {
                        const newVariants = [...variants]
                        newVariants[index].name = e.target.value
                        setVariants(newVariants)
                      }}
                      placeholder="e.g., 50ml"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">SKU</label>
                    <input
                      type="text"
                      value={variant.sku}
                      onChange={(e) => {
                        const newVariants = [...variants]
                        newVariants[index].sku = e.target.value
                        setVariants(newVariants)
                      }}
                      placeholder="e.g., MYK-OUD-50ML"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Price USD</label>
                    <input
                      type="number"
                      value={variant.price_usd}
                      onChange={(e) => {
                        const newVariants = [...variants]
                        newVariants[index].price_usd = e.target.value
                        setVariants(newVariants)
                      }}
                      step="0.01"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Price IDR</label>
                    <input
                      type="number"
                      value={variant.price_idr}
                      onChange={(e) => {
                        const newVariants = [...variants]
                        newVariants[index].price_idr = e.target.value
                        setVariants(newVariants)
                      }}
                      step="0.01"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Stock Quantity</label>
                    <input
                      type="number"
                      value={variant.stock_quantity}
                      onChange={(e) => {
                        const newVariants = [...variants]
                        newVariants[index].stock_quantity = e.target.value
                        setVariants(newVariants)
                      }}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Low Stock Threshold</label>
                    <input
                      type="number"
                      value={variant.low_stock_threshold}
                      onChange={(e) => {
                        const newVariants = [...variants]
                        newVariants[index].low_stock_threshold = e.target.value
                        setVariants(newVariants)
                      }}
                      placeholder="Alert when stock below this"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">In Stock</label>
                    <select
                      value={variant.in_stock?.toString() || 'true'}
                      onChange={(e) => {
                        const newVariants = [...variants]
                        newVariants[index].in_stock = e.target.value === 'true'
                        setVariants(newVariants)
                      }}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Min Purchase Quantity</label>
                    <input
                      type="number"
                      value={variant.min_purchase_quantity}
                      onChange={(e) => {
                        const newVariants = [...variants]
                        newVariants[index].min_purchase_quantity = e.target.value
                        setVariants(newVariants)
                      }}
                      min="1"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Max Purchase Quantity</label>
                    <input
                      type="number"
                      value={variant.max_purchase_quantity}
                      onChange={(e) => {
                        const newVariants = [...variants]
                        newVariants[index].max_purchase_quantity = e.target.value
                        setVariants(newVariants)
                      }}
                      placeholder="Leave empty for no limit"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Variant Media</label>
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Variant Image Upload */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Image</label>
                        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 transition-colors hover:border-luxury-gold">
                          <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="mt-1 text-xs text-gray-600">Upload Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => {
                              Array.from(e.target.files || []).forEach(file => {
                                const reader = new FileReader()
                                reader.onloadend = () => {
                                  setVariants(prev => prev.map((v, i) =>
                                    i === index ? { ...v, image_files: [...v.image_files, file], image_previews: [...v.image_previews, reader.result as string] } : v
                                  ))
                                }
                                reader.readAsDataURL(file)
                              })
                            }}
                            className="hidden"
                          />
                        </label>
                        {variant.image_previews.length > 0 && (
                          <div className="mt-2 grid grid-cols-5 gap-2">
                            {variant.image_previews.map((preview, imgIdx) => (
                              <div key={imgIdx} draggable
                                onDragStart={() => { dragImgFrom.current = imgIdx }}
                                onDragEnter={() => { dragImgOver.current = imgIdx; setDragImgOverIdx(imgIdx) }}
                                onDragEnd={() => {
                                  if (dragImgFrom.current !== null && dragImgOver.current !== null && dragImgFrom.current !== dragImgOver.current)
                                    reorderVariantImages(index, dragImgFrom.current, dragImgOver.current)
                                  dragImgFrom.current = null; dragImgOver.current = null; setDragImgOverIdx(null)
                                }}
                                onDragOver={e => e.preventDefault()}
                                className={`relative group cursor-grab rounded-lg border-2 transition-all ${dragImgOverIdx === imgIdx ? 'border-luxury-gold ring-2 ring-luxury-gold/30 scale-105' : 'border-luxury-gold/40'}`}>
                                <GripVertical className="absolute top-1 left-1 z-10 h-3 w-3 text-white drop-shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                <span className="absolute top-1 right-6 z-10 bg-luxury-gold/70 text-white text-[9px] px-1 rounded opacity-0 group-hover:opacity-100">{imgIdx + 1}</span>
                                <img src={preview} alt={`new ${imgIdx + 1}`} className="h-20 w-full rounded-lg object-cover" />
                                <button type="button" onClick={() => removeVariantNewImage(index, imgIdx)}
                                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 text-[10px] z-20">×</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      {/* Variant Video Upload */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Video</label>
                        <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 transition-colors hover:border-luxury-gold">
                          <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <span className="mt-1 text-xs text-gray-600">Upload Video</span>
                          <input
                            type="file"
                            accept="video/*"
                            multiple
                            onChange={(e) => {
                              Array.from(e.target.files || []).forEach(file => {
                                const reader = new FileReader()
                                reader.onloadend = () => {
                                  setVariants(prev => prev.map((v, i) =>
                                    i === index ? { ...v, video_files: [...v.video_files, file], video_previews: [...v.video_previews, reader.result as string] } : v
                                  ))
                                }
                                reader.readAsDataURL(file)
                              })
                            }}
                            className="hidden"
                          />
                        </label>
                        {variant.video_previews.length > 0 && (
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            {variant.video_previews.map((preview, vidIdx) => (
                              <div key={vidIdx} draggable
                                onDragStart={() => { dragVidFrom.current = vidIdx }}
                                onDragEnter={() => { dragVidOver.current = vidIdx; setDragVidOverIdx(vidIdx) }}
                                onDragEnd={() => {
                                  if (dragVidFrom.current !== null && dragVidOver.current !== null && dragVidFrom.current !== dragVidOver.current)
                                    reorderVariantVideos(index, dragVidFrom.current, dragVidOver.current)
                                  dragVidFrom.current = null; dragVidOver.current = null; setDragVidOverIdx(null)
                                }}
                                onDragOver={e => e.preventDefault()}
                                className={`relative group cursor-grab rounded-lg border-2 transition-all ${dragVidOverIdx === vidIdx ? 'border-luxury-gold ring-2 ring-luxury-gold/30 scale-105' : 'border-luxury-gold/40'}`}>
                                <GripVertical className="absolute top-1 left-1 z-10 h-3 w-3 text-white drop-shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                <span className="absolute top-1 right-1 z-10 bg-luxury-gold/70 text-white text-[9px] px-1 rounded opacity-0 group-hover:opacity-100">{vidIdx + 1}</span>
                                <video src={preview} className="h-24 w-full rounded-lg object-cover" controls />
                                <button type="button" onClick={() => removeVariantNewVideo(index, vidIdx)}
                                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 text-[10px] z-20">×</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </div>

          {/* Media Tab */}
          <div id="section-media">
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
              {imagePreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-4 gap-3 md:grid-cols-5">
                  {imagePreviews.map((preview, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={() => { dragImgFrom.current = index }}
                      onDragEnter={() => { dragImgOver.current = index; setDragImgOverIdx(index) }}
                      onDragEnd={() => {
                        if (dragImgFrom.current !== null && dragImgOver.current !== null && dragImgFrom.current !== dragImgOver.current)
                          reorderImages(dragImgFrom.current, dragImgOver.current)
                        dragImgFrom.current = null; dragImgOver.current = null; setDragImgOverIdx(null)
                      }}
                      onDragOver={e => e.preventDefault()}
                      className={`relative group cursor-grab rounded-lg border-2 transition-all duration-150 ${dragImgOverIdx === index ? 'border-luxury-gold ring-2 ring-luxury-gold/30 scale-105 opacity-75' : 'border-transparent'}`}
                    >
                      <GripVertical className="absolute top-1 left-1 z-10 h-4 w-4 text-white drop-shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      <span className="absolute top-1 right-6 z-10 bg-black/50 text-white text-[10px] px-1 rounded opacity-0 group-hover:opacity-100">{index + 1}</span>
                      <img src={preview} alt={`Preview ${index + 1}`} className="h-28 w-full rounded-lg object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 text-xs z-20"
                      >×</button>
                      <input
                        type="text"
                        value={imageAltTexts[index] || ''}
                        onChange={(e) => { const a = [...imageAltTexts]; a[index] = e.target.value; setImageAltTexts(a) }}
                        placeholder="Alt text..."
                        className="mt-1 w-full rounded border border-gray-200 px-2 py-1 text-xs focus:border-luxury-gold focus:outline-none"
                      />
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
              {videoPreviews.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-3 md:grid-cols-4">
                  {videoPreviews.map((preview, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={() => { dragVidFrom.current = index }}
                      onDragEnter={() => { dragVidOver.current = index; setDragVidOverIdx(index) }}
                      onDragEnd={() => {
                        if (dragVidFrom.current !== null && dragVidOver.current !== null && dragVidFrom.current !== dragVidOver.current)
                          reorderVideos(dragVidFrom.current, dragVidOver.current)
                        dragVidFrom.current = null; dragVidOver.current = null; setDragVidOverIdx(null)
                      }}
                      onDragOver={e => e.preventDefault()}
                      className={`relative group cursor-grab rounded-lg border-2 transition-all duration-150 ${dragVidOverIdx === index ? 'border-luxury-gold ring-2 ring-luxury-gold/30 scale-105 opacity-75' : 'border-transparent'}`}
                    >
                      <GripVertical className="absolute top-1 left-1 z-10 h-4 w-4 text-white drop-shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      <span className="absolute top-1 right-1 z-10 bg-black/50 text-white text-[10px] px-1 rounded opacity-0 group-hover:opacity-100">{index + 1}</span>
                      <video src={preview} className="h-28 w-full rounded-lg object-cover" controls />
                      <button
                        type="button"
                        onClick={() => removeVideo(index)}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 text-xs z-20"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          </div>

          {/* Advanced Tab */}
          <div id="section-advanced">
          {/* Compliance Fields Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Compliance & Certifications</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Manufacturing Date
                </label>
                <input
                  type="date"
                  name="manufacturing_date"
                  value={formData.manufacturing_date}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Expiration Date
                </label>
                <input
                  type="date"
                  name="expiration_date"
                  value={formData.expiration_date}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>
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
            </div>
          </div>

          {/* Additional Settings */}
          <div className="space-y-4 pt-8">
            <h3 className="text-lg font-semibold text-gray-900">Additional Settings</h3>
            <div className="space-y-4">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="pilih_lokal"
                    checked={formData.pilih_lokal}
                    onChange={(e) => setFormData(prev => ({ ...prev, pilih_lokal: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Pilih Lokal (Local Product)
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="is_popular"
                    checked={formData.is_popular}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_popular: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Mark as Popular
                  </label>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="is_best_selling"
                    checked={formData.is_best_selling}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_best_selling: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Mark as Best Selling
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Analytics & Display */}
          <div className="space-y-4 pt-8">
            <h3 className="text-lg font-semibold text-gray-900">Analytics & Display</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Rating (0-5)
                </label>
                <input
                  type="number"
                  name="rating"
                  value={formData.rating}
                  onChange={handleChange}
                  min="0"
                  max="5"
                  step="0.1"
                  placeholder="e.g., 4.5"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Products Sold
                </label>
                <input
                  type="number"
                  name="products_sold"
                  value={formData.products_sold}
                  onChange={handleChange}
                  min="0"
                  placeholder="e.g., 150"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>
            </div>
          </div>
          </div>

          {/* Submit Buttons - Outside all tabs */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
            <Link href="/cms/products">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={loading || uploadingMedia}
              className="bg-luxury-gold hover:bg-luxury-gold/90"
            >
              {loading ? 'Creating...' : uploadingMedia ? 'Uploading Media...' : 'Create Product'}
            </Button>
          </div>

        </div>
      </form>

      {savedProductId && (
        <VariantStockModal
          isOpen={variantStockModalOpen}
          onClose={() => setVariantStockModalOpen(false)}
          product={{
            id: savedProductId,
            name: formData.name,
            variants: variants.map(v => ({
              name: v.name,
              sku: v.sku,
              price_usd: parseFloat(v.price_usd) || 0,
              price_idr: parseFloat(v.price_idr) || 0,
              stock_quantity: parseInt(v.stock_quantity) || 0,
              image_url: v.image_previews[0] || '',
            })),
          }}
          onUpdate={() => {}}
        />
      )}
    </div>
  )
}
