import { feature } from 'bun:bundle'
import type { ToolUseContext } from '../../Tool.js'
import type { QuerySource } from '../../constants/querySource.js'
import type { ContextCollapseCommitEntry } from '../../types/logs.js'
import type { Message } from '../../types/message.js'
import { recordContextCollapseCommit, recordContextCollapseSnapshot } from '../../utils/sessionStorage.js'
import { tokenCountWithEstimation } from '../../utils/tokens.js'
import { getEffectiveContextWindowSize } from '../compact/autoCompact.js'
import { extractTextContent, getUserMessageText } from '../../utils/messages.js'
import { projectView } from './operations.js'
import {
  appendCommit,
  getNextCollapseId,
  getStats as getRuntimeStats,
  recordSpawnAttempt,
  resetRuntimeState,
  setSnapshot,
  subscribe,
  type ContextCollapseStats,
} from './store.js'

const PRESERVE_TAIL_MESSAGES = 10
const MIN_COLLAPSE_MESSAGES = 4
const MAX_COLLAPSE_MESSAGES = 12
const PROACTIVE_COLLAPSE_RATIO = 0.72

function messageText(message: Message): string {
  switch (message.type) {
    case 'user':
      return getUserMessageText(message) ?? '[user message]'
    case 'assistant': {
      const text = extractTextContent(message.message.content, '\n').trim()
      return text || '[assistant response]'
    }
    case 'attachment':
      return `[attachment:${message.attachment.type}]`
    case 'system':
      return message.message
    default:
      return '[message]'
  }
}

function summarizeMessages(messages: Message[]): string {
  return messages
    .map(messageText)
    .filter(Boolean)
    .join('\n')
    .slice(0, 1200)
}

function selectCollapseSpan(messages: Message[]): { start: number; end: number } | null {
  const collapsibleCount = Math.min(
    Math.max(messages.length - PRESERVE_TAIL_MESSAGES, 0),
    MAX_COLLAPSE_MESSAGES,
  )

  if (collapsibleCount < MIN_COLLAPSE_MESSAGES) {
    return null
  }

  return {
    start: 0,
    end: collapsibleCount - 1,
  }
}

async function commitCollapse(
  messages: Message[],
  toolUseContext: ToolUseContext,
): Promise<{ messages: Message[]; changed: boolean }> {
  const span = selectCollapseSpan(messages)
  if (!span) {
    recordSpawnAttempt({ committed: false })
    return { messages, changed: false }
  }

  const archived = messages.slice(span.start, span.end + 1)
  if (archived.length < MIN_COLLAPSE_MESSAGES) {
    recordSpawnAttempt({ committed: false })
    return { messages, changed: false }
  }

  const collapseId = getNextCollapseId()
  const summary = summarizeMessages(archived) || 'Earlier context collapsed.'
  const summaryUuid = crypto.randomUUID()
  const summaryContent = `<collapsed id="${collapseId}">${summary}</collapsed>`

  const commit: ContextCollapseCommitEntry = {
    type: 'marble-origami-commit',
    sessionId: toolUseContext.getAppState().sessionId,
    collapseId,
    summaryUuid,
    summaryContent,
    summary,
    firstArchivedUuid: archived[0]!.uuid,
    lastArchivedUuid: archived.at(-1)!.uuid,
  }

  await recordContextCollapseCommit({
    collapseId,
    summaryUuid,
    summaryContent,
    summary,
    firstArchivedUuid: commit.firstArchivedUuid,
    lastArchivedUuid: commit.lastArchivedUuid,
  })
  appendCommit(commit, archived.length)

  const lastSpawnTokens = tokenCountWithEstimation(messages)
  await recordContextCollapseSnapshot({
    staged: [],
    armed: false,
    lastSpawnTokens,
  })
  setSnapshot({
    type: 'marble-origami-snapshot',
    sessionId: commit.sessionId,
    staged: [],
    armed: false,
    lastSpawnTokens,
  })

  recordSpawnAttempt({ committed: true })

  const collapsedMessages = projectView(messages)
  return { messages: collapsedMessages, changed: true }
}

export { subscribe }

export function getStats(): ContextCollapseStats {
  return getRuntimeStats()
}

export function isContextCollapseEnabled(): boolean {
  return feature('CONTEXT_COLLAPSE') ? true : false
}

export function resetContextCollapse(): void {
  resetRuntimeState()
}

export async function applyCollapsesIfNeeded(
  messages: Message[],
  toolUseContext: ToolUseContext,
  querySource?: QuerySource,
): Promise<{
  messages: Message[]
  changed: boolean
}> {
  const projected = projectView(messages)

  if (
    !isContextCollapseEnabled() ||
    toolUseContext.agentId ||
    querySource === 'compact' ||
    querySource === 'session_memory'
  ) {
    return { messages: projected, changed: projected !== messages }
  }

  const effectiveWindow = getEffectiveContextWindowSize(
    toolUseContext.options.mainLoopModel,
  )
  const tokenUsage = tokenCountWithEstimation(projected)

  if (tokenUsage < effectiveWindow * PROACTIVE_COLLAPSE_RATIO) {
    return { messages: projected, changed: projected !== messages }
  }

  try {
    return await commitCollapse(projected, toolUseContext)
  } catch (error) {
    recordSpawnAttempt({
      committed: false,
      error: error instanceof Error ? error.message : String(error),
    })
    return { messages: projected, changed: projected !== messages }
  }
}

export function isWithheldPromptTooLong(
  message: Message | undefined,
  detector: (message: Message) => boolean,
  querySource?: QuerySource,
): boolean {
  if (!isContextCollapseEnabled()) return false
  if (querySource === 'compact' || querySource === 'session_memory') {
    return false
  }
  return !!message && detector(message)
}

export function recoverFromOverflow(
  messages: Message[],
  _querySource?: QuerySource,
): { messages: Message[]; committed: number } {
  const projected = projectView(messages)
  const span = selectCollapseSpan(projected)
  if (!span) {
    recordSpawnAttempt({ committed: false })
    return { messages: projected, committed: 0 }
  }

  const archived = projected.slice(span.start, span.end + 1)
  if (archived.length < MIN_COLLAPSE_MESSAGES) {
    recordSpawnAttempt({ committed: false })
    return { messages: projected, committed: 0 }
  }

  const collapseId = getNextCollapseId()
  const summary = summarizeMessages(archived) || 'Earlier context collapsed.'
  const summaryUuid = crypto.randomUUID()
  const summaryContent = `<collapsed id="${collapseId}">${summary}</collapsed>`
  appendCommit(
    {
      type: 'marble-origami-commit',
      sessionId: messages[0]?.uuid as ContextCollapseCommitEntry['sessionId'],
      collapseId,
      summaryUuid,
      summaryContent,
      summary,
      firstArchivedUuid: archived[0]!.uuid,
      lastArchivedUuid: archived.at(-1)!.uuid,
    },
    archived.length,
  )
  recordSpawnAttempt({ committed: true })
  return { messages: projectView(projected), committed: 1 }
}
