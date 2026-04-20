import { describe, expect, test } from 'bun:test'
import {
  getAdjustedScrollOffset,
  getNextSelectionIndex,
  getSearchActivationKey,
  getSearchModeAction,
  isListToggleKey,
} from './configNavigation.js'

describe('configNavigation', () => {
  test('getAdjustedScrollOffset keeps visible selections stable', () => {
    expect(getAdjustedScrollOffset(3, 2, 5)).toBe(2)
    expect(getAdjustedScrollOffset(3, 4, 5)).toBe(3)
    expect(getAdjustedScrollOffset(3, 8, 5)).toBe(4)
  })

  test('getNextSelectionIndex clamps to list bounds', () => {
    expect(getNextSelectionIndex(0, 10, -1)).toBe(0)
    expect(getNextSelectionIndex(4, 10, 1)).toBe(5)
    expect(getNextSelectionIndex(9, 10, 1)).toBe(9)
  })

  test('getSearchModeAction distinguishes clear/exit/enter list', () => {
    expect(getSearchModeAction('escape', 3)).toBe('clearSearch')
    expect(getSearchModeAction('escape', 0)).toBe('exitSearch')
    expect(getSearchModeAction('return', 0)).toBe('enterList')
    expect(getSearchModeAction('down', 0)).toBe('enterList')
    expect(getSearchModeAction('x', 2)).toBeNull()
  })

  test('isListToggleKey only allows horizontal toggles', () => {
    expect(isListToggleKey('left')).toBe(true)
    expect(isListToggleKey('right')).toBe(true)
    expect(isListToggleKey('tab')).toBe(true)
    expect(isListToggleKey('down')).toBe(false)
  })

  test('getSearchActivationKey filters control and reserved keys', () => {
    expect(getSearchActivationKey({ ctrl: true, meta: false, key: 'a' })).toBeNull()
    expect(getSearchActivationKey({ ctrl: false, meta: true, key: 'a' })).toBeNull()
    expect(getSearchActivationKey({ ctrl: false, meta: false, key: 'j' })).toBeNull()
    expect(getSearchActivationKey({ ctrl: false, meta: false, key: '/' })).toBeNull()
    expect(getSearchActivationKey({ ctrl: false, meta: false, key: ' ' })).toBeNull()
    expect(getSearchActivationKey({ ctrl: false, meta: false, key: 'a' })).toBe('a')
  })
})
