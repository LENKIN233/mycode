import type { Dispatch, SetStateAction } from 'react'
import type { AppState } from '../../state/AppState.js'
import { saveGlobalConfig, type GlobalConfig } from '../../utils/config.js'
import { transitionPlanAutoMode } from '../../utils/permissions/permissionSetup.js'
import { updateSettingsForSource } from '../../utils/settings/settings.js'
import type { SettingsJson } from '../../utils/settings/types.js'
import type { ThemeSetting } from '../../utils/theme.js'

type InitialAppState = Pick<
  AppState,
  | 'fastMode'
  | 'isBriefOnly'
  | 'mainLoopModel'
  | 'mainLoopModelForSession'
  | 'promptSuggestionEnabled'
  | 'replBridgeEnabled'
  | 'replBridgeOutboundOnly'
  | 'settings'
  | 'thinkingEnabled'
  | 'verbose'
>

type ConfigRevertArgs = {
  initialAppState: InitialAppState
  initialConfig: GlobalConfig
  initialLocalSettings: SettingsJson | undefined
  initialThemeSetting: ThemeSetting
  initialUserSettings: SettingsJson | undefined
  setAppState: Dispatch<SetStateAction<AppState>>
  setTheme: (theme: ThemeSetting) => void
  themeSetting: ThemeSetting
}

export function revertConfigChanges({
  initialAppState,
  initialConfig,
  initialLocalSettings,
  initialThemeSetting,
  initialUserSettings,
  setAppState,
  setTheme,
  themeSetting,
}: ConfigRevertArgs): void {
  if (themeSetting !== initialThemeSetting) {
    setTheme(initialThemeSetting)
  }

  saveGlobalConfig(() => initialConfig)

  updateSettingsForSource('localSettings', {
    spinnerTipsEnabled: initialLocalSettings?.spinnerTipsEnabled,
    prefersReducedMotion: initialLocalSettings?.prefersReducedMotion,
    outputStyle: initialLocalSettings?.outputStyle,
  })

  updateSettingsForSource('userSettings', {
    alwaysThinkingEnabled: initialUserSettings?.alwaysThinkingEnabled,
    fastMode: initialUserSettings?.fastMode,
    promptSuggestionEnabled: initialUserSettings?.promptSuggestionEnabled,
    autoUpdatesChannel: initialUserSettings?.autoUpdatesChannel,
    minimumVersion: initialUserSettings?.minimumVersion,
    language: initialUserSettings?.language,
    syntaxHighlightingDisabled: initialUserSettings?.syntaxHighlightingDisabled,
    permissions:
      initialUserSettings?.permissions === undefined
        ? undefined
        : {
            ...initialUserSettings.permissions,
            defaultMode: initialUserSettings.permissions.defaultMode,
          },
  })

  setAppState(prev => ({
    ...prev,
    mainLoopModel: initialAppState.mainLoopModel,
    mainLoopModelForSession: initialAppState.mainLoopModelForSession,
    verbose: initialAppState.verbose,
    thinkingEnabled: initialAppState.thinkingEnabled,
    fastMode: initialAppState.fastMode,
    promptSuggestionEnabled: initialAppState.promptSuggestionEnabled,
    isBriefOnly: initialAppState.isBriefOnly,
    replBridgeEnabled: initialAppState.replBridgeEnabled,
    replBridgeOutboundOnly: initialAppState.replBridgeOutboundOnly,
    settings: initialAppState.settings,
    toolPermissionContext: transitionPlanAutoMode(prev.toolPermissionContext),
  }))
}
