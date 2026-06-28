import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { fetchStripeMrr, parseLoose } from '@/lib/anthropic-import'
import type { Currency, StripeMrr } from '@/types'

export const maxDuration = 60

// POST /api/import/stripe — Pro-gated. Reads the connected Stripe account via the
// Stripe MCP server and returns a normalized MRR figure.
export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (session.plan !== 'pro') {
    return NextResponse.json({ error: 'upgrade_required' }, { status: 402 })
  }

  try {
    const text = await fetchStripeMrr()
    const raw = parseLoose<{ mrr?: number; currency?: string; count?: number }>(text)
    const currency: Currency = ['USD', 'JPY', 'EUR'].includes((raw.currency || '').toUpperCase())
      ? (raw.currency!.toUpperCase() as Currency)
      : 'USD'
    const result: StripeMrr = {
      mrr: Number(raw.mrr) || 0,
      currency,
      count: Number(raw.count) || 0,
    }
    return NextResponse.json({ data: result })
  } catch (err) {
    console.error('stripe import failed:', err)
    return NextResponse.json({ error: 'import_failed' }, { status: 502 })
  }
}
