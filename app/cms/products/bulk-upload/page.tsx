'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Upload, Download, FileSpreadsheet, Image as ImageIcon, Video, CheckCircle, AlertCircle, ArrowLeft, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { BulkMediaUpload } from '@/components/admin/BulkMediaUpload'

interface ParsedProduct {
  name: string
  sku: string
  fragrance_family: string
  collection: string
  gender: string
  description: string
  price_usd: string
  price_idr: string
  cost_price_usd: string
  cost_price_idr: string
  tax_enabled: string
  stock_quantity: string
  low_stock_threshold: string
  in_stock: string
  min_purchase_quantity: string
  max_purchase_quantity: string
  top_notes: string
  middle_notes: string
  base_notes: string
  formulation: string
  volume_ml: string
  country_of_origin: string
  shelf_life_months: string
  weight_grams: string
  shipping_weight_grams: string
  package_length_cm: string
  package_width_cm: string
  package_height_cm: string
  ships_from: string
  shipping_period_days: string
  is_pre_order: string
  pre_order_duration_days: string
  status: string
  scheduled_publish_date: string
  new_product_duration_days: string
  manufacturing_date: string
  expiration_date: string
  bpom_number: string
  pilih_lokal: string
  is_popular: string
  is_best_selling: string
  rating: string
  products_sold: string
  variants: Array<{
    name: string
    sku: string
    price_usd: string
    price_idr: string
    stock_quantity: string
    low_stock_threshold: string
    in_stock: string
    min_purchase_quantity: string
    max_purchase_quantity: string
    image_url: string
  }>
  rowIndices: number[]
}

interface AuditLog {
  id: string
  user_email: string
  uploaded_at: string
  csv_filename: string
  total_products: number
  successful_products: number
  failed_products: number
  media_uploaded_count: number
  duration_ms: number
}

