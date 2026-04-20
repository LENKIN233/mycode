import { Box, Text } from '../../ink.js'
import { ModelPicker } from '../ModelPicker.js'
import { MyCodeMdExternalIncludesDialog } from '../MyCodeMdExternalIncludesDialog.js'
import { ChannelDowngradeDialog, type ChannelDowngradeChoice } from '../ChannelDowngradeDialog.js'
import { Dialog } from '../design-system/Dialog.js'
import { Select } from '../CustomSelect/index.js'
import { KeyboardShortcutHint } from '../design-system/KeyboardShortcutHint.js'
import { ConfigurableShortcutHint } from '../ConfigurableShortcutHint.js'
import { Byline } from '../design-system/Byline.js'
import type { AutoUpdateChannel, ConfigSpecialSubMenu } from './types.js'

type Props = {
  autoUpdaterDisabledReason: {
    type?: 'env' | 'config' | string
    envVar?: string
  } | null | undefined
  closeSubmenu: () => void
  currentVersion: string
  externalIncludes: string[]
  onChannelDowngradeChoice: (choice: ChannelDowngradeChoice) => void
  onEnableAutoUpdates: (channel: AutoUpdateChannel) => void
  onTeammateModelSelected: (model: string | null) => void
  submenu: ConfigSpecialSubMenu | null
  teammateDefaultModel: string | null | undefined
}

export function renderConfigSpecialSubMenu({
  autoUpdaterDisabledReason,
  closeSubmenu,
  currentVersion,
  externalIncludes,
  onChannelDowngradeChoice,
  onEnableAutoUpdates,
  onTeammateModelSelected,
  submenu,
  teammateDefaultModel,
}: Props): React.ReactNode | null {
  if (submenu === 'TeammateModel') {
    return (
      <>
        <ModelPicker
          initial={teammateDefaultModel ?? null}
          skipSettingsWrite
          headerText="Default model for newly spawned teammates. The leader can override via the tool call's model parameter."
          onSelect={(model, _effort) => {
            onTeammateModelSelected(model)
          }}
          onCancel={closeSubmenu}
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

  if (submenu === 'ExternalIncludes') {
    return (
      <>
        <MyCodeMdExternalIncludesDialog
          onDone={closeSubmenu}
          externalIncludes={externalIncludes}
        />
        <Text dimColor>
          <Byline>
            <KeyboardShortcutHint shortcut="Enter" action="confirm" />
            <ConfigurableShortcutHint
              action="confirm:no"
              context="Confirmation"
              fallback="Esc"
              description="disable external includes"
            />
          </Byline>
        </Text>
      </>
    )
  }

  if (submenu === 'EnableAutoUpdates') {
    return (
      <Dialog
        title="Enable Auto-Updates"
        onCancel={closeSubmenu}
        hideBorder
        hideInputGuide
      >
        {autoUpdaterDisabledReason?.type !== 'config' ? (
          <>
            <Text>
              {autoUpdaterDisabledReason?.type === 'env'
                ? 'Auto-updates are controlled by an environment variable and cannot be changed here.'
                : 'Auto-updates are disabled in development builds.'}
            </Text>
            {autoUpdaterDisabledReason?.type === 'env' && (
              <Text dimColor>
                Unset {autoUpdaterDisabledReason.envVar} to re-enable auto-updates.
              </Text>
            )}
          </>
        ) : (
          <Select
            options={[
              { label: 'Enable with latest channel', value: 'latest' },
              { label: 'Enable with stable channel', value: 'stable' },
            ]}
            onChange={(channel: string) => {
              onEnableAutoUpdates(channel as AutoUpdateChannel)
            }}
          />
        )}
      </Dialog>
    )
  }

  if (submenu === 'ChannelDowngrade') {
    return (
      <ChannelDowngradeDialog
        currentVersion={currentVersion}
        onChoice={onChannelDowngradeChoice}
      />
    )
  }

  return null
}
