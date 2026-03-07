'use client'

import { useState } from 'react'
import { Upload, Download, AlertCircle, CheckCircle, XCircle, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'

interface ValidationError {
  row: number
  field: string
  message: string
}

interface PreviewProduct {
  row: number
  name: string
  sku: string
  brand: string
  price: string
  price_idr: string
  stock_quantity: string
  status: 'valid' | 'error'
  errors: string[]
}

export default function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewProduct[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [successCount, setSuccessCount] = useState(0)
  const [errorCount, setErrorCount] = useState(0)

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
      'meta_title', 'meta_description', 'meta_keywords', 'tags'
    ]

    const exampleRow = [
      'Mykonos Oud Royale', 'MYK-OUD-001', 'Mykonos', 'mykonos-oud-royale',
      'Luxury oud fragrance with amber and sandalwood notes', '120.00', '1800000',
      '60.00', '150.00', '100', '10', 'false', 'Fragrances', 'Oriental',
      'Extrait de Parfum', 'Spray', 'Unisex', 'Regular Edition', 'France',
      'Bergamot, Lemon', 'Rose, Jasmine', 'Oud, Amber', '100', '150',
      '220', '10', '8', '15', '36', 'NA18201234567', 'true',
      '2024-01-01', '2027-01-01', 'KOTA JAKARTA TIMUR', 'active', 'true',
      '1', '10', 'false', '', '', 'Mykonos Oud Royale Eau de Parfum',
      'Luxury oud fragrance with amber and sandalwood notes', 'oud, luxury, arabic',
      'oud, luxury, arabic, winter'
    ]

    const csv = [headers.join(','), exampleRow.join(',')].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'product_bulk_upload_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
    toast.success('Template downloaded successfully')
  }

  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n').filter(line => line.trim())
    return lines.map(line => {
      const values: string[] = []
      let current = ''
      let inQuotes = false

      for (let i = 0; i < line.length; i++) {
        const char = line[i]
        
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim())
          current = ''
        } else {
          current += char
        }
      }
      values.push(current.trim())
      return values
    })
  }

  const validateRow = (row: string[], headers: string[], rowIndex: number): PreviewProduct => {
    const errors: string[] = []
    const product: any = {}

    headers.forEach((header, index) => {
      product[header] = row[index] || ''
    })

    // Required fields validation
    if (!product['name*']) errors.push('Name is required')
    if (!product['sku*']) errors.push('SKU is required')
    if (!product['brand*']) errors.push('Brand is required')
    if (!product['slug*']) errors.push('Slug is required')
    if (!product['price_usd*']) errors.push('Price (USD) is required')
    if (!product['price_idr*']) errors.push('Price (IDR) is required')
    if (!product['stock_quantity*']) errors.push('Stock quantity is required')

    // Numeric validation
    if (product['price_usd*'] && isNaN(parseFloat(product['price_usd*']))) {
      errors.push('Price (USD) must be a number')
    }
    if (product['price_idr*'] && isNaN(parseFloat(product['price_idr*']))) {
      errors.push('Price (IDR) must be a number')
    }
    if (product['stock_quantity*'] && isNaN(parseInt(product['stock_quantity*']))) {
      errors.push('Stock quantity must be a number')
    }

    // Boolean validation
    const booleanFields = ['allow_backorder', 'halal_certified', 'is_featured', 'is_pre_order']
    booleanFields.forEach(field => {
      if (product[field] && !['true', 'false', ''].includes(product[field].toLowerCase())) {
        errors.push(`${field} must be true or false`)
      }
    })

    // Status validation
    if (product['status'] && !['draft', 'active', 'archived', ''].includes(product['status'].toLowerCase())) {
      errors.push('Status must be draft, active, or archived')
    }

    return {
      row: rowIndex + 2, // +2 because of header row and 0-indexing
      name: product['name*'] || '',
      sku: product['sku*'] || '',
      brand: product['brand*'] || '',
      price: product['price_usd*'] || '',
      price_idr: product['price_idr*'] || '',
      stock_quantity: product['stock_quantity*'] || '',
      status: errors.length === 0 ? 'valid' : 'error',
      errors
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    setFile(selectedFile)
    setUploadComplete(false)

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const rows = parseCSV(text)
      
      if (rows.length < 2) {
        toast.error('CSV file is empty or invalid')
        return
      }

      const headers = rows[0]
      const dataRows = rows.slice(1)

      const previews = dataRows.map((row, index) => validateRow(row, headers, index))
      setPreview(previews)

      const errors = previews.filter(p => p.status === 'error').length
      if (errors > 0) {
        toast.warning(`Found ${errors} row(s) with errors. Please fix them before uploading.`)
      } else {
        toast.success(`${previews.length} products ready to upload`)
      }
    }

    reader.readAsText(selectedFile)
  }

  const handleBulkUpload = async () => {
    if (!file) {
      toast.error('Please select a file first')
      return
    }

    const hasErrors = preview.some(p => p.status === 'error')
    if (hasErrors) {
      toast.error('Please fix all validation errors before uploading')
      return
    }

    setUploading(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Authentication required')
        return
      }

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/products/bulk-upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      })

      const result = await response.json()

      if (response.ok) {
        setSuccessCount(result.success || 0)
        setErrorCount(result.errors || 0)
        setUploadComplete(true)
        toast.success(`Successfully uploaded ${result.success} products!`)
        
        if (result.errors > 0) {
          toast.warning(`${result.errors} products failed to upload`)
        }
      } else {
        toast.error(result.error || 'Failed to upload products')
      }
    } catch (error) {
      console.error('Error uploading products:', error)
      toast.error('An error occurred during upload')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Bulk Product Upload</h1>
        <p className="mt-2 text-gray-600">Upload multiple products at once using CSV file</p>
      </div>

      {/* Download Template */}
      <div className="rounded-lg bg-blue-50 p-6 border border-blue-200">
        <div className="flex items-start gap-4">
          <FileSpreadsheet className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900">Download Template</h3>
            <p className="mt-1 text-sm text-blue-700">
              Download the CSV template with all required and optional fields. Fill it out with your product data.
            </p>
            <Button
              onClick={downloadTemplate}
              variant="outline"
              size="sm"
              className="mt-3 border-blue-600 text-blue-600 hover:bg-blue-100"
            >
              <Download className="mr-2 h-4 w-4" />
              Download CSV Template
            </Button>
          </div>
        </div>
      </div>

      {/* File Upload */}
      <div className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={uploading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-luxury-gold file:text-luxury-navy hover:file:bg-luxury-gold/90 disabled:opacity-50"
            />
            <p className="mt-2 text-xs text-gray-500">
              CSV file with product data. Make sure to follow the template format.
            </p>
          </div>

          {preview.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Preview ({preview.length} products)
                </h3>
                <div className="flex gap-2">
                  <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                    <CheckCircle className="mr-1 h-4 w-4" />
                    {preview.filter(p => p.status === 'valid').length} Valid
                  </span>
                  {preview.filter(p => p.status === 'error').length > 0 && (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                      <XCircle className="mr-1 h-4 w-4" />
                      {preview.filter(p => p.status === 'error').length} Errors
                    </span>
                  )}
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price (USD)</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {preview.map((product) => (
                      <tr key={product.row} className={product.status === 'error' ? 'bg-red-50' : ''}>
                        <td className="px-4 py-3 text-sm text-gray-900">{product.row}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{product.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{product.sku}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{product.brand}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">${product.price}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{product.stock_quantity}</td>
                        <td className="px-4 py-3">
                          {product.status === 'valid' ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <div className="group relative">
                              <XCircle className="h-5 w-5 text-red-600 cursor-help" />
                              <div className="absolute left-0 top-6 hidden group-hover:block z-10 w-64 rounded-lg bg-red-900 p-3 text-xs text-white shadow-lg">
                                <ul className="list-disc list-inside space-y-1">
                                  {product.errors.map((error, i) => (
                                    <li key={i}>{error}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex gap-4">
                <Button
                  onClick={handleBulkUpload}
                  disabled={uploading || preview.some(p => p.status === 'error')}
                  className="bg-luxury-gold text-luxury-navy hover:bg-luxury-gold/90"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {uploading ? 'Uploading...' : `Upload ${preview.filter(p => p.status === 'valid').length} Products`}
                </Button>
              </div>
            </div>
          )}

          {uploadComplete && (
            <div className="mt-6 rounded-lg bg-green-50 p-6 border border-green-200">
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-green-900">Upload Complete!</h3>
                  <p className="mt-1 text-sm text-green-700">
                    Successfully uploaded {successCount} products.
                    {errorCount > 0 && ` ${errorCount} products failed.`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="rounded-lg bg-gray-50 p-6">
        <h3 className="font-semibold text-gray-900 mb-3">Instructions</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-2">
            <span className="text-luxury-gold">1.</span>
            <span>Download the CSV template using the button above</span>
          </li>
          <li className="flex gap-2">
            <span className="text-luxury-gold">2.</span>
            <span>Fill in your product data. Fields marked with * are required</span>
          </li>
          <li className="flex gap-2">
            <span className="text-luxury-gold">3.</span>
            <span>Save the file as CSV format</span>
          </li>
          <li className="flex gap-2">
            <span className="text-luxury-gold">4.</span>
            <span>Upload the CSV file using the form above</span>
          </li>
          <li className="flex gap-2">
            <span className="text-luxury-gold">5.</span>
            <span>Review the preview and fix any validation errors</span>
          </li>
          <li className="flex gap-2">
            <span className="text-luxury-gold">6.</span>
            <span>Click "Upload Products" to import all valid products</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
