import type { Dispatch, SetStateAction } from 'react'
import type { AppState } from '../../state/AppState.js'
import { getGlobalConfig, saveGlobalConfig, type GlobalConfig } from '../../utils/config.js'
import {
  EXTERNAL_PERMISSION_MODES,
  PERMISSION_MODES,
  isExternalPermissionMode,
  permissionModeFromString,
  toExternalPermissionMode,
  type ExternalPermissionMode,
  type PermissionMode,
} from '../../utils/permissions/PermissionMode.js'
import { transitionPlanAutoMode } from '../../utils/permissions/permissionSetup.js'
import { logError } from '../../utils/log.js'
import {
  clearFastModeCooldown,
  FAST_MODE_MODEL_DISPLAY,
  getFastModeModel,
  isFastModeAvailable,
  isFastModeEnabled,
} from '../../utils/fastMode.js'
import { updateSettingsForSource } from '../../utils/settings/settings.js'
import type { SettingsJson } from '../../utils/settings/types.js'
import {
  logEvent,
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from 'src/services/analytics/index.js'
import type { Setting } from './types.js'

type Args = {
  autoUpdaterDisabledReason: unknown
  globalConfig: GlobalConfig
  isFastMode: boolean
  isFileCheckpointingAvailable: boolean
  promptSuggestionEnabled: boolean
  setAppState: Dispatch<SetStateAction<AppState>>
  setChanges: Dispatch<SetStateAction<Record<string, unknown>>>
  setGlobalConfig: Dispatch<SetStateAction<GlobalConfig>>
  setSettingsData: Dispatch<SetStateAction<SettingsJson | undefined>>
  settingsData: SettingsJson | undefined
  showAutoInDefaultModePicker: boolean
  showPromptSuggestionSetting: boolean
  thinkingEnabled: boolean | undefined
}

export function getConfigCoreSettings({
  autoUpdaterDisabledReason,
  globalConfig,
  isFastMode,
  isFileCheckpointingAvailable,
  promptSuggestionEnabled,
  setAppState,
  setChanges,
  setGlobalConfig,
  setSettingsData,
  settingsData,
  showAutoInDefaultModePicker,
  showPromptSuggestionSetting,
  thinkingEnabled,
}: Args): Setting[] {
  return [
    {
      id: 'autoCompactEnabled',
      label: 'Auto-compact',
      value: globalConfig.autoCompactEnabled,
      type: 'boolean' as const,
      onChange(autoCompactEnabled: boolean) {
        saveGlobalConfig(current => ({
          ...current,
          autoCompactEnabled,
        }))
        setGlobalConfig({
          ...getGlobalConfig(),
          autoCompactEnabled,
        })
        logEvent('tengu_auto_compact_setting_changed', {
          enabled: autoCompactEnabled,
        })
      },
    },
    {
      id: 'thinkingEnabled',
      label: 'Thinking mode',
      value: thinkingEnabled ?? true,
      type: 'boolean' as const,
      onChange(enabled: boolean) {
        setAppState(prev => ({
          ...prev,
          thinkingEnabled: enabled,
        }))
        updateSettingsForSource('userSettings', {
          alwaysThinkingEnabled: enabled ? undefined : false,
        })
        logEvent('tengu_thinking_toggled', {
          enabled,
        })
      },
    },
    ...(isFastModeEnabled() && isFastModeAvailable()
      ? [
          {
            id: 'fastMode',
            label: `Fast mode (${FAST_MODE_MODEL_DISPLAY} only)`,
            value: !!isFastMode,
            type: 'boolean' as const,
            onChange(enabled: boolean) {
              clearFastModeCooldown()
              updateSettingsForSource('userSettings', {
                fastMode: enabled ? true : undefined,
              })
              if (enabled) {
                setAppState(prev => ({
                  ...prev,
                  mainLoopModel: getFastModeModel(),
                  mainLoopModelForSession: null,
                  fastMode: true,
                }))
                setChanges(prev => ({
                  ...prev,
                  model: getFastModeModel(),
                  'Fast mode': 'ON',
                }))
                return
              }
              setAppState(prev => ({
                ...prev,
                fastMode: false,
              }))
              setChanges(prev => ({
                ...prev,
                'Fast mode': 'OFF',
              }))
            },
          },
        ]
      : []),
    ...(showPromptSuggestionSetting
      ? [
          {
            id: 'promptSuggestionEnabled',
            label: 'Prompt suggestions',
            value: promptSuggestionEnabled,
            type: 'boolean' as const,
            onChange(enabled: boolean) {
              setAppState(prev => ({
                ...prev,
                promptSuggestionEnabled: enabled,
              }))
              updateSettingsForSource('userSettings', {
                promptSuggestionEnabled: enabled ? undefined : false,
              })
            },
          },
        ]
      : []),
    ...(isFileCheckpointingAvailable
      ? [
          {
            id: 'fileCheckpointingEnabled',
            label: 'Rewind code (checkpoints)',
            value: globalConfig.fileCheckpointingEnabled,
            type: 'boolean' as const,
            onChange(enabled: boolean) {
              saveGlobalConfig(current => ({
                ...current,
                fileCheckpointingEnabled: enabled,
              }))
              setGlobalConfig({
                ...getGlobalConfig(),
                fileCheckpointingEnabled: enabled,
              })
              logEvent('tengu_file_history_snapshots_setting_changed', {
                enabled,
              })
            },
          },
        ]
      : []),
    {
      id: 'defaultPermissionMode',
      label: 'Default permission mode',
      value: settingsData?.permissions?.defaultMode || 'default',
      options: (() => {
        const priorityOrder: PermissionMode[] = ['default', 'plan']
        const excluded: PermissionMode[] = ['bypassPermissions']
        if (!showAutoInDefaultModePicker) {
          excluded.push('auto')
        }
        return [
          ...priorityOrder,
          ...EXTERNAL_PERMISSION_MODES.filter(
            mode => !priorityOrder.includes(mode) && !excluded.includes(mode),
          ),
        ]
      })(),
      type: 'enum' as const,
      onChange(mode: string) {
        const parsedMode = permissionModeFromString(mode)
        const validatedMode = isExternalPermissionMode(parsedMode)
          ? toExternalPermissionMode(parsedMode)
          : parsedMode
        const result = updateSettingsForSource('userSettings', {
          permissions: {
            ...settingsData?.permissions,
            defaultMode: validatedMode as ExternalPermissionMode,
          },
        })
        if (result.error) {
          logError(result.error)
          return
        }
        setSettingsData(prev => ({
          ...prev,
          permissions: {
            ...prev?.permissions,
            defaultMode: validatedMode as (typeof PERMISSION_MODES)[number],
          },
        }))
        setChanges(prev => ({
          ...prev,
          defaultPermissionMode: mode,
        }))
        logEvent('tengu_config_changed', {
          setting:
            'defaultPermissionMode' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
          value: mode as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        })
      },
    },
    ...(showAutoInDefaultModePicker
      ? [
          {
            id: 'useAutoModeDuringPlan',
            label: 'Use auto mode during plan',
            value: (settingsData as { useAutoModeDuringPlan?: boolean } | undefined)
              ?.useAutoModeDuringPlan ?? true,
            type: 'boolean' as const,
            onChange(useAutoModeDuringPlan: boolean) {
              updateSettingsForSource('userSettings', {
                useAutoModeDuringPlan,
              })
              setSettingsData(prev => ({
                ...prev,
                useAutoModeDuringPlan,
              }))
              setAppState(prev => {
                const next = transitionPlanAutoMode(prev.toolPermissionContext)
                if (next === prev.toolPermissionContext) return prev
                return {
                  ...prev,
                  toolPermissionContext: next,
                }
              })
              setChanges(prev => ({
                ...prev,
                'Use auto mode during plan': useAutoModeDuringPlan,
              }))
            },
          },
        ]
      : []),
    {
      id: 'respectGitignore',
      label: 'Respect .gitignore in file picker',
      value: globalConfig.respectGitignore,
      type: 'boolean' as const,
      onChange(respectGitignore: boolean) {
        saveGlobalConfig(current => ({
          ...current,
          respectGitignore,
        }))
        setGlobalConfig({
          ...getGlobalConfig(),
          respectGitignore,
        })
        logEvent('tengu_respect_gitignore_setting_changed', {
          enabled: respectGitignore,
        })
      },
    },
    autoUpdaterDisabledReason
      ? {
          id: 'autoUpdatesChannel',
          label: 'Auto-update channel',
          value: 'disabled',
          type: 'managedEnum' as const,
          onChange() {},
        }
      : {
          id: 'autoUpdatesChannel',
          label: 'Auto-update channel',
          value: settingsData?.autoUpdatesChannel ?? 'latest',
          type: 'managedEnum' as const,
          onChange() {},
        },
  ]
}
