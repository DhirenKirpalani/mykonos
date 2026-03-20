import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Bulk upload products with CSV + separate media files
 * Matches images/videos by filename specified in CSV
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Authentication
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || !['admin', 'staff'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const csvFile = formData.get('csvFile') as File
    const mediaFiles = formData.getAll('mediaFiles') as File[]

    if (!csvFile) {
      return NextResponse.json({ error: 'CSV file required' }, { status: 400 })
    }

    // Step 1: Parse CSV first to get product names
    const csvText = await csvFile.text()
    const rows = parseCSV(csvText)
    
    if (rows.length < 2) {
      return NextResponse.json({ error: 'CSV is empty' }, { status: 400 })
    }

    const headers = rows[0].map(h => h.trim())
    const dataRows = rows.slice(1)

    // Find image/video columns
    const imageColIndex = headers.findIndex(h => 
      h.toLowerCase().includes('image') || h === 'images' || h === 'image_files'
    )
    const videoColIndex = headers.findIndex(h => 
      h.toLowerCase().includes('video') || h === 'videos' || h === 'video_files'
    )
    const nameColIndex = headers.findIndex(h => h.toLowerCase().includes('name'))

    // Build a map of filename -> product name for organized storage
    const fileToProductMap = new Map<string, string>()
    
    dataRows.forEach((row) => {
      const productName = row[nameColIndex]?.trim() || 'unknown'
      
      // Map image files to product
      if (imageColIndex !== -1 && row[imageColIndex]) {
        const imageFilenames = row[imageColIndex].split(',').map(f => f.trim())
        imageFilenames.forEach(filename => {
          if (filename) fileToProductMap.set(filename, productName)
        })
      }
      
      // Map video files to product
      if (videoColIndex !== -1 && row[videoColIndex]) {
        const videoFilenames = row[videoColIndex].split(',').map(f => f.trim())
        videoFilenames.forEach(filename => {
          if (filename) fileToProductMap.set(filename, productName)
        })
      }
    })

    // Step 2: Upload all media files to product-specific folders
    const mediaMap = new Map<string, string>() // filename -> URL
    
    if (mediaFiles.length > 0) {
      console.log(`Uploading ${mediaFiles.length} media files to product folders...`)
      
      const uploadResults = await Promise.allSettled(
        mediaFiles.map(async (file) => {
          // Get product name for this file
          const productName = fileToProductMap.get(file.name) || 'uncategorized'
          
          // Create clean folder name from product name
          const folderName = productName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '')
          
          const timestamp = Date.now()
          const randomString = Math.random().toString(36).substring(7)
          const fileExt = file.name.split('.').pop()
          
          // Organized path: products/{product-name}/{timestamp}-{random}.{ext}
          const storagePath = `products/${folderName}/${timestamp}-${randomString}.${fileExt}`

          const arrayBuffer = await file.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          const { data, error } = await supabase.storage
            .from('product-media')
            .upload(storagePath, buffer, {
              contentType: file.type,
              cacheControl: '31536000',
              upsert: false,
            })

          if (error) throw error

          const { data: { publicUrl } } = supabase.storage
            .from('product-media')
            .getPublicUrl(storagePath)

          return { originalName: file.name, url: publicUrl, folder: folderName }
        })
      )

      // Build media map
      uploadResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          mediaMap.set(result.value.originalName, result.value.url)
          console.log(`✓ ${result.value.originalName} → products/${result.value.folder}/`)
        }
      })

      console.log(`Uploaded ${mediaMap.size} media files to organized folders`)
    }

    // Step 3: Create products with matched media
    let successCount = 0
    let errorCount = 0
    const errors: any[] = []

    for (let i = 0; i < dataRows.length; i++) {
      try {
        const row = dataRows[i]
        const product: any = {}

        // Map CSV columns to product fields
        headers.forEach((header, index) => {
          const value = row[index]?.trim() || ''
          const cleanHeader = header.replace('*', '').trim()
          product[cleanHeader] = value
        })

        // Match images from uploaded media
        const imageUrls: string[] = []
        if (imageColIndex !== -1 && row[imageColIndex]) {
          const imageFilenames = row[imageColIndex].split(',').map(f => f.trim())
          imageFilenames.forEach(filename => {
            if (filename && mediaMap.has(filename)) {
              imageUrls.push(mediaMap.get(filename)!)
            }
          })
        }

        // Match videos from uploaded media
        const videoUrls: string[] = []
        if (videoColIndex !== -1 && row[videoColIndex]) {
          const videoFilenames = row[videoColIndex].split(',').map(f => f.trim())
          videoFilenames.forEach(filename => {
            if (filename && mediaMap.has(filename)) {
              videoUrls.push(mediaMap.get(filename)!)
            }
          })
        }

        // Create product in database
        const { error: insertError } = await supabase
          .from('products')
          .insert({
            name: product.name,
            sku: product.sku,
            slug: product.slug || product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            brand: product.brand,
            description: product.description || '',
            price_usd: parseFloat(product.price_usd) || 0,
            price_idr: parseFloat(product.price_idr) || 0,
            cost_price: parseFloat(product.cost_price) || null,
            compare_at_price: parseFloat(product.compare_at_price) || null,
            stock_quantity: parseInt(product.stock_quantity) || 0,
            low_stock_threshold: parseInt(product.low_stock_threshold) || 10,
            allow_backorder: product.allow_backorder === 'true',
            category: product.category || null,
            fragrance_family: product.fragrance_family || null,
            collection: product.collection || null,
            formulation: product.formulation || null,
            gender: product.gender || null,
            edition_type: product.edition_type || null,
            country_of_origin: product.country_of_origin || null,
            top_notes: product.top_notes || null,
            middle_notes: product.middle_notes || null,
            base_notes: product.base_notes || null,
            volume_ml: parseFloat(product.volume_ml) || null,
            weight_grams: parseFloat(product.weight_grams) || null,
            shipping_weight_grams: parseFloat(product.shipping_weight_grams) || null,
            package_length_cm: parseFloat(product.package_length_cm) || null,
            package_width_cm: parseFloat(product.package_width_cm) || null,
            package_height_cm: parseFloat(product.package_height_cm) || null,
            shelf_life_months: parseInt(product.shelf_life_months) || null,
            bpom_number: product.bpom_number || null,
            halal_certified: product.halal_certified === 'true',
            manufacturing_date: product.manufacturing_date || null,
            expiration_date: product.expiration_date || null,
            ships_from: product.ships_from || null,
            status: product.status || 'draft',
            is_featured: product.is_featured === 'true',
            min_purchase_quantity: parseInt(product.min_purchase_quantity) || 1,
            max_purchase_quantity: parseInt(product.max_purchase_quantity) || null,
            is_pre_order: product.is_pre_order === 'true',
            pre_order_duration_days: parseInt(product.pre_order_duration_days) || null,
            scheduled_publish_date: product.scheduled_publish_date || null,
            meta_title: product.meta_title || null,
            meta_description: product.meta_description || null,
            meta_keywords: product.meta_keywords || null,
            tags: product.tags ? product.tags.split(',').map((t: string) => t.trim()) : [],
            image_urls: imageUrls,
            video_urls: videoUrls,
          })

        if (insertError) {
          throw insertError
        }

        successCount++
      } catch (error: any) {
        errorCount++
        errors.push({
          row: i + 2,
          error: error.message,
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${dataRows.length} products`,
      stats: {
        total: dataRows.length,
        successful: successCount,
        failed: errorCount,
        mediaUploaded: mediaMap.size,
      },
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('Bulk upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}

function parseCSV(text: string): string[][] {
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
