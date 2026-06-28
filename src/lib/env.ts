// Central, fail-fast access to required server env vars.
// Reading through these helpers gives a clear error instead of a silent undefined.

function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Missing required env var: ${name}`)
  return v
}

function optional(name: string): string {
  return process.env[name] ?? ''
}

export const env = {
  supabaseUrl: () => required('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: () => required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: () => required('SUPABASE_SERVICE_ROLE_KEY'),
  anthropicKey: () => required('ANTHROPIC_API_KEY'),
  stripeMcpToken: () => optional('STRIPE_MCP_TOKEN'),
  gmailMcpToken: () => optional('GMAIL_MCP_TOKEN'),
  stripeSecretKey: () => required('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: () => required('STRIPE_WEBHOOK_SECRET'),
  // Public Stripe Payment Link for the one-time (買い切り) Pro purchase.
  stripePaymentLink: () => required('NEXT_PUBLIC_STRIPE_PAYMENT_LINK'),
  siteUrl: () => process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
}
