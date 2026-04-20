import type { Dispatch, SetStateAction } from 'react'
import type { AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from 'src/services/analytics/index.js'
import { logEvent } from 'src/services/analytics/index.js'
import type { AppState } from '../../state/AppState.js'
import type { OutputStyle, GlobalConfig } from '../../utils/config.js'
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'
import type { SettingsJson } from '../../utils/settings/types.js'
import { updateSettingsForSource } from '../../utils/settings/settings.js'
import type { Setting } from './types.js'

type DisplaySettingsArgs = {
  globalConfig: GlobalConfig
  setGlobalConfig: Dispatch<SetStateAction<GlobalConfig>>
  settingsData: SettingsJson | undefined
  setSettingsData: Dispatch<SetStateAction<SettingsJson | undefined>>
  setAppState: Dispatch<SetStateAction<AppState>>
  themeSetting: string
  currentOutputStyle: OutputStyle
  currentLanguage: string | undefined
  verbose: boolean
  onChangeVerbose: (value: boolean) => void
  showTerminalSidebarSetting: boolean
  fullscreenCopyOnSelectAvailable: boolean
}

export function getDisplaySettingsItems({
  globalConfig,
  setGlobalConfig,
  settingsData,
  setSettingsData,
  setAppState,
  themeSetting,
  currentOutputStyle,
  currentLanguage,
  verbose,
  onChangeVerbose,
  showTerminalSidebarSetting,
  fullscreenCopyOnSelectAvailable,
}: DisplaySettingsArgs): Setting[] {
  return [
    {
      id: 'spinnerTipsEnabled',
      label: 'Show tips',
      value: settingsData?.spinnerTipsEnabled ?? true,
      type: 'boolean',
      onChange(spinnerTipsEnabled: boolean) {
        updateSettingsForSource('localSettings', {
          spinnerTipsEnabled,
        })
        setSettingsData(prev => ({
          ...prev,
          spinnerTipsEnabled,
        }))
        logEvent('tengu_tips_setting_changed', {
          enabled: spinnerTipsEnabled,
        })
      },
    },
    {
      id: 'prefersReducedMotion',
      label: 'Reduce motion',
      value: settingsData?.prefersReducedMotion ?? false,
      type: 'boolean',
      onChange(prefersReducedMotion: boolean) {
        updateSettingsForSource('localSettings', {
          prefersReducedMotion,
        })
        setSettingsData(prev => ({
          ...prev,
          prefersReducedMotion,
        }))
        setAppState(prev => ({
          ...prev,
          settings: {
            ...prev.settings,
            prefersReducedMotion,
          },
        }))
        logEvent('tengu_reduce_motion_setting_changed', {
          enabled: prefersReducedMotion,
        })
      },
    },
    {
      id: 'verbose',
      label: 'Verbose output',
      value: verbose,
      type: 'boolean',
      onChange: onChangeVerbose,
    },
    {
      id: 'terminalProgressBarEnabled',
      label: 'Terminal progress bar',
      value: globalConfig.terminalProgressBarEnabled,
      type: 'boolean',
      onChange(terminalProgressBarEnabled: boolean) {
        saveGlobalConfig(current => ({
          ...current,
          terminalProgressBarEnabled,
        }))
        setGlobalConfig({
          ...getGlobalConfig(),
          terminalProgressBarEnabled,
        })
        logEvent('tengu_terminal_progress_bar_setting_changed', {
          enabled: terminalProgressBarEnabled,
        })
      },
    },
    ...(showTerminalSidebarSetting
      ? [
          {
            id: 'showStatusInTerminalTab',
            label: 'Show status in terminal tab',
            value: globalConfig.showStatusInTerminalTab ?? false,
            type: 'boolean' as const,
            onChange(showStatusInTerminalTab: boolean) {
              saveGlobalConfig(current => ({
                ...current,
                showStatusInTerminalTab,
              }))
              setGlobalConfig({
                ...getGlobalConfig(),
                showStatusInTerminalTab,
              })
              logEvent('tengu_terminal_tab_status_setting_changed', {
                enabled: showStatusInTerminalTab,
              })
            },
          },
        ]
      : []),
    {
      id: 'showTurnDuration',
      label: 'Show turn duration',
      value: globalConfig.showTurnDuration,
      type: 'boolean',
      onChange(showTurnDuration: boolean) {
        saveGlobalConfig(current => ({
          ...current,
          showTurnDuration,
        }))
        setGlobalConfig({
          ...getGlobalConfig(),
          showTurnDuration,
        })
        logEvent('tengu_show_turn_duration_setting_changed', {
          enabled: showTurnDuration,
        })
      },
    },
    {
      id: 'copyFullResponse',
      label: 'Always copy full response (skip /copy picker)',
      value: globalConfig.copyFullResponse,
      type: 'boolean',
      onChange(copyFullResponse: boolean) {
        saveGlobalConfig(current => ({
          ...current,
          copyFullResponse,
        }))
        setGlobalConfig({
          ...getGlobalConfig(),
          copyFullResponse,
        })
        logEvent('tengu_config_changed', {
          setting: 'copyFullResponse' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
          value: String(copyFullResponse) as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        })
      },
    },
    ...(fullscreenCopyOnSelectAvailable
      ? [
          {
            id: 'copyOnSelect',
            label: 'Copy on select',
            value: globalConfig.copyOnSelect ?? true,
            type: 'boolean' as const,
            onChange(copyOnSelect: boolean) {
              saveGlobalConfig(current => ({
                ...current,
                copyOnSelect,
              }))
              setGlobalConfig({
                ...getGlobalConfig(),
                copyOnSelect,
              })
              logEvent('tengu_config_changed', {
                setting: 'copyOnSelect' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
                value: String(copyOnSelect) as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
              })
            },
          },
        ]
      : []),
    {
      id: 'theme',
      label: 'Theme',
      value: themeSetting,
      type: 'managedEnum',
      onChange() {},
    },
    {
      id: 'notifChannel',
      label: 'Notifications',
      value: globalConfig.preferredNotifChannel,
      options: [
        'auto',
        'iterm2',
        'terminal_bell',
        'iterm2_with_bell',
        'kitty',
        'ghostty',
        'notifications_disabled',
      ],
      type: 'enum',
      onChange(notifChannel: GlobalConfig['preferredNotifChannel']) {
        saveGlobalConfig(current => ({
          ...current,
          preferredNotifChannel: notifChannel,
        }))
        setGlobalConfig({
          ...getGlobalConfig(),
          preferredNotifChannel: notifChannel,
        })
      },
    },
    {
      id: 'outputStyle',
      label: 'Output style',
      value: currentOutputStyle,
      type: 'managedEnum',
      onChange() {},
    },
    {
      id: 'language',
      label: 'Language',
      value: currentLanguage ?? 'Default (English)',
      type: 'managedEnum',
      onChange() {},
    },
    {
      id: 'editorMode',
      label: 'Editor mode',
      value:
        globalConfig.editorMode === 'emacs'
          ? 'normal'
          : globalConfig.editorMode || 'normal',
      options: ['normal', 'vim'],
      type: 'enum',
      onChange(value: string) {
        saveGlobalConfig(current => ({
          ...current,
          editorMode: value as GlobalConfig['editorMode'],
        }))
        setGlobalConfig({
          ...getGlobalConfig(),
          editorMode: value as GlobalConfig['editorMode'],
        })
        logEvent('tengu_editor_mode_changed', {
          mode: value as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
          source: 'config_panel' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        })
      },
    },
  ]
}
