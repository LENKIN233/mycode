import { describe, expect, test } from 'bun:test'
import { parseModelsResponse } from './models.js'

describe('parseModelsResponse', () => {
  test('parses Anthropic-style data wrapper', () => {
    const models = parseModelsResponse({
      data: [
        { id: 'claude-sonnet-4-6', display_name: 'Claude Sonnet 4.6' },
        { id: 'claude-opus-4-6' },
      ],
    })

    expect([...models.keys()]).toEqual([
      'claude-sonnet-4-6',
      'claude-opus-4-6',
    ])
    expect(models.get('claude-sonnet-4-6')?.displayName).toBe(
      'Claude Sonnet 4.6',
    )
  })

  test('parses plain array responses and ignores invalid items', () => {
    const models = parseModelsResponse([
      { id: 'openrouter/model-a', name: 'Model A' },
      { nope: true },
      null,
    ])

    expect([...models.keys()]).toEqual(['openrouter/model-a'])
    expect(models.get('openrouter/model-a')?.displayName).toBe('Model A')
  })
})
