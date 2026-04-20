import type { Dispatch, SetStateAction } from 'react'
import type { AppState } from '../../state/AppState.js'
import { updateSettingsForSource } from '../../utils/settings/settings.js'
import type { SettingsJson } from '../../utils/settings/types.js'
import { setUserMsgOptIn } from '../../bootstrap/state.js'
import {
  logEvent,
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from 'src/services/analytics/index.js'
import type { Setting } from './types.js'

type ConfigViewSettingsArgs = {
  setAppState: Dispatch<SetStateAction<AppState>>
  setChanges: Dispatch<SetStateAction<Record<string, unknown>>>
  setSettingsData: Dispatch<SetStateAction<SettingsJson | undefined>>
  settingsData: SettingsJson | undefined
  showDefaultViewPicker: boolean
}

export function getConfigViewSettings({
  setAppState,
  setChanges,
  setSettingsData,
  settingsData,
  showDefaultViewPicker,
}: ConfigViewSettingsArgs): Setting[] {
  if (!showDefaultViewPicker) {
    return []
  }

  return [
    {
      id: 'defaultView',
      label: 'What you see by default',
      value: settingsData?.defaultView === undefined ? 'default' : String(settingsData.defaultView),
      options: ['transcript', 'chat', 'default'],
      type: 'enum' as const,
      onChange(selected: string) {
        const defaultView = selected === 'default' ? undefined : (selected as 'chat' | 'transcript')

        updateSettingsForSource('localSettings', {
          defaultView,
        })
        setSettingsData(prev => ({
          ...prev,
          defaultView,
        }))

        const nextBrief = defaultView === 'chat'
        setAppState(prev => {
          if (prev.isBriefOnly === nextBrief) {
            return prev
          }

          return {
            ...prev,
            isBriefOnly: nextBrief,
          }
        })

        // Keep userMsgOptIn aligned with the chosen default view so the
        // visible tool surface matches the persisted presentation mode.
        setUserMsgOptIn(nextBrief)
        setChanges(prev => ({
          ...prev,
          'Default view': selected,
        }))
        logEvent('tengu_default_view_setting_changed', {
          value: (defaultView ?? 'unset') as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
        })
      },
    },
  ]
}
