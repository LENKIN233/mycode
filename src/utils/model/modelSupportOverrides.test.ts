import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'fs'
import { setAPIProviderOverride } from './providers.js'
import { updateSettingsForSource } from '../settings/settings.js'
import { resolveProviderForModelSupport } from './modelSupportOverrides.js'

describe('resolveProviderForModelSupport', () => {
  test('falls back to mainLoop route for unknown model names', () => {
    const tempConfigDir = mkdtempSync('/tmp/mycode-model-support-')
    const originalConfigDir = process.env.MYCODE_CONFIG_DIR
    process.env.MYCODE_CONFIG_DIR = tempConfigDir
    setAPIProviderOverride('copilot')

    updateSettingsForSource('userSettings', {
      modelConfig: {
        mainLoop: {
          provider: 'firstParty',
          model: 'custom-project-model',
        },
      },
    })

    try {
      expect(resolveProviderForModelSupport('custom-project-model')).toBe(
        'firstParty',
      )
    } finally {
      if (originalConfigDir === undefined) {
        delete process.env.MYCODE_CONFIG_DIR
      } else {
        process.env.MYCODE_CONFIG_DIR = originalConfigDir
      }
      setAPIProviderOverride(null)
      rmSync(tempConfigDir, { recursive: true, force: true })
    }
  })

  test('prefers model-prefix inference for known copilot models', () => {
    expect(resolveProviderForModelSupport('gpt-5-mini')).toBe('copilot')
  })
})
