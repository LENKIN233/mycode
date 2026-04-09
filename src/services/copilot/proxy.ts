/**
 * Copilot API proxy: translates between Anthropic Messages API format
 * and OpenAI Chat Completions format used by the Copilot API.
 *
 * This module provides a custom `fetch` function that intercepts requests
 * from the Anthropic SDK and translates them to/from OpenAI format.
 */

import type { ClientOptions } from '@anthropic-ai/sdk'
import { getCopilotToken, requestCopilotReauth } from './auth.js'

const COPILOT_API_BASE = 'https://api.githubcopilot.com'

// Map Anthropic model names to Copilot model IDs.
// Copilot uses dotted version names like "claude-sonnet-4.5" while the SDK sends
// full date-suffixed IDs like "claude-sonnet-4-5-20250929".
//
// Copilot model pricing (premium request multipliers):
//   0x (FREE on paid plans): gpt-4.1, gpt-4o, gpt-5-mini
//   0.25x: grok-code-fast-1
//   0.33x: claude-haiku-4.5, gemini-3-flash-preview, gpt-5.4-mini
//   1x:    claude-sonnet-4/4.5/4.6, gemini-2.5-pro/3.1-pro-preview,
//          gpt-5.1/5.2/5.2-codex/5.3-codex/5.4
//   3x:    claude-opus-4.5/4.6/4.6-fast
const MODEL_MAP: Record<string, string> = {
  // MyCode configs.ts copilot model strings → Copilot API names
  'claude-sonnet-4-20250514': 'claude-sonnet-4',
  'claude-sonnet-4-5-20250929': 'claude-sonnet-4.5',
  'claude-sonnet-4-6': 'claude-sonnet-4.6',
  'claude-opus-4-20250514': 'claude-sonnet-4',   // opus-4.0 not available, fallback to sonnet-4
  'claude-opus-4-1-20250805': 'claude-sonnet-4',  // opus-4.1 not available, fallback to sonnet-4
  'claude-opus-4-5-20251101': 'claude-opus-4.5',
  'claude-opus-4-6': 'claude-opus-4.6',
  'claude-haiku-4-5-20251001': 'claude-haiku-4.5',
  'claude-3-5-haiku-20241022': 'claude-haiku-4.5', // 3.5-haiku not available, use 4.5
  'claude-3-5-sonnet-20241022': 'claude-sonnet-4',  // 3.5-sonnet not available, use 4.0
  'claude-3-7-sonnet-20250219': 'claude-sonnet-4',  // 3.7-sonnet not available, use 4.0
  // Claude dotted aliases (pass through)
  'claude-sonnet-4': 'claude-sonnet-4',
  'claude-sonnet-4.5': 'claude-sonnet-4.5',
  'claude-sonnet-4.6': 'claude-sonnet-4.6',
  'claude-opus-4.5': 'claude-opus-4.5',
  'claude-opus-4.6': 'claude-opus-4.6',
  'claude-opus-4.6-fast': 'claude-opus-4.6-fast',
  'claude-haiku-4.5': 'claude-haiku-4.5',
  // GPT: FREE on paid Copilot plans (0x multiplier)
  'gpt-4.1': 'gpt-4.1',
  'gpt-4o': 'gpt-4o',
  'gpt-5-mini': 'gpt-5-mini',
  // GPT: premium models
  'gpt-5.1': 'gpt-5.1',
  'gpt-5.2': 'gpt-5.2',
  'gpt-5.2-codex': 'gpt-5.2-codex',
  'gpt-5.3-codex': 'gpt-5.3-codex',
  'gpt-5.4': 'gpt-5.4',
  'gpt-5.4-mini': 'gpt-5.4-mini',
  // Gemini
  'gemini-2.5-pro': 'gemini-2.5-pro',
  'gemini-3-flash': 'gemini-3-flash-preview',
  'gemini-3.1-pro': 'gemini-3.1-pro-preview',
  // Grok
  'grok-code-fast-1': 'grok-code-fast-1',
}

const COPILOT_DEFAULT_MODEL = 'claude-sonnet-4.6'

function mapModel(model: string): string {
  if (MODEL_MAP[model]) return MODEL_MAP[model]
  // Fallback: strip date suffix and try again
  const stripped = model.replace(/-\d{8}$/, '')
  if (MODEL_MAP[stripped]) return MODEL_MAP[stripped]
  // Non-Claude models not in the map: pass through as-is to Copilot API
  // (allows using any model Copilot supports without updating the map)
  if (!model.startsWith('claude-')) return model
  // Unknown Claude model variant → pass through
  return model
}

/**
 * Cap max_tokens for non-Claude models which have lower output limits.
 * Limits sourced from Copilot /models API `capabilities.limits.max_output_tokens`.
 */
