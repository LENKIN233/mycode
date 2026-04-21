import { getSettings_DEPRECATED } from '../settings/settings.js'
import {
  getSmallFastModel,
  getDefaultSonnetModel,
  getDefaultOpusModel,
  type ModelName,
} from './model.js'
import { getAPIProvider, type APIProvider, normalizeSupportedProvider } from './providers.js'
import { getCachedAvailableCopilotModels } from '../../services/copilot/models.js'

// On Copilot, use FREE models (0x multiplier) for small tasks by default.
// GPT-5-mini: free (0x), 64K max output, strong reasoning + tool use.
const COPILOT_FREE_SMALL_MODEL = 'gpt-5-mini'
export const TASK_CATEGORY_GROUPS = {
  core: {
    label: 'Core Assistant',
    description: 'Main conversation and background assistant work',
  },
  session: {
    label: 'Session UX',
    description: 'Titles, summaries, hooks, and session-facing helpers',
  },
  analysis: {
    label: 'Analysis and Memory',
    description: 'Classification, memory selection, and derived analysis requests',
  },
  infrastructure: {
    label: 'Infrastructure and Checks',
    description: 'Quota probes, token counting, key checks, and guardrail helpers',
  },
} as const
const COPILOT_DEFAULT_CANDIDATES = {
  main: [
    'claude-sonnet-4.6',
    'claude-sonnet-4.5',
    'gpt-5.4',
    'gpt-5.3-codex',
    'gpt-5.2-codex',
    'gpt-5.2',
    'gpt-5.1',
    'gpt-4.1',
    'gpt-4o',
  ],
  small: [
    'gpt-5-mini',
    'gpt-4.1',
    'gpt-4o',
    'claude-haiku-4.5',
    'gpt-5.4-mini',
    'grok-code-fast-1',
    'gemini-3-flash-preview',
  ],
  medium: [
    'claude-haiku-4.5',
    'gpt-5.4-mini',
    'gpt-5-mini',
    'claude-sonnet-4.6',
    'claude-sonnet-4.5',
    'gpt-5.4',
    'gpt-5.2-codex',
  ],
  large: [
    'claude-opus-4.6',
    'claude-sonnet-4.6',
    'claude-opus-4.5',
    'gpt-5.4',
    'gpt-5.3-codex',
    'gpt-5.2-codex',
    'gemini-2.5-pro',
  ],
} as const

export const TASK_CATEGORIES = {
  mainLoop: {
    label: 'Main Loop',
    description: 'Primary assistant turns and main conversation requests',
    defaultTier: 'main' as const,
    group: 'core' as const,
    audience: 'common' as const,
  },
  title: {
    label: 'Title Generation',
    description: 'Session titles, rename, teleport, feedback titles',
    defaultTier: 'small' as const,
    group: 'session' as const,
    audience: 'common' as const,
  },
  summary: {
    label: 'Summary Generation',
    description: 'Tool use summaries, away summaries',
    defaultTier: 'small' as const,
    group: 'session' as const,
    audience: 'common' as const,
  },
  analysis: {
    label: 'Content Analysis',
    description: 'Web fetch analysis, web search ranking',
    defaultTier: 'small' as const,
    group: 'analysis' as const,
    audience: 'common' as const,
  },
  utility: {
    label: 'Utility Tasks',
    description: 'Shell prefix extraction, datetime parsing',
    defaultTier: 'small' as const,
    group: 'infrastructure' as const,
    audience: 'advanced' as const,
  },
  memory: {
    label: 'Memory Selection',
    description: 'Relevant memories, session search',
    defaultTier: 'medium' as const,
    group: 'analysis' as const,
    audience: 'common' as const,
  },
  permission: {
    label: 'Permission Classification',
    description: 'YOLO classifier, permission explainer',
    defaultTier: 'medium' as const,
    group: 'analysis' as const,
    audience: 'common' as const,
  },
  insights: {
    label: 'Insights Analysis',
    description: 'Insights facet extraction and narrative',
    defaultTier: 'large' as const,
    group: 'analysis' as const,
    audience: 'advanced' as const,
  },
  hooks: {
    label: 'Hooks Default',
    description: 'Default model for user-defined hooks',
    defaultTier: 'small' as const,
    group: 'session' as const,
    audience: 'common' as const,
  },
  quotaCheck: {
    label: 'Quota Check',
    description: 'Startup quota/rate-limit probe requests',
    defaultTier: 'small' as const,
    group: 'infrastructure' as const,
    audience: 'advanced' as const,
  },
  verifyApiKey: {
    label: 'API Key Verification',
    description: 'Credential verification checks',
    defaultTier: 'small' as const,
    group: 'infrastructure' as const,
    audience: 'advanced' as const,
  },
  tokenCount: {
    label: 'Token Counting',
    description: 'Context/token count API requests',
    defaultTier: 'small' as const,
    group: 'infrastructure' as const,
    audience: 'advanced' as const,
  },
  tokenCountFallback: {
    label: 'Token Count Fallback',
    description: 'Fallback token counting when primary path fails',
    defaultTier: 'small' as const,
    group: 'infrastructure' as const,
    audience: 'advanced' as const,
  },
  autoModeCritique: {
    label: 'Auto Mode Critique',
    description: 'Critique assistant for auto-mode rules',
    defaultTier: 'medium' as const,
    group: 'infrastructure' as const,
    audience: 'advanced' as const,
  },
  forkAgent: {
    label: 'Fork Agent (background)',
    description: 'Background forks: speculation, extract_memories, session_memory, prompt_suggestion, agent_summary',
    defaultTier: 'main' as const,
    group: 'core' as const,
    audience: 'advanced' as const,
  },
} as const

