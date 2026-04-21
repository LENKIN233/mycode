import type { SDKMessage } from '../entrypoints/agentSdkTypes.js'

// Remote session history is not available in this build (requires Anthropic CCR backend)

export const HISTORY_PAGE_SIZE = 100

export type HistoryPage = {
  events: SDKMessage[]
  firstId: string | null
  hasMore: boolean
}

export type HistoryAuthCtx = {
  baseUrl: string
  headers: Record<string, string>
}

export async function createHistoryAuthCtx(
  _sessionId: string,
): Promise<HistoryAuthCtx> {
  throw new Error('Remote session history is not available in this build')
}

export async function fetchLatestEvents(
  _ctx: HistoryAuthCtx,
  _limit = HISTORY_PAGE_SIZE,
): Promise<HistoryPage | null> {
  return null
}

export async function fetchOlderEvents(
  _ctx: HistoryAuthCtx,
  _beforeId: string,
  _limit = HISTORY_PAGE_SIZE,
): Promise<HistoryPage | null> {
  return null
}
