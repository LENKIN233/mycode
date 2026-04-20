import { describe, expect, test } from 'bun:test'
import {
  buildDesignFollowupPrompt,
  inferDesignTemplate,
  parseDesignCommandArgs,
  sanitizeDesignSlug,
  titleFromDesignBrief,
} from './helpers.js'

describe('sanitizeDesignSlug', () => {
  test('normalizes spaces and punctuation', () => {
    expect(sanitizeDesignSlug('Settings Redesign: Calm & Editorial')).toBe(
      'settings-redesign-calm-editorial',
    )
  })

  test('falls back when slug becomes empty', () => {
    expect(sanitizeDesignSlug('!!!')).toBe('design-artifact')
  })
})

describe('titleFromDesignBrief', () => {
  test('uses first line only', () => {
    expect(titleFromDesignBrief('Primary line\nsecondary context')).toBe(
      'Primary line',
    )
  })

  test('truncates long titles', () => {
    const title = titleFromDesignBrief(
      'A very long design brief that should be shortened before becoming the visible title in the starter',
    )

    expect(title.endsWith('...')).toBe(true)
    expect(title.length).toBeLessThanOrEqual(60)
  })
})

describe('buildDesignFollowupPrompt', () => {
  test('includes file path, brief, and artifact directory contract', () => {
    const prompt = buildDesignFollowupPrompt(
      'Redesign settings for a calmer feel',
      'artifacts/claude-design/settings-redesign.html',
      'canvas',
    )

    expect(prompt).toContain('claude-design agent')
    expect(prompt).toContain('artifacts/claude-design/settings-redesign.html')
    expect(prompt).toContain('at least 3 visual directions')
    expect(prompt).toContain('starter template is `canvas`')
    expect(prompt).toContain('Redesign settings for a calmer feel')
  })
})

describe('parseDesignCommandArgs', () => {
  test('extracts an explicit template flag', () => {
    expect(
      parseDesignCommandArgs('--template deck build a quarterly roadmap'),
    ).toEqual({
      brief: 'build a quarterly roadmap',
      template: 'deck',
    })
  })

  test('returns plain brief when no template flag is present', () => {
    expect(parseDesignCommandArgs('redesign the settings screen')).toEqual({
      brief: 'redesign the settings screen',
    })
  })

  test('extracts file and latest flags in any order', () => {
    expect(
      parseDesignCommandArgs(
        '--latest refine the strongest direction --file "artifacts/claude-design/settings.html"',
      ),
    ).toEqual({
      brief: 'refine the strongest direction',
      file: 'artifacts/claude-design/settings.html',
      latest: true,
    })
  })

  test('extracts list flag', () => {
    expect(parseDesignCommandArgs('--list')).toEqual({
      brief: '',
      list: true,
    })
  })
})

describe('inferDesignTemplate', () => {
  test('chooses deck for presentation language', () => {
    expect(inferDesignTemplate('Create a deck for the product kickoff')).toBe(
      'deck',
    )
  })

  test('chooses prototype for flow language', () => {
    expect(
      inferDesignTemplate('Prototype a calmer onboarding flow for signup'),
    ).toBe('prototype')
  })

  test('falls back to canvas', () => {
    expect(inferDesignTemplate('Explore three visual directions for settings')).toBe(
      'canvas',
    )
  })
})
