import { env } from '@/lib/env'

// Server-side Claude call with optional MCP connectors. The API key lives only on
// the server — it is never shipped to the browser (unlike the original artifact,
// which called the Messages API directly from the client).

interface McpServer {
  type: 'url'
  url: string
  name: string
  authorization_token?: string
}

async function callClaude(prompt: string, mcpServers?: McpServer[]): Promise<string> {
  const body: Record<string, unknown> = {
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  }
  if (mcpServers && mcpServers.length > 0) body.mcp_servers = mcpServers

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.anthropicKey(),
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'mcp-client-2025-04-04',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Anthropic API ${res.status}: ${detail.slice(0, 300)}`)
  }

  const data = await res.json()
  const blocks: Array<{ type: string; text?: string }> = data.content || []
  return blocks
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('\n')
}

// Tolerant JSON extraction — Claude sometimes wraps output in prose or fences.
export function parseLoose<T>(txt: string): T {
  let t = (txt || '').replace(/```json|```/g, '').trim()
  const start = t.search(/[[{]/)
  const end = Math.max(t.lastIndexOf(']'), t.lastIndexOf('}'))
  if (start >= 0 && end > start) t = t.slice(start, end + 1)
  return JSON.parse(t) as T
}

export async function fetchStripeMrr(): Promise<string> {
  return callClaude(
    'Use the Stripe tools to look up all active subscriptions and compute the total Monthly Recurring Revenue (MRR). Convert any yearly plans to a monthly figure. Respond with ONLY a JSON object, no prose: {"mrr": <number>, "currency": "<ISO code like USD or JPY>", "count": <number of active subs>}',
    [
      {
        type: 'url',
        url: 'https://mcp.stripe.com',
        name: 'stripe',
        ...(env.stripeMcpToken() ? { authorization_token: env.stripeMcpToken() } : {}),
      },
    ],
  )
}

export async function fetchGmailReceipts(): Promise<string> {
  return callClaude(
    'Search my Gmail for recent subscription billing receipts / invoices from SaaS and AI tools (e.g. OpenAI/ChatGPT, Anthropic/Claude, Cursor, GitHub, Vercel, Midjourney, Perplexity, Notion, etc). Extract each UNIQUE active subscription with its price. Deduplicate by service. Respond with ONLY a JSON array, no prose: [{"name":"<service>","amount":<number>,"currency":"<USD|JPY|EUR>","cycle":"<monthly|yearly>"}]',
    [
      {
        type: 'url',
        url: 'https://gmailmcp.googleapis.com/mcp/v1',
        name: 'gmail',
        ...(env.gmailMcpToken() ? { authorization_token: env.gmailMcpToken() } : {}),
      },
    ],
  )
}
