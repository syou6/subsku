import type { Plan } from '@/types'

// Free tier caps the number of tracked subscriptions; Pro is unlimited.
// Kept in one place so the client gate and the server enforcement agree.
export const FREE_SUB_LIMIT = 5

export const subLimitFor = (plan: Plan): number =>
  plan === 'pro' ? Infinity : FREE_SUB_LIMIT

export const canAddSub = (plan: Plan, current: number): boolean =>
  current < subLimitFor(plan)
