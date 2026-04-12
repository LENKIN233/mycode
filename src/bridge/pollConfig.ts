/**
 * Bridge poll config — stub (Anthropic remote infrastructure removed).
 *
 * PollIntervalConfig type re-exported from replBridge.ts for backward compat.
 */

// Re-export type from replBridge.ts where it's now inlined
export type { PollIntervalConfig } from './replBridge.js'

// Bridge disabled — return empty config
export function getPollIntervalConfig() { return {} as any }

export const DEFAULT_POLL_CONFIG = {
  poll_interval_ms_not_at_capacity: 1000,
  poll_interval_ms_at_capacity: 3000,
  non_exclusive_heartbeat_interval_ms: 0,
  multisession_poll_interval_ms_not_at_capacity: 1000,
  multisession_poll_interval_ms_partial_capacity: 3000,
  multisession_poll_interval_ms_at_capacity: 5000,
  reclaim_older_than_ms: 30000,
  session_keepalive_interval_v2_ms: 60000,
}
