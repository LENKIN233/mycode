import type { BetaUsage as Usage } from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs'
import chalk from 'chalk'
import {
  addToTotalCostState,
  addToTotalLinesChanged,
  getCostCounter,
  getTotalModelRequests,
  getModelUsage,
  getSdkBetas,
  getSessionId,
  getSourceRequestCounts,
  getTokenCounter,
  getTotalAPIDuration,
  getTotalAPIDurationWithoutRetries,
  getTotalCacheCreationInputTokens,
  getTotalCacheReadInputTokens,
  getTotalCostUSD,
  getTotalDuration,
  getTotalInputTokens,
  getTotalLinesAdded,
  getTotalLinesRemoved,
  getTotalOutputTokens,
  getTotalToolDuration,
  getTotalWebSearchRequests,
  getUsageForModel,
  hasUnknownModelCost,
  resetUsageState,
  resetStateForTests,
  setUsageStateForRestore,
  setHasUnknownModelCost,
} from './bootstrap/state.js'
import type { ModelUsage } from './entrypoints/agentSdkTypes.js'
import {
  type AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  logEvent,
} from './services/analytics/index.js'
import { getAdvisorUsage } from './utils/advisor.js'
import {
  getCurrentProjectConfig,
  saveCurrentProjectConfig,
} from './utils/config.js'
import {
  getContextWindowForModel,
  getModelMaxOutputTokens,
} from './utils/context.js'
import { isFastModeEnabled } from './utils/fastMode.js'
import { formatDuration, formatNumber } from './utils/format.js'
import type { FpsMetrics } from './utils/fpsTracker.js'
import { getCanonicalName } from './utils/model/model.js'
export {
  getTotalCostUSD as getTotalCost,
  getTotalModelRequests,
  getTotalDuration,
  getTotalAPIDuration,
  getTotalAPIDurationWithoutRetries,
  addToTotalLinesChanged,
  getTotalLinesAdded,
  getTotalLinesRemoved,
  getTotalInputTokens,
  getTotalOutputTokens,
  getTotalCacheReadInputTokens,
  getTotalCacheCreationInputTokens,
  getTotalWebSearchRequests,
  formatCost,
  hasUnknownModelCost,
  resetStateForTests,
  resetUsageState,
  setHasUnknownModelCost,
  getModelUsage,
  getUsageForModel,
}

type StoredSessionUsageState = {
  totalCostUSD: number
  totalModelRequests: number
  sourceRequestCounts?: Record<string, { count: number; units: number; model: string }>
  totalAPIDuration: number
  totalAPIDurationWithoutRetries: number
  totalToolDuration: number
  totalLinesAdded: number
  totalLinesRemoved: number
  lastDuration: number | undefined
  modelUsage: { [modelName: string]: ModelUsage } | undefined
}

/**
 * Gets stored usage state from project config for a specific session.
 * Returns usage data if the session ID matches, or undefined otherwise.
 * Use this to read usage BEFORE overwriting with saveCurrentSessionUsage().
 */
