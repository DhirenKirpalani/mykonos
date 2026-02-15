import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    // Try to get token from Authorization header first (preferred method)
    let accessToken = request.headers.get('authorization')?.replace('Bearer ', '')
    
    // Fallback to cookies if no header
    if (!accessToken) {
      const cookieStore = cookies()
      const allCookies = cookieStore.getAll()
      console.log('GET - All cookies:', allCookies.map(c => ({ name: c.name, valueLength: c.value.length })))
      
      const authCookie = allCookies.find(c => 
        c.name.includes('sb-') && c.name.includes('auth-token')
      )
      
      if (authCookie) {
        try {
          const authData = JSON.parse(authCookie.value)
          accessToken = authData.access_token || authData[0]
        } catch {
          accessToken = authCookie.value
        }
      }
    }
    
    if (!accessToken) {
      console.error('No access token found in header or cookies')
      return NextResponse.json({ 
        error: 'Unauthorized - Not logged in',
        hint: 'Please log in to access this resource'
      }, { status: 401 })
    }
    
    // Create supabase client with service role for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ 
        error: 'Unauthorized - Invalid session',
        details: authError?.message,
        hint: 'Please log in again'
      }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Fetch all system settings
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('setting_key')

    if (error) {
      throw error
    }

    // Convert to object for easier access
    const settingsObj = settings?.reduce((acc: any, setting: any) => {
      acc[setting.setting_key] = setting
      return acc
    }, {})

    return NextResponse.json(settingsObj || {})
  } catch (error) {
    console.error('Error fetching system settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch system settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Try to get token from Authorization header first (preferred method)
    let accessToken = request.headers.get('authorization')?.replace('Bearer ', '')
    
    // Fallback to cookies if no header
    if (!accessToken) {
      const cookieStore = cookies()
      const allCookies = cookieStore.getAll()
      console.log('POST - All cookies:', allCookies.map(c => ({ name: c.name, valueLength: c.value.length })))
      
      const authCookie = allCookies.find(c => 
        c.name.includes('sb-') && c.name.includes('auth-token')
      )
      
      if (authCookie) {
        try {
          const authData = JSON.parse(authCookie.value)
          accessToken = authData.access_token || authData[0]
        } catch {
          accessToken = authCookie.value
        }
      }
    }
    
    if (!accessToken) {
      console.error('No access token found in header or cookies')
      return NextResponse.json({ 
        error: 'Unauthorized - Not logged in',
        hint: 'Please log in to access this resource'
      }, { status: 401 })
    }
    
    // Create supabase client with service role for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ 
        error: 'Unauthorized - Invalid session',
        details: authError?.message,
        hint: 'Please log in again'
      }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userError || userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { setting_key, setting_value, reason } = body

    if (!setting_key || !setting_value) {
      return NextResponse.json(
        { error: 'setting_key and setting_value are required' },
        { status: 400 }
      )
    }

    // Call the update_system_setting function with user_id
    const { data, error } = await supabase.rpc('update_system_setting', {
      p_setting_key: setting_key,
      p_new_value: setting_value,
      p_user_id: user.id,
      p_reason: reason
    })

    if (error) {
      console.error('RPC Error:', error)
      return NextResponse.json(
        { 
          error: error.message || 'Failed to update system setting',
          details: error.details,
          hint: error.hint,
          code: error.code
        },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Error updating system setting:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update system setting' },
      { status: 500 }
    )
  }
}
