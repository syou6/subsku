import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { burnDataSchema } from '@/lib/schema'
import { EMPTY_BURN_DATA } from '@/types'

// GET /api/data — return the signed-in user's persisted Burn state.
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('burn_state')
    .select('data')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: 'load_failed' }, { status: 500 })
  }

  // Merge stored data over defaults so newly added fields are always present.
  const merged = { ...EMPTY_BURN_DATA, ...(data?.data ?? {}) }
  return NextResponse.json({ data: merged })
}

// PUT /api/data — validate and upsert the user's Burn state.
export async function PUT(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const parsed = burnDataSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_data', issues: parsed.error.issues.slice(0, 10) },
      { status: 422 },
    )
  }

  const { error } = await supabase
    .from('burn_state')
    .upsert({ user_id: user.id, data: parsed.data }, { onConflict: 'user_id' })

  if (error) {
    return NextResponse.json({ error: 'save_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