export type TaskCategory = keyof typeof TASK_CATEGORIES
export type TaskCategoryGroup = keyof typeof TASK_CATEGORY_GROUPS
export type TaskCategoryAudience = 'common' | 'advanced'
export const TASK_CATEGORY_KEYS = Object.keys(TASK_CATEGORIES) as TaskCategory[]
const TASK_CATEGORY_GROUP_ORDER: TaskCategoryGroup[] = [
  'core',
  'session',
  'analysis',
  'infrastructure',
]
const TASK_CATEGORY_AUDIENCE_ORDER: TaskCategoryAudience[] = ['common', 'advanced']
export const ORDERED_TASK_CATEGORY_KEYS = TASK_CATEGORY_AUDIENCE_ORDER.flatMap(
  audience =>
    TASK_CATEGORY_GROUP_ORDER.flatMap(group =>
      TASK_CATEGORY_KEYS.filter(
        key =>
          TASK_CATEGORIES[key].audience === audience &&
          TASK_CATEGORIES[key].group === group,
      ),
    ),
)

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

export function resolveCopilotDefaultModelFromAvailable(
  candidates: readonly string[],
  availableModelIds: Iterable<string>,
  fallback: ModelName,
): ModelName {
  const available = new Set(availableModelIds)
  if (available.size === 0) {
    return fallback
  }

  for (const candidate of candidates) {
    if (available.has(candidate)) {
      return candidate
    }
  }

  return [...available][0] as ModelName
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
  if (provider === 'copilot') {
    const availableIds = getCachedAvailableCopilotModels().map(model => model.id)
    const fallback =
      tier === 'main'
        ? 'claude-sonnet-4.6'
        : tier === 'small'
          ? COPILOT_FREE_SMALL_MODEL
          : tier === 'medium'
            ? 'claude-haiku-4.5'
            : 'claude-opus-4.6'

    const tierKey =
      category === 'forkAgent' ? 'small' : tier

    return resolveCopilotDefaultModelFromAvailable(
      COPILOT_DEFAULT_CANDIDATES[tierKey],
      availableIds,
      fallback,
    )
  }

  switch (tier) {
    case 'main':
      return getDefaultSonnetModel()
    case 'small':
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
      return getDefaultSonnetModel()
    case 'large':
      return getDefaultOpusModel()
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
      model: getDefaultModelForTier('small', provider, category),
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

export function getTaskCategoryGroup(category: TaskCategory): TaskCategoryGroup {
  return TASK_CATEGORIES[category].group
}

export function getTaskCategoryAudience(
  category: TaskCategory,
): TaskCategoryAudience {
  return TASK_CATEGORIES[category].audience
}

export function getTaskCategoryGroupMeta(group: TaskCategoryGroup): {
  label: string
  description: string
} {
  return TASK_CATEGORY_GROUPS[group]
}