export function getStoredSessionUsage(
  sessionId: string,
): StoredSessionUsageState | undefined {
  const projectConfig = getCurrentProjectConfig()

  // Try per-session storage first
  const perSession = projectConfig.sessionUsage?.[sessionId]
  if (perSession) {
    let modelUsage: { [modelName: string]: ModelUsage } | undefined
    if (perSession.modelUsage) {
      modelUsage = Object.fromEntries(
        Object.entries(perSession.modelUsage).map(([model, usage]) => [
          model,
          {
            ...usage,
            contextWindow: getContextWindowForModel(model, getSdkBetas()),
            maxOutputTokens: getModelMaxOutputTokens(model).default,
          },
        ]),
      )
    }
    return {
      totalCostUSD: perSession.totalCostUSD,
      totalModelRequests: perSession.totalModelRequests,
      sourceRequestCounts: perSession.sourceRequestCounts,
      totalAPIDuration: perSession.totalAPIDuration,
      totalAPIDurationWithoutRetries: perSession.totalAPIDurationWithoutRetries,
      totalToolDuration: perSession.totalToolDuration,
      totalLinesAdded: perSession.totalLinesAdded,
      totalLinesRemoved: perSession.totalLinesRemoved,
      lastDuration: perSession.lastDuration,
      modelUsage,
    }
  }

  // Fallback: legacy single-session storage.
  // TODO: Remove after legacy last* writers have been fully retired.
  if (projectConfig.lastSessionId !== sessionId) {
    return undefined
  }

  // Build model usage with context windows
  let modelUsage: { [modelName: string]: ModelUsage } | undefined
  if (projectConfig.lastModelUsage) {
    modelUsage = Object.fromEntries(
      Object.entries(projectConfig.lastModelUsage).map(([model, usage]) => [
        model,
        {
          ...usage,
          contextWindow: getContextWindowForModel(model, getSdkBetas()),
          maxOutputTokens: getModelMaxOutputTokens(model).default,
        },
      ]),
    )
  }

  return {
    totalCostUSD: projectConfig.lastCost ?? 0,
    totalModelRequests: projectConfig.lastTotalModelRequests ?? 0,
    sourceRequestCounts: projectConfig.lastSourceRequestCounts,
    totalAPIDuration: projectConfig.lastAPIDuration ?? 0,
    totalAPIDurationWithoutRetries:
      projectConfig.lastAPIDurationWithoutRetries ?? 0,
    totalToolDuration: projectConfig.lastToolDuration ?? 0,
    totalLinesAdded: projectConfig.lastLinesAdded ?? 0,
    totalLinesRemoved: projectConfig.lastLinesRemoved ?? 0,
    lastDuration: projectConfig.lastDuration,
    modelUsage,
  }
}

/**
 * Restores usage state from project config when resuming a session.
 * Only restores if the session ID matches the last saved session.
 * @returns true if usage state was restored, false otherwise
 */
export function restoreSessionUsageForSession(sessionId: string): boolean {
  const data = getStoredSessionUsage(sessionId)
  if (!data) {
    return false
  }
  setUsageStateForRestore(data)
  return true
}

/**
 * Saves the current session usage to project config.
 * Call this before switching sessions to avoid losing accumulated usage.
 */
export function saveCurrentSessionUsage(fpsMetrics?: FpsMetrics): void {
  const sessionId = getSessionId()
  const modelUsageSnapshot = Object.fromEntries(
    Object.entries(getModelUsage()).map(([model, usage]) => [
      model,
      {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cacheReadInputTokens: usage.cacheReadInputTokens,
        cacheCreationInputTokens: usage.cacheCreationInputTokens,
        webSearchRequests: usage.webSearchRequests,
        costUSD: usage.costUSD,
      },
    ]),
  )

  const sessionData = {
    totalCostUSD: getTotalCostUSD(),
    totalModelRequests: getTotalModelRequests(),
    sourceRequestCounts: getSourceRequestCounts(),
    totalAPIDuration: getTotalAPIDuration(),
    totalAPIDurationWithoutRetries: getTotalAPIDurationWithoutRetries(),
    totalToolDuration: getTotalToolDuration(),
    totalLinesAdded: getTotalLinesAdded(),
    totalLinesRemoved: getTotalLinesRemoved(),
    lastDuration: getTotalDuration(),
    modelUsage: modelUsageSnapshot,
  }

  saveCurrentProjectConfig(current => {
    // Keep up to 20 sessions to avoid unbounded growth
    const existingUsage = current.sessionUsage ?? {}
    const updatedUsage = { ...existingUsage, [sessionId]: sessionData }
    const keys = Object.keys(updatedUsage)
    if (keys.length > 20) {
      // Remove oldest entries (first keys in insertion order)
      for (const key of keys.slice(0, keys.length - 20)) {
        delete updatedUsage[key]
      }
    }

    return {
      ...current,
      // Legacy fields are now mostly read-only compatibility paths.
      // Keep only values not yet represented in sessionUsage.
      lastFpsAverage: fpsMetrics?.averageFps,
      lastFpsLow1Pct: fpsMetrics?.low1PctFps,
      lastSessionId: sessionId,
      sessionUsage: updatedUsage,
    }
  })
}