function capMaxTokensForModel(model: string, maxTokens: number | undefined): number | undefined {
  if (maxTokens === undefined) return undefined
  const m = model.toLowerCase()
  // GPT-4.1: 16,384 max output
  if (m.startsWith('gpt-4.1')) return Math.min(maxTokens, 16384)
  // GPT-4o / GPT-4o-mini: 16,384 / 4,096 max output
  if (m === 'gpt-4o-mini' || m.startsWith('gpt-4o-mini-')) return Math.min(maxTokens, 4096)
  if (m.startsWith('gpt-4o')) return Math.min(maxTokens, 16384)
  // GPT-5-mini: 64,000 max output
  if (m === 'gpt-5-mini') return Math.min(maxTokens, 64000)
  // GPT-5.1: 64,000 max output
  if (m === 'gpt-5.1') return Math.min(maxTokens, 64000)
  // GPT-5.2 / 5.2-codex: 64,000 / 128,000 max output
  if (m === 'gpt-5.2-codex') return Math.min(maxTokens, 128000)
  if (m === 'gpt-5.2') return Math.min(maxTokens, 64000)
  // GPT-5.3-codex: 128,000 max output
  if (m === 'gpt-5.3-codex') return Math.min(maxTokens, 128000)
  // GPT-5.4 / 5.4-mini: 128,000 max output
  if (m.startsWith('gpt-5.4')) return Math.min(maxTokens, 128000)
  // Gemini models: 64,000 max output
  if (m.startsWith('gemini')) return Math.min(maxTokens, 64000)
  // Grok: 64,000 max output
  if (m.startsWith('grok')) return Math.min(maxTokens, 64000)
  // Claude models: pass through (Copilot: 16K-64K depending on model)
  // Unknown models: pass through
  return maxTokens
}

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string | AnthropicContentBlock[]
}

interface AnthropicContentBlock {
  type: string
  text?: string
  name?: string
  id?: string
  input?: unknown
  content?: unknown
  tool_use_id?: string
  source?: unknown
  is_error?: boolean
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | OpenAIContentPart[] | null
  tool_calls?: OpenAIToolCall[]
  tool_call_id?: string
}

interface OpenAIContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

interface OpenAIToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

interface AnthropicTool {
  name: string
  description?: string
  input_schema?: unknown
}

interface OpenAITool {
  type: 'function'
  function: {
    name: string
    description?: string
    parameters?: unknown
  }
}

/**
 * Convert Anthropic system prompt blocks to a system message string.
 */
function convertSystem(
  system: string | Array<{ type: string; text: string }> | undefined,
): string {
  if (!system) return ''
  if (typeof system === 'string') return system
  return system
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('\n\n')
}

/**
 * Convert a single Anthropic content block to text content.
 */
function contentBlockToText(block: AnthropicContentBlock): string {
  if (block.type === 'text') return block.text ?? ''
  if (block.type === 'thinking') return '' // Skip thinking blocks
  if (block.type === 'redacted_thinking') return '' // Skip redacted thinking
  return ''
}

/**
 * Convert an Anthropic image block to an OpenAI image_url content part.
 * Returns null if the block doesn't have valid image data.
 */
function convertImageBlock(block: AnthropicContentBlock): OpenAIContentPart | null {
  const source = block.source as { type?: string; media_type?: string; data?: string; url?: string } | undefined
  if (source?.type === 'base64' && source.data && source.media_type) {
    return {
      type: 'image_url',
      image_url: { url: `data:${source.media_type};base64,${source.data}` },
    }
  }
  if (source?.type === 'url' && source.url) {
    return {
      type: 'image_url',
      image_url: { url: source.url },
    }
  }
  return null
}

/**
 * Convert Anthropic messages to OpenAI messages format.
 */
