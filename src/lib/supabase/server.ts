import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { env } from '@/lib/env'

// Request-scoped Supabase client backed by the auth cookies. Use in Server
// Components, Route Handlers, and Server Actions. RLS applies as the signed-in user.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        } catch {
          // Called from a Server Component — cookies are read-only here. The
          // middleware refreshes the session, so this can be safely ignored.
        }
      },
    },
  })
}

// Service-role client that bypasses RLS. Server-only. Use exclusively for trusted
// flows like the Stripe webhook updating a user's plan.
export function createAdminClient() {
  return createSupabaseClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