export default function BulkUploadWithMediaPage() {
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [uploadErrors, setUploadErrors] = useState<any[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([])
  const [previewData, setPreviewData] = useState<{ csvFile: File | null, mediaFiles: File[] }>({ csvFile: null, mediaFiles: [] })
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  const fetchAuditLogs = async () => {
    setLoadingLogs(true)
    try {
      const { data, error } = await supabase
        .from('bulk_upload_audit_logs')
        .select('*')
        .order('uploaded_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setAuditLogs(data || [])
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
    } finally {
      setLoadingLogs(false)
    }
  }

  useEffect(() => {
    fetchAuditLogs()
  }, [])

  const downloadTemplate = () => {
    const headers = [
      'Product Name', 'Product SKU', 'Category (Fragrance Family)', 'Collection', 'Gender', 'Description',
      'Base Price (USD)', 'Base Price (IDR)', 'Cost Price (USD)', 'Cost Price (IDR)', 'Tax Enabled',
      'Stock Quantity', 'Low Stock Threshold', 'In Stock', 'Minimum Purchase Quantity', 'Maximum Purchase Quantity',
      'Top Notes', 'Middle Notes', 'Base Notes', 'Formulation', 'Volume (ml)',
      'Country of Origin', 'Shelf Life (months)', 'Product Weight (grams)', 'Shipping Weight (grams)',
      'Package Length (cm)', 'Package Width (cm)', 'Package Height (cm)', 'Ships From', 'Shipping Period (days)',
      'Pre-Order', 'Pre-Order Duration (days)', 'Status', 'Scheduled Publish Date', 'New Badge Duration (days)',
      'Variant Name', 'Variant SKU', 'Variant Price (USD)', 'Variant Price (IDR)',
      'Variant Low Stock Quantity', 'Variant Low Stock Threshold', 'Variant In Stock',
      'Variant Minimum Purchase Quantity', 'Variant Maximum Purchase Quantity', 'Variant Image URL',
      'Manufacturing Date', 'Expiration Date', 'Official Distribution Authorization No. (BPOM, PIRT)',
      'Pilih Lokal (Local Product)', 'Mark as Popular', 'Mark as Best Selling', 'Rating (0-5)', 'Products Sold'
    ]

    const exampleRow = [
      'Mykonos - Inception Extrait de Parfum 50ml & 100ml', '', 'Oriental', 'Extrait de Parfum', 'Unisex',
      'The fragrance begins with the sharp clarity of Bergamot, Ginger, and bright citrus notes',
      '', '', '', '', 'TRUE',
      '', '', 'TRUE', '1', '2',
      'Bergamot, Ginger, Orange, Lemon', 'Neroli, Cinnamon, Black Tea, Biga Flower', 'Guaiac, Musk, Cedarwood, LorenoxTM',
      'Spray', '',
      '', '24', '150', '220',
      '10', '8', '15', 'KOTA JAKARTA TIMUR', '3',
      'TRUE', '30', 'active', '', '59',
      'Mykonos - Inception Extrait de Parfum 50ml', 'MYK-INCEPTION-50ML', '50', '750000',
      '0', '10', 'TRUE',
      '1', '2', 'inception-50ml.jpg',
      '2024-01-01', '2027-01-01', 'NA18250611824',
      'TRUE', 'TRUE', 'TRUE', '4.9', '10000'
    ]

    const csv = [headers.join(','), exampleRow.join(',')].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bulk_upload_with_media_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Template downloaded')
  }

  const handleCSVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.name.endsWith('.csv')) {
      setCsvFile(file)
      toast.success('CSV file selected')
    } else {
      toast.error('Please select a CSV file')
    }
  }

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setMediaFiles(files)
    toast.success(`${files.length} media files selected`)
  }

  const parseNumber = (value: string): number => {
    if (!value || value.trim() === '') return 0
    // Remove commas and parse
    const cleaned = value.replace(/,/g, '')
    const num = Number(cleaned)
    return isNaN(num) ? 0 : num
  }

  const parseCSVRobust = (text: string): string[][] => {
    const rows: string[][] = []
    let currentRow: string[] = []
    let currentCell = ''
    let inQuotes = false
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const nextChar = text[i + 1]
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentCell += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (char === ',' && !inQuotes) {
        currentRow.push(currentCell.trim())
        currentCell = ''
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++
        }
        if (currentCell || currentRow.length > 0) {
          currentRow.push(currentCell.trim())
          if (currentRow.some(cell => cell.length > 0)) {
            rows.push(currentRow)
          }
          currentRow = []
          currentCell = ''
        }
      } else {
        currentCell += char
      }
    }
    
    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell.trim())
      if (currentRow.some(cell => cell.length > 0)) {
        rows.push(currentRow)
      }
    }
    
    return rows
  }

  const parseCSVPreview = async (file: File) => {
    const text = await file.text()
    const rows = parseCSVRobust(text)
    
    if (rows.length < 2) {
      toast.error('CSV file is empty')
      return []
    }

    const headers = rows[0]
    const dataRows = rows.slice(1)
    
    // Map all column names
    const nameIdx = headers.findIndex(h => h === 'Product Name')
    const skuIdx = headers.findIndex(h => h === 'Product SKU')
    const categoryIdx = headers.findIndex(h => h === 'Category (Fragrance Family)')
    const collectionIdx = headers.findIndex(h => h === 'Collection')
    const genderIdx = headers.findIndex(h => h === 'Gender')
    const descriptionIdx = headers.findIndex(h => h === 'Description')
    const priceUsdIdx = headers.findIndex(h => h === 'Base Price (USD)')
    const priceIdrIdx = headers.findIndex(h => h === 'Base Price (IDR)')
    const costPriceUsdIdx = headers.findIndex(h => h === 'Cost Price (USD)')
    const costPriceIdrIdx = headers.findIndex(h => h === 'Cost Price (IDR)')
    const taxEnabledIdx = headers.findIndex(h => h === 'Tax Enabled')
    const stockQtyIdx = headers.findIndex(h => h === 'Stock Quantity')
    const lowStockIdx = headers.findIndex(h => h === 'Low Stock Threshold')
    const inStockIdx = headers.findIndex(h => h === 'In Stock')
    const minPurchaseIdx = headers.findIndex(h => h === 'Minimum Purchase Quantity')
    const maxPurchaseIdx = headers.findIndex(h => h === 'Maximum Purchase Quantity')
    const topNotesIdx = headers.findIndex(h => h === 'Top Notes')
    const middleNotesIdx = headers.findIndex(h => h === 'Middle Notes')
    const baseNotesIdx = headers.findIndex(h => h === 'Base Notes')
    const formulationIdx = headers.findIndex(h => h === 'Formulation')
    const volumeIdx = headers.findIndex(h => h === 'Volume (ml)')
    const countryIdx = headers.findIndex(h => h === 'Country of Origin')
    const shelfLifeIdx = headers.findIndex(h => h === 'Shelf Life (months)')
    const weightIdx = headers.findIndex(h => h === 'Product Weight (grams)')
    const shippingWeightIdx = headers.findIndex(h => h === 'Shipping Weight (grams)')
    const packageLengthIdx = headers.findIndex(h => h === 'Package Length (cm)')
    const packageWidthIdx = headers.findIndex(h => h === 'Package Width (cm)')
    const packageHeightIdx = headers.findIndex(h => h === 'Package Height (cm)')
    const shipsFromIdx = headers.findIndex(h => h === 'Ships From')
    const shippingPeriodIdx = headers.findIndex(h => h === 'Shipping Period (days)')
    const preOrderIdx = headers.findIndex(h => h === 'Pre-Order')
    const preOrderDurationIdx = headers.findIndex(h => h === 'Pre-Order Duration (days)')
    const statusIdx = headers.findIndex(h => h === 'Status')
    const scheduledPublishIdx = headers.findIndex(h => h === 'Scheduled Publish Date')
    const newBadgeDurationIdx = headers.findIndex(h => h === 'New Badge Duration (days)')
    const mfgDateIdx = headers.findIndex(h => h === 'Manufacturing Date')
    const expDateIdx = headers.findIndex(h => h === 'Expiration Date')
    const bpomIdx = headers.findIndex(h => h === 'Official Distribution Authorization No. (BPOM, PIRT)')
    const pilihLokalIdx = headers.findIndex(h => h === 'Pilih Lokal (Local Product)')
    const popularIdx = headers.findIndex(h => h === 'Mark as Popular')
    const bestSellingIdx = headers.findIndex(h => h === 'Mark as Best Selling')
    const ratingIdx = headers.findIndex(h => h === 'Rating (0-5)')
    const soldIdx = headers.findIndex(h => h === 'Products Sold')
    
    // Variant columns
    const variantNameIdx = headers.findIndex(h => h === 'Variant Name')
    const variantSkuIdx = headers.findIndex(h => h === 'Variant SKU')
    const variantPriceUsdIdx = headers.findIndex(h => h === 'Variant Price (USD)')
    const variantPriceIdrIdx = headers.findIndex(h => h === 'Variant Price (IDR)')
    const variantStockIdx = headers.findIndex(h => h === 'Variant Low Stock Quantity')
    const variantLowStockIdx = headers.findIndex(h => h === 'Variant Low Stock Threshold')
    const variantInStockIdx = headers.findIndex(h => h === 'Variant In Stock')
    const variantMinPurchaseIdx = headers.findIndex(h => h === 'Variant Minimum Purchase Quantity')
    const variantMaxPurchaseIdx = headers.findIndex(h => h === 'Variant Maximum Purchase Quantity')
    const variantImageIdx = headers.findIndex(h => h === 'Variant Image URL')

    // Group by product name
    const productMap = new Map<string, any>()
    let lastProductName = ''

    dataRows.forEach((row, index) => {
      const productName = row[nameIdx] || lastProductName
      
      if (productName) {
        lastProductName = productName
        
        if (!productMap.has(productName)) {
          productMap.set(productName, {
            name: productName,
            sku: row[skuIdx] || '',
            fragrance_family: row[categoryIdx] || '',
            collection: row[collectionIdx] || '',
            gender: row[genderIdx] || '',
            description: row[descriptionIdx] || '',
            price_usd: row[priceUsdIdx] || '',
            price_idr: row[priceIdrIdx] || '',
            cost_price_usd: row[costPriceUsdIdx] || '',
            cost_price_idr: row[costPriceIdrIdx] || '',
            tax_enabled: row[taxEnabledIdx] || '',
            stock_quantity: row[stockQtyIdx] || '',
            low_stock_threshold: row[lowStockIdx] || '',
            in_stock: row[inStockIdx] || '',
            min_purchase_quantity: row[minPurchaseIdx] || '',
            max_purchase_quantity: row[maxPurchaseIdx] || '',
            top_notes: row[topNotesIdx] || '',
            middle_notes: row[middleNotesIdx] || '',
            base_notes: row[baseNotesIdx] || '',
            formulation: row[formulationIdx] || '',
            volume_ml: row[volumeIdx] || '',
            country_of_origin: row[countryIdx] || '',
            shelf_life_months: row[shelfLifeIdx] || '',
            weight_grams: row[weightIdx] || '',
            shipping_weight_grams: row[shippingWeightIdx] || '',
            package_length_cm: row[packageLengthIdx] || '',
            package_width_cm: row[packageWidthIdx] || '',
            package_height_cm: row[packageHeightIdx] || '',
            ships_from: row[shipsFromIdx] || '',
            shipping_period_days: row[shippingPeriodIdx] || '',
            is_pre_order: row[preOrderIdx] || '',
            pre_order_duration_days: row[preOrderDurationIdx] || '',
            status: row[statusIdx] || '',
            scheduled_publish_date: row[scheduledPublishIdx] || '',
            new_product_duration_days: row[newBadgeDurationIdx] || '',
            manufacturing_date: row[mfgDateIdx] || '',
            expiration_date: row[expDateIdx] || '',
            bpom_number: row[bpomIdx] || '',
            pilih_lokal: row[pilihLokalIdx] || '',
            is_popular: row[popularIdx] || '',
            is_best_selling: row[bestSellingIdx] || '',
            rating: row[ratingIdx] || '',
            products_sold: row[soldIdx] || '',
            variants: [],
            rowIndices: []
          })
        }
        
        const product = productMap.get(productName)!
        product.rowIndices.push(index + 2)
        
        if (row[variantNameIdx]) {
          product.variants.push({
            name: row[variantNameIdx],
            sku: row[variantSkuIdx] || '',
            price_usd: row[variantPriceUsdIdx] || '',
            price_idr: row[variantPriceIdrIdx] || '',
            stock_quantity: row[variantStockIdx] || '',
            low_stock_threshold: row[variantLowStockIdx] || '',
            in_stock: row[variantInStockIdx] || '',
            min_purchase_quantity: row[variantMinPurchaseIdx] || '',
            max_purchase_quantity: row[variantMaxPurchaseIdx] || '',
            image_url: row[variantImageIdx] || ''
          })
        }
      }
    })

    return Array.from(productMap.values())
  }

  const handleUpload = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file')
      return
    }

    setUploading(true)

    try {
      // Parse CSV and show preview
      const products = await parseCSVPreview(csvFile)
      setParsedProducts(products)
      setPreviewData({ csvFile, mediaFiles })
      setShowPreview(true)
      toast.success(`Parsed ${products.length} products from CSV`)
    } catch (error: any) {
      console.error('Parse error:', error)
      toast.error('Failed to parse CSV: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  const confirmUpload = async () => {
    if (!previewData.csvFile) return

    setUploading(true)
    setShowPreview(false)
    setUploadComplete(false)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Authentication required')
        return
      }

      const formData = new FormData()
      formData.append('csvFile', previewData.csvFile)
      
      previewData.mediaFiles.forEach(file => {
        formData.append('mediaFiles', file)
      })

      const response = await fetch('/api/products/bulk-upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        setStats(result.stats)
        setUploadErrors(result.errors || [])
        setUploadComplete(true)
        
        if (result.stats.failed > 0) {
          toast.warning(`Uploaded ${result.stats.successful} products. ${result.stats.failed} failed (see details below)`)
        } else {
          toast.success(`Successfully uploaded ${result.stats.successful} products!`)
        }
        // Refresh audit logs
        fetchAuditLogs()
      } else {
        toast.error(result.error || 'Upload failed')
        if (result.errors) {
          setUploadErrors(result.errors)
        }
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error('Upload failed: ' + error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <>
      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-900">Preview Upload Data</h2>
              <p className="text-sm text-gray-600 mt-1">
                Review the parsed data before uploading to database
              </p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {parsedProducts.map((product, idx) => (
                  <div key={idx} className="border rounded-lg p-6 bg-white shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="font-bold text-xl text-gray-900">{product.name}</h3>
                      <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        CSV Rows: {product.rowIndices.join(', ')}
                      </div>
                    </div>

                    {/* Basic Info */}
                    <div className="mb-4">
                      <h4 className="font-semibold text-sm text-gray-700 mb-2 pb-1 border-b">Basic Information</h4>
                      <div className="grid grid-cols-4 gap-3 text-sm">
                        <div><span className="text-gray-600">SKU:</span> <span className="font-medium">{product.sku || 'N/A'}</span></div>
                        <div><span className="text-gray-600">Category:</span> <span className="font-medium">{product.fragrance_family || 'N/A'}</span></div>
                        <div><span className="text-gray-600">Collection:</span> <span className="font-medium">{product.collection || 'N/A'}</span></div>
                        <div><span className="text-gray-600">Gender:</span> <span className="font-medium">{product.gender || 'N/A'}</span></div>
                      </div>
                    </div>

                    {/* Pricing & Inventory */}
                    <div className="mb-4">
                      <h4 className="font-semibold text-sm text-gray-700 mb-2 pb-1 border-b">Pricing & Inventory</h4>
                      <div className="grid grid-cols-4 gap-3 text-sm">
                        <div><span className="text-gray-600">Price USD:</span> <span className="font-medium">${product.price_usd ? parseNumber(product.price_usd).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : 'N/A'}</span></div>
                        <div><span className="text-gray-600">Price IDR:</span> <span className="font-medium">Rp {product.price_idr ? parseNumber(product.price_idr).toLocaleString('id-ID') : 'N/A'}</span></div>
                        <div><span className="text-gray-600">Cost USD:</span> <span className="font-medium">${product.cost_price_usd ? parseNumber(product.cost_price_usd).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) : 'N/A'}</span></div>
                        <div><span className="text-gray-600">Cost IDR:</span> <span className="font-medium">Rp {product.cost_price_idr ? parseNumber(product.cost_price_idr).toLocaleString('id-ID') : 'N/A'}</span></div>
                        <div><span className="text-gray-600">Stock:</span> <span className="font-medium">{product.stock_quantity || 'N/A'}</span></div>
                        <div><span className="text-gray-600">Low Stock:</span> <span className="font-medium">{product.low_stock_threshold || 'N/A'}</span></div>
                        <div><span className="text-gray-600">In Stock:</span> <span className="font-medium">{product.in_stock || 'N/A'}</span></div>
                        <div><span className="text-gray-600">Tax:</span> <span className="font-medium">{product.tax_enabled || 'N/A'}</span></div>
                        <div><span className="text-gray-600">Min Purchase:</span> <span className="font-medium">{product.min_purchase_quantity || 'N/A'}</span></div>
                        <div><span className="text-gray-600">Max Purchase:</span> <span className="font-medium">{product.max_purchase_quantity || 'N/A'}</span></div>
                      </div>
                    </div>

                    {/* Fragrance Details */}
                    <div className="mb-4">
                      <h4 className="font-semibold text-sm text-gray-700 mb-2 pb-1 border-b">Fragrance Details</h4>
                      <div className="grid grid-cols-3 gap-3 text-sm mb-2">
                        <div><span className="text-gray-600">Formulation:</span> <span className="font-medium">{product.formulation || 'N/A'}</span></div>
                        <div><span className="text-gray-600">Volume:</span> <span className="font-medium">{product.volume_ml ? `${product.volume_ml}ml` : 'N/A'}</span></div>
                        <div><span className="text-gray-600">Country:</span> <span className="font-medium">{product.country_of_origin || 'N/A'}</span></div>
                      </div>
                      {(product.top_notes || product.middle_notes || product.base_notes) && (
                        <div className="grid grid-cols-3 gap-3 text-sm">
                          <div><span className="text-gray-600">Top Notes:</span> <span className="font-medium text-xs">{product.top_notes || 'N/A'}</span></div>
                          <div><span className="text-gray-600">Middle Notes:</span> <span className="font-medium text-xs">{product.middle_notes || 'N/A'}</span></div>
                          <div><span className="text-gray-600">Base Notes:</span> <span className="font-medium text-xs">{product.base_notes || 'N/A'}</span></div>
                        </div>
                      )}
                    </div>

                    {/* Shipping */}
                    <div className="mb-4">
                      <h4 className="font-semibold text-sm text-gray-700 mb-2 pb-1 border-b">Shipping & Dimensions</h4>
                      <div className="grid grid-cols-5 gap-3 text-sm">
                        <div><span className="text-gray-600">Weight:</span> <span className="font-medium">{product.weight_grams ? `${product.weight_grams}g` : 'N/A'}</span></div>
                        <div><span className="text-gray-600">Ship Weight:</span> <span className="font-medium">{product.shipping_weight_grams ? `${product.shipping_weight_grams}g` : 'N/A'}</span></div>
                        <div><span className="text-gray-600">L×W×H:</span> <span className="font-medium text-xs">{product.package_length_cm && product.package_width_cm && product.package_height_cm ? `${product.package_length_cm}×${product.package_width_cm}×${product.package_height_cm}cm` : 'N/A'}</span></div>
                        <div><span className="text-gray-600">Ships From:</span> <span className="font-medium text-xs">{product.ships_from || 'N/A'}</span></div>
                        <div><span className="text-gray-600">Ship Period:</span> <span className="font-medium">{product.shipping_period_days ? `${product.shipping_period_days} days` : 'N/A'}</span></div>
                      </div>
                    </div>

                    {/* Publishing & Marketing */}
                    <div className="mb-4">
                      <h4 className="font-semibold text-sm text-gray-700 mb-2 pb-1 border-b">Publishing & Marketing</h4>
                      <div className="grid grid-cols-5 gap-3 text-sm">
                        <div><span className="text-gray-600">Status:</span> <span className="font-medium capitalize">{product.status || 'N/A'}</span></div>
                        <div><span className="text-gray-600">Pre-Order:</span> <span className="font-medium">{product.is_pre_order || 'N/A'}</span></div>
                        <div><span className="text-gray-600">Pilih Lokal:</span> <span className="font-medium">{product.pilih_lokal || 'N/A'}</span></div>
                        <div><span className="text-gray-600">Popular:</span> <span className="font-medium">{product.is_popular || 'N/A'}</span></div>
                        <div><span className="text-gray-600">Best Selling:</span> <span className="font-medium">{product.is_best_selling || 'N/A'}</span></div>
                        <div><span className="text-gray-600">Rating:</span> <span className="font-medium">{product.rating || 'N/A'}</span></div>
                        <div><span className="text-gray-600">Sold:</span> <span className="font-medium">{product.products_sold || 'N/A'}</span></div>
                        <div><span className="text-gray-600">New Badge:</span> <span className="font-medium">{product.new_product_duration_days ? `${product.new_product_duration_days} days` : 'N/A'}</span></div>
                      </div>
                    </div>

                    {/* Compliance */}
                    <div className="mb-4">
                      <h4 className="font-semibold text-sm text-gray-700 mb-2 pb-1 border-b">Compliance & Dates</h4>
                      <div className="grid grid-cols-4 gap-3 text-sm">
                        <div><span className="text-gray-600">BPOM:</span> <span className="font-medium text-xs">{product.bpom_number || 'N/A'}</span></div>
                        <div><span className="text-gray-600">Shelf Life:</span> <span className="font-medium">{product.shelf_life_months ? `${product.shelf_life_months} months` : 'N/A'}</span></div>
                        <div><span className="text-gray-600">Mfg Date:</span> <span className="font-medium">{product.manufacturing_date || 'N/A'}</span></div>
                        <div><span className="text-gray-600">Exp Date:</span> <span className="font-medium">{product.expiration_date || 'N/A'}</span></div>
                      </div>
                    </div>

                    {/* Description */}
                    {product.description && (
                      <div className="mb-4">
                        <h4 className="font-semibold text-sm text-gray-700 mb-2 pb-1 border-b">Description</h4>
                        <p className="text-sm text-gray-700 whitespace-pre-line line-clamp-4">{product.description}</p>
                      </div>
                    )}
                    
                    {product.variants.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                          Variants ({product.variants.length})
                        </h4>
                        <div className="space-y-2">
                          {product.variants.map((variant, vIdx) => (
                            <div key={vIdx} className="bg-gray-50 rounded p-3 border">
                              <div className="font-semibold text-sm mb-2">{variant.name}</div>
                              <div className="grid grid-cols-5 gap-3 text-xs">
                                <div>
                                  <span className="text-gray-600">SKU:</span>{' '}
                                  <span className="font-medium">{variant.sku || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Price USD:</span>{' '}
                                  <span className="font-medium">
                                    ${variant.price_usd ? parseNumber(variant.price_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Price IDR:</span>{' '}
                                  <span className="font-medium">
                                    Rp {variant.price_idr ? parseNumber(variant.price_idr).toLocaleString('id-ID') : '0'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Stock:</span>{' '}
                                  <span className="font-medium">{variant.stock_quantity || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Low Stock:</span>{' '}
                                  <span className="font-medium">{variant.low_stock_threshold || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">In Stock:</span>{' '}
                                  <span className="font-medium">{variant.in_stock || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Min Purchase:</span>{' '}
                                  <span className="font-medium">{variant.min_purchase_quantity || 'N/A'}</span>
                                </div>
                                <div>
                                  <span className="text-gray-600">Max Purchase:</span>{' '}
                                  <span className="font-medium">{variant.max_purchase_quantity || 'N/A'}</span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-gray-600">Image URL:</span>{' '}
                                  <span className="font-medium text-xs truncate block">{variant.image_url || 'N/A'}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                <strong>{parsedProducts.length}</strong> products with{' '}
                <strong>{parsedProducts.reduce((sum, p) => sum + p.variants.length, 0)}</strong> total variants
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(false)}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmUpload}
                  disabled={uploading}
                  className="bg-luxury-gold text-luxury-navy hover:bg-luxury-gold/90"
                >
                  {uploading ? 'Uploading...' : 'Confirm & Upload'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <Link href="/cms/products">
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Button>
          </Link>
        </div>

      <div className="rounded-lg bg-blue-50 p-6 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3">How It Works</h3>
        <ol className="space-y-2 text-sm text-blue-800">
          <li className="flex gap-2">
            <span className="font-bold">1.</span>
            <span>Download the CSV template and fill in product data</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">2.</span>
            <span><strong>Optional:</strong> In the <strong>images</strong> column, list image filenames separated by commas (e.g., "product-1.jpg, product-2.jpg")</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">3.</span>
            <span><strong>Optional:</strong> In the <strong>videos</strong> column, list video filenames separated by commas (e.g., "promo.mp4")</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">4.</span>
            <span>Upload the CSV file (media files are optional)</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">5.</span>
            <span>If media files are uploaded, system automatically matches filenames and attaches media to products</span>
          </li>
        </ol>
      </div>

      {/* Download Template */}
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="flex items-start gap-4">
          <FileSpreadsheet className="h-6 w-6 text-luxury-gold flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Step 1: Download Template</h3>
            <p className="mt-1 text-sm text-gray-600">
              Download the CSV template with image and video filename columns
            </p>
            <Button
              onClick={downloadTemplate}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              <Download className="mr-2 h-4 w-4" />
              Download Template
            </Button>
          </div>
        </div>
      </div>

      {/* Upload CSV */}
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="flex items-start gap-4">
          <FileSpreadsheet className="h-6 w-6 text-luxury-gold flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Step 2: Upload CSV File</h3>
            <p className="mt-1 text-sm text-gray-600 mb-3">
              Upload your filled CSV with product data and media filenames
            </p>
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVChange}
              disabled={uploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-luxury-gold file:text-luxury-navy hover:file:bg-luxury-gold/90"
            />
            {csvFile && (
              <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                {csvFile.name}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Media */}
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="flex items-start gap-4">
          <ImageIcon className="h-6 w-6 text-luxury-gold flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Step 3: Upload Media Files (Optional)</h3>
            <p className="mt-1 text-sm text-gray-600 mb-3">
              Select all images and videos referenced in your CSV (optional - you can upload CSV without media)
            </p>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleMediaChange}
              disabled={uploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-luxury-gold file:text-luxury-navy hover:file:bg-luxury-gold/90"
            />
            {mediaFiles.length > 0 && (
              <div className="mt-3 space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  {mediaFiles.length} files selected
                </div>
                <div className="max-h-40 overflow-y-auto rounded border border-gray-200 p-2">
                  {mediaFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs text-gray-600 py-1">
                      {file.type.startsWith('image/') ? (
                        <ImageIcon className="h-3 w-3" />
                      ) : (
                        <Video className="h-3 w-3" />
                      )}
                      {file.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upload Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleUpload}
          disabled={!csvFile || uploading}
          className="bg-luxury-gold text-luxury-navy hover:bg-luxury-gold/90"
          size="lg"
        >
          <Upload className="mr-2 h-5 w-5" />
          {uploading ? 'Uploading...' : mediaFiles.length > 0 ? 'Upload Products with Media' : 'Upload Products'}
        </Button>
      </div>

      {/* Results */}
      {uploadComplete && stats && (
        <div className="space-y-4">
          <div className={`rounded-lg p-6 border ${stats.failed > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'}`}>
            <div className="flex items-start gap-4">
              {stats.failed > 0 ? (
                <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-1" />
              ) : (
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
              )}
              <div className="flex-1">
                <h3 className={`font-semibold ${stats.failed > 0 ? 'text-yellow-900' : 'text-green-900'}`}>
                  {stats.failed > 0 ? 'Upload Completed with Warnings' : 'Upload Complete!'}
                </h3>
                <div className="mt-2 space-y-1 text-sm">
                  <p className="text-green-800">✓ Uploaded {stats.mediaUploaded} media files</p>
                  <p className="text-green-800">✓ Created {stats.successful} products</p>
                  {stats.failed > 0 && (
                    <p className="text-red-600 font-medium">✗ {stats.failed} products failed or skipped</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Error Details */}
          {uploadErrors.length > 0 && (
            <div className="rounded-lg bg-red-50 p-6 border border-red-200">
              <div className="flex items-start gap-4">
                <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-red-900 mb-3">Upload Errors & Warnings</h3>
                  <div className="space-y-3">
                    {uploadErrors.map((error, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-4 border border-red-200">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {error.error === 'Duplicate product' ? (
                              <AlertCircle className="h-5 w-5 text-yellow-600" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-red-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900">{error.product}</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                error.error === 'Duplicate product' 
                                  ? 'bg-yellow-100 text-yellow-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {error.error}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700">{error.message}</p>
                            {error.existingId && (
                              <p className="text-xs text-gray-500 mt-1">
                                Existing product ID: <code className="bg-gray-100 px-1 rounded">{error.existingId}</code>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audit Logs */}
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-luxury-gold" />
            <h3 className="font-semibold text-gray-900">Recent Upload History</h3>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAuditLogs}
            disabled={loadingLogs}
          >
            {loadingLogs ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        {loadingLogs ? (
          <div className="text-center py-8 text-gray-500">Loading audit logs...</div>
        ) : auditLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No upload history yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Failed</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Media</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.uploaded_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{log.user_email}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{log.csv_filename}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{log.total_products}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {log.successful_products}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {log.failed_products > 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          {log.failed_products}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{log.media_uploaded_count}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                      {(log.duration_ms / 1000).toFixed(1)}s
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Example */}
      <div className="rounded-lg bg-gray-50 p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Example CSV Format</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 px-2 py-1">name*</th>
                <th className="border border-gray-300 px-2 py-1">sku*</th>
                <th className="border border-gray-300 px-2 py-1">price_usd*</th>
                <th className="border border-gray-300 px-2 py-1">images</th>
                <th className="border border-gray-300 px-2 py-1">videos</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-gray-300 px-2 py-1">Oud Royale</td>
                <td className="border border-gray-300 px-2 py-1">MYK-001</td>
                <td className="border border-gray-300 px-2 py-1">120.00</td>
                <td className="border border-gray-300 px-2 py-1">oud-1.jpg, oud-2.jpg</td>
                <td className="border border-gray-300 px-2 py-1">oud-promo.mp4</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-gray-600">
          Then upload files: <code className="bg-white px-1 rounded">oud-1.jpg</code>, <code className="bg-white px-1 rounded">oud-2.jpg</code>, <code className="bg-white px-1 rounded">oud-promo.mp4</code>
        </p>
      </div>
      </div>
    </>
  )
}
