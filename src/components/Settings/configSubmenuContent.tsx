import React from 'react'
import { formatAutoUpdaterDisabledReason } from '../../utils/config.js'
import type { LocalJSXCommandContext } from '../../commands.js'
import type { ChannelDowngradeChoice } from '../ChannelDowngradeDialog.js'
import type { OutputStyle } from '../../utils/config.js'
import type { ThemeSetting } from '../../utils/theme.js'
import {
  isBasicConfigSubMenu,
  renderBasicConfigSubMenu,
} from './basicConfigSubmenus.js'
import { ConfigListView } from './configListView.js'
import {
  isProviderRoutingSubMenu,
  renderProviderRoutingSubMenu,
} from './providerRoutingSettings.js'
import { renderConfigSpecialSubMenu } from './configSpecialSubmenus.js'
import type { AutoUpdateChannel, ConfigSubMenu } from './types.js'

type Props = {
  autoUpdaterDisabledReason: unknown
  closeSubmenu: () => void
  context: LocalJSXCommandContext
  currentLanguage: string | undefined
  currentOutputStyle: OutputStyle
  currentVersion: string
  externalIncludes: string[]
  filteredSettingsItems: Parameters<typeof ConfigListView>[0]['filteredSettingsItems']
  headerFocused: boolean
  insideModal: boolean
  isSearchMode: boolean
  isTerminalFocused: boolean
  maxVisible: number
  mainLoopModel: string | null
  onChannelDowngradeChoice: (choice: ChannelDowngradeChoice) => void
  onEnableAutoUpdates: (channel: AutoUpdateChannel) => void
  onLanguageSelected: (language: string | undefined) => void
  onModelSelected: (model: string | null) => void
  onOutputStyleSelected: (style: OutputStyle | undefined) => void
  onProviderRoutingDirty: () => void
  onTeammateModelSelected: (model: string | null) => void
  onThemeSelected: (theme: ThemeSetting) => void
  scrollOffset: number
  searchCursorOffset: number
  searchQuery: string
  selectedIndex: number
  showFastModeNotice: boolean
  showSubmenu: ConfigSubMenu | null
  showThinkingWarning: boolean
  teammateDefaultModel: string | null | undefined
}

export function renderConfigSubmenuContent({
  autoUpdaterDisabledReason,
  closeSubmenu,
  context,
  currentLanguage,
  currentOutputStyle,
  currentVersion,
  externalIncludes,
  filteredSettingsItems,
  headerFocused,
  insideModal,
  isSearchMode,
  isTerminalFocused,
  maxVisible,
  mainLoopModel,
  onChannelDowngradeChoice,
  onEnableAutoUpdates,
  onLanguageSelected,
  onModelSelected,
  onOutputStyleSelected,
  onProviderRoutingDirty,
  onTeammateModelSelected,
  onThemeSelected,
  scrollOffset,
  searchCursorOffset,
  searchQuery,
  selectedIndex,
  showFastModeNotice,
  showSubmenu,
  showThinkingWarning,
  teammateDefaultModel,
}: Props): React.ReactNode {
  if (isBasicConfigSubMenu(showSubmenu)) {
    return renderBasicConfigSubMenu({
      submenu: showSubmenu,
      mainLoopModel,
      currentOutputStyle,
      currentLanguage,
      showFastModeNotice,
      onThemeSelected,
      onModelSelected,
      onOutputStyleSelected,
      onLanguageSelected,
      onClose: closeSubmenu,
    })
  }

  if (isProviderRoutingSubMenu(showSubmenu)) {
    return renderProviderRoutingSubMenu({
      submenu: showSubmenu,
      context,
      onClose: closeSubmenu,
      onDirty: onProviderRoutingDirty,
    })
  }

  return (
    renderConfigSpecialSubMenu({
      submenu: showSubmenu,
      autoUpdaterDisabledReason,
      closeSubmenu,
      currentVersion,
      externalIncludes,
      teammateDefaultModel,
      onTeammateModelSelected,
      onEnableAutoUpdates,
      onChannelDowngradeChoice,
    }) ?? (
      <ConfigListView
        autoUpdaterDisabledReasonText={
          autoUpdaterDisabledReason
            ? formatAutoUpdaterDisabledReason(autoUpdaterDisabledReason)
            : undefined
        }
        filteredSettingsItems={filteredSettingsItems}
        headerFocused={headerFocused}
        insideModal={insideModal}
        isSearchMode={isSearchMode}
        isTerminalFocused={isTerminalFocused}
        maxVisible={maxVisible}
        scrollOffset={scrollOffset}
        searchCursorOffset={searchCursorOffset}
        searchQuery={searchQuery}
        selectedIndex={selectedIndex}
        showThinkingWarning={showThinkingWarning}
      />
    )
  )
}
