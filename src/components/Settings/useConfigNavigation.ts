import { useCallback } from 'react'
import type { KeyboardEvent } from '../../ink/events/keyboard-event.js'
import { useKeybindings } from '../../keybindings/useKeybinding.js'
import {
  getAdjustedScrollOffset,
  getNextSelectionIndex,
  getSearchActivationKey,
  getSearchModeAction,
  isListToggleKey,
} from './configNavigation.js'

type Args = {
  adjustScrollOffset: (newIndex: number) => void
  filteredSettingsLength: number
  headerFocused: boolean
  isSearchMode: boolean
  maxVisible: number
  searchQuery: string
  selectedIndex: number
  setIsSearchMode: (value: boolean) => void
  setScrollOffset: (value: number | ((prev: number) => number)) => void
  setSearchQuery: (value: string) => void
  setSelectedIndex: (value: number) => void
  setShowThinkingWarning: (value: boolean) => void
  showSubmenu: string | null
  toggleSetting: () => void
}

export function useConfigNavigation({
  adjustScrollOffset,
  filteredSettingsLength,
  headerFocused,
  isSearchMode,
  maxVisible,
  searchQuery,
  selectedIndex,
  setIsSearchMode,
  setScrollOffset,
  setSearchQuery,
  setSelectedIndex,
  setShowThinkingWarning,
  showSubmenu,
  toggleSetting,
}: Args): (e: KeyboardEvent) => void {
  const moveSelection = useCallback((delta: -1 | 1) => {
    setShowThinkingWarning(false)
    const newIndex = getNextSelectionIndex(selectedIndex, filteredSettingsLength, delta)
    setSelectedIndex(newIndex)
    adjustScrollOffset(newIndex)
  }, [
    adjustScrollOffset,
    filteredSettingsLength,
    selectedIndex,
    setSelectedIndex,
    setShowThinkingWarning,
  ])

  useKeybindings({
    'select:previous': () => {
      if (selectedIndex === 0) {
        setShowThinkingWarning(false)
        setIsSearchMode(true)
        setScrollOffset(0)
      } else {
        moveSelection(-1)
      }
    },
    'select:next': () => moveSelection(1),
    'scroll:lineUp': () => moveSelection(-1),
    'scroll:lineDown': () => moveSelection(1),
    'select:accept': toggleSetting,
    'settings:search': () => {
      setIsSearchMode(true)
      setSearchQuery('')
    },
  }, {
    context: 'Settings',
    isActive: showSubmenu === null && !isSearchMode && !headerFocused,
  })

  return useCallback((e: KeyboardEvent) => {
    if (showSubmenu !== null || headerFocused) {
      return
    }

    if (isSearchMode) {
      const searchModeAction = getSearchModeAction(e.key, searchQuery.length)
      if (searchModeAction === 'clearSearch') {
        e.preventDefault()
        setSearchQuery('')
        return
      }
      if (searchModeAction === 'exitSearch') {
        e.preventDefault()
        setIsSearchMode(false)
        return
      }
      if (searchModeAction === 'enterList') {
        e.preventDefault()
        setIsSearchMode(false)
        setSelectedIndex(0)
        setScrollOffset(0)
      }
      return
    }

    if (isListToggleKey(e.key)) {
      e.preventDefault()
      toggleSetting()
      return
    }

    const searchActivationKey = getSearchActivationKey(e)
    if (searchActivationKey !== null) {
      e.preventDefault()
      setIsSearchMode(true)
      setSearchQuery(searchActivationKey)
    }
  }, [
    headerFocused,
    isSearchMode,
    searchQuery,
    setIsSearchMode,
    setScrollOffset,
    setSearchQuery,
    setSelectedIndex,
    showSubmenu,
    toggleSetting,
  ])
}
