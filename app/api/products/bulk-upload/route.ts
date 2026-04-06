import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Parse number from string, removing commas
 */
function parseNumber(value: string | null | undefined): number | null {
  if (!value || value.trim() === '') return null
  const cleaned = value.replace(/,/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

/**
 * Convert plain text description to HTML with paragraph tags
 */
function formatDescriptionToHTML(text: string | null | undefined): string {
  if (!text || text.trim() === '') return ''
  
  // Split by double line breaks to create paragraphs
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim())
  
  // Wrap each paragraph in <p> tags and convert single line breaks to <br>
  const htmlParagraphs = paragraphs.map(para => {
    const withBreaks = para.trim().replace(/\n/g, '<br>')
    return `<p>${withBreaks}</p>`
  })
  
  return htmlParagraphs.join('\n')
}

/**
 * Generate simplified slug from product name
 * Removes brand prefix, sizes, and formulation details
 */
function generateSimplifiedSlug(productName: string): string {
  let slug = productName
  
  // Remove brand prefix (e.g., "Mykonos - ")
  slug = slug.replace(/^mykonos\s*-\s*/i, '')
  
  // Remove formulation types
  slug = slug.replace(/\s*(extrait\s+de\s+parfum|eau\s+de\s+parfum|edp|edt|cologne)\s*/gi, '')
  
  // Remove sizes (e.g., "50ml", "100ml", "50ml & 100ml")
  slug = slug.replace(/\s*\d+ml(\s*&\s*\d+ml)?\s*/gi, '')
  
  // Convert to lowercase and replace non-alphanumeric with hyphens
  slug = slug.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  
  // Remove leading/trailing hyphens
  slug = slug.replace(/^-+|-+$/g, '')
  
  return slug
}

/**
 * Fetch existing images from Supabase Storage for a product
 * Looks for images in product-media/{productSlug}/ folder
 */
async function fetchProductImagesFromStorage(supabase: any, productName: string): Promise<string[]> {
  try {
    // Create simplified slug from product name
    const slug = generateSimplifiedSlug(productName)
    
    console.log(`   🔍 Checking storage for images in: product-media/${slug}/`)
    
    // List files in the product folder
    const { data: files, error } = await supabase
      .storage
      .from('product-media')
      .list(slug, {
        limit: 100,
        sortBy: { column: 'name', order: 'asc' }
      })
    
    if (error) {
      console.log(`   ⚠️  Storage list error: ${error.message}`)
      return []
    }
    
    if (!files || files.length === 0) {
      console.log(`   ℹ️  No images found in storage for ${slug}`)
      return []
    }
    
    // Filter for image files and get public URLs
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif']
    const imageFiles = files.filter((file: any) => 
      imageExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    )
    
    if (imageFiles.length === 0) {
      console.log(`   ℹ️  No image files found in folder`)
      return []
    }
    
    // Get public URLs for all images
    const imageUrls = imageFiles.map((file: any) => {
      const { data } = supabase.storage
        .from('product-media')
        .getPublicUrl(`${slug}/${file.name}`)
      return data.publicUrl
    })
    
    console.log(`   ✅ Found ${imageUrls.length} image(s) in storage`)
    return imageUrls
  } catch (error) {
    console.error(`   ❌ Error fetching images from storage:`, error)
    return []
  }
}

/**
 * Map CSV column display names to database field names
 */
function mapColumnName(displayName: string): string {
  const mapping: { [key: string]: string } = {
    'Product Name': 'name',
    'Product SKU': 'sku',
    'Category (Fragrance Family)': 'fragrance_family',
    'Collection': 'collection',
    'Gender': 'gender',
    'Description': 'description',
    'Base Price (USD)': 'price_usd',
    'Base Price (IDR)': 'price_idr',
    'Cost Price (USD)': 'cost_price',
    'Cost Price (IDR)': 'cost_price_idr',
    'Tax Enabled': 'tax_enabled',
    'Stock Quantity': 'stock_quantity',
    'Low Stock Threshold': 'low_stock_threshold',
    'In Stock': 'in_stock',
    'Minimum Purchase Quantity': 'min_purchase_quantity',
    'Maximum Purchase Quantity': 'max_purchase_quantity',
    'Top Notes': 'top_notes',
    'Middle Notes': 'middle_notes',
    'Base Notes': 'base_notes',
    'Formulation': 'formulation',
    'Volume (ml)': 'volume_ml',
    'Country of Origin': 'country_of_origin',
    'Shelf Life (months)': 'shelf_life_months',
    'Product Weight (grams)': 'weight_grams',
    'Shipping Weight (grams)': 'shipping_weight_grams',
    'Package Length (cm)': 'package_length_cm',
    'Package Width (cm)': 'package_width_cm',
    'Package Height (cm)': 'package_height_cm',
    'Ships From': 'ships_from',
    'Shipping Period (days)': 'shipping_period_days',
    'Pre-Order': 'is_pre_order',
    'Pre-Order Duration (days)': 'pre_order_duration_days',
    'Status': 'status',
    'Scheduled Publish Date': 'scheduled_publish_date',
    'New Badge Duration (days)': 'new_product_duration_days',
    'Variant Name': 'variant_name',
    'Variant SKU': 'variant_sku',
    'Variant Price (USD)': 'variant_price_usd',
    'Variant Price (IDR)': 'variant_price_idr',
    'Variant Low Stock Quantity': 'variant_stock_quantity',
    'Variant Low Stock Threshold': 'variant_low_stock_threshold',
    'Variant In Stock': 'variant_in_stock',
    'Variant Minimum Purchase Quantity': 'variant_min_purchase_quantity',
    'Variant Maximum Purchase Quantity': 'variant_max_purchase_quantity',
    'Variant Image URL': 'variant_image_url',
    'Manufacturing Date': 'manufacturing_date',
    'Expiration Date': 'expiration_date',
    'Official Distribution Authorization No. (BPOM, PIRT)': 'bpom_number',
    'Pilih Lokal (Local Product)': 'pilih_lokal',
    'Mark as Popular': 'is_popular',
    'Mark as Best Selling': 'is_best_selling',
    'Rating (0-5)': 'rating',
    'Products Sold': 'products_sold'
  }
  
  return mapping[displayName] || displayName.toLowerCase().replace(/[^a-z0-9]+/g, '_')
}

/**
 * Bulk upload products with CSV + separate media files
 * Matches images/videos by filename specified in CSV
 */
export async function POST(request: NextRequest) {
  console.log('🚀 [BULK UPLOAD] Starting bulk upload process...')
  const startTime = Date.now()
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔐 [AUTH] Checking authentication...')
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('❌ [AUTH] Authentication failed:', authError?.message)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`✅ [AUTH] User authenticated: ${user.email}`)

    // Check if user is admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!userRole || userRole.role !== 'admin') {
      console.error('❌ [AUTH] User is not admin')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    console.log(`✅ [AUTH] User role verified: ${userRole.role}`)

    // Insert audit log for start of bulk upload process
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'bulk_upload_start',
        timestamp: new Date().toISOString(),
        data: {}
      })

    const formData = await request.formData()
    const csvFile = formData.get('csvFile') as File
    const mediaFiles = formData.getAll('mediaFiles') as File[]

    console.log('📁 [FILES] CSV file:', csvFile?.name, `(${csvFile?.size} bytes)`)
    console.log('📁 [FILES] Media files:', mediaFiles.length, 'files')
    mediaFiles.forEach((file, i) => {
      console.log(`   ${i + 1}. ${file.name} (${file.type}, ${file.size} bytes)`)
    })

    if (!csvFile) {
      console.error('❌ [FILES] No CSV file provided')
      return NextResponse.json({ error: 'CSV file required' }, { status: 400 })
    }

    // Step 1: Parse CSV first to get product names
    console.log('📊 [CSV] Parsing CSV file...')
    const csvText = await csvFile.text()
    const rows = parseCSV(csvText)
    
    console.log(`📊 [CSV] Parsed ${rows.length} rows (including header)`)
    
    if (rows.length < 2) {
      console.error('❌ [CSV] CSV is empty or has no data rows')
      return NextResponse.json({ error: 'CSV is empty' }, { status: 400 })
    }

    const headers = rows[0].map(h => h.trim())
    const dataRows = rows.slice(1)

    console.log(`📊 [CSV] Headers (${headers.length}):`, headers.slice(0, 10).join(', '), '...')
    console.log(`📊 [CSV] Data rows: ${dataRows.length}`)

    // Map display names to database field names
    const mappedHeaders = headers.map(h => mapColumnName(h))
    console.log(`📊 [CSV] Mapped headers:`, mappedHeaders.slice(0, 10).join(', '), '...')

    // Find image/video columns
    const imageColIndex = headers.findIndex(h => 
      h.toLowerCase().includes('image') || h === 'images' || h === 'image_files'
    )
    const videoColIndex = headers.findIndex(h => 
      h.toLowerCase().includes('video') || h === 'videos' || h === 'video_files'
    )
    const nameColIndex = mappedHeaders.findIndex(h => h === 'name')

    console.log('📊 [CSV] Column indices:')
    console.log(`   - Name column: ${nameColIndex} (${headers[nameColIndex] || 'not found'})`)
    console.log(`   - Images column: ${imageColIndex} (${headers[imageColIndex] || 'not found'})`)
    console.log(`   - Videos column: ${videoColIndex} (${headers[videoColIndex] || 'not found'})`)

    // Build a map of filename -> product name for organized storage
    console.log('🗺️  [MAPPING] Building filename to product mapping...')
    const fileToProductMap = new Map<string, string>()
    
    dataRows.forEach((row, rowIndex) => {
      const productName = row[nameColIndex]?.trim() || 'unknown'
      
      // Map image files to product
      if (imageColIndex !== -1 && row[imageColIndex]) {
        const imageFilenames = row[imageColIndex].split(',').map(f => f.trim())
        imageFilenames.forEach(filename => {
          if (filename) {
            fileToProductMap.set(filename, productName)
            console.log(`   Row ${rowIndex + 2}: ${filename} → ${productName}`)
          }
        })
      }
      
      // Map video files to product
      if (videoColIndex !== -1 && row[videoColIndex]) {
        const videoFilenames = row[videoColIndex].split(',').map(f => f.trim())
        videoFilenames.forEach(filename => {
          if (filename) {
            fileToProductMap.set(filename, productName)
            console.log(`   Row ${rowIndex + 2}: ${filename} → ${productName}`)
          }
        })
      }
    })

    console.log(`🗺️  [MAPPING] Mapped ${fileToProductMap.size} filenames to products`)

    // Step 2: Upload all media files to product-specific folders
    const mediaMap = new Map<string, string>() // filename -> URL
    
    if (mediaFiles.length > 0) {
      console.log(`📤 [MEDIA] Uploading ${mediaFiles.length} media files to product folders...`)
      
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
      uploadResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          mediaMap.set(result.value.originalName, result.value.url)
          console.log(`   ✅ ${index + 1}/${uploadResults.length}: ${result.value.originalName} → products/${result.value.folder}/`)
        } else {
          console.error(`   ❌ ${index + 1}/${uploadResults.length}: Failed to upload - ${result.reason}`)
        }
      })

      console.log(`📤 [MEDIA] Successfully uploaded ${mediaMap.size}/${mediaFiles.length} media files`)
    } else {
      console.log('📤 [MEDIA] No media files to upload')
    }

    // Step 3: Group rows by product name (handle merged cells)
    console.log('🏗️  [PRODUCTS] Grouping rows by product name...')
    const productGroups = new Map<string, any[]>()
    let lastProductName = ''
    
    dataRows.forEach((row, index) => {
      const product: any = {}
      
      // Map CSV columns to product fields using mapped headers
      mappedHeaders.forEach((fieldName, idx) => {
        const value = row[idx]?.trim() || ''
        product[fieldName] = value
      })
      
      // Handle merged cells - if product name is empty, use the last product name
      const productName = product.name || lastProductName
      if (productName) {
        lastProductName = productName
        product.name = productName
        product._rowIndex = index
        
        if (!productGroups.has(productName)) {
          productGroups.set(productName, [])
        }
        productGroups.get(productName)!.push(product)
      }
    })
    
    console.log(`🏗️  [PRODUCTS] Found ${productGroups.size} unique products`)
    productGroups.forEach((rows, name) => {
      console.log(`   - ${name}: ${rows.length} row(s)`)
    })

    // Step 4: Create products with variants
    console.log('\n🏗️  [PRODUCTS] Creating products from grouped data...')
    let successCount = 0
    let errorCount = 0
    const errors: any[] = []

    for (const [productName, productRows] of Array.from(productGroups.entries())) {
      console.log(`\n🔨 [PRODUCT] Processing: ${productName} (${productRows.length} variant(s))`)
      
      try {
        // Use the first row for product-level data
        const product = productRows[0]

        console.log(`   📝 Product name: ${product.name || 'N/A'}`)
        console.log(`   📝 SKU: ${product.sku || 'N/A'}`)
        console.log(`   📝 Fragrance Family: ${product.fragrance_family || 'N/A'}`)

        // First, try to fetch pre-uploaded images from storage
        let imageUrls: string[] = await fetchProductImagesFromStorage(supabase, product.name)
        
        // Get first row for CSV data access
        const firstRow = dataRows[product._rowIndex]
        
        // If no storage images found, try matching from uploaded media files
        if (imageUrls.length === 0) {
          if (imageColIndex !== -1 && firstRow[imageColIndex]) {
            const imageFilenames = firstRow[imageColIndex].split(',').map((f: string) => f.trim())
            console.log(`   🖼️  Image filenames in CSV: ${imageFilenames.join(', ') || 'none'}`)
            imageFilenames.forEach((filename: string) => {
              if (filename && mediaMap.has(filename)) {
                imageUrls.push(mediaMap.get(filename)!)
                console.log(`      ✅ Matched: ${filename}`)
              } else if (filename) {
                console.log(`      ⚠️  Not found: ${filename}`)
              }
            })
          }
        }
        
        console.log(`   🖼️  Total images: ${imageUrls.length}`)

        // Match videos from uploaded media (from first row)
        const videoUrls: string[] = []
        if (videoColIndex !== -1 && firstRow[videoColIndex]) {
          const videoFilenames = firstRow[videoColIndex].split(',').map((f: string) => f.trim())
          console.log(`   🎥 Video filenames in CSV: ${videoFilenames.join(', ') || 'none'}`)
          videoFilenames.forEach((filename: string) => {
            if (filename && mediaMap.has(filename)) {
              videoUrls.push(mediaMap.get(filename)!)
              console.log(`      ✅ Matched: ${filename}`)
            } else if (filename) {
              console.log(`      ⚠️  Not found: ${filename}`)
            }
          })
        }
        console.log(`   🎥 Total videos matched: ${videoUrls.length}`)

        // Check if product already exists by name or slug
        console.log(`   🔍 Checking for existing product...`)
        const generatedSlug = product.slug || (product.name ? generateSimplifiedSlug(product.name) : null)
        
        const { data: existingProduct, error: checkError } = await supabase
          .from('products')
          .select('id, name, slug')
          .or(`name.eq.${product.name},slug.eq.${generatedSlug}`)
          .maybeSingle()
        
        if (checkError) {
          console.error(`   ⚠️  Error checking for duplicates: ${checkError.message}`)
        }
        
        if (existingProduct) {
          console.log(`   ⚠️  Product already exists: "${existingProduct.name}" (ID: ${existingProduct.id})`)
          errors.push({
            product: product.name,
            error: 'Duplicate product',
            message: `Product "${product.name}" already exists in the database. Skipping to avoid duplicates.`,
            existingId: existingProduct.id
          })
          errorCount++
          continue
        }

        // Create product in database
        console.log(`   💾 Inserting product into database...`)
        const { data: insertedProduct, error: insertError } = await supabase
          .from('products')
          .insert({
            name: product.name,
            sku: product.sku || null,
            slug: product.slug || (product.name ? generateSimplifiedSlug(product.name) : null),
            brand: product.brand,
            description: formatDescriptionToHTML(product.description),
            size: product.volume_ml ? `${product.volume_ml}ml` : 'Standard',
            price_usd: parseNumber(product.price_usd),
            price_idr: parseNumber(product.price_idr),
            cost_price: parseNumber(product.cost_price),
            cost_price_idr: parseNumber(product.cost_price_idr),
            tax_enabled: product.tax_enabled === 'true',
            stock_quantity: parseInt(product.stock_quantity) || 0,
            low_stock_threshold: parseInt(product.low_stock_threshold) || 10,
            in_stock: product.in_stock === 'true',
            allow_backorder: product.allow_backorder === 'true',
            category: product.fragrance_family || 'Uncategorized',
            fragrance_family: product.fragrance_family || null,
            collection: product.collection || 'General',
            formulation: product.formulation || null,
            gender: product.gender || null,
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
            manufacturing_date: product.manufacturing_date || null,
            expiration_date: product.expiration_date || null,
            ships_from: product.ships_from || null,
            shipping_period_days: parseInt(product.shipping_period_days) || null,
            is_featured: product.is_featured === 'true',
            new_product_duration_days: parseInt(product.new_product_duration_days) || 30,
            min_purchase_quantity: parseInt(product.min_purchase_quantity) || 1,
            max_purchase_quantity: parseInt(product.max_purchase_quantity) || null,
            is_pre_order: product.is_pre_order === 'true',
            pre_order_duration_days: parseInt(product.pre_order_duration_days) || null,
            status: product.status ? product.status.toLowerCase() : 'draft',
            scheduled_publish_date: product.scheduled_publish_date || null,
            pilih_lokal: product.pilih_lokal === 'true',
            is_popular: product.is_popular === 'true',
            is_best_selling: product.is_best_selling === 'true',
            rating: parseFloat(product.rating) || null,
            products_sold: parseInt(product.products_sold) || 0,
            meta_title: product.meta_title || null,
            meta_description: product.meta_description || null,
            meta_keywords: product.meta_keywords || null,
            tags: product.tags || null,
            image_urls: imageUrls.length > 0 ? imageUrls : [],
            video_urls: videoUrls,
          })
          .select()
          .single()

        if (insertError) {
          console.error(`   ❌ Product insertion failed:`, insertError.message)
          throw insertError
        }

        console.log(`   ✅ Product created successfully! ID: ${insertedProduct?.id}`)

        // Build variants array from all rows for this product
        const variants: any[] = []
        for (const row of productRows) {
          if (row.variant_name) {
            const variantImageUrl = row.variant_image_url && mediaMap.has(row.variant_image_url) 
              ? mediaMap.get(row.variant_image_url)! 
              : null

            variants.push({
              name: row.variant_name,
              sku: row.variant_sku || null,
              price_usd: parseNumber(row.variant_price_usd),
              price_idr: parseNumber(row.variant_price_idr),
              stock_quantity: parseInt(row.variant_stock_quantity) || 0,
              low_stock_threshold: parseInt(row.variant_low_stock_threshold) || 10,
              in_stock: row.variant_in_stock === 'true',
              min_purchase_quantity: parseInt(row.variant_min_purchase_quantity) || 1,
              max_purchase_quantity: parseInt(row.variant_max_purchase_quantity) || null,
              image_url: variantImageUrl,
            })
            
            console.log(`   🔧 Added variant: ${row.variant_name} - $${parseNumber(row.variant_price_usd)} / Rp ${parseNumber(row.variant_price_idr)}`)
          }
        }

        // Update product with variants ONLY if variants actually exist
        // Don't create empty variant arrays for products without variants
        if (variants.length > 0 && insertedProduct) {
          console.log(`   💾 Updating product with ${variants.length} variant(s)...`)
          const { error: updateError } = await supabase
            .from('products')
            .update({ variants: variants })
            .eq('id', insertedProduct.id)

          if (updateError) {
            console.error(`   ❌ Variant update failed:`, updateError.message)
          } else {
            console.log(`   ✅ Variants stored successfully in JSONB field!`)
          }
        } else {
          console.log(`   ℹ️  No variants for this product - skipping variant update`)
        }

        successCount++
        console.log(`   ✅ Product "${productName}" completed successfully`)
      } catch (error: any) {
        errorCount++
        console.error(`   ❌ Product "${productName}" failed:`, error.message)
        errors.push({
          product: productName,
          rows: productRows.map(p => p._rowIndex + 2).join(', '),
          error: error.message,
        })
      }
    }

    const duration = Date.now() - startTime
    
    console.log('\n📊 [SUMMARY] Bulk upload completed!')
    console.log(`   ✅ Successful: ${successCount}/${productGroups.size} products`)
    console.log(`   ❌ Failed: ${errorCount}/${productGroups.size} products`)
    console.log(`   📤 Media uploaded: ${mediaMap.size}`)
    console.log(`   📦 Total rows processed: ${dataRows.length}`)
    console.log(`   ⏱️  Duration: ${duration}ms`)
    
    if (errors.length > 0) {
      console.log('\n❌ [ERRORS] Failed products:')
      errors.forEach(err => {
        console.log(`   Product "${err.product}" (rows ${err.rows}): ${err.error}`)
      })
    }

    // Insert audit log entry
    console.log('📝 [AUDIT] Recording bulk upload to audit log...')
    await supabase
      .from('bulk_upload_audit_logs')
      .insert({
        user_id: user.id,
        user_email: user.email || 'unknown',
        csv_filename: csvFile.name,
        total_rows: dataRows.length,
        total_products: productGroups.size,
        successful_products: successCount,
        failed_products: errorCount,
        media_files_count: mediaFiles.length,
        media_uploaded_count: mediaMap.size,
        errors: errors,
        duration_ms: duration,
      })
    console.log('✅ [AUDIT] Audit log entry created')

    return NextResponse.json({
      success: true,
      message: `Processed ${productGroups.size} products (${dataRows.length} rows)`,
      stats: {
        totalProducts: productGroups.size,
        totalRows: dataRows.length,
        successful: successCount,
        failed: errorCount,
        mediaUploaded: mediaMap.size,
        duration: duration,
      },
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('💥 [FATAL ERROR] Bulk upload failed:', error)
    console.error('Stack trace:', error.stack)
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: 500 }
    )
  }
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let inQuotes = false
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const nextChar = text[i + 1]
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        currentCell += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of cell
      currentRow.push(currentCell.trim())
      currentCell = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      // End of row (handle both \n and \r\n)
      if (char === '\r' && nextChar === '\n') {
        i++ // Skip \n in \r\n
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
  
  // Handle last cell and row
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim())
    if (currentRow.some(cell => cell.length > 0)) {
      rows.push(currentRow)
    }
  }
  
  return rows
}
