import React from 'react'
import type { LocalJSXCommandContext } from '../../commands.js'
import { ModelConfigPicker } from '../../commands/model-config/model-config.js'
import { ProviderPicker } from '../../commands/provider/provider.js'
import { Text } from '../../ink.js'
import { KeyboardShortcutHint } from '../design-system/KeyboardShortcutHint.js'
import { Byline } from '../design-system/Byline.js'
import { ConfigurableShortcutHint } from '../ConfigurableShortcutHint.js'
import {
  getCurrentSelectableProvider,
  PROVIDER_LABELS,
} from '../../utils/model/providerSelection.js'

export type ProviderRoutingSubMenu = 'Provider' | 'TaskRouting'

export function isProviderRoutingSubMenu(value: string | null): value is ProviderRoutingSubMenu {
  return value === 'Provider' || value === 'TaskRouting'
}

export function getProviderRoutingSettingsItems() {
  const currentProvider = getCurrentSelectableProvider()

  return [
    {
      id: 'provider',
      label: 'Default provider',
      value: PROVIDER_LABELS[currentProvider],
      type: 'managedEnum' as const,
      onChange() {},
    },
    {
      id: 'taskRouting',
      label: 'Request routing',
      value: 'Provider + model per task',
      type: 'managedEnum' as const,
      onChange() {},
    },
  ]
}

type RenderProviderRoutingSubMenuProps = {
  submenu: ProviderRoutingSubMenu
  context: LocalJSXCommandContext
  onClose: () => void
  onDirty: () => void
}

export function renderProviderRoutingSubMenu({
  submenu,
  context,
  onClose,
  onDirty,
}: RenderProviderRoutingSubMenuProps): React.ReactNode {
  const currentProvider = getCurrentSelectableProvider()

  if (submenu === 'Provider') {
    return (
      <>
        <ProviderPicker
          current={currentProvider}
          context={context}
          onProviderChanged={onDirty}
          onDone={() => {
            onClose()
          }}
        />
        <Text dimColor>
          <Byline>
            <KeyboardShortcutHint shortcut="Enter" action="confirm" />
            <ConfigurableShortcutHint
              action="confirm:no"
              context="Confirmation"
              fallback="Esc"
              description="cancel"
            />
          </Byline>
        </Text>
      </>
    )
  }

  return (
    <>
      <ModelConfigPicker
        onDone={() => {
          onClose()
        }}
        onConfigChange={onDirty}
      />
      <Text dimColor>
        <Byline>
          <KeyboardShortcutHint shortcut="Enter" action="select" />
          <ConfigurableShortcutHint
            action="confirm:no"
            context="Confirmation"
            fallback="Esc"
            description="close"
          />
        </Byline>
      </Text>
    </>
  )
}
