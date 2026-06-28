export type Currency = 'USD' | 'EUR' | 'JPY'
export type Cycle = 'monthly' | 'yearly'
export type Usage = 'high' | 'mid' | 'low'
export type Plan = 'free' | 'pro'

export interface Sub {
  id: string
  name: string
  amount: number
  currency: Currency
  cycle: Cycle
  category: string
  usage: Usage
  billingDate: string
  projectId: string
  account: string
}

export interface Project {
  id: string
  name: string
  revenue: number
  currency: Currency
  launchDate: string
}

export interface BurnData {
  subs: Sub[]
  projects: Project[]
  usd: number
  eur: number
  cash: number
  tax: number
  view: 'service' | 'category'
}

export const EMPTY_BURN_DATA: BurnData = {
  subs: [],
  projects: [],
  usd: 157,
  eur: 170,
  cash: 0,
  tax: 20,
  view: 'service',
}

// Shape returned by the Gmail import route — one detected subscription.
export interface GmailHit {
  name: string
  amount: number
  currency: Currency
  cycle: Cycle
}

// Shape returned by the Stripe MRR import route.
export interface StripeMrr {
  mrr: number
  currency: Currency
  count: number
}