function convertMessages(
  messages: AnthropicMessage[],
  system: string,
): OpenAIMessage[] {
  const result: OpenAIMessage[] = []

  if (system) {
    result.push({ role: 'system', content: system })
  }

  for (const msg of messages) {
    if (typeof msg.content === 'string') {
      result.push({ role: msg.role, content: msg.content })
      continue
    }

    if (!Array.isArray(msg.content)) {
      result.push({ role: msg.role, content: String(msg.content ?? '') })
      continue
    }

    if (msg.role === 'assistant') {
      // Collect text and tool_use blocks
      const textParts: string[] = []
      const toolCalls: OpenAIToolCall[] = []
      let reasoningText: string | undefined
      let reasoningOpaque: string | undefined

      for (const block of msg.content) {
        if (block.type === 'text') {
          textParts.push(block.text ?? '')
        } else if (block.type === 'thinking') {
          // Preserve thinking text for multi-turn context
          if (block.text) reasoningText = (reasoningText ?? '') + block.text
        } else if (block.type === 'redacted_thinking') {
          // Preserve opaque thinking data for multi-turn cache
          const data = (block as { data?: string }).data
          if (data) reasoningOpaque = data
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id!,
            type: 'function',
            function: {
              name: block.name!,
              arguments:
                typeof block.input === 'string'
                  ? block.input
                  : JSON.stringify(block.input ?? {}),
            },
          })
        }
      }

      const openaiMsg: OpenAIMessage & { reasoning_text?: string; reasoning_opaque?: string } = {
        role: 'assistant',
        content: textParts.join('') || null,
      }
      if (toolCalls.length > 0) {
        openaiMsg.tool_calls = toolCalls
      }
      // Preserve reasoning context for multi-turn conversations
      if (reasoningText) {
        openaiMsg.reasoning_text = reasoningText
      }
      if (reasoningOpaque) {
        openaiMsg.reasoning_opaque = reasoningOpaque
      }
      result.push(openaiMsg)
    } else if (msg.role === 'user') {
      // Check for tool_result blocks (responses to tool calls)
      const toolResults: Array<{
        tool_call_id: string
        content: string
      }> = []
      const contentParts: OpenAIContentPart[] = []
      let hasImages = false
      // Images from tool_result blocks — OpenAI tool messages are string-only,
      // so these get injected as a follow-up user message.
      const toolResultImages: OpenAIContentPart[] = []

      for (const block of msg.content) {
        if (block.type === 'tool_result') {
          let resultContent =
            typeof block.content === 'string'
              ? block.content
              : Array.isArray(block.content)
                ? (block.content as AnthropicContentBlock[])
                    .map(b => contentBlockToText(b))
                    .join('')
                : JSON.stringify(block.content ?? '')
          // Preserve is_error semantics — OpenAI tool messages have no error
          // flag, so prefix content so the model knows this tool call failed.
          if (block.is_error) {
            resultContent = `[ERROR] ${resultContent}`
          }
          toolResults.push({
            tool_call_id: block.tool_use_id!,
            content: resultContent,
          })
          // Extract images from tool_result content arrays
          if (Array.isArray(block.content)) {
            for (const inner of block.content as AnthropicContentBlock[]) {
              if (inner.type === 'image') {
                const imgPart = convertImageBlock(inner)
                if (imgPart) toolResultImages.push(imgPart)
              }
            }
          }
        } else if (block.type === 'text') {
          contentParts.push({ type: 'text', text: block.text ?? '' })
        } else if (block.type === 'image') {
          const imgPart = convertImageBlock(block)
          if (imgPart) {
            contentParts.push(imgPart)
            hasImages = true
          } else {
            contentParts.push({ type: 'text', text: '[image]' })
          }
        }
      }

      // Add tool results as separate tool messages
      for (const tr of toolResults) {
        result.push({
          role: 'tool',
          tool_call_id: tr.tool_call_id,
          content: tr.content,
        })
      }

      // Inject tool_result images as a user message (OpenAI tool msgs are string-only)
      if (toolResultImages.length > 0) {
        result.push({
          role: 'user',
          content: [
            { type: 'text' as const, text: '[Tool result images]' },
            ...toolResultImages,
          ],
        })
      }

      // Add remaining content as user message
      if (contentParts.length > 0) {
        if (hasImages) {
          // Multi-part content with images
          result.push({ role: 'user', content: contentParts })
        } else {
          // Plain text (more compatible, avoids multi-part overhead)
          result.push({
            role: 'user',
            content: contentParts.map(p => p.text ?? '').join(''),
          })
        }
      }

      // If only tool_results were present, no user message is needed
      if (toolResults.length === 0 && contentParts.length === 0 && toolResultImages.length === 0) {
        result.push({ role: 'user', content: '' })
      }
    }
  }

  return result
}

/**
 * Convert Anthropic tools to OpenAI function tools format.
 */
function convertTools(tools: AnthropicTool[] | undefined): OpenAITool[] {
  if (!tools || tools.length === 0) return []
  return tools
    .filter(
      t =>
        t.name &&
        // Filter out server-side tool types that don't have input_schema
        typeof t.name === 'string',
    )
    .map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        ...(t.description && { description: t.description }),
        ...(t.input_schema && { parameters: t.input_schema }),
      },
    }))
}

/**
 * Build the OpenAI request body from an Anthropic Messages API request body.
 */
