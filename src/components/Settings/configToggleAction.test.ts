import { describe, expect, test } from 'bun:test'
import { getConfigToggleAction } from './configToggleAction.js'
import type { Setting } from './types.js'

function createBooleanSetting(id = 'flag', value = false): Setting {
  return {
    id,
    label: id,
    onChange() {},
    type: 'boolean',
    value,
  }
}

function createEnumSetting(
  id = 'mode',
  value = 'one',
  options = ['one', 'two', 'three'],
): Setting {
  return {
    id,
    label: id,
    onChange() {},
    options,
    type: 'enum',
    value,
  }
}

describe('configToggleAction', () => {
  test('returns none when setting is missing', () => {
    expect(
      getConfigToggleAction({
        autoUpdaterDisabledReason: null,
        currentAutoUpdateChannel: 'latest',
        managedSubmenu: undefined,
        setting: undefined,
      }),
    ).toEqual({ kind: 'none' })
  })

  test('returns toggleBoolean for boolean settings', () => {
    expect(
      getConfigToggleAction({
        autoUpdaterDisabledReason: null,
        currentAutoUpdateChannel: 'latest',
        managedSubmenu: undefined,
        setting: createBooleanSetting(),
      }),
    ).toEqual({ kind: 'toggleBoolean' })
  })

  test('prefers managed submenu routing when present', () => {
    expect(
      getConfigToggleAction({
        autoUpdaterDisabledReason: null,
        currentAutoUpdateChannel: 'latest',
        managedSubmenu: 'Theme',
        setting: createEnumSetting('theme'),
      }),
    ).toEqual({ kind: 'openSubmenu', submenu: 'Theme' })
  })

  test('routes auto update setting to enable dialog when disabled externally', () => {
    expect(
      getConfigToggleAction({
        autoUpdaterDisabledReason: { type: 'env' },
        currentAutoUpdateChannel: 'latest',
        managedSubmenu: undefined,
        setting: createEnumSetting('autoUpdatesChannel', 'latest', ['latest', 'stable']),
      }),
    ).toEqual({ kind: 'openSubmenu', submenu: 'EnableAutoUpdates' })
  })

  test('routes latest channel downgrade through confirmation dialog', () => {
    expect(
      getConfigToggleAction({
        autoUpdaterDisabledReason: null,
        currentAutoUpdateChannel: 'latest',
        managedSubmenu: undefined,
        setting: createEnumSetting('autoUpdatesChannel', 'latest', ['latest', 'stable']),
      }),
    ).toEqual({ kind: 'openSubmenu', submenu: 'ChannelDowngrade' })
  })

  test('routes stable channel directly back to latest', () => {
    expect(
      getConfigToggleAction({
        autoUpdaterDisabledReason: null,
        currentAutoUpdateChannel: 'stable',
        managedSubmenu: undefined,
        setting: createEnumSetting('autoUpdatesChannel', 'stable', ['latest', 'stable']),
      }),
    ).toEqual({ kind: 'setLatestAutoUpdates' })
  })

  test('cycles ordinary enum settings to the next option', () => {
    expect(
      getConfigToggleAction({
        autoUpdaterDisabledReason: null,
        currentAutoUpdateChannel: 'latest',
        managedSubmenu: undefined,
        setting: createEnumSetting('mode', 'two', ['one', 'two', 'three']),
      }),
    ).toEqual({ kind: 'cycleEnum', nextValue: 'three' })
  })
})
