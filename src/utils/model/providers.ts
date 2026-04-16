import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../../services/analytics/index.js'

// Other provider types are kept for type compatibility with imported SDK code
export type APIProvider = 'firstParty' | 'bedrock' | 'vertex' | 'foundry' | 'copilot'

// Runtime override — set by /provider command or --copilot-login
let runtimeProviderOverride: APIProvider | null = null

export function setAPIProviderOverride(provider: APIProvider | null): void {
  // Only copilot is supported
  if (provider !== null && provider !== 'copilot') {
    throw new Error(`Provider "${provider}" is not supported. Only "copilot" is available.`)
  }
  runtimeProviderOverride = provider
  if (provider === 'copilot' || provider === null) {
    process.env.MYCODE_USE_COPILOT = '1'
  }
  // Re-initialize model strings for the new provider (lazy import to avoid circular dep)
  import('./modelStrings.js').then(m => m.reinitModelStrings()).catch(() => {})
}

export function getAPIProvider(): APIProvider {
  // Only GitHub Copilot is supported
  return 'copilot'
}

export function getAPIProviderForStatsig(): AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  return getAPIProvider() as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
}

/**
 * Check if ANTHROPIC_BASE_URL is a first-party Anthropic API URL.
 * Returns true if not set (default API) or points to api.anthropic.com
 * (or api-staging.anthropic.com for ant users).
 */
export function isFirstPartyBaseUrl(): boolean {
  const baseUrl = process.env.ANTHROPIC_BASE_URL
  if (!baseUrl) {
    return true
  }
  try {
    const host = new URL(baseUrl).host
    const allowedHosts = ['api.anthropic.com']
    if (process.env.USER_TYPE === 'ant') {
      allowedHosts.push('api-staging.anthropic.com')
    }
    return allowedHosts.includes(host)
  } catch {
    return false
  }
}
