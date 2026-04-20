import { describe, expect, test } from 'bun:test'
import { buildDesignStarterHtml } from './starter.js'
import {
  getDesignArtifactPreviewImagePath,
  inferDesignTemplateFromArtifactContent,
  verifyDesignArtifactContent,
} from './verify.js'

describe('verifyDesignArtifactContent', () => {
  test('accepts canvas starter output', () => {
    const html = buildDesignStarterHtml(
      'Design Artifact',
      'Explore settings directions',
      '2026-04-20 12:00',
      'canvas',
    )
    expect(verifyDesignArtifactContent(html, 'canvas')).toEqual({
      ok: true,
      warnings: [],
    })
  })

  test('flags missing deck affordances', () => {
    const result = verifyDesignArtifactContent(
      '<!doctype html><html><head><title>x</title></head><body>nope</body></html>',
      'deck',
    )

    expect(result.ok).toBe(false)
    expect(result.warnings.some(w => w.includes('slide counter'))).toBe(true)
  })

  test('infers template from artifact content', () => {
    const deckHtml = buildDesignStarterHtml(
      'Deck',
      'Kickoff deck',
      '2026-04-20 12:00',
      'deck',
    )
    const prototypeHtml = buildDesignStarterHtml(
      'Prototype',
      'Signup flow',
      '2026-04-20 12:00',
      'prototype',
    )

    expect(inferDesignTemplateFromArtifactContent(deckHtml)).toBe('deck')
    expect(inferDesignTemplateFromArtifactContent(prototypeHtml)).toBe(
      'prototype',
    )
  })

  test('derives preview image path next to artifact', () => {
    expect(
      getDesignArtifactPreviewImagePath(
        '/tmp/artifacts/claude-design/sample-v2.html',
      ),
    ).toBe('/tmp/artifacts/claude-design/sample-v2.preview.png')
  })
})
