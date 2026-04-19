import type {
  ContextCollapseCommitEntry,
  ContextCollapseSnapshotEntry,
} from '../../types/logs.js'
import { restoreRuntimeState } from './store.js'

export function restoreFromEntries(
  commits: ContextCollapseCommitEntry[] = [],
  snapshot?: ContextCollapseSnapshotEntry,
): void {
  restoreRuntimeState(commits, snapshot)
}
