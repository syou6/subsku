import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { fetchGmailReceipts, parseLoose } from '@/lib/anthropic-import'
import type { Currency, Cycle, GmailHit } from '@/types'

export const maxDuration = 60

// POST /api/import/gmail — Pro-gated. Scans Gmail receipts via the Gmail MCP
// server and returns deduplicated subscription candidates for the user to confirm.
export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (session.plan !== 'pro') {
    return NextResponse.json({ error: 'upgrade_required' }, { status: 402 })
  }

  try {
    const text = await fetchGmailReceipts()
    const raw = parseLoose<unknown>(text)
    const arr = Array.isArray(raw) ? raw : []
    const hits: GmailHit[] = arr
      .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
      .filter((x) => x.name && x.amount)
      .map((x) => {
        const currency: Currency = ['USD', 'JPY', 'EUR'].includes(
          String(x.currency || '').toUpperCase(),
        )
          ? (String(x.currency).toUpperCase() as Currency)
          : 'USD'
        const cycle: Cycle = x.cycle === 'yearly' ? 'yearly' : 'monthly'
        return { name: String(x.name), amount: Number(x.amount) || 0, currency, cycle }
      })

    return NextResponse.json({ data: hits })
  } catch (err) {
    console.error('gmail import failed:', err)
    return NextResponse.json({ error: 'import_failed' }, { status: 502 })
  }
}
