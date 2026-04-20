type SearchModeAction = 'clearSearch' | 'enterList' | 'exitSearch' | null

type KeyLikeEvent = {
  ctrl: boolean
  meta: boolean
  key: string
}

export function getAdjustedScrollOffset(
  currentOffset: number,
  newIndex: number,
  maxVisible: number,
): number {
  if (newIndex < currentOffset) {
    return newIndex
  }
  if (newIndex >= currentOffset + maxVisible) {
    return newIndex - maxVisible + 1
  }
  return currentOffset
}

export function getNextSelectionIndex(
  selectedIndex: number,
  listLength: number,
  delta: -1 | 1,
): number {
  return Math.max(0, Math.min(listLength - 1, selectedIndex + delta))
}

export function getSearchModeAction(
  key: string,
  searchQueryLength: number,
): SearchModeAction {
  if (key === 'escape') {
    return searchQueryLength > 0 ? 'clearSearch' : 'exitSearch'
  }
  if (key === 'return' || key === 'down' || key === 'wheeldown') {
    return 'enterList'
  }
  return null
}

export function isListToggleKey(key: string): boolean {
  return key === 'left' || key === 'right' || key === 'tab'
}

export function getSearchActivationKey(event: KeyLikeEvent): string | null {
  if (event.ctrl || event.meta) {
    return null
  }
  if (event.key === 'j' || event.key === 'k' || event.key === '/') {
    return null
  }
  if (event.key.length === 1 && event.key !== ' ') {
    return event.key
  }
  return null
}
