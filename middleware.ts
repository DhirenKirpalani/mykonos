import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create Supabase client for session refresh
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  await supabase.auth.getUser()

  // Skip maintenance check for CMS routes, API routes, and static files
  if (
    request.nextUrl.pathname.startsWith('/cms') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/static') ||
    request.nextUrl.pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)
  ) {
    return response
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Check if maintenance mode is enabled
    const { data: maintenanceSetting, error: settingError } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'maintenance_mode')
      .single()

    console.log('Middleware - Checking maintenance mode:', {
      path: request.nextUrl.pathname,
      maintenanceSetting,
      settingError,
      enabled: maintenanceSetting?.setting_value?.enabled
    })

    const isMaintenanceMode = maintenanceSetting?.setting_value?.enabled === true
    
    if (isMaintenanceMode) {
      console.log('Maintenance mode is ENABLED - blocking access')
      // Check if user is admin/staff (they can still access during maintenance)
      const cookieHeader = request.headers.get('cookie') || ''
      const accessToken = cookieHeader.split(';').find(c => c.trim().startsWith('sb-access-token='))?.split('=')[1]
      
      if (accessToken) {
        const { data: { user } } = await supabase.auth.getUser(accessToken)
        
        if (user) {
          const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()
          
          // Allow admin and staff to bypass maintenance mode
          if (userData?.role === 'admin' || userData?.role === 'staff') {
            return response
          }
        }
      }
      
      // Return maintenance page HTML directly
      const maintenanceMessage = maintenanceSetting?.setting_value?.message || 
        'We are currently performing maintenance. Please check back soon.'
      
      return new NextResponse(
        `<!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Maintenance Mode - Mykonos</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
              }
              
              @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
              }
              
              @keyframes shimmer {
                0% { background-position: -1000px 0; }
                100% { background-position: 1000px 0; }
              }
              
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                background: #0A1E3D;
                color: white;
                overflow: hidden;
                position: relative;
              }
              
              body::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: radial-gradient(circle at 20% 50%, rgba(212, 175, 55, 0.08) 0%, transparent 50%),
                            radial-gradient(circle at 80% 80%, rgba(212, 175, 55, 0.08) 0%, transparent 50%);
                animation: pulse 8s ease-in-out infinite;
              }
              
              .container {
                text-align: center;
                padding: 2rem;
                max-width: 600px;
                position: relative;
                z-index: 1;
                animation: fadeIn 0.8s ease-out;
              }
              
              .icon {
                font-size: 5rem;
                display: inline-block;
                margin-bottom: 2rem;
                animation: pulse 2s ease-in-out infinite;
                filter: drop-shadow(0 0 20px rgba(212, 175, 55, 0.5));
              }
              
              h1 {
                font-size: clamp(2rem, 8vw, 3.5rem);
                margin-bottom: 1.5rem;
                color: #d4af37;
                font-family: 'Georgia', serif;
                letter-spacing: 0.3em;
                font-weight: 300;
                text-transform: uppercase;
                background: linear-gradient(90deg, #d4af37, #f4e5b1, #d4af37);
                background-size: 200% auto;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                animation: shimmer 3s linear infinite;
              }
              
              .message {
                font-size: 1.25rem;
                line-height: 1.8;
                color: #d4af37;
                margin-bottom: 2rem;
                font-weight: 300;
                animation: fadeIn 1s ease-out 0.3s both;
              }
              
              .status-badge {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
                padding: 0.75rem 1.5rem;
                background: rgba(212, 175, 55, 0.1);
                border: 1px solid rgba(212, 175, 55, 0.3);
                border-radius: 50px;
                font-size: 0.9rem;
                color: #d4af37;
                font-weight: 500;
                animation: fadeIn 1.2s ease-out 0.6s both;
                backdrop-filter: blur(10px);
              }
              
              .status-dot {
                width: 8px;
                height: 8px;
                background: #d4af37;
                border-radius: 50%;
                animation: pulse 2s ease-in-out infinite;
              }
              
              .footer {
                margin-top: 3rem;
                font-size: 0.9rem;
                color: rgba(212, 175, 55, 0.7);
                animation: fadeIn 1.5s ease-out 0.9s both;
              }
              
              @media (max-width: 640px) {
                .container {
                  padding: 1.5rem;
                }
                .icon {
                  font-size: 4rem;
                }
                .message {
                  font-size: 1.1rem;
                }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="icon">🔧</div>
              <h1>MYKONOS</h1>
              <p class="message">${maintenanceMessage}</p>
              <div class="status-badge">
                <span class="status-dot"></span>
                <span>Maintenance in Progress</span>
              </div>
              <div class="footer">
                We'll be back shortly. Thank you for your patience.
              </div>
            </div>
          </body>
        </html>`,
        {
          status: 503,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Retry-After': '3600'
          }
        }
      )
    }

    // Check if checkout is disabled
    if (request.nextUrl.pathname === '/checkout') {
      const { data: checkoutSetting } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'checkout_enabled')
        .single()

      if (checkoutSetting?.setting_value?.enabled === false) {
        return NextResponse.redirect(new URL('/cart?checkout_disabled=true', request.url))
      }
    }

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
