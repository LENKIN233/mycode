import { getSettings_DEPRECATED } from '../settings/settings.js'
import {
  getSmallFastModel,
  getDefaultSonnetModel,
  getDefaultOpusModel,
  getDefaultMainLoopModel,
  type ModelName,
} from './model.js'
import { getAPIProvider } from './providers.js'

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

type ModelConfigSettings = Partial<Record<TaskCategory, string>>

function getModelConfigFromSettings(): ModelConfigSettings {
  const settings = getSettings_DEPRECATED()
  return (settings as Record<string, unknown>)?.modelConfig as ModelConfigSettings ?? {}
}

function getDefaultModelForTier(
  tier: 'main' | 'small' | 'medium' | 'large',
): ModelName {
  switch (tier) {
    case 'main':
      return getDefaultMainLoopModel()
    case 'small':
      // On Copilot provider, default to FREE model to save premium requests
      return getAPIProvider() === 'copilot' ? COPILOT_FREE_SMALL_MODEL : getSmallFastModel()
    case 'medium': return getDefaultSonnetModel()
    case 'large': return getDefaultOpusModel()
  }
}

export function getModelForTask(category: TaskCategory): ModelName {
  const config = getModelConfigFromSettings()
  const override = config[category]
  if (override) return override
  // Fork agents use the main model on non-Copilot (prompt cache benefit)
  // but FREE model on Copilot (no prompt caching → pure waste)
  if (category === 'forkAgent' && getAPIProvider() === 'copilot') {
    return COPILOT_FREE_SMALL_MODEL
  }
  // On Copilot, medium-tier tasks (permission, autoModeCritique) use
  // claude-haiku-4.5 (0.33x) instead of Sonnet (1x) for cost savings.
  // Haiku is a Claude model with good safety classification ability.
  if (getAPIProvider() === 'copilot' && TASK_CATEGORIES[category].defaultTier === 'medium') {
    return 'claude-haiku-4.5'
  }
  return getDefaultModelForTier(TASK_CATEGORIES[category].defaultTier)
}

export function getCurrentModelForCategory(category: TaskCategory): {
  model: ModelName
  isOverridden: boolean
  tier: string
} {
  const config = getModelConfigFromSettings()
  const override = config[category]
  const tier = TASK_CATEGORIES[category].defaultTier
  if (override) {
    return { model: override, isOverridden: true, tier }
  }
  return { model: getDefaultModelForTier(tier), isOverridden: false, tier }
}
