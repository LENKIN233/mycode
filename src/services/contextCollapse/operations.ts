import type { Message } from '../../types/message.js'
import { createUserMessage, extractTextContent } from '../../utils/messages.js'
import {
  getCommits,
  getSnapshot,
  getStats,
  setArchivedCount,
} from './store.js'

function createCollapsedSummaryMessage(
  summaryUuid: string,
  summaryContent: string,
): Message {
  return createUserMessage({
    content: summaryContent,
    isMeta: true,
    uuid: summaryUuid,
  })
}

function messageUuid(message: Message): string {
  return message.uuid
}

export function projectView(messages: Message[]): Message[] {
  let view = messages

  for (const commit of getCommits()) {
    const hasSummary = view.some(message => messageUuid(message) === commit.summaryUuid)
    if (hasSummary) {
      continue
    }

    const startIndex = view.findIndex(
      message => messageUuid(message) === commit.firstArchivedUuid,
    )
    const endIndex = view.findIndex(
      message => messageUuid(message) === commit.lastArchivedUuid,
    )

    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
      continue
    }

    setArchivedCount(commit.summaryUuid, endIndex - startIndex + 1)
    view = [
      ...view.slice(0, startIndex),
      createCollapsedSummaryMessage(commit.summaryUuid, commit.summaryContent),
      ...view.slice(endIndex + 1),
    ]
  }

  return view
}

function previewText(message: Message): string | null {
  switch (message.type) {
    case 'user':
      return typeof message.message.content === 'string'
        ? message.message.content
        : extractTextContent(message.message.content, '\n')
    case 'assistant':
      return extractTextContent(message.message.content, '\n')
    case 'attachment':
      return `Attachment: ${message.attachment.type}`
    case 'system':
      return message.message
    default:
      return null
  }
}

export function summarizeContextCollapseState() {
  return {
    stats: getStats(),
    staged: getSnapshot()?.staged ?? [],
    commits: getCommits().map(commit => ({
      collapseId: commit.collapseId,
      summary: commit.summary,
      summaryUuid: commit.summaryUuid,
    })),
  }
}

export function getContextCollapsePreview(messages: Message[] = []) {
  const projected = messages.length > 0 ? projectView(messages) : []
  return projected
    .map(message => previewText(message)?.trim())
    .filter((text): text is string => !!text)
    .slice(0, 10)
}
