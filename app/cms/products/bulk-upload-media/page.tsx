'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Upload, Download, FileSpreadsheet, Image as ImageIcon, Video, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { BulkMediaUpload } from '@/components/admin/BulkMediaUpload'

export default function BulkUploadWithMediaPage() {
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [stats, setStats] = useState<any>(null)

  const downloadTemplate = () => {
    const headers = [
      'name*', 'sku*', 'brand*', 'slug*', 'description', 'price_usd*', 'price_idr*',
      'cost_price', 'compare_at_price', 'stock_quantity*', 'low_stock_threshold',
      'allow_backorder', 'category', 'fragrance_family', 'collection', 'formulation',
      'gender', 'edition_type', 'country_of_origin', 'top_notes', 'middle_notes',
      'base_notes', 'volume_ml', 'weight_grams', 'shipping_weight_grams',
      'package_length_cm', 'package_width_cm', 'package_height_cm', 'shelf_life_months',
      'bpom_number', 'halal_certified', 'manufacturing_date', 'expiration_date',
      'ships_from', 'status', 'is_featured', 'min_purchase_quantity', 'max_purchase_quantity',
      'is_pre_order', 'pre_order_duration_days', 'scheduled_publish_date',
      'meta_title', 'meta_description', 'meta_keywords', 'tags',
      'images', 'videos' // NEW: Image and video filename columns
    ]

    const exampleRow = [
      'Mykonos Oud Royale', 'MYK-OUD-001', 'Mykonos', 'mykonos-oud-royale',
      'Luxury oud fragrance', '120.00', '1800000',
      '60.00', '150.00', '100', '10', 'false', 'Fragrances', 'Oriental',
      'Extrait de Parfum', 'Spray', 'Unisex', 'Regular Edition', 'France',
      'Bergamot, Lemon', 'Rose, Jasmine', 'Oud, Amber', '100', '150',
      '220', '10', '8', '15', '36', 'NA18201234567', 'true',
      '2024-01-01', '2027-01-01', 'KOTA JAKARTA TIMUR', 'active', 'true',
      '1', '10', 'false', '', '', 'Mykonos Oud Royale',
      'Luxury oud fragrance', 'oud, luxury', 'oud, luxury, arabic',
      'oud-royale-1.jpg, oud-royale-2.jpg, oud-royale-3.jpg', // Images
      'oud-royale-promo.mp4' // Videos
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

  const handleUpload = async () => {
    if (!csvFile) {
      toast.error('Please select a CSV file')
      return
    }

    if (mediaFiles.length === 0) {
      toast.error('Please select media files (images/videos)')
      return
    }

    setUploading(true)
    setUploadComplete(false)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        toast.error('Authentication required')
        return
      }

      const formData = new FormData()
      formData.append('csvFile', csvFile)
      
      mediaFiles.forEach(file => {
        formData.append('mediaFiles', file)
      })

      const response = await fetch('/api/products/bulk-upload-with-media', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        setStats(result.stats)
        setUploadComplete(true)
        toast.success(result.message)
      } else {
        toast.error(result.error || 'Upload failed')
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/cms/products">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Bulk Upload with Media</h1>
        <p className="mt-2 text-gray-600">
          Upload products via CSV and attach images/videos by filename
        </p>
      </div>

      {/* Workflow Explanation */}
      <div className="rounded-lg bg-blue-50 p-6 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3">How It Works</h3>
        <ol className="space-y-2 text-sm text-blue-800">
          <li className="flex gap-2">
            <span className="font-bold">1.</span>
            <span>Download the CSV template and fill in product data</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">2.</span>
            <span>In the <strong>images</strong> column, list image filenames separated by commas (e.g., "product-1.jpg, product-2.jpg")</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">3.</span>
            <span>In the <strong>videos</strong> column, list video filenames separated by commas (e.g., "promo.mp4")</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">4.</span>
            <span>Upload the CSV file and all media files below</span>
          </li>
          <li className="flex gap-2">
            <span className="font-bold">5.</span>
            <span>System automatically matches filenames and attaches media to products</span>
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
            <h3 className="font-semibold text-gray-900">Step 3: Upload Media Files</h3>
            <p className="mt-1 text-sm text-gray-600 mb-3">
              Select all images and videos referenced in your CSV
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
          disabled={!csvFile || mediaFiles.length === 0 || uploading}
          className="bg-luxury-gold text-luxury-navy hover:bg-luxury-gold/90"
          size="lg"
        >
          <Upload className="mr-2 h-5 w-5" />
          {uploading ? 'Uploading...' : 'Upload Products with Media'}
        </Button>
      </div>

      {/* Results */}
      {uploadComplete && stats && (
        <div className="rounded-lg bg-green-50 p-6 border border-green-200">
          <div className="flex items-start gap-4">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-green-900">Upload Complete!</h3>
              <div className="mt-2 space-y-1 text-sm text-green-800">
                <p>✓ Uploaded {stats.mediaUploaded} media files</p>
                <p>✓ Created {stats.successful} products</p>
                {stats.failed > 0 && (
                  <p className="text-red-600">✗ {stats.failed} products failed</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
  )
}
