import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../../services/analytics/index.js'
import { isEnvTruthy } from '../envUtils.js'

export type APIProvider = 'firstParty' | 'bedrock' | 'vertex' | 'foundry' | 'copilot'

function isAnthropicOfficialDisabled(): boolean {
  return isEnvTruthy(process.env.MYCODE_DISABLE_ANTHROPIC_OFFICIAL)
}

// Runtime override — set by /provider command or --copilot-login
let runtimeProviderOverride: APIProvider | null = null

export function setAPIProviderOverride(provider: APIProvider | null): void {
  runtimeProviderOverride = provider
  if (provider === 'copilot') {
    process.env.MYCODE_USE_COPILOT = '1'
  } else if (provider === null && process.env.MYCODE_USE_COPILOT) {
    delete process.env.MYCODE_USE_COPILOT
  }
  // Re-initialize model strings for the new provider (lazy import to avoid circular dep)
  import('./modelStrings.js').then(m => m.reinitModelStrings()).catch(() => {})
}

export function getAPIProvider(): APIProvider {
  if (runtimeProviderOverride) return runtimeProviderOverride
  if (isAnthropicOfficialDisabled()) {
    // Personal/forked setups can hard-disable Anthropic first-party mode.
    // Keep explicit 3P providers if configured, otherwise default to copilot.
    return isEnvTruthy(process.env.MYCODE_USE_BEDROCK)
      ? 'bedrock'
      : isEnvTruthy(process.env.MYCODE_USE_VERTEX)
        ? 'vertex'
        : isEnvTruthy(process.env.MYCODE_USE_FOUNDRY)
          ? 'foundry'
          : 'copilot'
  }
  return isEnvTruthy(process.env.MYCODE_USE_COPILOT)
    ? 'copilot'
    : isEnvTruthy(process.env.MYCODE_USE_BEDROCK)
      ? 'bedrock'
      : isEnvTruthy(process.env.MYCODE_USE_VERTEX)
        ? 'vertex'
        : isEnvTruthy(process.env.MYCODE_USE_FOUNDRY)
          ? 'foundry'
          : 'firstParty'
}

export function getAPIProviderForStatsig(): AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  return getAPIProvider() as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
}

/**
 * Check if ANTHROPIC_BASE_URL is a first-party Anthropic API URL.
 * Returns true if not set (default API) or points to api.anthropic.com
 * (or api-staging.anthropic.com for ant users).
 */
export function isFirstPartyAnthropicBaseUrl(): boolean {
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
