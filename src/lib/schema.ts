import { z } from 'zod'

// Server-side validation for the persisted Burn state. Anything the client PUTs
// to /api/data is parsed through this before it touches the database.

const currency = z.enum(['USD', 'EUR', 'JPY'])
const cycle = z.enum(['monthly', 'yearly'])
const usage = z.enum(['high', 'mid', 'low'])

export const subSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().max(120),
  amount: z.number().finite().min(0).max(1_000_000_000),
  currency,
  cycle,
  category: z.string().max(60),
  usage,
  billingDate: z.string().max(20),
  projectId: z.string().max(64),
  account: z.string().max(60),
})

export const projectSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().max(120),
  revenue: z.number().finite().min(0).max(1_000_000_000),
  currency,
  launchDate: z.string().max(20),
})

export const burnDataSchema = z.object({
  subs: z.array(subSchema).max(500),
  projects: z.array(projectSchema).max(200),
  usd: z.number().finite().min(0).max(100000),
  eur: z.number().finite().min(0).max(100000),
  cash: z.number().finite().min(0).max(1_000_000_000_000),
  tax: z.number().finite().min(0).max(100),
  view: z.enum(['service', 'category']),
})
