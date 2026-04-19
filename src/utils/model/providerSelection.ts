import { copilotLogin, hasCopilotCredentials } from '../../services/copilot/index.js'
import { getSettings_DEPRECATED, updateSettingsForSource } from '../settings/settings.js'
import {
  getAPIProvider,
  getExplicitAPIProvider,
  normalizeSupportedProvider,
  setAPIProviderOverride,
  type APIProvider,
} from './providers.js'

export type SelectableProvider = Extract<APIProvider, 'copilot' | 'firstParty'>

export const PROVIDER_LABELS: Record<SelectableProvider, string> = {
  copilot: 'GitHub Copilot',
  firstParty: 'Manual API / Compatible Endpoint',
}

export const PROVIDER_ALIASES: Record<string, SelectableProvider> = {
  api: 'firstParty',
  anthropic: 'firstParty',
  manual: 'firstParty',
  local: 'firstParty',
  'first-party': 'firstParty',
  firstparty: 'firstParty',
  copilot: 'copilot',
  'github-copilot': 'copilot',
  github: 'copilot',
}

export const INTERACTIVE_PROVIDER_OPTIONS: Array<{
  value: SelectableProvider
  label: string
  description: string
}> = [
  {
    value: 'copilot',
    label: 'GitHub Copilot',
    description: 'Uses your Copilot device login and Copilot model catalog',
  },
  {
    value: 'firstParty',
    label: 'Manual API / Compatible Endpoint',
    description: 'Uses ANTHROPIC_API_KEY and optional ANTHROPIC_BASE_URL',
  },
]

export function getStoredProviderSelection(): SelectableProvider | null {
  const settingsProvider = normalizeSupportedProvider(
    (getSettings_DEPRECATED() as { apiProvider?: string } | undefined)?.apiProvider,
  )

  if (settingsProvider === 'copilot' || settingsProvider === 'firstParty') {
    return settingsProvider
  }

  return null
}

export function getExplicitProviderSelection(): SelectableProvider | null {
  const provider = getExplicitAPIProvider()

  if (provider === 'copilot' || provider === 'firstParty') {
    return provider
  }

  return null
}

export function getCurrentSelectableProvider(): SelectableProvider {
  return getAPIProvider() === 'firstParty' ? 'firstParty' : 'copilot'
}

export function inferProviderFromModel(model: string): SelectableProvider | null {
  const normalized = model.trim().toLowerCase()

  if (!normalized) {
    return null
  }

  if (
    normalized.startsWith('gpt-') ||
    normalized.startsWith('o1') ||
    normalized.startsWith('o3') ||
    normalized.startsWith('claude-sonnet-4.') ||
    normalized.startsWith('claude-haiku-4.') ||
    normalized.startsWith('claude-opus-4.')
  ) {
    return 'copilot'
  }

  if (
    normalized.startsWith('claude-') ||
    normalized.startsWith('us.anthropic.') ||
    normalized.startsWith('anthropic.')
  ) {
    return 'firstParty'
  }

  return null
}

export function persistProviderSelection(provider: SelectableProvider): void {
  updateSettingsForSource('userSettings', {
    apiProvider: provider,
  })
}

export async function activateProviderSelection(
  provider: SelectableProvider,
  options?: {
    loginCopilot?: boolean
    onProviderChanged?: () => void
  },
): Promise<void> {
  if (provider === 'copilot' && options?.loginCopilot !== false && !hasCopilotCredentials()) {
    await copilotLogin()
  }

  setAPIProviderOverride(provider)
  persistProviderSelection(provider)
  options?.onProviderChanged?.()
}
