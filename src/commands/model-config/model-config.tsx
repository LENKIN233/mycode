import chalk from 'chalk'
import * as React from 'react'
import { useState, useCallback } from 'react'
import type { CommandResultDisplay } from '../../commands.js'
import { Select, type OptionWithDescription } from '../../components/CustomSelect/index.js'
import { Box, Text } from '../../ink.js'
import { Pane } from '../../components/design-system/Pane.js'
import type { LocalJSXCommandCall } from '../../types/command.js'
import { updateSettingsForSource } from '../../utils/settings/settings.js'
import {
  TASK_CATEGORIES,
  TASK_CATEGORY_KEYS,
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

function formatModelDisplay(provider: SupportedTaskProvider, model: string, isOverridden: boolean): string {
  const rendered = `${provider === 'copilot' ? 'copilot' : 'api'}:${model}`
  if (isOverridden) {
    return chalk.green(rendered)
  }
  return chalk.dim(rendered + ' (default)')
}

function getCategoryOptions(): OptionWithDescription[] {
  return TASK_CATEGORY_KEYS.map(key => {
    const cat = TASK_CATEGORIES[key]
    const { provider, model, isOverridden } = getCurrentModelForCategory(key)
    return {
      label: cat.label,
      description: `${formatModelDisplay(provider, model, isOverridden)} · ${cat.description}`,
      value: key,
    }
  })
}

function getModelChoices(_category: TaskCategory): OptionWithDescription[] {
  const choices: OptionWithDescription[] = [
    { label: 'Reset to default', description: 'Use the default provider/model route for this task', value: '__reset__' },
  ]

  for (const opt of COPILOT_MODEL_CHOICES) {
    choices.push({
      label: `[copilot] ${opt.label}`,
      description: opt.description,
      value: `copilot::${opt.model}`,
    })
  }

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
  for (const key of TASK_CATEGORY_KEYS) {
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

  const handleCategorySelect = useCallback((value: string) => {
    setSelectedCategory(value as TaskCategory)
  }, [])

  const handleModelSelect = useCallback((value: string) => {
    const category = selectedCategory!
    const selectedRoute = value === '__reset__' ? null : parseTaskChoice(value)

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
  }, [onConfigChange, selectedCategory])

  const handleCancel = useCallback(() => {
    if (selectedCategory) {
      setSelectedCategory(null)
    } else {
      onDone('Model config dismissed', { display: 'system' })
    }
  }, [selectedCategory, onDone])

  if (selectedCategory) {
    const cat = TASK_CATEGORIES[selectedCategory]
    const { provider, model } = getCurrentModelForCategory(selectedCategory)
    return (
      <Pane color="permission">
        <Box flexDirection="column">
          <Text bold>
            Select model for: {cat.label}
          </Text>
          <Text dimColor>
            Current: {provider === 'copilot' ? 'copilot' : 'api'}:{model} · {cat.description}
          </Text>
          <Box marginTop={1}>
            <Select
              options={getModelChoices(selectedCategory)}
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
        <Box marginTop={1}>
          <Select
            options={getCategoryOptions()}
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
