import type { QuerySource } from '../../constants/querySource.js'
import type { AssistantMessage, Message } from '../../types/message.js'
import type { CacheSafeParams } from '../../utils/forkedAgent.js'
import {
  isMediaSizeErrorMessage,
  isPromptTooLongMessage,
} from '../api/errors.js'
import { compactConversation, type CompactionResult } from './compact.js'
import { runPostCompactCleanup } from './postCompactCleanup.js'
import { suppressCompactWarning } from './compactWarningState.js'
import { setLastSummarizedMessageId } from '../SessionMemory/sessionMemoryUtils.js'
import { getUserContext } from '../../context.js'

type TryReactiveCompactParams = {
  hasAttempted: boolean
  querySource: QuerySource
  aborted: boolean
  messages: Message[]
  cacheSafeParams: CacheSafeParams
}

type ReactiveCompactSuccess = {
  ok: true
  result: CompactionResult
}

type ReactiveCompactFailure =
  | { ok: false; reason: 'aborted' | 'exhausted' | 'error' | 'too_few_groups' | 'media_unstrippable' }

export function isReactiveCompactEnabled(): boolean {
  return true
}

export function isReactiveOnlyMode(): boolean {
  return false
}

export function isWithheldPromptTooLong(
  message: Message | undefined,
): message is AssistantMessage {
  return message?.type === 'assistant' && isPromptTooLongMessage(message)
}

export function isWithheldMediaSizeError(
  message: Message | undefined,
): message is AssistantMessage {
  return message?.type === 'assistant' && isMediaSizeErrorMessage(message)
}

async function compactViaRecovery(
  messages: Message[],
  cacheSafeParams: CacheSafeParams,
): Promise<CompactionResult> {
  const result = await compactConversation(
    messages,
    cacheSafeParams.toolUseContext,
    cacheSafeParams,
    false,
    undefined,
    true,
  )

  setLastSummarizedMessageId(undefined)
  suppressCompactWarning()
  getUserContext.cache.clear?.()
  runPostCompactCleanup()

  return result
}

export async function tryReactiveCompact(
  params: TryReactiveCompactParams,
): Promise<CompactionResult | null> {
  if (params.aborted || params.hasAttempted || params.messages.length === 0) {
    return null
  }

  try {
    return await compactViaRecovery(params.messages, params.cacheSafeParams)
  } catch {
    return null
  }
}

export async function reactiveCompactOnPromptTooLong(
  messages: Message[],
  cacheSafeParams: CacheSafeParams,
  _options?: { customInstructions?: string; trigger?: string },
): Promise<ReactiveCompactSuccess | ReactiveCompactFailure> {
  if (messages.length === 0 || cacheSafeParams.toolUseContext.abortController.signal.aborted) {
    return { ok: false, reason: 'aborted' }
  }

  try {
    const result = await compactViaRecovery(messages, cacheSafeParams)
    return { ok: true, result }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

export async function runReactiveCompact<T>(messages: T): Promise<T> {
  return messages
}
