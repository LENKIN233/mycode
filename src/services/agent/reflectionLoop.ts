/**
 * ReAct (Reason-Act-Observe) reflection loop for agent error recovery.
 *
 * When tool execution fails, instead of blindly retrying or giving up,
 * this module injects a structured reflection message that helps the model
 * understand WHY the failure occurred and devise a better strategy.
 *
 * This is NOT a separate agent — it enhances the existing query loop by
 * injecting targeted reflection prompts into the conversation when
 * specific failure patterns are detected.
 *
 * Integration point: Called from the query loop after tool results are
 * collected, before the next API call.
 */

import type { ToolUseBlock } from '@anthropic-ai/sdk/resources/index.mjs'
import { logEvent } from '../analytics/index.js'
import type { AssistantMessage, Message, UserMessage } from '../../types/message.js'
import { createUserMessage } from '../../utils/messages.js'

/** Failure patterns that trigger reflection. */
export type FailurePattern =
  | 'tool_error'           // Tool returned is_error: true
  | 'repeated_failure'     // Same tool failed multiple times
  | 'stuck_loop'           // Model calling same tool with same args
  | 'permission_denied'    // Tool permission was denied
  | 'file_not_found'       // File/path doesn't exist
  | 'syntax_error'         // Code syntax error in output

type FailureRecord = {
  toolName: string
  toolInput: Record<string, unknown>
  errorContent: string
  pattern: FailurePattern
  timestamp: number
}

/**
 * Tracks failure patterns across tool executions within a query session.
 * Used to detect when the model is stuck in a loop or repeatedly failing.
 */
export class ReflectionTracker {
  private failureHistory: FailureRecord[] = []
  private toolCallSignatures = new Map<string, number>()
  // Track consecutive failures without any successful tool call
  private consecutiveFailures = 0

  /**
   * Record a tool execution result and detect failure patterns.
   * Returns a reflection message if a pattern is detected, or null.
   */
  analyzeToolResult(
    toolBlock: ToolUseBlock,
    resultMessage: UserMessage,
  ): FailurePattern | null {
    const content = Array.isArray(resultMessage.message.content)
      ? resultMessage.message.content
      : []

    const errorBlock = content.find(
      block => block.type === 'tool_result' && block.is_error === true,
    )

    if (!errorBlock) {
      // Successful execution — reset consecutive counter
      this.consecutiveFailures = 0
      return null
    }

    this.consecutiveFailures++

    const errorContent =
      errorBlock.type === 'tool_result' && typeof errorBlock.content === 'string'
        ? errorBlock.content
        : ''

    // Detect specific failure patterns
    const pattern = this.classifyFailure(toolBlock, errorContent)

    this.failureHistory.push({
      toolName: toolBlock.name,
      toolInput: (toolBlock.input as Record<string, unknown>) ?? {},
      errorContent,
      pattern,
      timestamp: Date.now(),
    })

    // Track tool call signatures for loop detection
    const signature = this.getCallSignature(toolBlock)
    const count = (this.toolCallSignatures.get(signature) ?? 0) + 1
    this.toolCallSignatures.set(signature, count)

    if (count >= 3) return 'stuck_loop'

    return pattern
  }

  /**
   * Classify the type of failure from error content.
   */
  private classifyFailure(
    toolBlock: ToolUseBlock,
    errorContent: string,
  ): FailurePattern {
    const lowerError = errorContent.toLowerCase()

    if (
      lowerError.includes('permission denied') ||
      lowerError.includes('user rejected') ||
      lowerError.includes('not allowed')
    ) {
      return 'permission_denied'
    }

    if (
      lowerError.includes('no such file') ||
      lowerError.includes('not found') ||
      lowerError.includes('enoent') ||
      lowerError.includes('does not exist')
    ) {
      return 'file_not_found'
    }

    if (
      lowerError.includes('syntax error') ||
      lowerError.includes('syntaxerror') ||
      lowerError.includes('parse error') ||
      lowerError.includes('unexpected token')
    ) {
      return 'syntax_error'
    }

    // Check for repeated failures of the same tool
    const recentSameToolFailures = this.failureHistory.filter(
      f =>
        f.toolName === toolBlock.name &&
        Date.now() - f.timestamp < 60_000, // within last minute
    )
    if (recentSameToolFailures.length >= 2) {
      return 'repeated_failure'
    }

    return 'tool_error'
  }

  /**
   * Generate a deterministic signature for a tool call to detect loops.
   */
  private getCallSignature(toolBlock: ToolUseBlock): string {
    const input = toolBlock.input as Record<string, unknown>
    // Use only the most significant input fields for signature
    const significantKeys = Object.keys(input)
      .sort()
      .slice(0, 3)
    const significantValues = significantKeys
      .map(k => `${k}=${JSON.stringify(input[k]).slice(0, 100)}`)
      .join('|')
    return `${toolBlock.name}::${significantValues}`
  }