function translateRequest(anthropicBody: Record<string, unknown>): {
  url: string
  body: Record<string, unknown>
} {
  const model = mapModel(anthropicBody.model as string)
  const system = convertSystem(
    anthropicBody.system as
      | string
      | Array<{ type: string; text: string }>
      | undefined,
  )
  const messages = convertMessages(
    anthropicBody.messages as AnthropicMessage[],
    system,
  )

  const maxTokens = capMaxTokensForModel(model, anthropicBody.max_tokens as number | undefined)

  const openaiBody: Record<string, unknown> = {
    model,
    messages,
    stream: anthropicBody.stream ?? false,
  }

  // Convert Anthropic thinking → Copilot reasoning_effort (OpenAI standard)
  // Auto-enable: when MyCode requests thinking, map to reasoning_effort.
  // Override: set COPILOT_REASONING_EFFORT=low|medium|high to force a specific level.
  const thinking = anthropicBody.thinking as { type?: string; budget_tokens?: number } | undefined
  if (thinking && thinking.type !== 'disabled' && model.startsWith('claude')) {
    if (process.env.COPILOT_REASONING_EFFORT) {
      // Explicit user override
      openaiBody.reasoning_effort = process.env.COPILOT_REASONING_EFFORT
    } else {
      // Auto-map: adaptive → medium; budget-based → low/medium/high
      if (thinking.type === 'adaptive') {
        openaiBody.reasoning_effort = 'medium'
      } else if (thinking.type === 'enabled' && thinking.budget_tokens) {
        // Map budget_tokens to reasoning_effort tiers:
        // ≤8k → low, ≤32k → medium, >32k → high
        if (thinking.budget_tokens <= 8192) {
          openaiBody.reasoning_effort = 'low'
        } else if (thinking.budget_tokens <= 32768) {
          openaiBody.reasoning_effort = 'medium'
        } else {
          openaiBody.reasoning_effort = 'high'
        }
      } else {
        openaiBody.reasoning_effort = 'medium'
      }
    }
  }

  // OpenAI API: reasoning models MUST use max_completion_tokens, not max_tokens.
  // Using max_tokens with reasoning_effort causes the API to ignore reasoning.
  if (openaiBody.reasoning_effort) {
    openaiBody.max_completion_tokens = maxTokens
  } else {
    openaiBody.max_tokens = maxTokens
  }

  // Convert temperature
  if (anthropicBody.temperature !== undefined) {
    openaiBody.temperature = anthropicBody.temperature
  }

  // Convert tools
  const tools = convertTools(
    anthropicBody.tools as AnthropicTool[] | undefined,
  )
  if (tools.length > 0) {
    openaiBody.tools = tools
  }

  // Convert tool_choice: Anthropic → OpenAI format
  // Anthropic: { type: "auto" } | { type: "any" } | { type: "tool", name: "..." }
  // OpenAI:    "auto" | "required" | { type: "function", function: { name: "..." } }
  const toolChoice = anthropicBody.tool_choice as { type?: string; name?: string } | undefined
  if (toolChoice && tools.length > 0) {
    if (toolChoice.type === 'auto') {
      openaiBody.tool_choice = 'auto'
    } else if (toolChoice.type === 'any') {
      openaiBody.tool_choice = 'required'
    } else if (toolChoice.type === 'tool' && toolChoice.name) {
      openaiBody.tool_choice = {
        type: 'function',
        function: { name: toolChoice.name },
      }
    }
  }

  // Add streaming options
  if (anthropicBody.stream) {
    openaiBody.stream_options = { include_usage: true }
  }

  // Convert Anthropic output_format → OpenAI response_format
  // Anthropic: { type: 'json_schema', schema: { ... } }
  // OpenAI:    { type: 'json_schema', json_schema: { name: 'response', schema: { ... } } }
  const outputFormat = anthropicBody.output_format as { type?: string; schema?: unknown } | undefined
  if (outputFormat?.type === 'json_schema' && outputFormat.schema) {
    openaiBody.response_format = {
      type: 'json_schema',
      json_schema: {
        name: 'response',
        strict: true,
        schema: outputFormat.schema,
      },
    }
  } else if (outputFormat?.type === 'json') {
    openaiBody.response_format = { type: 'json_object' }
  }

  // Convert stop_sequences
  if (anthropicBody.stop_sequences) {
    openaiBody.stop = anthropicBody.stop_sequences
  }

  return {
    url: `${COPILOT_API_BASE}/chat/completions`,
    body: openaiBody,
  }
}

/**
 * Convert an OpenAI streaming chunk to Anthropic SSE events.
 * Handles the translation from OpenAI delta format to Anthropic content_block events.
 */
class StreamTranslator {
  private contentBlockIndex = 0
  // Track active tool calls by index so we can emit content_block_start for new ones
  private activeToolCalls = new Map<
    number,
    { id: string; name: string; blockIndex: number }
  >()
  private hasStartedText = false
  private hasStartedThinking = false
  private inputJsonBuffers = new Map<number, string>()
  private messageId: string
  private model: string
  private usage = { input_tokens: 0, output_tokens: 0 }

  constructor(model: string) {
    this.model = model
    this.messageId = `msg_${Date.now()}`
  }

