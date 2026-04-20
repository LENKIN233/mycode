import type { Dispatch, SetStateAction } from 'react'
import { getCurrentProjectConfig, getGlobalConfig, saveGlobalConfig, type GlobalConfig } from '../../utils/config.js'
import { isAgentSwarmsEnabled } from '../../utils/agentSwarmsEnabled.js'
import {
  clearCliTeammateModeOverride,
  getCliTeammateModeOverride,
} from '../../utils/swarm/backends/teammateModeSnapshot.js'
import {
  logEvent,
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from 'src/services/analytics/index.js'
import type { Setting } from './types.js'

type Args = {
  globalConfig: GlobalConfig
  isConnectedToIde: boolean
  isSupportedTerminal: boolean
  mainLoopModel: string | null
  onChangeMainModelConfig: (value: string | null) => void
  setGlobalConfig: Dispatch<SetStateAction<GlobalConfig>>
  shouldShowExternalIncludesToggle: boolean
  teammateModelDisplayString: (value: string | null | undefined) => string
}

export function getConfigIntegrationSettings({
  globalConfig,
  isConnectedToIde,
  isSupportedTerminal,
  mainLoopModel,
  onChangeMainModelConfig,
  setGlobalConfig,
  shouldShowExternalIncludesToggle,
  teammateModelDisplayString,
}: Args): Setting[] {
  return [
    {
      id: 'prStatusFooterEnabled',
      label: 'Show PR status footer',
      value: globalConfig.prStatusFooterEnabled ?? true,
      type: 'boolean' as const,
      onChange(enabled: boolean) {
        saveGlobalConfig(current => {
          if (current.prStatusFooterEnabled === enabled) return current
          return {
            ...current,
            prStatusFooterEnabled: enabled,
          }
        })
        setGlobalConfig({
          ...getGlobalConfig(),
          prStatusFooterEnabled: enabled,
        })
        logEvent('tengu_pr_status_footer_setting_changed', {
          enabled,
        })
      },
    },
    {
      id: 'model',
      label: 'Model',
      value: mainLoopModel === null ? 'Default (recommended)' : mainLoopModel,
      type: 'managedEnum' as const,
      onChange: onChangeMainModelConfig,
    },
    ...(isConnectedToIde
      ? [
          {
            id: 'diffTool',
            label: 'Diff tool',
            value: globalConfig.diffTool ?? 'auto',
            options: ['terminal', 'auto'],
            type: 'enum' as const,
            onChange(diffTool: string) {
              saveGlobalConfig(current => ({
                ...current,
                diffTool: diffTool as GlobalConfig['diffTool'],
              }))
              setGlobalConfig({
                ...getGlobalConfig(),
                diffTool: diffTool as GlobalConfig['diffTool'],
              })
              logEvent('tengu_diff_tool_changed', {
                tool: diffTool as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
                source:
                  'config_panel' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
              })
            },
          },
        ]
      : []),
    ...(!isSupportedTerminal
      ? [
          {
            id: 'autoConnectIde',
            label: 'Auto-connect to IDE (external terminal)',
            value: globalConfig.autoConnectIde ?? false,
            type: 'boolean' as const,
            onChange(autoConnectIde: boolean) {
              saveGlobalConfig(current => ({
                ...current,
                autoConnectIde,
              }))
              setGlobalConfig({
                ...getGlobalConfig(),
                autoConnectIde,
              })
              logEvent('tengu_auto_connect_ide_changed', {
                enabled: autoConnectIde,
                source:
                  'config_panel' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
              })
            },
          },
        ]
      : []),
    ...(isSupportedTerminal
      ? [
          {
            id: 'autoInstallIdeExtension',
            label: 'Auto-install IDE extension',
            value: globalConfig.autoInstallIdeExtension ?? true,
            type: 'boolean' as const,
            onChange(autoInstallIdeExtension: boolean) {
              saveGlobalConfig(current => ({
                ...current,
                autoInstallIdeExtension,
              }))
              setGlobalConfig({
                ...getGlobalConfig(),
                autoInstallIdeExtension,
              })
              logEvent('tengu_auto_install_ide_extension_changed', {
                enabled: autoInstallIdeExtension,
                source:
                  'config_panel' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
              })
            },
          },
        ]
      : []),
    {
      id: 'myCodeInChromeDefaultEnabled',
      label: 'Browser Extension enabled by default',
      value: globalConfig.myCodeInChromeDefaultEnabled ?? true,
      type: 'boolean' as const,
      onChange(enabled: boolean) {
        saveGlobalConfig(current => ({
          ...current,
          myCodeInChromeDefaultEnabled: enabled,
        }))
        setGlobalConfig({
          ...getGlobalConfig(),
          myCodeInChromeDefaultEnabled: enabled,
        })
        logEvent('tengu_mycode_in_chrome_setting_changed', {
          enabled,
        })
      },
    },
    ...(isAgentSwarmsEnabled()
      ? (() => {
          const cliOverride = getCliTeammateModeOverride()
          const label = cliOverride
            ? `Teammate mode [overridden: ${cliOverride}]`
            : 'Teammate mode'
          return [
            {
              id: 'teammateMode',
              label,
              value: globalConfig.teammateMode ?? 'auto',
              options: ['auto', 'tmux', 'in-process'],
              type: 'enum' as const,
              onChange(mode: string) {
                if (mode !== 'auto' && mode !== 'tmux' && mode !== 'in-process') {
                  return
                }
                clearCliTeammateModeOverride(mode)
                saveGlobalConfig(current => ({
                  ...current,
                  teammateMode: mode,
                }))
                setGlobalConfig({
                  ...getGlobalConfig(),
                  teammateMode: mode,
                })
                logEvent('tengu_teammate_mode_changed', {
                  mode: mode as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
                })
              },
            },
            {
              id: 'teammateDefaultModel',
              label: 'Default teammate model',
              value: teammateModelDisplayString(globalConfig.teammateDefaultModel),
              type: 'managedEnum' as const,
              onChange() {},
            },
          ]
        })()
      : []),
    ...(shouldShowExternalIncludesToggle
      ? [
          {
            id: 'showExternalIncludesDialog',
            label: 'External MYCODE.md includes',
            value: getCurrentProjectConfig().hasMyCodeMdExternalIncludesApproved
              ? 'true'
              : 'false',
            type: 'managedEnum' as const,
            onChange() {},
          },
        ]
      : []),
  ]
}
