import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * Get system settings audit logs
 */
export async function GET(request: Request) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get authorization header
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

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || (userData as any).role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const settingKey = searchParams.get('setting_key')

    // Fetch system settings audit logs
    let query = supabase
      .from('system_settings_log')
      .select(`
        id,
        setting_key,
        old_value,
        new_value,
        changed_by,
        reason,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filter by setting key if provided
    if (settingKey) {
      query = query.eq('setting_key', settingKey)
    }

    const { data: logs, error } = await query

    if (error) {
      console.error('System settings audit log fetch error:', error)
      throw error
    }

    // Enrich logs with user information
    const enrichedLogs = await Promise.all(
      (logs || []).map(async (log) => {
        if (log.changed_by) {
          const { data: userData } = await supabase
            .from('users')
            .select('email, full_name')
            .eq('id', log.changed_by)
            .single()
          
          return {
            ...log,
            user: userData || null
          }
        }
        return log
      })
    )

    return NextResponse.json({
      logs: enrichedLogs,
      count: enrichedLogs.length
    })
  } catch (error: any) {
    console.error('System settings audit log error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}
