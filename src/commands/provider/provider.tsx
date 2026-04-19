import chalk from 'chalk'
import * as React from 'react'
import { useCallback } from 'react'
import type { CommandResultDisplay } from '../../commands.js'
import { Select, type OptionWithDescription } from '../../components/CustomSelect/index.js'
import { Pane } from '../../components/design-system/Pane.js'
import { Box, Text } from '../../ink.js'
import type { LocalJSXCommandCall, LocalJSXCommandContext, LocalJSXCommandOnDone } from '../../types/command.js'
import {
  activateProviderSelection,
  getCurrentSelectableProvider,
  INTERACTIVE_PROVIDER_OPTIONS,
  PROVIDER_ALIASES,
  PROVIDER_LABELS,
  type SelectableProvider,
} from '../../utils/model/providerSelection.js'

type Props = {
  current: SelectableProvider
  onDone: (
    result?: string,
    options?: { display?: CommandResultDisplay },
  ) => void
  context: LocalJSXCommandContext
  onProviderChanged?: (provider: SelectableProvider) => void
}

async function switchProvider(
  provider: SelectableProvider,
  current: SelectableProvider,
  context: LocalJSXCommandContext,
  onDone: LocalJSXCommandOnDone,
  onProviderChanged?: (provider: SelectableProvider) => void,
): Promise<void> {
  const previousLabel = PROVIDER_LABELS[current]
  const newLabel = PROVIDER_LABELS[provider]

  try {
    await activateProviderSelection(provider, {
      onProviderChanged: () => context.onChangeAPIKey(),
    })
  } catch (err) {
    onDone(
      `${chalk.red('✗')} ${provider === 'copilot' ? 'Copilot login failed' : 'Provider switch failed'}: ${err instanceof Error ? err.message : String(err)}`,
      { display: 'system' },
    )
    return
  }

  onDone(
    provider === current
      ? `Already using ${chalk.bold(newLabel)}`
      : `Provider switched: ${chalk.dim(previousLabel)} → ${chalk.bold.green(newLabel)}`,
    { display: 'system' },
  )

  if (provider !== current) {
    onProviderChanged?.(provider)
  }
}

function ProviderPicker({ current, onDone, context, onProviderChanged }: Props): React.ReactNode {
  const options: OptionWithDescription[] = INTERACTIVE_PROVIDER_OPTIONS.map(option => ({
    label: option.label,
    description:
      option.description +
      (option.value === current ? chalk.green(' ← active') : ''),
    value: option.value,
  }))

  const handleSelect = useCallback(async (value: string) => {
    await switchProvider(value as SelectableProvider, current, context, onDone, onProviderChanged)
  }, [context, current, onDone, onProviderChanged])

  const handleCancel = useCallback(() => {
    onDone('Provider selection dismissed', { display: 'system' })
  }, [onDone])

  return (
    <Pane color="permission">
      <Box flexDirection="column">
        <Text bold>Choose Provider</Text>
        <Text dimColor>
          Current: {PROVIDER_LABELS[current]}
        </Text>
        <Text dimColor>
          Use `/model-config` to route individual request types to different providers and models.
        </Text>
        <Box marginTop={1}>
          <Select
            options={options}
            onChange={handleSelect}
            onCancel={handleCancel}
            visibleOptionCount={options.length}
            hideIndexes={false}
          />
        </Box>
      </Box>
    </Pane>
  )
}

export { ProviderPicker }

export const call: LocalJSXCommandCall = async (onDone, context, args) => {
  const current = getCurrentSelectableProvider()

  if (!args || !args.trim()) {
    return <ProviderPicker current={current} onDone={onDone} context={context} />
  }

  const target = args.trim().toLowerCase()

  if (target === 'login') {
    try {
      await activateProviderSelection('copilot', {
        onProviderChanged: () => context.onChangeAPIKey(),
      })
      onDone(
        `${chalk.green('✓')} Copilot login successful! Provider switched to ${chalk.bold('GitHub Copilot')}`,
        { display: 'system' },
      )
    } catch (err) {
      onDone(
        `${chalk.red('✗')} Copilot login failed: ${err instanceof Error ? err.message : String(err)}`,
        { display: 'system' },
      )
    }
    return undefined
  }

  const provider = PROVIDER_ALIASES[target]
  if (!provider) {
    onDone(
      `Unknown provider "${target}". Run ${chalk.cyan('/provider')} to choose interactively.`,
      { display: 'system' },
    )
    return undefined
  }

  await switchProvider(provider, current, context, onDone)
  return undefined
}
