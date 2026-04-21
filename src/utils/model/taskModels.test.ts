import { describe, expect, test } from 'bun:test'
import {
  ORDERED_TASK_CATEGORY_KEYS,
  getTaskCategoryAudience,
  getTaskCategoryGroup,
  getTaskCategoryGroupMeta,
  resolveCopilotDefaultModelFromAvailable,
} from './taskModels.js'

describe('resolveCopilotDefaultModelFromAvailable', () => {
  test('returns first preferred available model', () => {
    expect(
      resolveCopilotDefaultModelFromAvailable(
        ['claude-sonnet-4.6', 'gpt-5.4', 'gpt-4.1'],
        ['gpt-4.1', 'gpt-5.4'],
        'claude-sonnet-4.6',
      ),
    ).toBe('gpt-5.4')
  })

  test('falls back when availability list is empty', () => {
    expect(
      resolveCopilotDefaultModelFromAvailable(
        ['claude-sonnet-4.6', 'gpt-5.4'],
        [],
        'claude-sonnet-4.6',
      ),
    ).toBe('claude-sonnet-4.6')
  })

  test('uses first available model when no preferred candidate matches', () => {
    expect(
      resolveCopilotDefaultModelFromAvailable(
        ['claude-sonnet-4.6'],
        ['gemini-2.5-pro', 'gpt-4.1'],
        'claude-sonnet-4.6',
      ),
    ).toBe('gemini-2.5-pro')
  })

  test('exposes ordered categories grouped for UI', () => {
    expect(ORDERED_TASK_CATEGORY_KEYS.slice(0, 3)).toEqual([
      'mainLoop',
      'title',
      'summary',
    ])
    expect(getTaskCategoryGroup('hooks')).toBe('session')
    expect(getTaskCategoryAudience('tokenCountFallback')).toBe('advanced')
    expect(getTaskCategoryGroupMeta('analysis').label).toBe(
      'Analysis and Memory',
    )
  })
})
