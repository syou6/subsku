import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { env } from '@/lib/env'

// POST /api/stripe/checkout — start a Burn Pro subscription checkout for the user.
export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, plan')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.plan === 'pro') {
    return NextResponse.json({ error: 'already_pro' }, { status: 409 })
  }

  // Reuse an existing Stripe customer or create one keyed to the user id.
  let customerId = profile?.stripe_customer_id ?? undefined
  if (!customerId) {
    const customer = await stripe().customers.create({
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    })
    customerId = customer.id
    // Persist via service-role webhook later; best-effort write here too.
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const site = env.siteUrl()
  const checkout = await stripe().checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: env.stripePricePro(), quantity: 1 }],
    success_url: `${site}/app?upgraded=1`,
    cancel_url: `${site}/app?canceled=1`,
    client_reference_id: user.id,
    metadata: { user_id: user.id },
    subscription_data: { metadata: { user_id: user.id } },
    allow_promotion_codes: true,
  })

  return NextResponse.json({ url: checkout.url })
}
