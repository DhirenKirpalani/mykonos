import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const dynamic = 'force-dynamic'

async function getAuthUser(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabase.auth.getUser(token)
  return user
}

export async function GET(
  request: Request,
  { params }: { params: { page: string } }
) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('page_contents')
    .select('locale, content, updated_at')
    .eq('page_key', params.page)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result: Record<string, any> = {}
  for (const row of data || []) {
    result[row.locale] = { content: row.content, updated_at: row.updated_at }
  }

  return NextResponse.json({ success: true, data: result })
}

export async function PUT(
  request: Request,
  { params }: { params: { page: string } }
) {
  const user = await getAuthUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { locale, content } = body

  if (!locale || !content) {
    return NextResponse.json({ error: 'Missing locale or content' }, { status: 400 })
  }

  const { error } = await supabase
    .from('page_contents')
    .upsert(
      {
        page_key: params.page,
        locale,
        content,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      },
      { onConflict: 'page_key,locale' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
