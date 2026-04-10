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
} from '../../utils/model/taskModels.js'
import { getAPIProvider } from '../../utils/model/providers.js'
import { getModelOptions } from '../../utils/model/modelOptions.js'

type Props = {
  onDone: (
    result?: string,
    options?: { display?: CommandResultDisplay },
  ) => void
}

function formatModelDisplay(model: string, isOverridden: boolean): string {
  if (isOverridden) {
    return chalk.green(model)
  }
  return chalk.dim(model + ' (default)')
}

function getCategoryOptions(): OptionWithDescription[] {
  return TASK_CATEGORY_KEYS.map(key => {
    const cat = TASK_CATEGORIES[key]
    const { model, isOverridden } = getCurrentModelForCategory(key)
    return {
      label: cat.label,
      description: `${formatModelDisplay(model, isOverridden)} · ${cat.description}`,
      value: key,
    }
  })
}

function getModelChoices(category: TaskCategory): OptionWithDescription[] {
  const provider = getAPIProvider()
  const choices: OptionWithDescription[] = [
    { label: 'Reset to default', description: 'Use the tier default for this task', value: '__reset__' },
  ]

  if (provider === 'copilot') {
    // Show copilot model options
    const modelOpts = getModelOptions()
    for (const opt of modelOpts) {
      if (opt.value) {
        choices.push({
          label: opt.label,
          description: opt.description ?? '',
          value: opt.value,
        })
      }
    }
  } else {
    // Non-copilot: show common model aliases
    choices.push(
      { label: 'Haiku 4.5', description: 'Small & fast', value: 'claude-haiku-4-5-20251001' },
      { label: 'Sonnet 4.6', description: 'Balanced', value: 'claude-sonnet-4-6-20250514' },
      { label: 'Opus 4.6', description: 'Most capable', value: 'claude-opus-4-6-20250522' },
    )
  }

  return choices
}

function ModelConfigPicker({ onDone }: Props): React.ReactNode {
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | null>(null)

  const handleCategorySelect = useCallback((value: string) => {
    setSelectedCategory(value as TaskCategory)
  }, [])

  const handleModelSelect = useCallback((value: string) => {
    const category = selectedCategory!
    const modelValue = value === '__reset__' ? undefined : value

    // Save to user settings
    const catKey = category as string
    if (modelValue) {
      updateSettingsForSource('userSettings', { modelConfig: { [catKey]: modelValue } } as any)
    } else {
      // Reset: rebuild modelConfig without this category
      const currentConfig: Record<string, string> = {}
      for (const key of TASK_CATEGORY_KEYS) {
        const { model, isOverridden } = getCurrentModelForCategory(key)
        if (isOverridden && key !== category) {
          currentConfig[key] = model
        }
      }
      updateSettingsForSource('userSettings', { modelConfig: Object.keys(currentConfig).length > 0 ? currentConfig : undefined } as any)
    }

    const label = TASK_CATEGORIES[category].label
    const displayModel = modelValue ?? 'default'
    setSelectedCategory(null) // return to category list
  }, [selectedCategory])

  const handleCancel = useCallback(() => {
    if (selectedCategory) {
      setSelectedCategory(null)
    } else {
      onDone('Model config dismissed', { display: 'system' })
    }
  }, [selectedCategory, onDone])

  if (selectedCategory) {
    const cat = TASK_CATEGORIES[selectedCategory]
    const { model } = getCurrentModelForCategory(selectedCategory)
    return (
      <Pane color="permission">
        <Box flexDirection="column">
          <Text bold>
            Select model for: {cat.label}
          </Text>
          <Text dimColor>
            Current: {model} · {cat.description}
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
          Configure which model is used for each type of request path.
          {getAPIProvider() === 'copilot' ? ' Tip: use FREE models (gpt-4.1, gpt-4o, gpt-5-mini) to save premium requests.' : ''}
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

export const call: LocalJSXCommandCall = async (onDone, _context) => {
  return <ModelConfigPicker onDone={onDone} />
}
