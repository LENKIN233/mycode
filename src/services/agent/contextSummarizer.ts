/**
 * Enhanced context summarization for better information retention.
 *
 * Works alongside the existing autoCompact/snipCompact/reactiveCompact
 * systems. Instead of replacing them, this module provides pre-processing
 * that classifies message content by importance BEFORE compaction occurs,
 * so the compaction prompt can produce higher quality summaries.
 *
 * Key improvement: Existing compaction treats all messages equally.
 * This module tags messages with retention priorities so the compaction
 * prompt knows which information to preserve vs. drop.
 *
 * Integration point: Called just before autocompact in the query loop.
 */

import type { Message, AssistantMessage, UserMessage } from '../../types/message.js'
import { logEvent } from '../analytics/index.js'

/** Priority levels for context retention during compaction. */
export type RetentionPriority =
  | 'critical'   // Must be preserved verbatim (e.g., user's original task)
  | 'high'       // Important to preserve (e.g., key findings, decisions)
  | 'medium'     // Useful context (e.g., tool results with relevant data)
  | 'low'        // Can be summarized aggressively (e.g., failed attempts)
  | 'ephemeral'  // Can be dropped entirely (e.g., progress messages, retries)

export type MessageAnnotation = {
  priority: RetentionPriority
  category: string
  keyFacts: string[]
}

/**
 * Classify a message's retention priority based on content analysis.
 * This runs O(1) per message — no API calls, just heuristic analysis.
 */
export function classifyMessagePriority(
  message: Message,
  index: number,
  totalMessages: number,
): MessageAnnotation {
  // First message is always the user's original task — critical
  if (index === 0 && message.type === 'user') {
    return {
      priority: 'critical',
      category: 'user_task',
      keyFacts: extractKeyFacts(message),
    }
  }

  // User messages with substantial content are high priority
  if (message.type === 'user') {
    const content = getUserMessageText(message)
    if (content.length > 0 && !message.isMeta) {
      return {
        priority: 'high',
        category: 'user_input',
        keyFacts: extractKeyFacts(message),
      }
    }
    // Meta messages (system-injected) are lower priority
    if (message.isMeta) {
      return {
        priority: 'low',
        category: 'meta_message',
        keyFacts: [],
      }
    }
  }

  // Assistant messages with tool use — classify by tool type
  if (message.type === 'assistant') {
    const blocks = message.message.content as Array<{ type: string; name: string; input: unknown }>
    const toolBlocks = blocks.filter(
      b => b.type === 'tool_use',
    )

    if (toolBlocks.length > 0) {
      // Tool results from write operations are more important
      const hasWriteOp = toolBlocks.some(b =>
        ['Edit', 'Write', 'NotebookEdit', 'MultiEdit'].includes(b.name),
      )
      if (hasWriteOp) {
        return {
          priority: 'high',
          category: 'file_modification',
          keyFacts: toolBlocks
            .filter(b =>
              ['Edit', 'Write', 'NotebookEdit', 'MultiEdit'].includes(b.name),
            )
            .map(b => {
              const input = b.input as Record<string, unknown>
              return `Modified: ${input.file_path ?? input.filePath ?? 'unknown'}`
            }),
        }
      }

      // Read-only tools are lower priority in compaction
      return {
        priority: 'medium',
        category: 'tool_execution',
        keyFacts: [],
      }
    }

    // Assistant text-only messages (analysis, explanations)
    const textArr = message.message.content as Array<{ type: string }>
    const textBlocks = textArr.filter(b => b.type === 'text')
    if (textBlocks.length > 0) {
      // Recent assistant messages are more important
      const recencyFactor = index / totalMessages
      if (recencyFactor > 0.7) {
        return {
          priority: 'high',
          category: 'recent_analysis',
          keyFacts: [],
        }
      }
      return {
        priority: 'medium',
        category: 'analysis',
        keyFacts: [],
      }
    }
  }

  // Tool result messages — classify by success/failure
  if (message.type === 'user' && hasToolResultContent(message)) {
    const isError = hasErrorResult(message)
    if (isError) {
      return {
        priority: 'low',
        category: 'failed_tool_result',
        keyFacts: [],
      }
    }
    return {
      priority: 'medium',
      category: 'tool_result',
      keyFacts: [],
    }
  }

  // Attachment messages
  if (message.type === 'attachment') {
    return {
      priority: 'medium',
      category: 'attachment',
      keyFacts: [],
    }
  }

  // Progress messages are ephemeral
  if (message.type === 'progress') {
    return {
      priority: 'ephemeral',
      category: 'progress',
      keyFacts: [],
    }
  }

  return {
    priority: 'medium',
    category: 'other',
    keyFacts: [],
  }
}

