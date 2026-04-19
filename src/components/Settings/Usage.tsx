import React from 'react'
import { Box, Text } from '../../ink.js'
import { ConfigurableShortcutHint } from '../ConfigurableShortcutHint.js'
import { Byline } from '../design-system/Byline.js'
import {
  formatCost,
  formatSourceUsage,
  getModelUsage,
  getTotalAPIDuration,
  getTotalCost,
  getTotalDuration,
  getTotalLinesAdded,
  getTotalLinesRemoved,
  getTotalModelRequests,
  hasUnknownModelCost,
} from '../../usage-tracker.js'
import { formatDuration, formatNumber } from '../../utils/format.js'
import { getCanonicalName } from '../../utils/model/model.js'
import {
  getCurrentSelectableProvider,
  getExplicitProviderSelection,
  PROVIDER_LABELS,
} from '../../utils/model/providerSelection.js'
import { getTaskRoute } from '../../utils/model/taskModels.js'

function formatSessionCost(): string {
  if (hasUnknownModelCost()) {
    return 'Tracked, but some models do not have local cost metadata'
  }

  return formatCost(getTotalCost(), 4)
}

function getUsageRouteRows(): Array<{ label: string; provider: string; model: string }> {
  return [
    ['Main loop', 'mainLoop'],
    ['Title', 'title'],
    ['Summary', 'summary'],
    ['Hooks', 'hooks'],
  ].map(([label, taskCategory]) => {
    const route = getTaskRoute(taskCategory as 'mainLoop' | 'title' | 'summary' | 'hooks')
    return {
      label,
      provider: PROVIDER_LABELS[route.provider === 'firstParty' ? 'firstParty' : 'copilot'],
      model: route.model,
    }
  })
}

function getModelUsageRows(): Array<{ name: string; usage: ReturnType<typeof getModelUsage>[string] }> {
  return Object.entries(getModelUsage())
    .sort(([, left], [, right]) => {
      const requestDelta = (right.requestCount ?? 0) - (left.requestCount ?? 0)
      if (requestDelta !== 0) {
        return requestDelta
      }
      return right.outputTokens - left.outputTokens
    })
    .slice(0, 5)
    .map(([model, usage]) => ({
      name: getCanonicalName(model),
      usage,
    }))
}

export function Usage(): React.ReactNode {
  const totalRequests = getTotalModelRequests()
  const explicitProvider = getExplicitProviderSelection()
  const currentProvider = getCurrentSelectableProvider()
  const sourceUsageLines = formatSourceUsage()
    .split('\n')
    .slice(1)
    .filter(Boolean)
  const modelUsageRows = getModelUsageRows()
  const routeRows = getUsageRouteRows()

  return (
    <Box flexDirection="column" gap={1}>
      <Box flexDirection="column">
        <Text bold>Provider and usage</Text>
        <Text>
          Default provider:{' '}
          {explicitProvider
            ? PROVIDER_LABELS[explicitProvider]
            : `Not pinned yet (fallback: ${PROVIDER_LABELS[currentProvider]})`}
        </Text>
        <Text dimColor>
          Use `/provider` to change the default and `/model-config` to route each task type.
        </Text>
      </Box>

      <Box flexDirection="column">
        <Text bold>Task routes</Text>
        {routeRows.map(route => (
          <Text key={route.label}>
            {route.label}: {route.provider} · {route.model}
          </Text>
        ))}
      </Box>

      <Box flexDirection="column">
        <Text bold>Session totals</Text>
        <Text>Requests: {Number.isInteger(totalRequests) ? formatNumber(totalRequests) : totalRequests.toFixed(2)}</Text>
        <Text>Tracked cost: {formatSessionCost()}</Text>
        <Text>API time: {formatDuration(getTotalAPIDuration())}</Text>
        <Text>Wall time: {formatDuration(getTotalDuration())}</Text>
        <Text>
          Code changes: {getTotalLinesAdded()} added, {getTotalLinesRemoved()} removed
        </Text>
      </Box>

      {modelUsageRows.length > 0 ? (
        <Box flexDirection="column">
          <Text bold>Top models this session</Text>
          {modelUsageRows.map(({ name, usage }, index) => (
            <Text key={`${name}-${index}`}>
              {name}: {(usage.requestCount ?? 0)} req · {formatNumber(usage.inputTokens)} in · {formatNumber(usage.outputTokens)} out
            </Text>
          ))}
        </Box>
      ) : (
        <Text dimColor>No model requests recorded yet in this session.</Text>
      )}

      {sourceUsageLines.length > 0 && (
        <Box flexDirection="column">
          <Text bold>Requests by source</Text>
          {sourceUsageLines.map(line => (
            <Text key={line} dimColor>
              {line}
            </Text>
          ))}
        </Box>
      )}

      <Text dimColor>
        <Byline>
          <Text>/usage shows the full request breakdown in the transcript.</Text>
          <ConfigurableShortcutHint action="confirm:no" context="Settings" fallback="Esc" description="cancel" />
        </Byline>
      </Text>
    </Box>
  )
}