/**
 * Persists request usage progress during an active session.
 * Keeps session resume data in sync even before process exit.
 */
export function saveSessionUsageSnapshot(): void {
  const sessionId = getSessionId()
  saveCurrentProjectConfig(current => {
    const existingUsage = current.sessionUsage ?? {}
    const existingSession = existingUsage[sessionId]
    return {
      ...current,
      lastSessionId: sessionId,
      sessionUsage: {
        ...existingUsage,
        [sessionId]: {
          ...(existingSession ?? {
            totalCostUSD: 0,
            totalAPIDuration: 0,
            totalAPIDurationWithoutRetries: 0,
            totalToolDuration: 0,
            totalLinesAdded: 0,
            totalLinesRemoved: 0,
          }),
          totalModelRequests: getTotalModelRequests(),
          sourceRequestCounts: getSourceRequestCounts(),
        },
      },
    }
  })
}

function formatCost(cost: number, maxDecimalPlaces: number = 4): string {
  return `$${cost > 0.5 ? round(cost, 100).toFixed(2) : cost.toFixed(maxDecimalPlaces)}`
}

function formatModelUsage(): string {
  const modelUsageMap = getModelUsage()
  if (Object.keys(modelUsageMap).length === 0) {
    return 'Usage:                 0 input, 0 output, 0 cache read, 0 cache write'
  }

  // Accumulate usage by short name
  const usageByShortName: { [shortName: string]: ModelUsage } = {}
  for (const [model, usage] of Object.entries(modelUsageMap)) {
    const shortName = getCanonicalName(model)
    if (!usageByShortName[shortName]) {
      usageByShortName[shortName] = {
        inputTokens: 0,
        outputTokens: 0,
        cacheReadInputTokens: 0,
        cacheCreationInputTokens: 0,
        webSearchRequests: 0,
        costUSD: 0,
        requestCount: 0,
        contextWindow: 0,
        maxOutputTokens: 0,
      }
    }
    const accumulated = usageByShortName[shortName]
    accumulated.requestCount += usage.requestCount ?? 0
    accumulated.inputTokens += usage.inputTokens
    accumulated.outputTokens += usage.outputTokens
    accumulated.cacheReadInputTokens += usage.cacheReadInputTokens
    accumulated.cacheCreationInputTokens += usage.cacheCreationInputTokens
    accumulated.webSearchRequests += usage.webSearchRequests
    accumulated.costUSD += usage.costUSD
  }

  let result = 'Usage by model:'
  for (const [shortName, usage] of Object.entries(usageByShortName)) {
    const totalInput = usage.inputTokens + usage.cacheReadInputTokens + usage.cacheCreationInputTokens
    const usageString =
      `  ${usage.requestCount} req, ` +
      `${formatNumber(totalInput)} input (${formatNumber(usage.inputTokens)} new + ${formatNumber(usage.cacheReadInputTokens)} cache read + ${formatNumber(usage.cacheCreationInputTokens)} cache write), ` +
      `${formatNumber(usage.outputTokens)} output` +
      (usage.webSearchRequests > 0
        ? `, ${formatNumber(usage.webSearchRequests)} web search`
        : '')
    result += `\n` + `${shortName}:`.padStart(21) + usageString
  }
  return result
}

export function formatSourceUsage(): string {
  const sources = getSourceRequestCounts()
  const entries = Object.entries(sources)
  if (entries.length === 0) {
    return ''
  }

  // Sort by units descending
  entries.sort((a, b) => b[1].units - a[1].units)

  const maxSourceLen = Math.max(...entries.map(([s]) => s.length), 6)
  let result = 'Requests by source:'
  for (const [source, info] of entries) {
    const unitsStr = info.units === 0 ? 'free' : `${info.units % 1 === 0 ? info.units : info.units.toFixed(2)} units`
    result += `\n  ${source.padEnd(maxSourceLen)}  ${String(info.count).padStart(3)} req  (${unitsStr.padStart(10)})  ${info.model}`
  }
  return result
}