  /**
   * Build a reflection message based on the detected failure pattern.
   * The message is injected as a meta user message so the model can
   * reason about the failure and adjust its approach.
   */
  buildReflectionMessage(
    pattern: FailurePattern,
    toolBlock: ToolUseBlock,
    errorContent: string,
  ): UserMessage {
    const reflection = this.getReflectionPrompt(pattern, toolBlock, errorContent)

    logEvent('tengu_reflection_triggered', {
      consecutiveFailures: this.consecutiveFailures,
    })

    return createUserMessage({
      content: reflection,
      isMeta: true,
    })
  }

  /**
   * Generate the reflection prompt text based on failure pattern.
   */
  private getReflectionPrompt(
    pattern: FailurePattern,
    toolBlock: ToolUseBlock,
    errorContent: string,
  ): string {
    const toolName = toolBlock.name
    const truncatedError = errorContent.length > 500
      ? errorContent.slice(0, 500) + '...'
      : errorContent

    switch (pattern) {
      case 'stuck_loop':
        return (
          `<system-reminder>REFLECTION: You have called ${toolName} with the same arguments ${this.toolCallSignatures.get(this.getCallSignature(toolBlock)) ?? 3}+ times and it keeps failing. ` +
          `Stop and reconsider your approach. ` +
          `The error was: ${truncatedError}\n\n` +
          `Before your next action, briefly think about:\n` +
          `1. Why is this approach not working?\n` +
          `2. What alternative approach could succeed?\n` +
          `3. Is there a different tool or method you should use instead?</system-reminder>`
        )

      case 'repeated_failure':
        return (
          `<system-reminder>REFLECTION: ${toolName} has failed multiple times recently. ` +
          `Last error: ${truncatedError}\n\n` +
          `Before retrying, consider:\n` +
          `1. Is the input correct? Check file paths, argument names, and values.\n` +
          `2. Are there prerequisites that need to be met first?\n` +
          `3. Should you try a different approach entirely?</system-reminder>`
        )

      case 'permission_denied':
        return (
          `<system-reminder>REFLECTION: ${toolName} was denied by permissions. ` +
          `Do not retry the same tool call — it will be denied again. ` +
          `Instead, either:\n` +
          `1. Use a different tool that achieves the same goal\n` +
          `2. Explain to the user what you need permission to do and why\n` +
          `3. Find an alternative approach that doesn't require this permission</system-reminder>`
        )

      case 'file_not_found':
        return (
          `<system-reminder>REFLECTION: File/path not found when calling ${toolName}. ` +
          `Error: ${truncatedError}\n\n` +
          `Before retrying:\n` +
          `1. Use Glob or find to verify the correct path\n` +
          `2. Check if the file might have a different name or location\n` +
          `3. Consider if the file needs to be created first</system-reminder>`
        )

      case 'syntax_error':
        return (
          `<system-reminder>REFLECTION: Syntax error encountered in ${toolName}. ` +
          `Error: ${truncatedError}\n\n` +
          `Before retrying:\n` +
          `1. Read the file to understand the current syntax context\n` +
          `2. Fix the syntax issue in your next attempt\n` +
          `3. Consider smaller, more targeted edits</system-reminder>`
        )

      case 'tool_error':
      default:
        // For generic errors, only inject if consecutive failures are high
        if (this.consecutiveFailures >= 3) {
          return (
            `<system-reminder>REFLECTION: You have had ${this.consecutiveFailures} consecutive tool failures. ` +
            `Last error from ${toolName}: ${truncatedError}\n\n` +
            `Pause and reconsider your overall approach. What has changed? ` +
            `Is there a simpler way to achieve the goal?</system-reminder>`
          )
        }
        // Low consecutive failures — no reflection needed for generic errors
        return ''
    }
  }

  /**
   * Whether a reflection is warranted based on current failure state.
   */
  shouldReflect(pattern: FailurePattern): boolean {
    switch (pattern) {
      case 'stuck_loop':
      case 'repeated_failure':
      case 'permission_denied':
        return true
      case 'file_not_found':
      case 'syntax_error':
        return this.consecutiveFailures >= 2
      case 'tool_error':
        return this.consecutiveFailures >= 3
      default:
        return false
    }
  }

  /**
   * Get summary of failures for analytics.
   */
  getSummary(): {
    totalFailures: number
    patterns: Record<string, number>
    loopsDetected: number
  } {
    const patterns: Record<string, number> = {}
    for (const f of this.failureHistory) {
      patterns[f.pattern] = (patterns[f.pattern] ?? 0) + 1
    }
    const loopsDetected = Array.from(this.toolCallSignatures.values()).filter(
      c => c >= 3,
    ).length
    return {
      totalFailures: this.failureHistory.length,
      patterns,
      loopsDetected,
    }
  }

  /**
   * Reset tracker state. Called between user turns.
   */
  reset(): void {
    this.failureHistory = []
    this.toolCallSignatures.clear()
    this.consecutiveFailures = 0
  }
}
