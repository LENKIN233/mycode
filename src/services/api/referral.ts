import {
  getOauthAccountInfo,
  getSubscriptionType,
  isMyCodeAISubscriber,
} from '../../utils/auth.js'
import { getGlobalConfig } from '../../utils/config.js'

// Anthropic platform API is not available in this fork (API-key auth only).
type ReferralCampaign = string
type ReferralEligibilityResponse = any
type ReferrerRewardInfo = any

// Cache expiration time: 24 hours (eligibility changes only on subscription/experiment changes)
const CACHE_EXPIRATION_MS = 24 * 60 * 60 * 1000

export async function fetchReferralEligibility(
  campaign: ReferralCampaign = 'mycode_guest_pass',
): Promise<ReferralEligibilityResponse> {
  throw new Error('Anthropic platform API not available')
}

/**
 * Prechecks for if user can access guest passes feature
 */
function shouldCheckForPasses(): boolean {
  return !!(
    getOauthAccountInfo()?.organizationUuid &&
    isMyCodeAISubscriber() &&
    getSubscriptionType() === 'max'
  )
}

/**
 * Check cached passes eligibility from GlobalConfig
 * Returns current cached state and cache status
 */
export function checkCachedPassesEligibility(): {
  eligible: boolean
  needsRefresh: boolean
  hasCache: boolean
} {
  if (!shouldCheckForPasses()) {
    return {
      eligible: false,
      needsRefresh: false,
      hasCache: false,
    }
  }

  const orgId = getOauthAccountInfo()?.organizationUuid
  if (!orgId) {
    return {
      eligible: false,
      needsRefresh: false,
      hasCache: false,
    }
  }

  const config = getGlobalConfig()
  const cachedEntry = config.passesEligibilityCache?.[orgId]

  if (!cachedEntry) {
    // No cached entry, needs fetch
    return {
      eligible: false,
      needsRefresh: true,
      hasCache: false,
    }
  }

  const { eligible, timestamp } = cachedEntry
  const now = Date.now()
  const needsRefresh = now - timestamp > CACHE_EXPIRATION_MS

  return {
    eligible,
    needsRefresh,
    hasCache: true,
  }
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  BRL: 'R$',
  CAD: 'CA$',
  AUD: 'A$',
  NZD: 'NZ$',
  SGD: 'S$',
}

export function formatCreditAmount(reward: ReferrerRewardInfo): string {
  const symbol = CURRENCY_SYMBOLS[reward.currency] ?? `${reward.currency} `
  const amount = reward.amount_minor_units / 100
  const formatted = amount % 1 === 0 ? amount.toString() : amount.toFixed(2)
  return `${symbol}${formatted}`
}

/**
 * Get cached referrer reward info from eligibility cache
 * Returns the reward info if the user is in a v1 campaign, null otherwise
 */
export function getCachedReferrerReward(): ReferrerRewardInfo | null {
  const orgId = getOauthAccountInfo()?.organizationUuid
  if (!orgId) return null
  const config = getGlobalConfig()
  const cachedEntry = config.passesEligibilityCache?.[orgId]
  return cachedEntry?.referrer_reward ?? null
}

/**
 * Get the cached remaining passes count from eligibility cache
 * Returns the number of remaining passes, or null if not available
 */
export function getCachedRemainingPasses(): number | null {
  const orgId = getOauthAccountInfo()?.organizationUuid
  if (!orgId) return null
  const config = getGlobalConfig()
  const cachedEntry = config.passesEligibilityCache?.[orgId]
  return cachedEntry?.remaining_passes ?? null
}

/**
 * Fetch passes eligibility and store in GlobalConfig
 * Anthropic platform API not available — always returns null.
 */
export async function fetchAndStorePassesEligibility(): Promise<ReferralEligibilityResponse | null> {
  return null
}

/**
 * Get cached passes eligibility data or fetch if needed
 * Anthropic platform API not available — always returns null.
 */
export async function getCachedOrFetchPassesEligibility(): Promise<ReferralEligibilityResponse | null> {
  return null
}

/**
 * Prefetch passes eligibility on startup
 * Anthropic platform API not available — no-op.
 */
export async function prefetchPassesEligibility(): Promise<void> {
  return
}