  /**
   * Produce the initial message_start event.
   */
  getMessageStartEvent(): string {
    return this.formatSSE({
      type: 'message_start',
      message: {
        id: this.messageId,
        type: 'message',
        role: 'assistant',
        content: [],
        model: this.model,
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 0, output_tokens: 0 },
      },
    })
  }

  /**
   * Translate one OpenAI streaming chunk to zero or more Anthropic SSE events.
   */
  translateChunk(chunk: Record<string, unknown>): string[] {
    const events: string[] = []
    const choices = chunk.choices as Array<{
      delta?: {
        role?: string
        content?: string | null
        reasoning_text?: string | null
        reasoning_opaque?: string | null
        tool_calls?: Array<{
          index: number
          id?: string
          function?: { name?: string; arguments?: string }
        }>
      }
      finish_reason?: string | null
    }>

    // Handle usage data (often in the last chunk with stream_options)
    if (chunk.usage) {
      const u = chunk.usage as {
        prompt_tokens?: number
        completion_tokens?: number
      }
      this.usage.input_tokens = u.prompt_tokens ?? 0
      this.usage.output_tokens = u.completion_tokens ?? 0
    }

    if (!choices || choices.length === 0) return events

    const choice = choices[0]
    const delta = choice.delta

    if (delta) {
      // Handle reasoning/thinking content (Copilot extension for Claude models)
      if (delta.reasoning_text) {
        // Close open text block if reasoning resumes after text (interleaved thinking)
        if (this.hasStartedText && !this.hasStartedThinking) {
          events.push(
            this.formatSSE({
              type: 'content_block_stop',
              index: this.contentBlockIndex,
            }),
          )
          this.contentBlockIndex++
          this.hasStartedText = false
        }
        if (!this.hasStartedThinking) {
          this.hasStartedThinking = true
          events.push(
            this.formatSSE({
              type: 'content_block_start',
              index: this.contentBlockIndex,
              content_block: { type: 'thinking', thinking: '' },
            }),
          )
        }
        events.push(
          this.formatSSE({
            type: 'content_block_delta',
            index: this.contentBlockIndex,
            delta: { type: 'thinking_delta', thinking: delta.reasoning_text },
          }),
        )
      }

      // Handle reasoning_opaque — emit as redacted_thinking block
      if (delta.reasoning_opaque) {
        // Close thinking block if it was open
        if (this.hasStartedThinking) {
          events.push(
            this.formatSSE({
              type: 'content_block_stop',
              index: this.contentBlockIndex,
            }),
          )
          this.contentBlockIndex++
          this.hasStartedThinking = false
        }
        // Close text block if it was open (interleaved case)
        if (this.hasStartedText) {
          events.push(
            this.formatSSE({
              type: 'content_block_stop',
              index: this.contentBlockIndex,
            }),
          )
          this.contentBlockIndex++
          this.hasStartedText = false
        }
        // Emit redacted_thinking block (start + stop, no delta for opaque data)
        events.push(
          this.formatSSE({
            type: 'content_block_start',
            index: this.contentBlockIndex,
            content_block: { type: 'redacted_thinking', data: delta.reasoning_opaque },
          }),
        )
        events.push(
          this.formatSSE({
            type: 'content_block_stop',
            index: this.contentBlockIndex,
          }),
        )
        this.contentBlockIndex++
      }

      // Handle text content
      if (delta.content) {
        // Close thinking block when text starts
        if (this.hasStartedThinking && !this.hasStartedText) {
          events.push(
            this.formatSSE({
              type: 'content_block_stop',
              index: this.contentBlockIndex,
            }),
          )
          this.contentBlockIndex++
          this.hasStartedThinking = false
        }
        if (!this.hasStartedText) {
          this.hasStartedText = true
          events.push(
            this.formatSSE({
              type: 'content_block_start',
              index: this.contentBlockIndex,
              content_block: { type: 'text', text: '' },
            }),
          )
        }
        events.push(
          this.formatSSE({
            type: 'content_block_delta',
            index: this.contentBlockIndex,
            delta: { type: 'text_delta', text: delta.content },
          }),
        )
      }

      // Handle tool calls
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const existing = this.activeToolCalls.get(tc.index)

          if (!existing && tc.id && tc.function?.name) {
            // Close thinking block if open
            if (this.hasStartedThinking) {
              events.push(
                this.formatSSE({
                  type: 'content_block_stop',
                  index: this.contentBlockIndex,
                }),
              )
              this.contentBlockIndex++
              this.hasStartedThinking = false
            }
            // Close text block if open
            if (this.hasStartedText) {
              events.push(
                this.formatSSE({
                  type: 'content_block_stop',
                  index: this.contentBlockIndex,
                }),
              )
              this.contentBlockIndex++
              this.hasStartedText = false
            }

            // New tool call — emit content_block_start
            const blockIndex = this.contentBlockIndex
            this.activeToolCalls.set(tc.index, {
              id: tc.id,
              name: tc.function.name,
              blockIndex,
            })
            this.inputJsonBuffers.set(tc.index, '')
            events.push(
              this.formatSSE({
                type: 'content_block_start',
                index: blockIndex,
                content_block: {
                  type: 'tool_use',
                  id: tc.id,
                  name: tc.function.name,
                  input: {},
                },
              }),
            )
            this.contentBlockIndex++
          }

          // Stream tool call arguments
          if (tc.function?.arguments) {
            const info = this.activeToolCalls.get(tc.index)
            if (info) {
              // Accumulate the JSON buffer
              const buffer = this.inputJsonBuffers.get(tc.index) ?? ''
              this.inputJsonBuffers.set(
                tc.index,
                buffer + tc.function.arguments,
              )

              events.push(
                this.formatSSE({
                  type: 'content_block_delta',
                  index: info.blockIndex,
                  delta: {
                    type: 'input_json_delta',
                    partial_json: tc.function.arguments,
                  },
                }),
              )
            }
          }
        }
      }
    }

    // Handle finish
    if (choice.finish_reason) {
      // Close any open blocks
      if (this.hasStartedThinking) {
        events.push(
          this.formatSSE({
            type: 'content_block_stop',
            index: this.contentBlockIndex,
          }),
        )
        this.contentBlockIndex++
      }
      if (this.hasStartedText) {
        events.push(
          this.formatSSE({
            type: 'content_block_stop',
            index: this.contentBlockIndex,
          }),
        )
      }

      // Close open tool call blocks
      for (const [, info] of this.activeToolCalls) {
        events.push(
          this.formatSSE({
            type: 'content_block_stop',
            index: info.blockIndex,
          }),
        )
      }

      // Map finish_reason
      let stopReason: string
      switch (choice.finish_reason) {
        case 'stop':
          stopReason = 'end_turn'
          break
        case 'tool_calls':
          stopReason = 'tool_use'
          break
        case 'length':
          stopReason = 'max_tokens'
          break
        case 'content_filter':
          // GPT models may refuse to generate content. Surface this to the
          // user as a text block so it's visible, rather than silently
          // treating it as a normal end_turn.
          if (!this.hasStartedText) {
            this.hasStartedText = true
            events.push(
              this.formatSSE({
                type: 'content_block_start',
                index: this.contentBlockIndex,
                content_block: { type: 'text', text: '' },
              }),
            )
          }
          events.push(
            this.formatSSE({
              type: 'content_block_delta',
              index: this.contentBlockIndex,
              delta: {
                type: 'text_delta',
                text: '\n\n[Content filtered by model safety policy]',
              },
            }),
          )
          stopReason = 'end_turn'
          break
        default:
          stopReason = 'end_turn'
      }

      events.push(
        this.formatSSE({
          type: 'message_delta',
          delta: { stop_reason: stopReason, stop_sequence: null },
          usage: { output_tokens: this.usage.output_tokens },
        }),
      )
      events.push(
        this.formatSSE({
          type: 'message_stop',
        }),
      )
    }

    return events
  }

  private formatSSE(data: unknown): string {
    return `event: ${(data as { type: string }).type}\ndata: ${JSON.stringify(data)}\n\n`
  }
}

