import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'

export const runtime = 'nodejs'

// POST /api/stripe/webhook — source of truth for the one-time (買い切り) Pro
// purchase. Verifies the signature, then on a paid checkout flips the buyer's
// plan to 'pro' for life. The buyer is identified by client_reference_id, which
// the client appends to the Payment Link URL (= the Supabase user id).
export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'no_signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe().webhooks.constructEvent(body, sig, env.stripeWebhookSecret())
  } catch (err) {
    console.error('webhook signature verification failed:', err)
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object as Stripe.Checkout.Session
      const paid = s.payment_status === 'paid' || s.payment_status === 'no_payment_required'
      const userId = s.client_reference_id || (s.metadata?.user_id as string) || null

      if (paid && userId) {
        const admin = createAdminClient()
        const customerId = typeof s.customer === 'string' ? s.customer : (s.customer?.id ?? null)
        // Upsert (not update) so the plan still flips even if the profile row is
        // missing — e.g. a user who signed up before the seed trigger existed.
        await admin
          .from('profiles')
          .upsert({ id: userId, plan: 'pro', stripe_customer_id: customerId }, { onConflict: 'id' })
      } else {
        console.warn('checkout completed but not flipped:', { paid, userId })
      }
    }
  } catch (err) {
    console.error('webhook handler error:', err)
    return NextResponse.json({ error: 'handler_failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
