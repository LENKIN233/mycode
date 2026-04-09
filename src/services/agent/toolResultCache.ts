/**
 * Session-level cache for idempotent tool results.
 *
 * Caches results from read-only tools (Glob, Grep, FileRead) so repeated
 * identical calls skip re-execution and return the cached result instantly.
 * Saves tokens and latency for common patterns like the model re-reading
 * the same file multiple times in one turn.
 *
 * Cache entries are invalidated when a write tool (FileEdit, FileWrite,
 * Bash with side effects) modifies a file that overlaps with a cached read.
 *
 * Integration point: StreamingToolExecutor checks the cache before
 * executing a tool, and stores results after execution.
 */

import type { ToolResultBlockParam } from '@anthropic-ai/sdk/resources/index.mjs'
import { logEvent } from '../analytics/index.js'

/** Tools whose results can safely be cached within a session turn. */
const CACHEABLE_TOOLS = new Set([
  'Read',
  'Glob',
  'Grep',
  'LS',
  'ListMcpResources',
  'ReadMcpResource',
])

/** Tools that invalidate cached results by modifying file state. */
const INVALIDATING_TOOLS = new Set([
  'Edit',
  'Write',
  'NotebookEdit',
  'MultiEdit',
])

/** Tools where we need to check command content for file mutation. */
const CONDITIONAL_INVALIDATORS = new Set(['Bash', 'PowerShell'])

/** Bash commands that are known to be read-only (safe for caching). */
const READ_ONLY_BASH_PREFIXES = [
  'cat ',
  'head ',
  'tail ',
  'wc ',
  'ls ',
  'find ',
  'grep ',
  'rg ',
  'git log',
  'git show',
  'git diff',
  'git status',
  'git branch',
  'git rev-parse',
  'git blame',
  'echo ',
  'pwd',
  'which ',
  'type ',
  'file ',
  'stat ',
  'du ',
  'df ',
  'env',
  'printenv',
  'uname',
  'whoami',
  'date',
  'tree ',
]

type CacheEntry = {
  result: string
  timestamp: number
  hitCount: number
}

export class ToolResultCache {
  private cache = new Map<string, CacheEntry>()
  private stats = { hits: 0, misses: 0, invalidations: 0, evictions: 0 }
  private maxEntries: number

  constructor(maxEntries = 200) {
    this.maxEntries = maxEntries
  }

  /**
   * Generate a cache key from tool name and input.
   * Deterministic: same tool + same input → same key.
   */
  private makeKey(toolName: string, input: Record<string, unknown>): string {
    // Sort keys for deterministic serialization
    const sortedInput = Object.keys(input)
      .sort()
      .reduce(
        (acc, key) => {
          acc[key] = input[key]
          return acc
        },
        {} as Record<string, unknown>,
      )
    return `${toolName}::${JSON.stringify(sortedInput)}`
  }

  /**
   * Check if a tool's results can be cached.
   */
  isCacheable(toolName: string, input: Record<string, unknown>): boolean {
    if (CACHEABLE_TOOLS.has(toolName)) return true

    // Bash/PowerShell can be cached if the command is read-only
    if (CONDITIONAL_INVALIDATORS.has(toolName)) {
      const command = (input.command as string) ?? ''
      return READ_ONLY_BASH_PREFIXES.some(prefix =>
        command.trimStart().startsWith(prefix),
      )
    }

    return false
  }

  /**
   * Look up a cached result. Returns undefined on miss.
   */
  get(
    toolName: string,
    input: Record<string, unknown>,
  ): string | undefined {
    if (!this.isCacheable(toolName, input)) return undefined

    const key = this.makeKey(toolName, input)
    const entry = this.cache.get(key)

    if (entry) {
      entry.hitCount++
      this.stats.hits++
      return entry.result
    }

    this.stats.misses++
    return undefined
  }

  /**
   * Store a tool result in the cache.
   */
  set(
    toolName: string,
    input: Record<string, unknown>,
    result: string,
  ): void {
    if (!this.isCacheable(toolName, input)) return

    // Don't cache error results
    if (result.includes('<tool_use_error>')) return

    // Don't cache very large results (they should be persisted, not cached)
    if (result.length > 100_000) return

    const key = this.makeKey(toolName, input)

    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      this.evictOldest()
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      hitCount: 0,
    })
  }

  /**
   * Notify the cache that a tool with side effects was executed.
   * Invalidates cached entries that may be affected.
   */
  notifyToolExecution(
    toolName: string,
    input: Record<string, unknown>,
  ): void {
    // Direct file-modifying tools: invalidate entries touching the same file
    if (INVALIDATING_TOOLS.has(toolName)) {
      const filePath =
        (input.file_path as string) ??
        (input.filePath as string) ??
        (input.path as string)
      if (filePath) {
        this.invalidateByPath(filePath)
      }
      return
    }

    // Bash/PowerShell: invalidate everything if the command is not read-only
    if (CONDITIONAL_INVALIDATORS.has(toolName)) {
      const command = (input.command as string) ?? ''
      const isReadOnly = READ_ONLY_BASH_PREFIXES.some(prefix =>
        command.trimStart().startsWith(prefix),
      )
      if (!isReadOnly) {
        // Conservative: clear all cached reads since bash can modify anything
        this.invalidateAll()
      }
    }
  }

  /**
   * Invalidate cache entries that reference a specific file path.
   */
  private invalidateByPath(filePath: string): void {
    const toDelete: string[] = []
    for (const [key] of this.cache) {
      // Check if the cache key references this file path
      if (key.includes(filePath)) {
        toDelete.push(key)
      }
    }
    for (const key of toDelete) {
      this.cache.delete(key)
      this.stats.invalidations++
    }
  }

  /**
   * Clear all cached entries. Called when a non-read-only bash command
   * runs and we can't determine which files were affected.
   */
  private invalidateAll(): void {
    const count = this.cache.size
    this.cache.clear()
    this.stats.invalidations += count
  }

  /**
   * Evict the oldest entry by timestamp.
   */
  private evictOldest(): void {
    let oldestKey: string | undefined
    let oldestTime = Infinity
    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp
        oldestKey = key
      }
    }
    if (oldestKey) {
      this.cache.delete(oldestKey)
      this.stats.evictions++
    }
  }

  /**
   * Get cache statistics for telemetry.
   */
  getStats(): {
    hits: number
    misses: number
    invalidations: number
    evictions: number
    size: number
    hitRate: number
  } {
    const total = this.stats.hits + this.stats.misses
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    }
  }

  /**
   * Log cache stats to analytics. Called at end of query session.
   */
  logStats(): void {
    const stats = this.getStats()
    if (stats.hits > 0 || stats.misses > 0) {
      logEvent('tengu_tool_result_cache_stats', {
        hits: stats.hits,
        misses: stats.misses,
        invalidations: stats.invalidations,
        evictions: stats.evictions,
        size: stats.size,
        hitRate: Math.round(stats.hitRate * 100),
      })
    }
  }

  /**
   * Reset the cache. Called between user turns.
   */
  reset(): void {
    this.cache.clear()
    this.stats = { hits: 0, misses: 0, invalidations: 0, evictions: 0 }
  }

  /**
   * Disposable support — logs stats when the cache goes out of scope.
   */
  [Symbol.dispose](): void {
    this.logStats()
  }
}
