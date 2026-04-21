import chalk from 'chalk'
import * as React from 'react'
import { useState, useCallback, useEffect, useMemo } from 'react'
import type { CommandResultDisplay } from '../../commands.js'
import { Select, type OptionWithDescription } from '../../components/CustomSelect/index.js'
import { Box, Text } from '../../ink.js'
import { Pane } from '../../components/design-system/Pane.js'
import type { LocalJSXCommandCall } from '../../types/command.js'
import { updateSettingsForSource } from '../../utils/settings/settings.js'
import {
  getAvailableCopilotModels,
  getCachedAvailableCopilotModels,
} from '../../services/copilot/models.js'
import {
  getTaskCategoryAudience,
  getTaskCategoryGroup,
  getTaskCategoryGroupMeta,
  TASK_CATEGORIES,
  ORDERED_TASK_CATEGORY_KEYS,
  getCurrentModelForCategory,
  type TaskCategory,
  type SupportedTaskProvider,
} from '../../utils/model/taskModels.js'
import { getDefaultOpusModel, getDefaultSonnetModel, getSmallFastModel } from '../../utils/model/model.js'

type Props = {
  onDone: (
    result?: string,
    options?: { display?: CommandResultDisplay },
  ) => void
  onConfigChange?: () => void
}

type PersistedTaskConfig = {
  provider: SupportedTaskProvider
  model: string
}

const TOGGLE_ADVANCED_VALUE = '__toggle_advanced_routes__'

function normalizeCustomModelInput(value: string): string | null {
  const normalized = value.trim()
  return normalized ? normalized : null
}

