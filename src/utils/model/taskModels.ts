import { getSettings_DEPRECATED } from '../settings/settings.js'
import { getSmallFastModel, getDefaultSonnetModel, getDefaultOpusModel, type ModelName } from './model.js'

export const TASK_CATEGORIES = {
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
} as const

export type TaskCategory = keyof typeof TASK_CATEGORIES
export const TASK_CATEGORY_KEYS = Object.keys(TASK_CATEGORIES) as TaskCategory[]

type ModelConfigSettings = Partial<Record<TaskCategory, string>>

function getModelConfigFromSettings(): ModelConfigSettings {
  const settings = getSettings_DEPRECATED()
  return (settings as Record<string, unknown>)?.modelConfig as ModelConfigSettings ?? {}
}

function getDefaultModelForTier(tier: 'small' | 'medium' | 'large'): ModelName {
  switch (tier) {
    case 'small': return getSmallFastModel()
    case 'medium': return getDefaultSonnetModel()
    case 'large': return getDefaultOpusModel()
  }
}

export function getModelForTask(category: TaskCategory): ModelName {
  const config = getModelConfigFromSettings()
  const override = config[category]
  if (override) return override
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
