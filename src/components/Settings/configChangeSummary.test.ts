import { afterEach, describe, expect, test } from 'bun:test'
import stripAnsi from 'strip-ansi'
import { buildConfigChangeSummary } from './configChangeSummary.js'
import { normalizeApiKeyForConfig } from '../../utils/authPortable.js'
import type { GlobalConfig } from '../../utils/config.js'
import type { SettingsJson } from '../../utils/settings/types.js'

const ORIGINAL_ENV = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  COO_RUNNING_ON_HOMESPACE: process.env.COO_RUNNING_ON_HOMESPACE,
  USER_TYPE: process.env.USER_TYPE,
}

afterEach(() => {
  process.env.ANTHROPIC_API_KEY = ORIGINAL_ENV.ANTHROPIC_API_KEY
  process.env.COO_RUNNING_ON_HOMESPACE = ORIGINAL_ENV.COO_RUNNING_ON_HOMESPACE
  process.env.USER_TYPE = ORIGINAL_ENV.USER_TYPE
})

function createConfig(overrides: Partial<GlobalConfig> = {}): GlobalConfig {
  return {
    autoCompactEnabled: false,
    autoConnectIde: false,
    autoInstallIdeExtension: true,
    copyFullResponse: false,
    copyOnSelect: false,
    customApiKeyResponses: {
      approved: [],
      rejected: [],
    },
    diffTool: 'auto',
    editorMode: 'vi',
    preferredNotifChannel: 'auto',
    remoteControlAtStartup: false,
    respectGitignore: true,
    showStatusInTerminalTab: false,
    showTurnDuration: false,
    terminalProgressBarEnabled: false,
    theme: 'dark',
    ...overrides,
  } as GlobalConfig
}

function stripSummary(summary: string[]): string[] {
  return summary.map(line => stripAnsi(line))
}

describe('configChangeSummary', () => {
  test('summarizes direct changes and config diffs', () => {
    const initialConfig = createConfig()
    const globalConfig = createConfig({
      autoCompactEnabled: true,
      preferredNotifChannel: 'kitty',
      theme: 'light',
    })

    const summary = stripSummary(
      buildConfigChangeSummary({
        changes: { verbose: true },
        currentLanguage: 'zh-CN',
        currentOutputStyle: 'stream-json',
        globalConfig,
        initialConfig,
        initialLanguage: undefined,
        initialOutputStyle: 'text',
        initialSettingsData: { autoUpdatesChannel: 'latest' } as SettingsJson,
        settingsData: { autoUpdatesChannel: 'stable' } as SettingsJson,
      }),
    )

    expect(summary).toContain('Set verbose to true')
    expect(summary).toContain('Set theme to light')
    expect(summary).toContain('Set notifications to kitty')
    expect(summary).toContain('Set output style to stream-json')
    expect(summary).toContain('Set response language to zh-CN')
    expect(summary).toContain('Enabled auto-compact')
    expect(summary).toContain('Set auto-update channel to stable')
  })

  test('records custom API key enablement outside homespace', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz'
    delete process.env.USER_TYPE
    delete process.env.COO_RUNNING_ON_HOMESPACE
    const normalizedKey = normalizeApiKeyForConfig(process.env.ANTHROPIC_API_KEY)

    const initialConfig = createConfig()
    const globalConfig = createConfig({
      customApiKeyResponses: {
        approved: [normalizedKey],
        rejected: [],
      },
    })

    const summary = stripSummary(
      buildConfigChangeSummary({
        changes: {},
        currentLanguage: undefined,
        currentOutputStyle: 'text',
        globalConfig,
        initialConfig,
        initialLanguage: undefined,
        initialOutputStyle: 'text',
        initialSettingsData: undefined,
        settingsData: undefined,
      }),
    )

    expect(summary).toContain('Enabled custom API key')
  })

  test('ignores API key summary on homespace', () => {
    process.env.ANTHROPIC_API_KEY = 'sk-ant-api03-abcdefghijklmnopqrstuvwxyz'
    process.env.USER_TYPE = 'ant'
    process.env.COO_RUNNING_ON_HOMESPACE = '1'
    const normalizedKey = normalizeApiKeyForConfig(process.env.ANTHROPIC_API_KEY)

    const initialConfig = createConfig()
    const globalConfig = createConfig({
      customApiKeyResponses: {
        approved: [normalizedKey],
        rejected: [],
      },
    })

    const summary = stripSummary(
      buildConfigChangeSummary({
        changes: {},
        currentLanguage: undefined,
        currentOutputStyle: 'text',
        globalConfig,
        initialConfig,
        initialLanguage: undefined,
        initialOutputStyle: 'text',
        initialSettingsData: undefined,
        settingsData: undefined,
      }),
    )

    expect(summary).not.toContain('Enabled custom API key')
    expect(summary).not.toContain('Disabled custom API key')
  })
})
