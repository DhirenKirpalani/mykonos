'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { VariantStockModal } from '@/components/VariantStockModal'

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const productId = params.id as string
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
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
    sku: '',
    description: '',
    brand: '',
    price_usd: '',
    price_idr: '',
    cost_price: '',
    compare_at_price: '',
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
    edition_type: '',
    country_of_origin: '',
    top_notes: '',
    middle_notes: '',
    base_notes: '',
    bpom_number: '',
    halal_certified: false,
    manufacturing_date: '',
    expiration_date: '',
    ships_from: 'KOTA JAKARTA TIMUR',
    status: 'draft',
    is_featured: false,
    min_purchase_quantity: '1',
    max_purchase_quantity: '',
    is_pre_order: false,
    pre_order_duration_days: '',
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
  })
  const [imageAltTexts, setImageAltTexts] = useState<string[]>([])
  const [bulkDiscounts, setBulkDiscounts] = useState<Array<{quantity: string, discount_percentage: string}>>([])
  const [variants, setVariants] = useState<Array<{
    name: string
    sku: string
    price_usd: string
    price_idr: string
    stock_quantity: string
    image_url: string
  }>>([])
  const [variantStockModalOpen, setVariantStockModalOpen] = useState(false)

  useEffect(() => {
    fetchProduct()
  }, [productId])

  const fetchProduct = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        toast.error('Authentication required')
        router.push('/cms/products')
        return
      }

      const response = await fetch(`/api/products/admin/${productId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        const product = data.product
        
        console.log('Fetched product data:', product)
        console.log('Product image_urls:', product.image_urls)
        
        setFormData({
          name: product.name || '',
          slug: product.slug || '',
          sku: product.sku || '',
          description: product.description || '',
          brand: product.brand || '',
          price_usd: product.price_usd?.toString() || '',
          price_idr: product.price_idr?.toString() || '',
          cost_price: product.cost_price?.toString() || '',
          compare_at_price: product.compare_at_price?.toString() || '',
          stock_quantity: product.stock_quantity?.toString() || '',
          low_stock_threshold: product.low_stock_threshold?.toString() || '',
          allow_backorder: product.allow_backorder ?? false,
          fragrance_family: product.fragrance_family || '',
          collection: product.collection || '',
          in_stock: product.in_stock ?? true,
          volume_ml: product.volume_ml?.toString() || '',
          weight_grams: product.weight_grams?.toString() || '',
          shipping_weight_grams: product.shipping_weight_grams?.toString() || '',
          package_length_cm: product.package_length_cm?.toString() || '',
          package_width_cm: product.package_width_cm?.toString() || '',
          package_height_cm: product.package_height_cm?.toString() || '',
          shelf_life_months: product.shelf_life_months?.toString() || '',
          formulation: product.formulation || '',
          gender: product.gender || '',
          edition_type: product.edition_type || '',
          country_of_origin: product.country_of_origin || '',
          top_notes: product.top_notes || '',
          middle_notes: product.middle_notes || '',
          base_notes: product.base_notes || '',
          bpom_number: product.bpom_number || '',
          halal_certified: product.halal_certified ?? false,
          manufacturing_date: product.manufacturing_date || '',
          expiration_date: product.expiration_date || '',
          ships_from: product.ships_from || 'KOTA JAKARTA TIMUR',
          status: product.status || 'draft',
          is_featured: product.is_featured ?? false,
          min_purchase_quantity: product.min_purchase_quantity?.toString() || '1',
          max_purchase_quantity: product.max_purchase_quantity?.toString() || '',
          is_pre_order: product.is_pre_order ?? false,
          pre_order_duration_days: product.pre_order_duration_days?.toString() || '',
          scheduled_publish_date: product.scheduled_publish_date || '',
          meta_title: product.meta_title || '',
          meta_description: product.meta_description || '',
          meta_keywords: product.meta_keywords || '',
          tags: product.tags || '',
          pilih_lokal: product.pilih_lokal ?? false,
          rating: product.rating?.toString() || '',
          products_sold: product.products_sold?.toString() || '',
          is_popular: product.is_popular ?? false,
          is_best_selling: product.is_best_selling ?? false,
        })
        
        if (product.image_urls && Array.isArray(product.image_urls)) {
          console.log('Processing image_urls array:', product.image_urls)
          // Separate images and videos
          const images: string[] = []
          const videos: string[] = []
          
          product.image_urls.forEach((url: string) => {
            if (url && typeof url === 'string') {
              if (url.endsWith('.mp4') || url.endsWith('.mov') || url.includes('video')) {
                videos.push(url)
              } else {
                images.push(url)
              }
            }
          })
          
          console.log('Separated images:', images)
          console.log('Separated videos:', videos)
          
          setImagePreviews(images)
          setVideoPreviews(videos)
        } else {
          console.log('No image_urls found or not an array:', product.image_urls)
        }
        if (product.image_alt_texts && Array.isArray(product.image_alt_texts)) {
          setImageAltTexts(product.image_alt_texts)
        }
        if (product.bulk_discounts && Array.isArray(product.bulk_discounts)) {
          setBulkDiscounts(product.bulk_discounts.map((d: any) => ({
            quantity: d.quantity?.toString() || '',
            discount_percentage: d.discount_percentage?.toString() || ''
          })))
        }
        if (product.variants && Array.isArray(product.variants)) {
          setVariants(product.variants.map((v: any) => ({
            name: v.name || '',
            sku: v.sku || '',
            price_usd: v.price_usd?.toString() || '',
            price_idr: v.price_idr?.toString() || '',
            stock_quantity: v.stock_quantity?.toString() || '',
            image_url: v.image_url || ''
          })))
        }
      } else {
        toast.error('Failed to load product')
        router.push('/cms/products')
      }
    } catch (error) {
      console.error('Error fetching product:', error)
      toast.error('An error occurred')
      router.push('/cms/products')
    } finally {
      setFetching(false)
    }
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
    // Only remove from imageFiles if it's a newly uploaded file (not a URL)
    const preview = imagePreviews[index]
    if (preview && preview.startsWith('data:')) {
      // It's a newly uploaded file
      const fileIndex = imageFiles.findIndex((_, i) => i === index)
      if (fileIndex !== -1) {
        setImageFiles(prev => prev.filter((_, i) => i !== fileIndex))
      }
    }
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
    setImageAltTexts(prev => prev.filter((_, i) => i !== index))
  }

  const removeVideo = (index: number) => {
    // Only remove from videoFiles if it's a newly uploaded file (not a URL)
    const preview = videoPreviews[index]
    if (preview && preview.startsWith('data:')) {
      // It's a newly uploaded file
      const fileIndex = videoFiles.findIndex((_, i) => i === index)
      if (fileIndex !== -1) {
        setVideoFiles(prev => prev.filter((_, i) => i !== fileIndex))
      }
    }
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

      // Upload new media files (pass product name for folder)
      const newMediaUrls = await uploadMedia(session, formData.name)
      
      // Combine existing media URLs (from previews that are actual URLs) with newly uploaded ones
      const existingImageUrls = imagePreviews.filter(url => !url.startsWith('data:'))
      const existingVideoUrls = videoPreviews.filter(url => !url.startsWith('data:'))
      const allMediaUrls = [...existingImageUrls, ...existingVideoUrls, ...newMediaUrls]

      const response = await fetch(`/api/products/admin/${productId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          ...formData,
          price_usd: parseFloat(formData.price_usd),
          price_idr: parseFloat(formData.price_idr),
          cost_price: formData.cost_price ? parseFloat(formData.cost_price) : null,
          compare_at_price: formData.compare_at_price ? parseFloat(formData.compare_at_price) : null,
          stock_quantity: parseInt(formData.stock_quantity),
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
          pilih_lokal: formData.pilih_lokal,
          rating: formData.rating ? parseFloat(formData.rating) : 0,
          products_sold: formData.products_sold ? parseInt(formData.products_sold) : 0,
          is_popular: formData.is_popular,
          is_best_selling: formData.is_best_selling,
          image_urls: allMediaUrls,
          image_alt_texts: imageAltTexts,
          bulk_discounts: bulkDiscounts.filter(d => d.quantity && d.discount_percentage).map(d => ({
            quantity: parseInt(d.quantity),
            discount_percentage: parseFloat(d.discount_percentage)
          })),
          variants: variants.filter(v => v.name).map(v => ({
            name: v.name,
            sku: v.sku,
            price_usd: parseFloat(v.price_usd) || 0,
            price_idr: parseFloat(v.price_idr) || 0,
            stock_quantity: parseInt(v.stock_quantity) || 0,
            image_url: v.image_url
          })),
        })
      })

      if (response.ok) {
        toast.success('Product updated successfully!', {
          description: 'Redirecting to products page...'
        })
        setTimeout(() => router.push('/cms/products'), 1000)
      } else {
        const errorData = await response.json()
        toast.error('Failed to update product', {
          description: errorData.error || 'Unknown error occurred'
        })
      }
    } catch (error: any) {
      console.error('Error updating product:', error)
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

  if (fetching) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading product...</div>
      </div>
    )
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
          <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
          <p className="mt-2 text-gray-600">Update product information</p>
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
                Product SKU *
              </label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleChange}
                required
                placeholder="e.g., MYK-OUD-001"
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

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Brand *
              </label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                required
                placeholder="e.g., Mykonos"
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
              />
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

          {/* Pricing Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Pricing</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Selling Price (USD) *
                </label>
                <input
                  type="number"
                  name="price_usd"
                  value={formData.price_usd}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Selling Price (IDR) *
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
                  Compare-at Price (USD)
                </label>
                <input
                  type="number"
                  name="compare_at_price"
                  value={formData.compare_at_price}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="Original price for sales"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
              </div>
            </div>
          </div>

          {/* Inventory Section */}
          <div className="space-y-4">
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
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="allow_backorder"
                checked={formData.allow_backorder}
                onChange={(e) => setFormData(prev => ({ ...prev, allow_backorder: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold"
              />
              <label className="text-sm font-medium text-gray-700">
                Allow Backorders (when out of stock)
              </label>
            </div>
          </div>

          {/* Product Details Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Product Details</h3>
            <div className="grid gap-6 md:grid-cols-2">

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
            </div>
          </div>

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

          {/* Shipping & Package Dimensions Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Shipping & Package Dimensions</h3>
            <div className="grid gap-6 md:grid-cols-4">
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
                  Length (cm)
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
                  Width (cm)
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
                  Height (cm)
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
            </div>
          </div>

          {/* SEO Fields Section */}
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
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="halal_certified"
                checked={formData.halal_certified}
                onChange={(e) => setFormData(prev => ({ ...prev, halal_certified: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold"
              />
              <label className="text-sm font-medium text-gray-700">
                Halal Certified
              </label>
            </div>
          </div>

          {/* Purchase Limits Section */}
          <div className="space-y-4">
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

          {/* Pre-Order Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Pre-Order Settings</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  name="is_pre_order"
                  checked={formData.is_pre_order}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_pre_order: e.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-luxury-gold focus:ring-luxury-gold"
                />
                <label className="text-sm font-medium text-gray-700">
                  Enable Pre-Order
                </label>
              </div>

              {formData.is_pre_order && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Pre-Order Duration (days)
                  </label>
                  <input
                    type="number"
                    name="pre_order_duration_days"
                    value={formData.pre_order_duration_days}
                    onChange={handleChange}
                    min="1"
                    placeholder="e.g., 14"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Scheduled Publish Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Publishing & Status</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Product Status *
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Scheduled Publish Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  name="scheduled_publish_date"
                  value={formData.scheduled_publish_date}
                  onChange={handleChange}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                />
                <p className="mt-1 text-xs text-gray-500">Leave empty to publish immediately</p>
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
                Featured Product (Show on homepage)
              </label>
            </div>
          </div>

          {/* Product Tags & Sorting Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Product Tags & Sorting</h3>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Rating (0.0 - 5.0)
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
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pilih Lokal (Show local product badge)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, pilih_lokal: true }))}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                      formData.pilih_lokal
                        ? 'bg-[#C2A36B] text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    True
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, pilih_lokal: false }))}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                      !formData.pilih_lokal
                        ? 'bg-[#C2A36B] text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    False
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Popular Product (Show in popular filter)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, is_popular: true }))}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                      formData.is_popular
                        ? 'bg-[#C2A36B] text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    True
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, is_popular: false }))}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                      !formData.is_popular
                        ? 'bg-[#C2A36B] text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    False
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Best Selling (Show in best selling filter)
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, is_best_selling: true }))}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                      formData.is_best_selling
                        ? 'bg-[#C2A36B] text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    True
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, is_best_selling: false }))}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                      !formData.is_best_selling
                        ? 'bg-[#C2A36B] text-white shadow-sm'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    False
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Discounts Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Bulk Discounts</h3>
              <Button
                type="button"
                onClick={() => setBulkDiscounts([...bulkDiscounts, { quantity: '', discount_percentage: '' }])}
                variant="outline"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Discount Tier
              </Button>
            </div>
            {bulkDiscounts.map((discount, index) => (
              <div key={index} className="grid gap-4 md:grid-cols-3 items-end">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={discount.quantity}
                    onChange={(e) => {
                      const newDiscounts = [...bulkDiscounts]
                      newDiscounts[index].quantity = e.target.value
                      setBulkDiscounts(newDiscounts)
                    }}
                    min="1"
                    placeholder="e.g., 10"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Discount %
                  </label>
                  <input
                    type="number"
                    value={discount.discount_percentage}
                    onChange={(e) => {
                      const newDiscounts = [...bulkDiscounts]
                      newDiscounts[index].discount_percentage = e.target.value
                      setBulkDiscounts(newDiscounts)
                    }}
                    min="0"
                    max="100"
                    step="0.01"
                    placeholder="e.g., 10"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                  />
                </div>
                <Button
                  type="button"
                  onClick={() => setBulkDiscounts(bulkDiscounts.filter((_, i) => i !== index))}
                  variant="destructive"
                  size="sm"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* Product Variants Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Product Variants</h3>
              <div className="flex gap-2">
                {variants.length > 0 && (
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
                <Button
                  type="button"
                  onClick={() => setVariants([...variants, { name: '', sku: '', price_usd: '', price_idr: '', stock_quantity: '', image_url: '' }])}
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
                    <label className="block text-sm font-medium text-gray-700">
                      Variant Name *
                    </label>
                    <input
                      type="text"
                      value={variant.name}
                      onChange={(e) => {
                        const newVariants = [...variants]
                        newVariants[index].name = e.target.value
                        setVariants(newVariants)
                      }}
                      placeholder="e.g., 50ml, Blue, Large"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      SKU
                    </label>
                    <input
                      type="text"
                      value={variant.sku}
                      onChange={(e) => {
                        const newVariants = [...variants]
                        newVariants[index].sku = e.target.value
                        setVariants(newVariants)
                      }}
                      placeholder="e.g., MYK-50ML-001"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Price (USD)
                    </label>
                    <input
                      type="number"
                      value={variant.price_usd}
                      onChange={(e) => {
                        const newVariants = [...variants]
                        newVariants[index].price_usd = e.target.value
                        setVariants(newVariants)
                      }}
                      step="0.01"
                      min="0"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Price (IDR)
                    </label>
                    <input
                      type="number"
                      value={variant.price_idr}
                      onChange={(e) => {
                        const newVariants = [...variants]
                        newVariants[index].price_idr = e.target.value
                        setVariants(newVariants)
                      }}
                      step="0.01"
                      min="0"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Stock Quantity
                    </label>
                    <input
                      type="number"
                      value={variant.stock_quantity}
                      onChange={(e) => {
                        const newVariants = [...variants]
                        newVariants[index].stock_quantity = e.target.value
                        setVariants(newVariants)
                      }}
                      min="0"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Image URL
                    </label>
                    <input
                      type="text"
                      value={variant.image_url}
                      onChange={(e) => {
                        const newVariants = [...variants]
                        newVariants[index].image_url = e.target.value
                        setVariants(newVariants)
                      }}
                      placeholder="https://..."
                      className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                    />
                  </div>
                </div>
              </div>
            ))}
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
                <div className="mt-4 space-y-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="rounded-lg border border-gray-200 p-4">
                      <div className="flex gap-4">
                        <div className="relative flex-shrink-0">
                          <img
                            src={preview}
                            alt={`Preview ${index + 1}`}
                            className="h-24 w-24 rounded-lg object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(index)}
                            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                        <div className="flex-1">
                          <label className="block text-sm font-medium text-gray-700">
                            Alt Text (for SEO & Accessibility)
                          </label>
                          <input
                            type="text"
                            value={imageAltTexts[index] || ''}
                            onChange={(e) => {
                              const newAltTexts = [...imageAltTexts]
                              newAltTexts[index] = e.target.value
                              setImageAltTexts(newAltTexts)
                            }}
                            placeholder="e.g., Mykonos Oud Royale perfume bottle"
                            className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-luxury-gold focus:outline-none focus:ring-2 focus:ring-luxury-gold/20"
                          />
                        </div>
                      </div>
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

          <div className="flex gap-4 border-t border-gray-200 pt-6">
            <Button
              type="submit"
              disabled={loading || uploadingMedia}
              className="bg-luxury-gold text-luxury-navy hover:bg-luxury-gold/90"
            >
              {uploadingMedia ? 'Uploading Media...' : loading ? 'Updating...' : 'Update Product'}
            </Button>
            <Link href="/cms/products">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
          </div>
        </div>
      </form>

      {/* Variant Stock Modal */}
      {variants.length > 0 && (
        <VariantStockModal
          isOpen={variantStockModalOpen}
          onClose={() => setVariantStockModalOpen(false)}
          product={{
            id: productId,
            name: formData.name,
            variants: variants.map(v => ({
              name: v.name,
              sku: v.sku,
              price_usd: parseFloat(v.price_usd) || 0,
              price_idr: parseFloat(v.price_idr) || 0,
              stock_quantity: parseInt(v.stock_quantity) || 0,
              image_url: v.image_url
            }))
          }}
          onUpdate={fetchProduct}
        />
      )}
    </div>
  )
}
