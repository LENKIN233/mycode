import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from '../../services/analytics/index.js'

// Other provider types are kept for type compatibility with imported SDK code
export type APIProvider = 'firstParty' | 'bedrock' | 'vertex' | 'foundry' | 'copilot'

const SUPPORTED_PROVIDERS = new Set<APIProvider>(['firstParty', 'copilot'])

// Runtime override — set by /provider command or --copilot-login
let runtimeProviderOverride: APIProvider | null = null

function normalizeSupportedProvider(value: string | undefined): APIProvider | null {
  switch (value?.trim().toLowerCase()) {
    case 'api':
    case 'anthropic':
    case 'firstparty':
    case 'first-party':
    case 'firstpartyapi':
    case 'firstParty':
      return 'firstParty'
    case 'copilot':
    case 'github-copilot':
    case 'github':
      return 'copilot'
    default:
      return null
  }
}

export function setAPIProviderOverride(provider: APIProvider | null): void {
  if (provider !== null && !SUPPORTED_PROVIDERS.has(provider)) {
    throw new Error(
      `Provider "${provider}" is not supported in this fork. Supported providers: ${[...SUPPORTED_PROVIDERS].join(', ')}`,
    )
  }
  runtimeProviderOverride = provider

  if (provider === null) {
    delete process.env.MYCODE_API_PROVIDER
  } else {
    process.env.MYCODE_API_PROVIDER = provider
  }

  if (provider === 'copilot') {
    process.env.MYCODE_USE_COPILOT = '1'
  } else {
    delete process.env.MYCODE_USE_COPILOT
  }

  // Re-initialize model strings for the new provider (lazy import to avoid circular dep)
  import('./modelStrings.js').then(m => m.reinitModelStrings()).catch(() => {})
}

export function getAPIProvider(): APIProvider {
  if (runtimeProviderOverride) {
    return runtimeProviderOverride
  }

  const envProvider = normalizeSupportedProvider(process.env.MYCODE_API_PROVIDER)
  if (envProvider) {
    return envProvider
  }

  if (
    process.env.ANTHROPIC_API_KEY ||
    process.env.ANTHROPIC_AUTH_TOKEN ||
    process.env.ANTHROPIC_BASE_URL
  ) {
    return 'firstParty'
  }

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
