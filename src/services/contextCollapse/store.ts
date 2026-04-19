import type {
  ContextCollapseCommitEntry,
  ContextCollapseSnapshotEntry,
} from '../../types/logs.js'

export type ContextCollapseStats = {
  collapsedSpans: number
  collapsedMessages: number
  stagedSpans: number
  health: {
    totalErrors: number
    totalEmptySpawns: number
    emptySpawnWarningEmitted: boolean
    totalSpawns: number
    lastError?: string
  }
}

type RuntimeState = {
  commits: ContextCollapseCommitEntry[]
  snapshot: ContextCollapseSnapshotEntry | undefined
  archivedCounts: Map<string, number>
  nextCollapseId: number
  health: ContextCollapseStats['health']
}

const listeners = new Set<() => void>()

const state: RuntimeState = {
  commits: [],
  snapshot: undefined,
  archivedCounts: new Map(),
  nextCollapseId: 1,
  health: {
    totalErrors: 0,
    totalEmptySpawns: 0,
    emptySpawnWarningEmitted: false,
    totalSpawns: 0,
    lastError: undefined,
  },
}

function notify(): void {
  for (const listener of listeners) {
    listener()
  }
}

function reseedNextCollapseId(): void {
  const maxCollapseId = state.commits.reduce((maxId, commit) => {
    const numericId = Number.parseInt(commit.collapseId, 10)
    return Number.isFinite(numericId) ? Math.max(maxId, numericId) : maxId
  }, 0)
  state.nextCollapseId = maxCollapseId + 1
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getCommits(): readonly ContextCollapseCommitEntry[] {
  return state.commits
}

export function getSnapshot(): ContextCollapseSnapshotEntry | undefined {
  return state.snapshot
}

export function getNextCollapseId(): string {
  const collapseId = String(state.nextCollapseId).padStart(16, '0')
  state.nextCollapseId += 1
  return collapseId
}

export function recordSpawnAttempt({
  committed,
  error,
}: {
  committed: boolean
  error?: string
}): void {
  state.health.totalSpawns += 1

  if (error) {
    state.health.totalErrors += 1
    state.health.lastError = error
  }

  if (committed) {
    state.health.totalEmptySpawns = 0
    state.health.emptySpawnWarningEmitted = false
  } else {
    state.health.totalEmptySpawns += 1
    if (state.health.totalEmptySpawns >= 3) {
      state.health.emptySpawnWarningEmitted = true
    }
  }

  notify()
}

export function resetRuntimeState(): void {
  state.commits = []
  state.snapshot = undefined
  state.archivedCounts.clear()
  state.nextCollapseId = 1
  state.health = {
    totalErrors: 0,
    totalEmptySpawns: 0,
    emptySpawnWarningEmitted: false,
    totalSpawns: 0,
    lastError: undefined,
  }
  notify()
}

export function restoreRuntimeState(
  commits: ContextCollapseCommitEntry[],
  snapshot: ContextCollapseSnapshotEntry | undefined,
): void {
  resetRuntimeState()
  state.commits = [...commits]
  state.snapshot = snapshot
  reseedNextCollapseId()
  notify()
}

export function appendCommit(
  commit: ContextCollapseCommitEntry,
  archivedCount?: number,
): void {
  state.commits.push(commit)
  if (archivedCount !== undefined) {
    state.archivedCounts.set(commit.summaryUuid, archivedCount)
  }
  reseedNextCollapseId()
  notify()
}

export function setSnapshot(
  snapshot: ContextCollapseSnapshotEntry | undefined,
): void {
  state.snapshot = snapshot
  notify()
}

export function setArchivedCount(summaryUuid: string, count: number): void {
  if (count <= 0) return
  if (state.archivedCounts.get(summaryUuid) === count) return
  state.archivedCounts.set(summaryUuid, count)
  notify()
}

export function getStats(): ContextCollapseStats {
  let collapsedMessages = 0
  for (const commit of state.commits) {
    collapsedMessages += state.archivedCounts.get(commit.summaryUuid) ?? 0
  }

  return {
    collapsedSpans: state.commits.length,
    collapsedMessages,
    stagedSpans: state.snapshot?.staged.length ?? 0,
    health: { ...state.health },
  }
}
