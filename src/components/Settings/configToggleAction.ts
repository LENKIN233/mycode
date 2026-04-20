import type { Setting } from './types.js'

export type ToggleAction =
  | { kind: 'none' }
  | { kind: 'toggleBoolean' }
  | { kind: 'cycleEnum'; nextValue: string }
  | { kind: 'openSubmenu'; submenu: string }
  | { kind: 'setLatestAutoUpdates' }

export function getConfigToggleAction(args: {
  autoUpdaterDisabledReason: unknown
  currentAutoUpdateChannel: 'latest' | 'stable'
  managedSubmenu: string | undefined
  setting: Setting | undefined
}): ToggleAction {
  const { autoUpdaterDisabledReason, currentAutoUpdateChannel, managedSubmenu, setting } = args

  if (!setting || !setting.onChange) {
    return { kind: 'none' }
  }

  if (setting.type === 'boolean') {
    return { kind: 'toggleBoolean' }
  }

  if (managedSubmenu !== undefined) {
    return { kind: 'openSubmenu', submenu: managedSubmenu }
  }

  if (setting.id === 'autoUpdatesChannel') {
    if (autoUpdaterDisabledReason) {
      return { kind: 'openSubmenu', submenu: 'EnableAutoUpdates' }
    }
    if (currentAutoUpdateChannel === 'latest') {
      return { kind: 'openSubmenu', submenu: 'ChannelDowngrade' }
    }
    return { kind: 'setLatestAutoUpdates' }
  }

  if (setting.type === 'enum') {
    const currentIndex = setting.options.indexOf(setting.value)
    const nextIndex = (currentIndex + 1) % setting.options.length
    return {
      kind: 'cycleEnum',
      nextValue: setting.options[nextIndex]!,
    }
  }

  return { kind: 'none' }
}
