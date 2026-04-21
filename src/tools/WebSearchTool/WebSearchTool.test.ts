import { describe, expect, test } from 'bun:test'
import {
  getWebSearchAnalysisRoute,
  isWebSearchEnabledForRoute,
} from './WebSearchTool.js'
import { mkdtempSync, rmSync } from 'fs'
import { setAPIProviderOverride } from '../../utils/model/providers.js'
import { updateSettingsForSource } from '../../utils/settings/settings.js'

describe('WebSearchTool route selection', () => {
  test('enables web search when analysis task is routed to firstParty', () => {
    const tempConfigDir = mkdtempSync('/tmp/mycode-websearch-')
    const originalConfigDir = process.env.MYCODE_CONFIG_DIR
    process.env.MYCODE_CONFIG_DIR = tempConfigDir
    process.env.ANTHROPIC_API_KEY = 'test-key'
    setAPIProviderOverride('copilot')

    updateSettingsForSource('userSettings', {
      modelConfig: {
        analysis: {
          provider: 'firstParty',
          model: 'claude-3-7-sonnet-20250219',
        },
      },
    })

    try {
      const route = getWebSearchAnalysisRoute()
      expect(route.provider).toBe('firstParty')
      expect(route.model).toBe('claude-3-7-sonnet-20250219')
      expect(isWebSearchEnabledForRoute(route)).toBe(true)
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
