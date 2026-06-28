import { createClient } from '@/lib/supabase/server'
import type { Plan } from '@/types'

export interface SessionInfo {
  userId: string
  email: string | null
  plan: Plan
}

// Resolve the signed-in user plus their billing plan. Returns null when not
// authenticated. The plan defaults to 'free' if the profile row is missing.
export async function getSession(): Promise<SessionInfo | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .maybeSingle()

  const plan: Plan = profile?.plan === 'pro' ? 'pro' : 'free'
  return { userId: user.id, email: user.email ?? null, plan }
}
