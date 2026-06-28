import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/auth'
import { EMPTY_BURN_DATA, type BurnData } from '@/types'
import Burn from '@/components/Burn'

export const dynamic = 'force-dynamic'

export default async function AppPage() {
  const session = await getSession()
  if (!session) redirect('/login?next=/app')

  const supabase = await createClient()
  const { data } = await supabase
    .from('burn_state')
    .select('data')
    .eq('user_id', session.userId)
    .maybeSingle()

  const initial: BurnData = { ...EMPTY_BURN_DATA, ...((data?.data as Partial<BurnData>) ?? {}) }

  // Public Payment Link — optional so the app still loads before billing is set up.
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? ''

  return (
    <Burn
      initialData={initial}
      plan={session.plan}
      email={session.email}
      userId={session.userId}
      paymentLink={paymentLink}
    />
  )
}
