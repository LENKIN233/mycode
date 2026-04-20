import { useCallback, useEffect } from 'react'
import { getAdjustedScrollOffset } from './configNavigation.js'

type UseConfigSelectionWindowArgs = {
  filteredSettingsLength: number
  maxVisible: number
  selectedIndex: number
  setScrollOffset: (value: number | ((prev: number) => number)) => void
  setSelectedIndex: (value: number) => void
}

export function useConfigSelectionWindow({
  filteredSettingsLength,
  maxVisible,
  selectedIndex,
  setScrollOffset,
  setSelectedIndex,
}: UseConfigSelectionWindowArgs): (newIndex: number) => void {
  useEffect(() => {
    if (selectedIndex >= filteredSettingsLength) {
      const newIndex = Math.max(0, filteredSettingsLength - 1)
      setSelectedIndex(newIndex)
      setScrollOffset(Math.max(0, newIndex - maxVisible + 1))
      return
    }

    setScrollOffset(prev =>
      getAdjustedScrollOffset(prev, selectedIndex, maxVisible),
    )
  }, [
    filteredSettingsLength,
    maxVisible,
    selectedIndex,
    setScrollOffset,
    setSelectedIndex,
  ])

  return useCallback((newIndex: number) => {
    setScrollOffset(prev => getAdjustedScrollOffset(prev, newIndex, maxVisible))
  }, [maxVisible, setScrollOffset])
}
