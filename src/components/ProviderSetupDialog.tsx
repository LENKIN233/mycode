import React, { useCallback, useMemo, useState } from 'react'
import { Select, type OptionWithDescription } from './CustomSelect/index.js'
import { Dialog } from './design-system/Dialog.js'
import { Box, Text } from '../ink.js'
import {
  activateProviderSelection,
  getCurrentSelectableProvider,
  INTERACTIVE_PROVIDER_OPTIONS,
  PROVIDER_LABELS,
  type SelectableProvider,
} from '../utils/model/providerSelection.js'

type Props = {
  onDone(): void
}

type SetupChoice = SelectableProvider | 'later'

export function ProviderSetupDialog({ onDone }: Props): React.ReactNode {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const current = getCurrentSelectableProvider()

  const options = useMemo<OptionWithDescription[]>(() => [
    ...INTERACTIVE_PROVIDER_OPTIONS.map(option => ({
      label: option.label,
      description:
        option.description +
        (option.value === current ? ' (current fallback)' : ''),
      value: option.value,
    })),
    {
      label: 'Decide later',
      description:
        'Skip this for now. You can set the default later with /provider and still mix providers per task with /model-config.',
      value: 'later',
    },
  ], [current])

  const handleSelect = useCallback((value: string) => {
    void (async () => {
      if (value === 'later') {
        onDone()
        return
      }

      setIsSubmitting(true)
      setError(null)

      try {
        await activateProviderSelection(value as SelectableProvider)
        onDone()
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
        setIsSubmitting(false)
      }
    })()
  }, [onDone])

  return (
    <Dialog
      title="Choose a default provider"
      color="background"
      onCancel={onDone}
    >
      <Box flexDirection="column" gap={1}>
        <Text>
          Pick how this fork should connect by default. You can switch later with `/provider`,
          and route individual request types with `/model-config`.
        </Text>
        <Text dimColor>
          Current fallback: {PROVIDER_LABELS[current]}
        </Text>
        {error && (
          <Text color="error">
            {error}
          </Text>
        )}
        {isSubmitting ? (
          <Text dimColor>
            Starting GitHub Copilot login...
          </Text>
        ) : (
          <Select
            options={options}
            onChange={handleSelect}
            onCancel={onDone}
            visibleOptionCount={options.length}
          />
        )}
      </Box>
    </Dialog>
  )
}
