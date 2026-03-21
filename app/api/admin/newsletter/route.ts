import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    
    if (!supabaseServiceKey) {
      throw new Error('Service role key not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    let query = supabase
      .from('newsletter_subscriptions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (status === 'active') {
      query = query.eq('is_active', true)
    } else if (status === 'unsubscribed') {
      query = query.eq('is_active', false)
    }

    if (search) {
      query = query.ilike('email', `%${search}%`)
    }

    query = query.range(offset, offset + limit - 1)

    const { data: subscribers, error, count } = await query

    if (error) {
      console.error('Newsletter fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch subscribers' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      subscribers: subscribers || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    })
  } catch (error: any) {
    console.error('Newsletter fetch error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscribers' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    
    if (!supabaseServiceKey) {
      throw new Error('Service role key not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase.rpc('subscribe_to_newsletter', {
      p_email: email.toLowerCase().trim(),
      p_source: 'admin'
    })

    if (error) {
      console.error('Newsletter subscription error:', error)
      return NextResponse.json(
        { error: 'Failed to add subscriber' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Subscriber added successfully',
      subscription_id: data
    })
  } catch (error: any) {
    console.error('Newsletter subscription error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to add subscriber' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    
    if (!supabaseServiceKey) {
      throw new Error('Service role key not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Subscriber ID is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('newsletter_subscriptions')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Newsletter delete error:', error)
      return NextResponse.json(
        { error: 'Failed to delete subscriber' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Subscriber deleted successfully'
    })
  } catch (error: any) {
    console.error('Newsletter delete error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete subscriber' },
      { status: 500 }
    )
  }
}
