import { readFile } from 'fs/promises'
import type { DesignTemplate } from './helpers.js'

export type DesignVerificationResult = {
  ok: boolean
  warnings: string[]
}

export function verifyDesignArtifactContent(
  html: string,
  template: DesignTemplate,
): DesignVerificationResult {
  const warnings: string[] = []

  const required = ['<!doctype html>', '<html', '<body', '<title>']
  for (const token of required) {
    if (!html.toLowerCase().includes(token)) {
      warnings.push(`Missing required HTML token: ${token}`)
    }
  }

  if (!html.includes('data-screen-label')) {
    warnings.push('Missing data-screen-label markers for major screens/slides')
  }

  if (!html.includes('localStorage')) {
    warnings.push('Missing localStorage persistence for starter state')
  }

  if (!html.includes('Tweaks')) {
    warnings.push('Missing visible Tweaks section')
  }

  if (template === 'deck' && !html.includes('slide-counter')) {
    warnings.push('Deck starter is missing slide counter wiring')
  }

  if (template === 'prototype' && !html.includes('Primary Screen')) {
    warnings.push('Prototype starter is missing primary-screen placeholder')
  }

  if (template === 'canvas' && !html.includes('Design directions')) {
    warnings.push('Canvas starter is missing design-direction comparison section')
  }

  return {
    ok: warnings.length === 0,
    warnings,
  }
}

export function inferDesignTemplateFromArtifactContent(
  html: string,
): DesignTemplate {
  if (html.includes('slide-counter') || html.includes('Deck starter')) {
    return 'deck'
  }

  if (
    html.includes('Primary Screen') ||
    html.includes('Prototype starter') ||
    html.includes('Flow framing')
  ) {
    return 'prototype'
  }

  return 'canvas'
}

export async function verifyDesignArtifactFile(
  path: string,
  template: DesignTemplate,
): Promise<DesignVerificationResult> {
  const html = await readFile(path, 'utf-8')
  return verifyDesignArtifactContent(html, template)
}

export async function inferDesignTemplateFromArtifactFile(
  path: string,
): Promise<DesignTemplate> {
  const html = await readFile(path, 'utf-8')
  return inferDesignTemplateFromArtifactContent(html)
}
