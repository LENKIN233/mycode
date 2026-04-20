import { Box, Text } from '../../ink.js'
import figures from 'figures'
import { permissionModeTitle, type PermissionMode } from '../../utils/permissions/PermissionMode.js'
import { SearchBox } from '../SearchBox.js'
import { ConfigurableShortcutHint } from '../ConfigurableShortcutHint.js'
import { Byline } from '../design-system/Byline.js'
import { KeyboardShortcutHint } from '../design-system/KeyboardShortcutHint.js'
import type { Setting } from './types.js'

type Props = {
  autoUpdaterDisabledReasonText?: string
  filteredSettingsItems: Setting[]
  headerFocused: boolean
  insideModal: boolean
  isSearchMode: boolean
  isTerminalFocused: boolean
  maxVisible: number
  scrollOffset: number
  searchCursorOffset: number
  searchQuery: string
  selectedIndex: number
  showThinkingWarning: boolean
}

const THEME_LABELS: Record<string, string> = {
  auto: 'Auto (match terminal)',
  dark: 'Dark mode',
  light: 'Light mode',
  'dark-daltonized': 'Dark mode (colorblind-friendly)',
  'light-daltonized': 'Light mode (colorblind-friendly)',
  'dark-ansi': 'Dark mode (ANSI colors only)',
  'light-ansi': 'Light mode (ANSI colors only)',
}

export function ConfigListView({
  autoUpdaterDisabledReasonText,
  filteredSettingsItems,
  headerFocused,
  insideModal,
  isSearchMode,
  isTerminalFocused,
  maxVisible,
  scrollOffset,
  searchCursorOffset,
  searchQuery,
  selectedIndex,
  showThinkingWarning,
}: Props): React.ReactNode {
  return (
    <Box flexDirection="column" gap={1} marginY={insideModal ? undefined : 1}>
      <SearchBox
        query={searchQuery}
        isFocused={isSearchMode && !headerFocused}
        isTerminalFocused={isTerminalFocused}
        cursorOffset={searchCursorOffset}
        placeholder="Search settings…"
      />
      <Box flexDirection="column">
        {filteredSettingsItems.length === 0 ? (
          <Text dimColor italic>
            No settings match &quot;{searchQuery}&quot;
          </Text>
        ) : (
          <>
            {scrollOffset > 0 && (
              <Text dimColor>
                {figures.arrowUp} {scrollOffset} more above
              </Text>
            )}
            {filteredSettingsItems
              .slice(scrollOffset, scrollOffset + maxVisible)
              .map((setting, index) => {
                const actualIndex = scrollOffset + index
                const isSelected =
                  actualIndex === selectedIndex && !headerFocused && !isSearchMode
                return (
                  <Box key={setting.id}>
                    <Box width={44}>
                      <Text color={isSelected ? 'suggestion' : undefined}>
                        {isSelected ? figures.pointer : ' '} {setting.label}
                      </Text>
                    </Box>
                    <Box key={isSelected ? 'selected' : 'unselected'}>
                      {renderSettingValue({
                        autoUpdaterDisabledReasonText,
                        isSelected,
                        setting,
                        showThinkingWarning,
                      })}
                    </Box>
                  </Box>
                )
              })}
            {scrollOffset + maxVisible < filteredSettingsItems.length && (
              <Text dimColor>
                {figures.arrowDown}{' '}
                {filteredSettingsItems.length - scrollOffset - maxVisible} more below
              </Text>
            )}
          </>
        )}
      </Box>
      {renderFooter({ headerFocused, isSearchMode })}
    </Box>
  )
}