export function formatUsageSummary(): string {
  const modelUsageDisplay = formatModelUsage()
  const sourceUsageDisplay = formatSourceUsage()
  const totalRequests = getTotalModelRequests()
  const requestDisplay = Number.isInteger(totalRequests)
    ? formatNumber(totalRequests)
    : totalRequests.toFixed(2).replace(/\.?0+$/, '')

  return chalk.dim(
    `Total API requests:    ${requestDisplay}\n` +
      `Total duration (API):  ${formatDuration(getTotalAPIDuration())}
Total duration (wall): ${formatDuration(getTotalDuration())}
Total code changes:    ${getTotalLinesAdded()} ${getTotalLinesAdded() === 1 ? 'line' : 'lines'} added, ${getTotalLinesRemoved()} ${getTotalLinesRemoved() === 1 ? 'line' : 'lines'} removed
${modelUsageDisplay}` +
      (sourceUsageDisplay ? `\n${sourceUsageDisplay}` : ''),
  )
}

function round(number: number, precision: number): number {
  return Math.round(number * precision) / precision
}

function addToTotalModelUsage(
  cost: number,
  usage: Usage,
  model: string,
): ModelUsage {
  const modelUsage = getUsageForModel(model) ?? {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadInputTokens: 0,
    cacheCreationInputTokens: 0,
    webSearchRequests: 0,
    costUSD: 0,
    requestCount: 0,
    contextWindow: 0,
    maxOutputTokens: 0,
  }

  modelUsage.requestCount += 1
  modelUsage.inputTokens += usage.input_tokens
  modelUsage.outputTokens += usage.output_tokens
  modelUsage.cacheReadInputTokens += usage.cache_read_input_tokens ?? 0
  modelUsage.cacheCreationInputTokens += usage.cache_creation_input_tokens ?? 0
  modelUsage.webSearchRequests +=
    usage.server_tool_use?.web_search_requests ?? 0
  modelUsage.costUSD += cost
  modelUsage.contextWindow = getContextWindowForModel(model, getSdkBetas())
  modelUsage.maxOutputTokens = getModelMaxOutputTokens(model).default
  return modelUsage
}

export function addToTotalSessionUsage(
  _cost: number,
  usage: Usage,
  model: string,
): number {
  const cost = 0
  const modelUsage = addToTotalModelUsage(cost, usage, model)
  addToTotalCostState(cost, modelUsage, model)

  const attrs =
    isFastModeEnabled() && usage.speed === 'fast'
      ? { model, speed: 'fast' }
      : { model }

  getCostCounter()?.add(cost, attrs)
  getTokenCounter()?.add(usage.input_tokens, { ...attrs, type: 'input' })
  getTokenCounter()?.add(usage.output_tokens, { ...attrs, type: 'output' })
  getTokenCounter()?.add(usage.cache_read_input_tokens ?? 0, {
    ...attrs,
    type: 'cacheRead',
  })
  getTokenCounter()?.add(usage.cache_creation_input_tokens ?? 0, {
    ...attrs,
    type: 'cacheCreation',
  })

  let totalCost = cost
  for (const advisorUsage of getAdvisorUsage(usage)) {
    const advisorCost = 0
    logEvent('tengu_advisor_tool_token_usage', {
      advisor_model:
        advisorUsage.model as AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
      input_tokens: advisorUsage.input_tokens,
      output_tokens: advisorUsage.output_tokens,
      cache_read_input_tokens: advisorUsage.cache_read_input_tokens ?? 0,
      cache_creation_input_tokens:
        advisorUsage.cache_creation_input_tokens ?? 0,
      cost_usd_micros: Math.round(advisorCost * 1_000_000),
    })
    totalCost += addToTotalSessionUsage(
      advisorCost,
      advisorUsage,
      advisorUsage.model,
    )
  }
  return totalCost
}

