import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import type { AssistantMessage } from '../types/message.js'

type JobState = {
  status: 'completed' | 'errored' | 'empty'
  updatedAt: string
  assistantMessageCount: number
  lastAssistantPreview: string
  lastApiError: string | null
}

function getLastAssistantPreview(messages: AssistantMessage[]): string {
  const lastAssistant = messages.at(-1)
  if (!lastAssistant) {
    return ''
  }

  const textBlocks = lastAssistant.message.content
    .filter(
      block => block.type === 'text' && typeof block.text === 'string' && block.text.length > 0,
    )
    .map(block => block.text.trim())
    .filter(Boolean)

  return textBlocks.join('\n').slice(0, 500)
}

export async function classifyAndWriteState(
  jobDir: string,
  assistantMessages: AssistantMessage[],
): Promise<JobState> {
  const lastAssistant = assistantMessages.at(-1)
  const state: JobState = {
    status:
      assistantMessages.length === 0
        ? 'empty'
        : lastAssistant?.isApiErrorMessage
          ? 'errored'
          : 'completed',
    updatedAt: new Date().toISOString(),
    assistantMessageCount: assistantMessages.length,
    lastAssistantPreview: getLastAssistantPreview(assistantMessages),
    lastApiError:
      lastAssistant?.isApiErrorMessage && typeof lastAssistant.apiError === 'string'
        ? lastAssistant.apiError
        : null,
  }

  await mkdir(jobDir, { recursive: true })
  await writeFile(join(jobDir, 'state.json'), JSON.stringify(state, null, 2))

  return state
}

export async function runClassifier() {
  return null
}
