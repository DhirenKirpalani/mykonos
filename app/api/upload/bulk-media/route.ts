import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for bulk uploads

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB per file
const MAX_FILES_PER_REQUEST = 20
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

/**
 * Bulk upload media files to Supabase Storage
 * Supports parallel uploads with validation and error handling
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
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      )
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    // Check user role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || !['admin', 'staff'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const entityType = formData.get('entityType') as string // 'product' or 'collection'
    const entityId = formData.get('entityId') as string
    const folderName = formData.get('folderName') as string

    // Validation
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES_PER_REQUEST} files allowed per request` },
        { status: 400 }
      )
    }

    if (!entityType || !['product', 'collection'].includes(entityType)) {
      return NextResponse.json(
        { error: 'Invalid entity type. Must be "product" or "collection"' },
        { status: 400 }
      )
    }

    // Validate file types and sizes
    const validationErrors: string[] = []
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        validationErrors.push(`${file.name}: File too large (max 50MB)`)
      }
      
      const isImage = ALLOWED_IMAGE_TYPES.includes(file.type)
      const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type)
      
      if (!isImage && !isVideo) {
        validationErrors.push(`${file.name}: Invalid file type (${file.type})`)
      }
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      )
    }

    // Create organized folder path: products/{product-name}/ or collections/{collection-name}/
    const sanitizedFolder = folderName
      ? folderName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      : entityId || 'general'
    
    const basePath = `${entityType}s/${sanitizedFolder}`
    
    console.log(`Uploading to organized folder: ${basePath}/`)

    // Upload files in parallel with controlled concurrency
    const uploadResults = await Promise.allSettled(
      files.map(async (file) => {
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(7)
        const fileExt = file.name.split('.').pop()
        const fileName = `${timestamp}-${randomString}.${fileExt}`
        const filePath = `${basePath}/${fileName}`

        // Convert File to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('product-media')
          .upload(filePath, buffer, {
            contentType: file.type,
            cacheControl: '31536000', // 1 year
            upsert: false,
          })

        if (error) {
          throw new Error(`Upload failed: ${error.message}`)
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('product-media')
          .getPublicUrl(filePath)

        return {
          fileName: file.name,
          url: publicUrl,
          path: filePath,
          type: file.type.startsWith('video/') ? 'video' : 'image',
          size: file.size,
        }
      })
    )

    // Process results
    const successful: any[] = []
    const failed: any[] = []

    uploadResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(result.value)
      } else {
        failed.push({
          fileName: files[index].name,
          error: result.reason?.message || 'Upload failed',
        })
      }
    })

    // If entity ID provided, attach media to entity
    if (entityId && successful.length > 0) {
      const imageUrls = successful.filter(f => f.type === 'image').map(f => f.url)
      const videoUrls = successful.filter(f => f.type === 'video').map(f => f.url)

      if (entityType === 'product') {
        // Get existing URLs
        const { data: product } = await supabase
          .from('products')
          .select('image_urls, video_urls')
          .eq('id', entityId)
          .single()

        const existingImages = product?.image_urls || []
        const existingVideos = product?.video_urls || []

        // Update product with new URLs
        await supabase
          .from('products')
          .update({
            image_urls: [...existingImages, ...imageUrls],
            video_urls: [...existingVideos, ...videoUrls],
          })
          .eq('id', entityId)
      } else if (entityType === 'collection') {
        // Update collection image
        if (imageUrls.length > 0) {
          await supabase
            .from('collections')
            .update({
              image_url: imageUrls[0], // Use first image as collection image
            })
            .eq('id', entityId)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Uploaded ${successful.length} of ${files.length} files`,
      uploaded: successful,
      failed: failed.length > 0 ? failed : undefined,
      stats: {
        total: files.length,
        successful: successful.length,
        failed: failed.length,
      },
    })
  } catch (error: any) {
    console.error('Bulk upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload files' },
      { status: 500 }
    )
  }
}
