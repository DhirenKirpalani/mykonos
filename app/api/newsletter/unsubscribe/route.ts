import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    
    if (!supabaseServiceKey) {
      throw new Error('Service role key not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await request.json()
    const { email, token } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase.rpc('unsubscribe_from_newsletter', {
      p_email: email.toLowerCase().trim()
    })

    if (error) {
      console.error('Newsletter unsubscribe error:', error)
      return NextResponse.json(
        { error: 'Failed to unsubscribe. Please try again.' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Email not found in our newsletter list' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from newsletter'
    })
  } catch (error: any) {
    console.error('Newsletter unsubscribe error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to unsubscribe' },
      { status: 500 }
    )
  }
}
