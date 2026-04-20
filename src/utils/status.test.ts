import { afterEach, describe, expect, test } from 'bun:test'
import { buildAPIProviderProperties } from './status.js'

const ORIGINAL_ENV = {
  ANTHROPIC_BASE_URL: process.env.ANTHROPIC_BASE_URL,
  MYCODE_API_PROVIDER: process.env.MYCODE_API_PROVIDER,
}

afterEach(() => {
  process.env.ANTHROPIC_BASE_URL = ORIGINAL_ENV.ANTHROPIC_BASE_URL
  process.env.MYCODE_API_PROVIDER = ORIGINAL_ENV.MYCODE_API_PROVIDER
})

describe('buildAPIProviderProperties', () => {
  test('shows Manual API provider even without custom base URL', () => {
    process.env.MYCODE_API_PROVIDER = 'firstParty'
    delete process.env.ANTHROPIC_BASE_URL

    expect(buildAPIProviderProperties()).toContainEqual({
      label: 'API provider',
      value: 'Manual API / Compatible Endpoint',
    })
  })

  test('shows Manual API provider plus custom base URL', () => {
    process.env.MYCODE_API_PROVIDER = 'firstParty'
    process.env.ANTHROPIC_BASE_URL = 'https://example.invalid/v1'

    const properties = buildAPIProviderProperties()

    expect(properties).toContainEqual({
      label: 'API provider',
      value: 'Manual API / Compatible Endpoint',
    })
    expect(properties).toContainEqual({
      label: 'Anthropic base URL',
      value: 'https://example.invalid/v1',
    })
  })

  test('shows Copilot provider label', () => {
    process.env.MYCODE_API_PROVIDER = 'copilot'

    expect(buildAPIProviderProperties()[0]).toEqual({
      label: 'API provider',
      value: 'GitHub Copilot',
    })
  })
})