/**
 * Transform an OpenAI SSE stream into an Anthropic SSE stream.
 */
function translateStream(
  openaiStream: ReadableStream<Uint8Array>,
  model: string,
): ReadableStream<Uint8Array> {
  const translator = new StreamTranslator(model)
  const decoder = new TextDecoder()
  const encoder = new TextEncoder()
  let buffer = ''

  return new ReadableStream({
    async start(controller) {
      // Send message_start event
      controller.enqueue(encoder.encode(translator.getMessageStartEvent()))

      const reader = openaiStream.getReader()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Process complete SSE lines
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? '' // Keep incomplete line in buffer

          let streamDone = false
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              if (data === '[DONE]') {
                streamDone = true
                break
              }

              try {
                const chunk = JSON.parse(data)
                const events = translator.translateChunk(chunk)
                for (const event of events) {
                  controller.enqueue(encoder.encode(event))
                }
              } catch {
                // Skip unparseable chunks
              }
            }
          }
          if (streamDone) break
        }
      } catch (err) {
        controller.error(err)
      } finally {
        reader.cancel().catch(() => {})
        controller.close()
      }
    },
  })
}

/**
 * Translate a non-streaming OpenAI response to Anthropic format.
 */
function translateNonStreamingResponse(
  openaiResponse: Record<string, unknown>,
  requestModel: string,
): Record<string, unknown> {
  const choices = openaiResponse.choices as Array<{
    message?: {
      role?: string
      content?: string | null
      reasoning_text?: string | null
      reasoning_opaque?: string | null
      tool_calls?: Array<{
        id: string
        function: { name: string; arguments: string }
      }>
    }
    finish_reason?: string
  }>

  const content: unknown[] = []

  if (choices?.[0]?.message) {
    const msg = choices[0].message

    // Add thinking block from reasoning_text (Copilot extension for MyCode)
    if (msg.reasoning_text) {
      content.push({ type: 'thinking', thinking: msg.reasoning_text })
    }

    // Add redacted_thinking from reasoning_opaque (encrypted context for multi-turn)
    if (msg.reasoning_opaque) {
      content.push({ type: 'redacted_thinking', data: msg.reasoning_opaque })
    }

    if (msg.content) {
      content.push({ type: 'text', text: msg.content })
    }

    if (msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        let input: unknown = {}
        try {
          input = JSON.parse(tc.function.arguments)
        } catch {
          input = tc.function.arguments
        }
        content.push({
          type: 'tool_use',
          id: tc.id,
          name: tc.function.name,
          input,
        })
      }
    }
  }

  let stopReason = 'end_turn'
  if (choices?.[0]?.finish_reason === 'tool_calls') stopReason = 'tool_use'
  if (choices?.[0]?.finish_reason === 'length') stopReason = 'max_tokens'
  if (choices?.[0]?.finish_reason === 'content_filter') {
    content.push({
      type: 'text',
      text: '\n\n[Content filtered by model safety policy]',
    })
  }

  const usage = openaiResponse.usage as {
    prompt_tokens?: number
    completion_tokens?: number
  }

  return {
    id: `msg_${Date.now()}`,
    type: 'message',
    role: 'assistant',
    content,
    model: requestModel,
    stop_reason: stopReason,
    stop_sequence: null,
    usage: {
      input_tokens: usage?.prompt_tokens ?? 0,
      output_tokens: usage?.completion_tokens ?? 0,
    },
  }
}

