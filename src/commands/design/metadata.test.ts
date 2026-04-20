import { describe, expect, test } from 'bun:test'
import {
  getDesignArtifactMetaPath,
  getRevisionBasePath,
} from './metadata.js'

describe('getDesignArtifactMetaPath', () => {
  test('appends sidecar suffix next to artifact', () => {
    expect(
      getDesignArtifactMetaPath('artifacts/claude-design/settings-v2.html'),
    ).toBe('artifacts/claude-design/settings-v2.html.meta.json')
  })
})

describe('getRevisionBasePath', () => {
  test('normalizes versioned artifact names to base path', () => {
    expect(
      getRevisionBasePath('artifacts/claude-design/settings-v4.html'),
    ).toBe('artifacts/claude-design/settings.html')
  })

  test('leaves base artifact path untouched', () => {
    expect(getRevisionBasePath('artifacts/claude-design/settings.html')).toBe(
      'artifacts/claude-design/settings.html',
    )
  })
})
