import Stripe from 'stripe'
import { env } from '@/lib/env'

let _stripe: Stripe | null = null

// Lazy singleton so importing this module never throws at build time when the
// secret key isn't present (e.g. during `next build` static analysis).
export function stripe(): Stripe {
  if (!_stripe) {
    // Pin nothing — let the SDK use its bundled default API version. Casting keeps
    // this resilient across Stripe SDK minor bumps that change the version literal.
    _stripe = new Stripe(env.stripeSecretKey())
  }
  return _stripe
}