/**
 * Create a fake successful Anthropic streaming response that displays a
 * message to the user. Used for auth prompts that need to appear in the TUI
 * chat (rather than being swallowed by the SDK's retry logic).
 */
function createFakeAssistantResponse(text: string, isStreaming: boolean): Response {
  const msgId = `msg_reauth_${Date.now()}`
  if (!isStreaming) {
    return new Response(
      JSON.stringify({
        id: msgId,
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text }],
        model: 'copilot-reauth',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 0, output_tokens: 0 },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'request-id': `copilot-reauth-${Date.now()}`,
        },
      },
    )
  }

  // Build SSE stream matching Anthropic's streaming format
  const events = [
    `event: message_start\ndata: ${JSON.stringify({
      type: 'message_start',
      message: {
        id: msgId,
        type: 'message',
        role: 'assistant',
        content: [],
        model: 'copilot-reauth',
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 0, output_tokens: 0 },
      },
    })}\n\n`,
    `event: content_block_start\ndata: ${JSON.stringify({
      type: 'content_block_start',
      index: 0,
      content_block: { type: 'text', text: '' },
    })}\n\n`,
    `event: content_block_delta\ndata: ${JSON.stringify({
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text },
    })}\n\n`,
    `event: content_block_stop\ndata: ${JSON.stringify({
      type: 'content_block_stop',
      index: 0,
    })}\n\n`,
    `event: message_delta\ndata: ${JSON.stringify({
      type: 'message_delta',
      delta: { stop_reason: 'end_turn', stop_sequence: null },
      usage: { output_tokens: 0 },
    })}\n\n`,
    `event: message_stop\ndata: ${JSON.stringify({
      type: 'message_stop',
    })}\n\n`,
  ]

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      for (const event of events) {
        controller.enqueue(encoder.encode(event))
      }
      controller.close()
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'close',
      'request-id': `copilot-reauth-${Date.now()}`,
    },
  })
}

/**
 * Global reauth gate shared across all createCopilotFetch() instances,
 * even if the module is loaded via different import paths.
 * Uses globalThis to guarantee a single device code flow per process.
 */
type ReauthGateResult = {
  pollPromise: Promise<void>
  verification_uri: string
  user_code: string
}
const REAUTH_GATE_KEY = '__copilot_reauth_gate__'
function getReauthGate(): Promise<ReauthGateResult> | null {
  return (globalThis as Record<string, unknown>)[REAUTH_GATE_KEY] as Promise<ReauthGateResult> | null ?? null
}
function setReauthGate(gate: Promise<ReauthGateResult> | null): void {
  ;(globalThis as Record<string, unknown>)[REAUTH_GATE_KEY] = gate
}
const BROWSER_OPENED_KEY = '__copilot_browser_opened__'
function markBrowserOpened(): boolean {
  if ((globalThis as Record<string, unknown>)[BROWSER_OPENED_KEY]) return false
  ;(globalThis as Record<string, unknown>)[BROWSER_OPENED_KEY] = true
  return true
}
function resetBrowserOpened(): void {
  ;(globalThis as Record<string, unknown>)[BROWSER_OPENED_KEY] = false
}

/**
 * Handle TUI-friendly Copilot re-authentication.
 * Starts a device code flow (deduped across concurrent requests),
 * opens the browser, and returns a fake assistant response with
 * the verification URL and code so the user sees it in the TUI chat.
 */
async function handleReauth(
  isStreaming: boolean,
  message: string,
): Promise<Response> {
  if (!getReauthGate()) {
    setReauthGate(requestCopilotReauth())
  }

  try {
    const currentGate = getReauthGate()!
    const { verification_uri, user_code, pollPromise } = await currentGate

    if (markBrowserOpened()) {
      try {
        const { exec } = require('child_process')
        exec(`open "${verification_uri}"`)
      } catch {}
    }

    pollPromise
      .then(() => { setReauthGate(null); resetBrowserOpened() })
      .catch(() => { setReauthGate(null); resetBrowserOpened() })

    return createFakeAssistantResponse(
      `⚠️ ${message}\n\n` +
      `请在浏览器中访问: ${verification_uri}\n` +
      `输入验证码: **${user_code}**\n\n` +
      `授权完成后，重新发送消息即可。`,
      isStreaming,
    )
  } catch (reauthErr) {
    setReauthGate(null)
    resetBrowserOpened()
    const msg =
      reauthErr instanceof Error ? reauthErr.message : String(reauthErr)
    return createFakeAssistantResponse(
      `⚠️ Copilot 认证失败: ${msg}\n\n请运行 \`/provider login\` 手动重新认证。`,
      isStreaming,
    )
  }
}

