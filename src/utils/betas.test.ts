import { afterEach, describe, expect, test } from 'bun:test'
import {
  PROMPT_CACHING_SCOPE_BETA_HEADER,
  STRUCTURED_OUTPUTS_BETA_HEADER,
} from '../constants/betas.js'
import {
  clearBetasCaches,
  getModelBetas,
  modelSupportsStructuredOutputs,
} from './betas.js'

describe('betas provider overrides', () => {
  afterEach(() => {
    delete process.env.MYCODE_DISABLE_EXPERIMENTAL_BETAS
    delete process.env.ANTHROPIC_API_KEY
    clearBetasCaches()
  })

  test('respects explicit provider for structured outputs support', () => {
    expect(modelSupportsStructuredOutputs('claude-sonnet-4-6', 'copilot')).toBe(
      false,
    )
    expect(
      modelSupportsStructuredOutputs('claude-sonnet-4-6', 'firstParty'),
    ).toBe(true)
  })

  test('respects explicit provider when building model betas', () => {
    process.env.ANTHROPIC_API_KEY = 'test-key'

    const copilotBetas = getModelBetas('claude-sonnet-4-6', 'copilot')
    const firstPartyBetas = getModelBetas('claude-sonnet-4-6', 'firstParty')

    expect(copilotBetas).not.toContain(PROMPT_CACHING_SCOPE_BETA_HEADER)
    expect(copilotBetas).not.toContain(STRUCTURED_OUTPUTS_BETA_HEADER)

    expect(firstPartyBetas).toContain(PROMPT_CACHING_SCOPE_BETA_HEADER)
  })
})