const COPILOT_MODEL_CHOICES: Array<{ model: string; label: string; description: string }> = [
  { model: 'claude-sonnet-4.6', label: 'Claude Sonnet 4.6', description: 'Best for everyday tasks · 1x' },
  { model: 'claude-opus-4.6', label: 'Claude Opus 4.6', description: 'Most capable for complex work · 3x' },
  { model: 'claude-haiku-4.5', label: 'Claude Haiku 4.5', description: 'Fastest Claude · 0.33x' },
  { model: 'gpt-4.1', label: 'GPT 4.1', description: 'FREE · General purpose' },
  { model: 'gpt-4o', label: 'GPT 4o', description: 'FREE · Multimodal' },
  { model: 'gpt-5-mini', label: 'GPT 5 Mini', description: 'FREE · Small & fast' },
  { model: 'gpt-5.4', label: 'GPT 5.4', description: 'Most capable GPT · 1x' },
  { model: 'gpt-5.4-mini', label: 'GPT 5.4 Mini', description: '0.33x' },
  { model: 'gpt-5.3-codex', label: 'GPT 5.3 Codex', description: 'Code-optimized · 1x' },
  { model: 'gpt-5.2-codex', label: 'GPT 5.2 Codex', description: 'Code-optimized · 1x' },
  { model: 'gpt-5.2', label: 'GPT 5.2', description: '1x' },
  { model: 'gpt-5.1', label: 'GPT 5.1', description: '1x' },
  { model: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', description: '1x' },
  { model: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', description: 'Preview · 1x' },
  { model: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', description: 'Preview · 0.33x' },
  { model: 'claude-sonnet-4.5', label: 'Claude Sonnet 4.5', description: '1x' },
  { model: 'claude-sonnet-4', label: 'Claude Sonnet 4', description: '1x' },
  { model: 'claude-opus-4.6-fast', label: 'Claude Opus 4.6 Fast', description: 'Lower latency · 3x' },
  { model: 'claude-opus-4.5', label: 'Claude Opus 4.5', description: '3x' },
  { model: 'grok-code-fast-1', label: 'Grok Code Fast', description: '0.25x' },
]

const COPILOT_MODEL_METADATA = new Map(
  COPILOT_MODEL_CHOICES.map(choice => [choice.model, choice]),
)

function formatModelDisplay(provider: SupportedTaskProvider, model: string, isOverridden: boolean): string {
  const rendered = `${provider === 'copilot' ? 'copilot' : 'api'}:${model}`
  if (isOverridden) {
    return chalk.green(rendered)
  }
  return chalk.dim(rendered + ' (default)')
}

function getCategoryOptions(showAdvancedRoutes: boolean): OptionWithDescription[] {
  const categoryOptions = ORDERED_TASK_CATEGORY_KEYS.filter(key =>
    showAdvancedRoutes ? true : getTaskCategoryAudience(key) === 'common',
  ).map(key => {
    const cat = TASK_CATEGORIES[key]
    const { provider, model, isOverridden } = getCurrentModelForCategory(key)
    const group = getTaskCategoryGroupMeta(getTaskCategoryGroup(key))
    const audience = getTaskCategoryAudience(key)
    const audienceLabel = audience === 'advanced' ? 'Advanced' : 'Common'
    return {
      label: `[${audienceLabel} · ${group.label}] ${cat.label}`,
      description: `${formatModelDisplay(provider, model, isOverridden)} · ${cat.description}`,
      value: key,
    }
  })

  const advancedCount = ORDERED_TASK_CATEGORY_KEYS.filter(
    key => getTaskCategoryAudience(key) === 'advanced',
  ).length

  categoryOptions.push({
    label: showAdvancedRoutes ? 'Hide advanced routes' : 'Show advanced routes',
    description: showAdvancedRoutes
      ? 'Return to the common request routes only'
      : `Reveal ${advancedCount} lower-frequency internal/helper routes`,
    value: TOGGLE_ADVANCED_VALUE,
  })

  return categoryOptions
}

function getCategoryOptionsWithWarnings(
  showAdvancedRoutes: boolean,
  availableCopilotModels: string[] | null,
): OptionWithDescription[] {
  const availableSet =
    availableCopilotModels && availableCopilotModels.length > 0
      ? new Set(availableCopilotModels)
      : null

  return getCategoryOptions(showAdvancedRoutes).map(option => {
    if (
      option.value === TOGGLE_ADVANCED_VALUE ||
      !availableSet ||
      availableSet.size === 0
    ) {
      return option
    }

    const category = option.value as TaskCategory
    const { provider, model } = getCurrentModelForCategory(category)
    if (provider !== 'copilot' || availableSet.has(model)) {
      return option
    }

    return {
      ...option,
      label: <Text color="warning">! {option.label}</Text>,
      description: `${option.description} · Copilot model unavailable on this account`,
    }
  })
}

function buildCopilotModelChoices(availableCopilotModels: string[] | null): OptionWithDescription[] {
  const visibleModels =
    availableCopilotModels && availableCopilotModels.length > 0
      ? availableCopilotModels
      : COPILOT_MODEL_CHOICES.map(choice => choice.model)

  return visibleModels.map(model => {
    const known = COPILOT_MODEL_METADATA.get(model)
    return {
      label: `[copilot] ${known?.label ?? model}`,
      description:
        known?.description ??
        (availableCopilotModels && availableCopilotModels.length > 0
          ? 'Available on this Copilot account'
          : 'Copilot model'),
      value: `copilot::${model}`,
    }
  })
}

function getModelChoices(
  _category: TaskCategory,
  availableCopilotModels: string[] | null,
): OptionWithDescription[] {
  const choices: OptionWithDescription[] = [
    { label: 'Reset to default', description: 'Use the default provider/model route for this task', value: '__reset__' },
  ]

  choices.push(...buildCopilotModelChoices(availableCopilotModels))

  const apiModels = [
    getDefaultSonnetModel(),
    getDefaultOpusModel(),
    getSmallFastModel(),
    process.env.ANTHROPIC_MODEL,
    process.env.ANTHROPIC_DEFAULT_SONNET_MODEL,
    process.env.ANTHROPIC_DEFAULT_OPUS_MODEL,
    process.env.ANTHROPIC_DEFAULT_HAIKU_MODEL,
  ].filter((value, index, list): value is string => !!value && list.indexOf(value) === index)

  for (const model of apiModels) {
    choices.push({
      label: `[api] ${model}`,
      description: 'Manual API / compatible endpoint',
      value: `firstParty::${model}`,
    })
  }

  choices.push({
    type: 'input',
    label: '[copilot] Custom model ID',
    description: 'Enter any Copilot model ID for this task route',
    value: '__custom_copilot__',
    placeholder: 'e.g. gpt-5.4 or claude-sonnet-4.6',
    showLabelWithValue: true,
    labelValueSeparator: ': ',
    allowEmptySubmitToCancel: false,
    onChange: () => {},
  })

  choices.push({
    type: 'input',
    label: '[api] Custom model ID',
    description: 'Enter any API / compatible-endpoint model ID for this task route',
    value: '__custom_api__',
    placeholder: 'e.g. claude-sonnet-4-6 or openrouter/model-name',
    showLabelWithValue: true,
    labelValueSeparator: ': ',
    allowEmptySubmitToCancel: false,
    onChange: () => {},
  })

  return choices
}

function parseTaskChoice(value: string): PersistedTaskConfig | null {
  const separatorIndex = value.indexOf('::')
  if (separatorIndex === -1) {
    return null
  }
  const provider = value.slice(0, separatorIndex)
  const model = value.slice(separatorIndex + 2)
  if ((provider !== 'copilot' && provider !== 'firstParty') || !model) {
    return null
  }
  return {
    provider,
    model,
  }
}

function buildPersistedModelConfig(excluding?: TaskCategory): Record<string, PersistedTaskConfig> | undefined {
  const currentConfig: Record<string, PersistedTaskConfig> = {}
  for (const key of ORDERED_TASK_CATEGORY_KEYS) {
    if (key === excluding) {
      continue
    }
    const { provider, model, isOverridden } = getCurrentModelForCategory(key)
    if (isOverridden) {
      currentConfig[key] = { provider, model }
    }
  }
  return Object.keys(currentConfig).length > 0 ? currentConfig : undefined
}

function ModelConfigPicker({ onDone, onConfigChange }: Props): React.ReactNode {
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | null>(null)
  const [showAdvancedRoutes, setShowAdvancedRoutes] = useState(false)
  const [availableCopilotModels, setAvailableCopilotModels] = useState<string[] | null>(() => {
    const cached = getCachedAvailableCopilotModels().map(model => model.id)
    return cached.length > 0 ? cached : null
  })

  useEffect(() => {
    let cancelled = false
    void getAvailableCopilotModels()
      .then(models => {
        if (!cancelled && models.length > 0) {
          setAvailableCopilotModels(models.map(model => model.id))
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [])

  const persistCategoryRoute = useCallback(
    (category: TaskCategory, selectedRoute: PersistedTaskConfig | null) => {
      const catKey = category as string
      if (selectedRoute) {
        updateSettingsForSource('userSettings', {
          modelConfig: {
            ...(buildPersistedModelConfig(category) ?? {}),
            [catKey]: selectedRoute,
          },
        } as any)
      } else {
        updateSettingsForSource('userSettings', {
          modelConfig: buildPersistedModelConfig(category),
        } as any)
      }

      onConfigChange?.()
      setSelectedCategory(null)
    },
    [onConfigChange],
  )

  const handleCategorySelect = useCallback((value: string) => {
    if (value === TOGGLE_ADVANCED_VALUE) {
      setShowAdvancedRoutes(current => !current)
      return
    }
    setSelectedCategory(value as TaskCategory)
  }, [])

  const handleModelSelect = useCallback((value: string) => {
    const category = selectedCategory!
    const selectedRoute = value === '__reset__' ? null : parseTaskChoice(value)
    persistCategoryRoute(category, selectedRoute)
  }, [persistCategoryRoute, selectedCategory])

  const handleCustomModelSubmit = useCallback(
    (provider: SupportedTaskProvider, rawModel: string) => {
      const category = selectedCategory
      const model = normalizeCustomModelInput(rawModel)
      if (!category || !model) {
        return
      }

      persistCategoryRoute(category, { provider, model })
    },
    [persistCategoryRoute, selectedCategory],
  )

  const handleCancel = useCallback(() => {
    if (selectedCategory) {
      setSelectedCategory(null)
    } else {
      onDone('Model config dismissed', { display: 'system' })
    }
  }, [selectedCategory, onDone])

  const copilotAvailabilityHint = useMemo(() => {
    if (availableCopilotModels && availableCopilotModels.length > 0) {
      return `Copilot choices are filtered to ${availableCopilotModels.length} model(s) available on this account.`
    }
    return 'Copilot choices fall back to the built-in catalog until availability is detected.'
  }, [availableCopilotModels])

  if (selectedCategory) {
    const cat = TASK_CATEGORIES[selectedCategory]
    const group = getTaskCategoryGroupMeta(getTaskCategoryGroup(selectedCategory))
    const audience = getTaskCategoryAudience(selectedCategory)
    const { provider, model } = getCurrentModelForCategory(selectedCategory)
    const isCurrentCopilotModelUnavailable =
      provider === 'copilot' &&
      availableCopilotModels !== null &&
      availableCopilotModels.length > 0 &&
      !availableCopilotModels.includes(model)
    return (
      <Pane color="permission">
        <Box flexDirection="column">
          <Text bold>
            Select model for: {cat.label}
          </Text>
          <Text dimColor>
            Current: {provider === 'copilot' ? 'copilot' : 'api'}:{model} · {cat.description}
          </Text>
          <Text dimColor>
            Scope: {audience === 'advanced' ? 'Advanced internal route' : 'Common user-facing route'} · Group: {group.label} · Default tier: {cat.defaultTier}
          </Text>
          {isCurrentCopilotModelUnavailable && (
            <Text color="warning">
              Current Copilot model is not available on this account. Pick another route or reset to default.
            </Text>
          )}
          <Text dimColor>{copilotAvailabilityHint}</Text>
          <Box marginTop={1}>
            <Select
              options={getModelChoices(selectedCategory, availableCopilotModels).map(option => {
                if (option.type === 'input' && option.value === '__custom_copilot__') {
                  return {
                    ...option,
                    onChange: (value: string) => handleCustomModelSubmit('copilot', value),
                  }
                }

                if (option.type === 'input' && option.value === '__custom_api__') {
                  return {
                    ...option,
                    onChange: (value: string) => handleCustomModelSubmit('firstParty', value),
                  }
                }

                return option
              })}
              onChange={handleModelSelect}
              onCancel={handleCancel}
              visibleOptionCount={12}
              hideIndexes={false}
            />
          </Box>
        </Box>
      </Pane>
    )
  }

  return (
    <Pane color="permission">
      <Box flexDirection="column">
        <Text bold>
          Request Model Configuration
        </Text>
        <Text dimColor>
          Configure which provider and model each request path should use.
        </Text>
        <Text dimColor>
          Common routes are shown by default. Use the toggle below to reveal lower-frequency internal helper routes.
        </Text>
        <Text dimColor>{copilotAvailabilityHint}</Text>
        <Box marginTop={1}>
          <Select
            options={getCategoryOptionsWithWarnings(
              showAdvancedRoutes,
              availableCopilotModels,
            )}
            onChange={handleCategorySelect}
            onCancel={handleCancel}
            visibleOptionCount={10}
            hideIndexes={false}
          />
        </Box>
      </Box>
    </Pane>
  )
}

export { ModelConfigPicker }

export const call: LocalJSXCommandCall = async (onDone, _context) => {
  return <ModelConfigPicker onDone={onDone} />
}