/**
 * Build a retention-aware context summary hint that can be prepended
 * to the compaction prompt. This tells the compactor which information
 * to prioritize in its summary.
 */
export function buildRetentionHint(messages: Message[]): string {
  const annotations = messages.map((msg, i) =>
    classifyMessagePriority(msg, i, messages.length),
  )

  // Collect all critical and high-priority key facts
  const criticalFacts = annotations
    .filter(a => a.priority === 'critical' || a.priority === 'high')
    .flatMap(a => a.keyFacts)
    .filter(f => f.length > 0)

  // Count categories for the compactor
  const categoryCounts: Record<string, number> = {}
  for (const ann of annotations) {
    categoryCounts[ann.category] = (categoryCounts[ann.category] ?? 0) + 1
  }

  const fileModifications = annotations
    .filter(a => a.category === 'file_modification')
    .flatMap(a => a.keyFacts)

  const lines: string[] = []

  if (criticalFacts.length > 0) {
    lines.push(
      `Key facts to preserve in summary:`,
      ...criticalFacts.map(f => `- ${f}`),
    )
  }

  if (fileModifications.length > 0) {
    lines.push(
      `\nFile modifications made (must be preserved):`,
      ...fileModifications.map(f => `- ${f}`),
    )
  }

  // Count failed tool results to let compactor know it can drop them
  const failedResults = annotations.filter(
    a => a.category === 'failed_tool_result',
  ).length
  if (failedResults > 0) {
    lines.push(
      `\n${failedResults} failed tool results can be summarized briefly or dropped.`,
    )
  }

  return lines.join('\n')
}

/**
 * Estimate how many of the messages should be preserved vs. summarized,
 * based on their retention priorities.
 */
export function estimateRetentionSplit(
  messages: Message[],
): {
  preserveCount: number
  summarizeCount: number
  dropCount: number
} {
  const annotations = messages.map((msg, i) =>
    classifyMessagePriority(msg, i, messages.length),
  )

  let preserveCount = 0
  let summarizeCount = 0
  let dropCount = 0

  for (const ann of annotations) {
    switch (ann.priority) {
      case 'critical':
      case 'high':
        preserveCount++
        break
      case 'medium':
        summarizeCount++
        break
      case 'low':
      case 'ephemeral':
        dropCount++
        break
    }
  }

  return { preserveCount, summarizeCount, dropCount }
}

// --- Helper functions ---

function getUserMessageText(message: Message): string {
  if (message.type !== 'user') return ''
  const content = message.message.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter(b => b.type === 'text')
      .map(b => ('text' in b ? b.text : ''))
      .join('\n')
  }
  return ''
}

function hasToolResultContent(message: Message): boolean {
  if (message.type !== 'user') return false
  const content = message.message.content
  if (!Array.isArray(content)) return false
  return content.some(b => b.type === 'tool_result')
}

function hasErrorResult(message: Message): boolean {
  if (message.type !== 'user') return false
  const content = message.message.content
  if (!Array.isArray(content)) return false
  return content.some(
    b => b.type === 'tool_result' && b.is_error === true,
  )
}

function extractKeyFacts(message: Message): string[] {
  const text = getUserMessageText(message)
  if (!text) return []

  // Extract the most important facts from user messages:
  // file paths, function names, error messages, etc.
  const facts: string[] = []

  // Extract file paths
  const pathPattern = /(?:^|\s)((?:\/|\.\/|\.\.\/|src\/|[a-zA-Z]:\\)[^\s,;:'")\]}>]+)/g
  let match
  while ((match = pathPattern.exec(text)) !== null) {
    if (match[1] && match[1].length < 200) {
      facts.push(`File: ${match[1]}`)
    }
  }

  // Keep facts concise
  return facts.slice(0, 5)
}
