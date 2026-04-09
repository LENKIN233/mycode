/**
 * Smart tool pool selection based on agent role and task context.
 *
 * Instead of giving all tools to every agent and filtering at validate-time,
 * this module prunes the tool pool at assembly-time based on the agent's
 * declared role and the current task context.
 *
 * Benefits:
 * - Fewer tools in the prompt → less noise for the model → better tool selection
 * - Smaller API payload → faster TTFT → lower cost
 * - Role-appropriate tools → fewer permission denials
 *
 * This module does NOT remove tools the agent might legitimately need.
 * It only removes tools that are clearly irrelevant to the agent's role.
 *
 * Integration point: Called from assembleToolPool() in tools.ts.
 */

import type { Tool, Tools } from '../../Tool.js'
import { logEvent } from '../analytics/index.js'

/**
 * Role-based tool profiles. Each profile defines tools that are
 * EXCLUDED for that role. Tools not listed are included by default.
 *
 * Conservative approach: only exclude tools that are clearly irrelevant.
 * If in doubt, keep the tool available.
 */
const ROLE_EXCLUSIONS: Record<string, Set<string>> = {
  // Read-only exploration agent — no write tools
  'Explore': new Set([
    'Edit',
    'Write',
    'NotebookEdit',
    'MultiEdit',
    'TodoWrite',
    'TaskCreate',
    'TaskUpdate',
    'EnterPlanMode',
    'ExitPlanMode',
    'ExitPlanModeV2',
    'TeamCreate',
    'TeamDelete',
    'Sleep',
    'CronCreate',
    'CronDelete',
    'PushNotification',
    'SubscribePR',
    'EnterWorktree',
    'ExitWorktree',
    'Config',
    'SuggestBackgroundPR',
  ]),

  // Plan agent — read-only + no agent spawning
  'Plan': new Set([
    'Edit',
    'Write',
    'NotebookEdit',
    'MultiEdit',
    'Agent',
    'TodoWrite',
    'TaskCreate',
    'TaskUpdate',
    'EnterPlanMode',
    'ExitPlanMode',
    'ExitPlanModeV2',
    'TeamCreate',
    'TeamDelete',
    'Sleep',
    'CronCreate',
    'CronDelete',
    'PushNotification',
    'SubscribePR',
    'EnterWorktree',
    'ExitWorktree',
    'Config',
    'SuggestBackgroundPR',
  ]),

  // Verification agent — read-only in project, can write to /tmp
  'verification': new Set([
    'Edit',
    'Write',
    'NotebookEdit',
    'MultiEdit',
    'Agent',
    'TodoWrite',
    'TaskCreate',
    'TaskUpdate',
    'EnterPlanMode',
    'ExitPlanMode',
    'ExitPlanModeV2',
    'TeamCreate',
    'TeamDelete',
    'Sleep',
    'CronCreate',
    'CronDelete',
    'PushNotification',
    'SubscribePR',
    'EnterWorktree',
    'ExitWorktree',
    'Config',
    'SuggestBackgroundPR',
  ]),
}

/**
 * Context-based tool relevance hints.
 * When certain conditions are true, specific tools are boosted or deprioritized.
 */
type ContextHint = {
  /** Condition description for logging */
  description: string
  /** Check if this hint applies */
  check: (context: ToolSelectionContext) => boolean
  /** Tools to exclude when this hint applies */
  exclude: string[]
}

export type ToolSelectionContext = {
  /** Agent type / role name */
  agentType?: string
  /** Whether any MCP servers are connected */
  hasMcpServers: boolean
  /** Number of tools currently in the pool */
  totalToolCount: number
  /** Whether this is a subagent */
  isSubagent: boolean
  /** Whether coordinator mode is active */
  isCoordinatorMode: boolean
}

const CONTEXT_HINTS: ContextHint[] = [
  {
    description: 'No MCP servers connected',
    check: ctx => !ctx.hasMcpServers,
    exclude: ['ListMcpResources', 'ReadMcpResource'],
  },
  {
    description: 'Subagent should not spawn more agents (non-coordinator)',
    check: ctx => ctx.isSubagent && !ctx.isCoordinatorMode,
    // Note: fork-subagent and coordinator handle this differently.
    // We only exclude TeamCreate/Delete for non-coordinator subagents.
    exclude: ['TeamCreate', 'TeamDelete'],
  },
]

/**
 * Filter tools based on agent role and context.
 * Returns a new array — does not mutate the input.
 *
 * @param tools - The full tool pool to filter
 * @param context - Current selection context
 * @returns Filtered tools appropriate for the role
 */
export function selectToolsForRole(
  tools: Tools,
  context: ToolSelectionContext,
): Tools {
  const exclusions = new Set<string>()

  // Apply role-based exclusions
  if (context.agentType && ROLE_EXCLUSIONS[context.agentType]) {
    for (const toolName of ROLE_EXCLUSIONS[context.agentType]!) {
      exclusions.add(toolName)
    }
  }

  // Apply context-based hints
  for (const hint of CONTEXT_HINTS) {
    if (hint.check(context)) {
      for (const toolName of hint.exclude) {
        exclusions.add(toolName)
      }
    }
  }

  if (exclusions.size === 0) return tools

  const filtered = tools.filter(tool => !exclusions.has(tool.name))

  const removedCount = tools.length - filtered.length
  if (removedCount > 0) {
    logEvent('tengu_smart_tool_selection', {
      removedCount,
      remainingCount: filtered.length,
    })
  }

  return filtered
}

/**
 * Estimate token savings from tool pool pruning.
 * Each tool definition is roughly 150-300 tokens in the prompt.
 */
export function estimateTokenSavings(removedCount: number): number {
  const AVG_TOKENS_PER_TOOL = 200
  return removedCount * AVG_TOKENS_PER_TOOL
}
