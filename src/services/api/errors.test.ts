import { describe, expect, test } from 'bun:test'
import { get3PModelFallbackSuggestion } from './errors.js'

describe('get3PModelFallbackSuggestion', () => {
  test('does not suggest fallback for firstParty requests', () => {
    expect(
      get3PModelFallbackSuggestion('claude-sonnet-4.6', 'firstParty'),
    ).toBeUndefined()
  })

  test('suggests downgrade for third-party sonnet requests', () => {
    expect(
      get3PModelFallbackSuggestion('claude-sonnet-4-6', 'copilot'),
    ).toBeTruthy()
  })
})
