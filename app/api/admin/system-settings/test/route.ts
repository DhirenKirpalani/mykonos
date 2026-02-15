import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    checks: {}
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Check 1: Authentication
    const cookieHeader = request.headers.get('cookie') || ''
    const accessToken = cookieHeader.split(';').find(c => c.trim().startsWith('sb-access-token='))?.split('=')[1]
    
    diagnostics.checks.hasAccessToken = !!accessToken
    
    if (accessToken) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken)
      diagnostics.checks.authValid = !authError && !!user
      diagnostics.checks.userId = user?.id
      
      if (user) {
        // Check user role
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()
        
        diagnostics.checks.userRole = userData?.role
        diagnostics.checks.isAdmin = userData?.role === 'admin'
      }
    }
    
    // Check 2: System settings table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('system_settings')
      .select('setting_key')
      .limit(1)
    
    diagnostics.checks.systemSettingsTableExists = !tableError
    diagnostics.checks.tableError = tableError?.message
    
    // Check 3: RPC function exists
    const { data: rpcCheck, error: rpcError } = await supabase.rpc('get_system_setting', {
      p_setting_key: 'test_key'
    })
    
    diagnostics.checks.rpcFunctionExists = !rpcError || rpcError.message?.includes('does not exist') === false
    diagnostics.checks.rpcError = rpcError?.message
    
    // Check 4: Try to read settings
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('*')
      .limit(5)
    
    diagnostics.checks.canReadSettings = !settingsError
    diagnostics.checks.settingsCount = settings?.length || 0
    diagnostics.checks.settingsError = settingsError?.message
    
    return NextResponse.json(diagnostics)
  } catch (error: any) {
    diagnostics.error = error.message
    return NextResponse.json(diagnostics, { status: 500 })
  }
}