/**
 * Create a custom fetch function that proxies Anthropic SDK requests
 * through the GitHub Copilot API.
 *
 * This intercepts calls to /v1/messages and translates them to
 * OpenAI chat completions format for the Copilot API.
 */
export function createCopilotFetch(): NonNullable<ClientOptions['fetch']> {

  return async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    const url = input instanceof URL ? input.href : String(input)

    // Only intercept calls to the messages endpoint
    if (!url.includes('/v1/messages')) {
      return fetch(input, init)
    }

    // Handle countTokens endpoint locally — Copilot API has no countTokens
    // equivalent, and letting it fall through would waste a premium request
    // (the proxy would send it as a chat completion).
    if (url.includes('/count_tokens')) {
      const body = JSON.parse(init?.body as string)
      // Rough estimation: serialize messages + tools and count ~4 chars per token
      const messageText = JSON.stringify(body.messages ?? [])
      const toolText = JSON.stringify(body.tools ?? [])
      const estimatedTokens = Math.ceil((messageText.length + toolText.length) / 4)
      return new Response(
        JSON.stringify({ input_tokens: estimatedTokens }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      )
    }

    // Parse the Anthropic request body
    const anthropicBody = JSON.parse(init?.body as string)

    // Get a fresh Copilot token
    let copilotToken: string
    try {
      // If a previous message already kicked off re-auth and it completed,
      // clear the gate and try the fresh token
      const gate = getReauthGate()
      if (gate) {
        try {
          const info = await gate
          await info.pollPromise
        } catch {
          // reauth failed — will be handled below when getCopilotToken throws
        }
        setReauthGate(null)
        resetBrowserOpened()
      }
      // autoLogin=false so we don't block on console.error prompts
      // that are invisible in the TUI's Ink alternate buffer
      copilotToken = await getCopilotToken({ autoLogin: false })
    } catch (err) {
      // Token expired or missing — start TUI-friendly device code flow.
      // Return a fake successful response so the message appears in the TUI
      // chat (401 errors get swallowed by the SDK's retry logic).
      return handleReauth(
        !!anthropicBody.stream,
        'Copilot 认证已过期，正在重新授权...',
      )
    }

    // Translate request
    const translated = translateRequest(anthropicBody)

    // Build Copilot request headers
    const copilotHeaders: Record<string, string> = {
      Authorization: `Bearer ${copilotToken}`,
      'Content-Type': 'application/json',
      Accept: anthropicBody.stream
        ? 'text/event-stream'
        : 'application/json',
      'User-Agent': 'mycode-rev/1.0',
      'Openai-Intent': 'conversation-edits',
      'Copilot-Integration-Id': 'vscode-chat',
      'Editor-Version': 'vscode/1.100.0',
      'Editor-Plugin-Version': 'copilot/1.0.0',
    }

    // Make request to Copilot API
    const copilotResponse = await fetch(translated.url, {
      method: 'POST',
      headers: copilotHeaders,
      body: JSON.stringify(translated.body),
      signal: init?.signal,
    })

    if (!copilotResponse.ok) {
      // If Copilot returns 401, the cached token is stale (e.g. system clock
      // was wrong when it was issued). Clear it and trigger re-auth.
      if (copilotResponse.status === 401) {
        // Invalidate the cached token so next getCopilotToken call won't reuse it
        try {
          const { invalidateCopilotToken } = await import('./auth.js')
          invalidateCopilotToken()
        } catch {}

        return handleReauth(
          !!anthropicBody.stream,
          'Copilot 认证令牌已失效，正在重新授权...',
        )
      }

      // Return other errors as Anthropic-formatted error
      const errorText = await copilotResponse.text()
      return new Response(
        JSON.stringify({
          type: 'error',
          error: {
            type: 'api_error',
            message: `Copilot API error ${copilotResponse.status}: ${errorText}`,
          },
        }),
        {
          status: copilotResponse.status,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    if (anthropicBody.stream) {
      // Transform the streaming response
      if (!copilotResponse.body) {
        throw new Error('No response body from Copilot API')
      }

      const translatedStream = translateStream(
        copilotResponse.body,
        anthropicBody.model,
      )

      return new Response(translatedStream, {
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'close',
          // The Anthropic SDK looks for the request-id header
          'request-id': `copilot-${Date.now()}`,
        },
      })
    }

    // Non-streaming: translate the full response
    const openaiResult = await copilotResponse.json()
    const anthropicResult = translateNonStreamingResponse(
      openaiResult as Record<string, unknown>,
      anthropicBody.model,
    )

    return new Response(JSON.stringify(anthropicResult), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'request-id': `copilot-${Date.now()}`,
      },
    })
  }
}
