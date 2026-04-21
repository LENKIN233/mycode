import { describe, expect, test } from 'bun:test'
import { mkdtempSync, rmSync } from 'fs'
import { setAPIProviderOverride } from '../utils/model/providers.js'
import { updateSettingsForSource } from '../utils/settings/settings.js'
import { getMemorySelectionRoute } from './findRelevantMemories.js'

describe('getMemorySelectionRoute', () => {
  test('uses the memory task route even when the default provider is copilot', () => {
    const tempConfigDir = mkdtempSync('/tmp/mycode-memroute-')
    const originalConfigDir = process.env.MYCODE_CONFIG_DIR
    setAPIProviderOverride('copilot')
    process.env.ANTHROPIC_API_KEY = 'test-key'
    process.env.MYCODE_CONFIG_DIR = tempConfigDir

    updateSettingsForSource('userSettings', {
      modelConfig: {
        memory: {
          provider: 'firstParty',
          model: 'claude-3-7-sonnet-20250219',
        },
      },
    })

    try {
      expect(getMemorySelectionRoute()).toEqual({
        provider: 'firstParty',
        model: 'claude-3-7-sonnet-20250219',
        isOverridden: true,
        tier: 'medium',
      })
    } finally {
      if (originalConfigDir === undefined) {
        delete process.env.MYCODE_CONFIG_DIR
      } else {
        process.env.MYCODE_CONFIG_DIR = originalConfigDir
      }
      delete process.env.ANTHROPIC_API_KEY
      setAPIProviderOverride(null)
      rmSync(tempConfigDir, { recursive: true, force: true })
    }
  })
})
