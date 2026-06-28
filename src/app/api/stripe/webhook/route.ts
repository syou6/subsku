import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'

export const runtime = 'nodejs'

// POST /api/stripe/webhook — source of truth for plan changes. Verifies the
// signature, then flips profiles.plan based on subscription state. Uses the
// service-role client because the request has no user session.
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

  const admin = createAdminClient()

  async function setPlanByCustomer(
    customerId: string,
    plan: 'free' | 'pro',
    subscriptionId: string | null,
    periodEnd: number | null,
  ) {
    await admin
      .from('profiles')
      .update({
        plan,
        stripe_subscription_id: subscriptionId,
        current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      })
      .eq('stripe_customer_id', customerId)
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session
        const customerId = typeof s.customer === 'string' ? s.customer : s.customer?.id
        const userId = (s.metadata?.user_id as string) || s.client_reference_id || null
        // Ensure the customer id is linked to the user (in case checkout created it).
        if (customerId && userId) {
          await admin
            .from('profiles')
            .update({ stripe_customer_id: customerId })
            .eq('id', userId)
        }
        if (customerId) {
          const subId = typeof s.subscription === 'string' ? s.subscription : null
          await setPlanByCustomer(customerId, 'pro', subId, null)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        const active = sub.status === 'active' || sub.status === 'trialing'
        const periodEnd = (sub as unknown as { current_period_end?: number }).current_period_end ?? null
        await setPlanByCustomer(customerId, active ? 'pro' : 'free', sub.id, periodEnd)
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
        await setPlanByCustomer(customerId, 'free', null, null)
        break
      }
      default:
        break
    }
  } catch (err) {
    console.error('webhook handler error:', err)
    return NextResponse.json({ error: 'handler_failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
