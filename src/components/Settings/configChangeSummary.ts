import chalk from 'chalk'
import {
  logEvent,
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from 'src/services/analytics/index.js'
import { normalizeApiKeyForConfig } from '../../utils/authPortable.js'
import type { GlobalConfig, OutputStyle } from '../../utils/config.js'
import type { SettingsJson } from '../../utils/settings/types.js'
import { isRunningOnHomespace } from 'src/utils/envUtils.js'

type Args = {
  changes: Record<string, unknown>
  currentLanguage: string | undefined
  currentOutputStyle: OutputStyle
  globalConfig: GlobalConfig
  initialConfig: GlobalConfig
  initialLanguage: string | undefined
  initialOutputStyle: OutputStyle
  initialSettingsData: SettingsJson | undefined
  settingsData: SettingsJson | undefined
}

function addBooleanChange(
  changes: string[],
  currentValue: boolean | undefined,
  initialValue: boolean | undefined,
  enabledLabel: string,
  disabledLabel: string = `Disabled ${enabledLabel.replace(/^Enabled /, '')}`,
): void {
  if (currentValue !== initialValue) {
    changes.push(currentValue ? enabledLabel : disabledLabel)
  }
}

export function buildConfigChangeSummary({
  changes,
  currentLanguage,
  currentOutputStyle,
  globalConfig,
  initialConfig,
  initialLanguage,
  initialOutputStyle,
  initialSettingsData,
  settingsData,
}: Args): string[] {
  const formattedChanges = Object.entries(changes).map(([key, value]) => {
    logEvent('tengu_config_changed', {
      key: key as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      value: value as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })

    return `Set ${key} to ${chalk.bold(value)}`
  })

  const effectiveApiKey = isRunningOnHomespace() ? undefined : process.env.ANTHROPIC_API_KEY
  const truncatedKey = effectiveApiKey
    ? normalizeApiKeyForConfig(effectiveApiKey)
    : undefined
  const initialUsingCustomKey = Boolean(
    truncatedKey && initialConfig.customApiKeyResponses?.approved?.includes(truncatedKey),
  )
  const currentUsingCustomKey = Boolean(
    truncatedKey && globalConfig.customApiKeyResponses?.approved?.includes(truncatedKey),
  )

  if (initialUsingCustomKey !== currentUsingCustomKey) {
    formattedChanges.push(`${currentUsingCustomKey ? 'Enabled' : 'Disabled'} custom API key`)
    logEvent('tengu_config_changed', {
      key: 'env.ANTHROPIC_API_KEY' as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      value: currentUsingCustomKey as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
    })
  }

  if (globalConfig.theme !== initialConfig.theme) {
    formattedChanges.push(`Set theme to ${chalk.bold(globalConfig.theme)}`)
  }
  if (globalConfig.preferredNotifChannel !== initialConfig.preferredNotifChannel) {
    formattedChanges.push(`Set notifications to ${chalk.bold(globalConfig.preferredNotifChannel)}`)
  }
  if (currentOutputStyle !== initialOutputStyle) {
    formattedChanges.push(`Set output style to ${chalk.bold(currentOutputStyle)}`)
  }
  if (currentLanguage !== initialLanguage) {
    formattedChanges.push(
      `Set response language to ${chalk.bold(currentLanguage ?? 'Default (English)')}`,
    )
  }
  if (globalConfig.editorMode !== initialConfig.editorMode) {
    formattedChanges.push(`Set editor mode to ${chalk.bold(globalConfig.editorMode || 'emacs')}`)
  }
  if (globalConfig.diffTool !== initialConfig.diffTool) {
    formattedChanges.push(`Set diff tool to ${chalk.bold(globalConfig.diffTool)}`)
  }

  addBooleanChange(
    formattedChanges,
    globalConfig.autoConnectIde,
    initialConfig.autoConnectIde,
    'Enabled auto-connect to IDE',
  )
  addBooleanChange(
    formattedChanges,
    globalConfig.autoInstallIdeExtension,
    initialConfig.autoInstallIdeExtension,
    'Enabled auto-install IDE extension',
  )
  addBooleanChange(
    formattedChanges,
    globalConfig.autoCompactEnabled,
    initialConfig.autoCompactEnabled,
    'Enabled auto-compact',
  )
  addBooleanChange(
    formattedChanges,
    globalConfig.respectGitignore,
    initialConfig.respectGitignore,
    'Enabled respect .gitignore in file picker',
  )
  addBooleanChange(
    formattedChanges,
    globalConfig.copyFullResponse,
    initialConfig.copyFullResponse,
    'Enabled always copy full response',
  )
  addBooleanChange(
    formattedChanges,
    globalConfig.copyOnSelect,
    initialConfig.copyOnSelect,
    'Enabled copy on select',
  )
  addBooleanChange(
    formattedChanges,
    globalConfig.terminalProgressBarEnabled,
    initialConfig.terminalProgressBarEnabled,
    'Enabled terminal progress bar',
  )
  addBooleanChange(
    formattedChanges,
    globalConfig.showStatusInTerminalTab,
    initialConfig.showStatusInTerminalTab,
    'Enabled terminal tab status',
  )
  addBooleanChange(
    formattedChanges,
    globalConfig.showTurnDuration,
    initialConfig.showTurnDuration,
    'Enabled turn duration',
  )

  if (globalConfig.remoteControlAtStartup !== initialConfig.remoteControlAtStartup) {
    formattedChanges.push(
      globalConfig.remoteControlAtStartup === undefined
        ? 'Reset Remote Control to default'
        : `${globalConfig.remoteControlAtStartup ? 'Enabled' : 'Disabled'} Remote Control for all sessions`,
    )
  }
  if (settingsData?.autoUpdatesChannel !== initialSettingsData?.autoUpdatesChannel) {
    formattedChanges.push(
      `Set auto-update channel to ${chalk.bold(settingsData?.autoUpdatesChannel ?? 'latest')}`,
    )
  }

  return formattedChanges
}