function renderSettingValue({
  autoUpdaterDisabledReasonText,
  isSelected,
  setting,
  showThinkingWarning,
}: {
  autoUpdaterDisabledReasonText?: string
  isSelected: boolean
  setting: Setting
  showThinkingWarning: boolean
}): React.ReactNode {
  if (setting.type === 'boolean') {
    return (
      <>
        <Text color={isSelected ? 'suggestion' : undefined}>
          {setting.value.toString()}
        </Text>
        {showThinkingWarning && setting.id === 'thinkingEnabled' && (
          <Text color="warning">
            {' '}
            Changing thinking mode mid-conversation will increase latency and may
            reduce quality.
          </Text>
        )}
      </>
    )
  }

  if (setting.id === 'theme') {
    return (
      <Text color={isSelected ? 'suggestion' : undefined}>
        {THEME_LABELS[setting.value.toString()] ?? setting.value.toString()}
      </Text>
    )
  }

  if (setting.id === 'notifChannel') {
    return (
      <Text color={isSelected ? 'suggestion' : undefined}>
        <NotifChannelLabel value={setting.value.toString()} />
      </Text>
    )
  }

  if (setting.id === 'defaultPermissionMode') {
    return (
      <Text color={isSelected ? 'suggestion' : undefined}>
        {permissionModeTitle(setting.value as PermissionMode)}
      </Text>
    )
  }

  if (setting.id === 'autoUpdatesChannel' && autoUpdaterDisabledReasonText) {
    return (
      <Box flexDirection="column">
        <Text color={isSelected ? 'suggestion' : undefined}>disabled</Text>
        <Text dimColor>({autoUpdaterDisabledReasonText})</Text>
      </Box>
    )
  }

  return (
    <Text color={isSelected ? 'suggestion' : undefined}>
      {setting.value.toString()}
    </Text>
  )
}

function renderFooter({
  headerFocused,
  isSearchMode,
}: {
  headerFocused: boolean
  isSearchMode: boolean
}): React.ReactNode {
  if (headerFocused) {
    return (
      <Text dimColor>
        <Byline>
          <KeyboardShortcutHint shortcut="←/→ tab" action="switch" />
          <KeyboardShortcutHint shortcut="↓" action="return" />
          <ConfigurableShortcutHint
            action="confirm:no"
            context="Settings"
            fallback="Esc"
            description="close"
          />
        </Byline>
      </Text>
    )
  }

  if (isSearchMode) {
    return (
      <Text dimColor>
        <Byline>
          <Text>Type to filter</Text>
          <KeyboardShortcutHint shortcut="Enter/↓" action="select" />
          <KeyboardShortcutHint shortcut="↑" action="tabs" />
          <ConfigurableShortcutHint
            action="confirm:no"
            context="Settings"
            fallback="Esc"
            description="clear"
          />
        </Byline>
      </Text>
    )
  }

  return (
    <Text dimColor>
      <Byline>
        <ConfigurableShortcutHint
          action="select:accept"
          context="Settings"
          fallback="Space"
          description="change"
        />
        <ConfigurableShortcutHint
          action="settings:close"
          context="Settings"
          fallback="Enter"
          description="save"
        />
        <ConfigurableShortcutHint
          action="settings:search"
          context="Settings"
          fallback="/"
          description="search"
        />
        <ConfigurableShortcutHint
          action="confirm:no"
          context="Settings"
          fallback="Esc"
          description="cancel"
        />
      </Byline>
    </Text>
  )
}

function NotifChannelLabel({ value }: { value: string }): React.ReactNode {
  switch (value) {
    case 'auto':
      return 'Auto'
    case 'iterm2':
      return (
        <Text>
          iTerm2 <Text dimColor>(OSC 9)</Text>
        </Text>
      )
    case 'terminal_bell':
      return (
        <Text>
          Terminal Bell <Text dimColor>(\a)</Text>
        </Text>
      )
    case 'kitty':
      return (
        <Text>
          Kitty <Text dimColor>(OSC 99)</Text>
        </Text>
      )
    case 'ghostty':
      return (
        <Text>
          Ghostty <Text dimColor>(OSC 777)</Text>
        </Text>
      )
    case 'iterm2_with_bell':
      return 'iTerm2 w/ Bell'
    case 'notifications_disabled':
      return 'Disabled'
    default:
      return value
  }
}
