import { getSettings_DEPRECATED } from '../settings/settings.js'
import {
  getSmallFastModel,
  getDefaultSonnetModel,
  getDefaultOpusModel,
  type ModelName,
} from './model.js'
import { getAPIProvider, type APIProvider, normalizeSupportedProvider } from './providers.js'

// On Copilot, use FREE models (0x multiplier) for small tasks by default.
// GPT-5-mini: free (0x), 64K max output, strong reasoning + tool use.
const COPILOT_FREE_SMALL_MODEL = 'gpt-5-mini'

export const TASK_CATEGORIES = {
  mainLoop: {
    label: 'Main Loop',
    description: 'Primary assistant turns and main conversation requests',
    defaultTier: 'main' as const,
  },
  title: {
    label: 'Title Generation',
    description: 'Session titles, rename, teleport, feedback titles',
    defaultTier: 'small' as const,
  },
  summary: {
    label: 'Summary Generation',
    description: 'Tool use summaries, away summaries',
    defaultTier: 'small' as const,
  },
  analysis: {
    label: 'Content Analysis',
    description: 'Web fetch analysis, web search ranking',
    defaultTier: 'small' as const,
  },
  utility: {
    label: 'Utility Tasks',
    description: 'Shell prefix extraction, datetime parsing',
    defaultTier: 'small' as const,
  },
  memory: {
    label: 'Memory Selection',
    description: 'Relevant memories, session search',
    defaultTier: 'medium' as const,
  },
  permission: {
    label: 'Permission Classification',
    description: 'YOLO classifier, permission explainer',
    defaultTier: 'medium' as const,
  },
  insights: {
    label: 'Insights Analysis',
    description: 'Insights facet extraction and narrative',
    defaultTier: 'large' as const,
  },
  hooks: {
    label: 'Hooks Default',
    description: 'Default model for user-defined hooks',
    defaultTier: 'small' as const,
  },
  quotaCheck: {
    label: 'Quota Check',
    description: 'Startup quota/rate-limit probe requests',
    defaultTier: 'small' as const,
  },
  verifyApiKey: {
    label: 'API Key Verification',
    description: 'Credential verification checks',
    defaultTier: 'small' as const,
  },
  tokenCount: {
    label: 'Token Counting',
    description: 'Context/token count API requests',
    defaultTier: 'small' as const,
  },
  tokenCountFallback: {
    label: 'Token Count Fallback',
    description: 'Fallback token counting when primary path fails',
    defaultTier: 'small' as const,
  },
  autoModeCritique: {
    label: 'Auto Mode Critique',
    description: 'Critique assistant for auto-mode rules',
    defaultTier: 'medium' as const,
  },
  forkAgent: {
    label: 'Fork Agent (background)',
    description: 'Background forks: speculation, extract_memories, session_memory, prompt_suggestion, agent_summary',
    defaultTier: 'main' as const,
  },
} as const

export type TaskCategory = keyof typeof TASK_CATEGORIES
export const TASK_CATEGORY_KEYS = Object.keys(TASK_CATEGORIES) as TaskCategory[]

export type SupportedTaskProvider = Extract<APIProvider, 'firstParty' | 'copilot'>

type TaskModelOverride = string | {
  model: string
  provider?: SupportedTaskProvider
}

type ModelConfigSettings = Partial<Record<TaskCategory, TaskModelOverride>>

export type TaskRoute = {
  provider: SupportedTaskProvider
  model: ModelName
  isOverridden: boolean
  tier: string
}

function getModelConfigFromSettings(): ModelConfigSettings {
  const settings = getSettings_DEPRECATED()
  return (settings as Record<string, unknown>)?.modelConfig as ModelConfigSettings ?? {}
}

function getDefaultProviderForTask(_category: TaskCategory): SupportedTaskProvider {
  const provider = getAPIProvider()
  return provider === 'copilot' ? 'copilot' : 'firstParty'
}

function normalizeTaskProvider(value: string | undefined): SupportedTaskProvider | null {
  const provider = normalizeSupportedProvider(value)
  return provider === 'copilot' || provider === 'firstParty' ? provider : null
}

function parseTaskOverride(
  override: TaskModelOverride | undefined,
): { provider?: SupportedTaskProvider; model?: ModelName } | null {
  if (!override) {
    return null
  }
  if (typeof override === 'string') {
    return { model: override }
  }
  if (typeof override.model !== 'string' || !override.model.trim()) {
    return null
  }
  return {
    model: override.model,
    provider: normalizeTaskProvider(override.provider),
  }
}

function getDefaultModelForTier(
  tier: 'main' | 'small' | 'medium' | 'large',
  provider: SupportedTaskProvider,
  category?: TaskCategory,
): ModelName {
  switch (tier) {
    case 'main':
      return provider === 'copilot' ? 'claude-sonnet-4.6' : getDefaultSonnetModel()
    case 'small':
      if (provider === 'copilot') {
        return COPILOT_FREE_SMALL_MODEL
      }
      if (
        category === 'verifyApiKey' ||
        category === 'quotaCheck' ||
        category === 'tokenCount' ||
        category === 'tokenCountFallback'
      ) {
        return getSmallFastModel()
      }
      return getDefaultSonnetModel()
    case 'medium':
      return provider === 'copilot' ? 'claude-haiku-4.5' : getDefaultSonnetModel()
    case 'large':
      return provider === 'copilot' ? 'claude-opus-4.6' : getDefaultOpusModel()
  }
}

export function getTaskRoute(category: TaskCategory): TaskRoute {
  const config = getModelConfigFromSettings()
  const parsedOverride = parseTaskOverride(config[category])
  const provider = parsedOverride?.provider ?? getDefaultProviderForTask(category)
  const tier = TASK_CATEGORIES[category].defaultTier

  if (parsedOverride?.model) {
    return {
      provider,
      model: parsedOverride.model,
      isOverridden: true,
      tier,
    }
  }

  if (category === 'forkAgent' && provider === 'copilot') {
    return {
      provider,
      model: COPILOT_FREE_SMALL_MODEL,
      isOverridden: false,
      tier,
    }
  }

  return {
    provider,
    model: getDefaultModelForTier(tier, provider, category),
    isOverridden: false,
    tier,
  }
}

export function getModelForTask(category: TaskCategory): ModelName {
  return getTaskRoute(category).model
}

export function getProviderForTask(category: TaskCategory): SupportedTaskProvider {
  return getTaskRoute(category).provider
}

export function getCurrentModelForCategory(category: TaskCategory): {
  model: ModelName
  provider: SupportedTaskProvider
  isOverridden: boolean
  tier: string
} {
  const route = getTaskRoute(category)
  return route
}
