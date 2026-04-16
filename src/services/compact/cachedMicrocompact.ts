// Cached microcompact — no-op stub. The cache editing API is not available
// in this build; isCachedMicrocompactEnabled() always returns false so none
// of the other exports are ever invoked at runtime.

export interface CachedMCState {
  registeredTools: Set<string>
  toolOrder: string[]
  deletedRefs: Set<string>
}

export interface CacheEditsBlock {
  type: 'cache_edits'
  edits: { type: 'delete'; cache_reference: string }[]
}

export interface PinnedCacheEdits {
  position: number
  block: CacheEditsBlock
}

export function isCachedMicrocompactEnabled(): boolean {
  return false
}

export function isModelSupportedForCacheEditing(_model: string): boolean {
  return false
}

export function createCachedMCState(): CachedMCState {
  return { registeredTools: new Set(), toolOrder: [], deletedRefs: new Set() }
}

export function getCachedMCConfig(): { triggerThreshold: number; keepRecent: number } {
  return { triggerThreshold: 0, keepRecent: 0 }
}

export function registerToolResult(_state: CachedMCState, _toolId: string): void {}

export function registerToolMessage(_state: CachedMCState, _groupIds: string[]): void {}

export function getToolResultsToDelete(_state: CachedMCState): string[] {
  return []
}

export function createCacheEditsBlock(
  _state: CachedMCState,
  _toolIds: string[],
): CacheEditsBlock | null {
  return null
}
