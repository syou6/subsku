import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Exchanges the auth code (magic link / OAuth) for a session, then redirects.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/app'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next.startsWith('/') ? next : '/app'}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`)
}
