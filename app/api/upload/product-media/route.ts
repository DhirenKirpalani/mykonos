import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

/**
 * Upload product media (images/videos) to Supabase Storage
 */
export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get session from authorization header
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

    // Get form data
    const formData = await request.formData()
    const files = formData.getAll('files').filter(
      (f): f is File => f instanceof File && typeof (f as File).name === 'string' && (f as File).name.length > 0
    )
    const productName = formData.get('productName') as string

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    if (!productName) {
      return NextResponse.json(
        { error: 'Product name is required' },
        { status: 400 }
      )
    }

    // Sanitize product name for folder path
    const folderName = productName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    const uploadedUrls: string[] = []
    const errors: string[] = []

    // Upload each file to Supabase Storage
    for (const file of files) {
      try {
        // Generate unique filename
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(7)
        const fileExt = file.name?.split('.').pop() || 'bin'
        const fileName = `${timestamp}-${randomString}.${fileExt}`
        const filePath = `${folderName}/${fileName}`

        // Convert File to ArrayBuffer
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Determine content type
        const contentType = file.type || 'application/octet-stream'

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('product-media')
          .upload(filePath, buffer, {
            contentType,
            cacheControl: '3600',
            upsert: false,
          })

        if (error) {
          console.error('Upload error for file:', file.name, error)
          errors.push(`Failed to upload ${file.name}: ${error.message}`)
          continue
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('product-media')
          .getPublicUrl(filePath)

        uploadedUrls.push(publicUrl)
      } catch (fileError: any) {
        console.error('File processing error:', fileError)
        errors.push(`Error processing ${file.name}: ${fileError.message}`)
      }
    }

    if (uploadedUrls.length === 0) {
      return NextResponse.json(
        { error: 'All uploads failed', details: errors },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Files uploaded successfully',
      urls: uploadedUrls,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload files' },
      { status: 500 }
    )
  }
}

/**
 * Delete product media from Supabase Storage
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get session from authorization header
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

    const body = await request.json()
    const urls: string[] = body.urls || (body.filePath ? [body.filePath] : [])

    if (urls.length === 0) {
      return NextResponse.json({ message: 'No files to delete' })
    }

    const bucketName = 'product-media'
    const marker = `/storage/v1/object/public/${bucketName}/`

    // Extract storage paths from full public URLs (or use raw paths directly)
    const paths = urls
      .map(url => {
        const idx = url.indexOf(marker)
        return idx !== -1 ? decodeURIComponent(url.slice(idx + marker.length)) : url
      })
      .filter(p => p && p.trim() !== '')

    if (paths.length === 0) {
      return NextResponse.json({ message: 'No valid paths to delete' })
    }

    const { error } = await supabase.storage.from(bucketName).remove(paths)

    if (error) {
      console.error('Delete error:', error)
      return NextResponse.json(
        { error: 'Failed to delete files' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: `Deleted ${paths.length} file(s) successfully`,
      deleted: paths,
    })
  } catch (error: any) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete file' },
      { status: 500 }
    )
  }
}
