// GrowthBook/Statsig removed — safe flags force-enabled, rest return defaults

// Flags that are safe to enable locally (no external service dependency)
const ENABLED_FLAGS: Record<string, unknown> = {
  // Context & compression optimization
  tengu_cobalt_raccoon: true,        // compact mode optimization
  // Session memory
  tengu_session_memory: true,        // session-level memory extraction
  // Tool discovery
  tengu_glacier_2xr: true,           // tool discovery enhancement
  // Background agents
  tengu_auto_background_agents: true, // background agent execution
  // Memory time tracking
  tengu_herring_clock: true,         // memory time tracking
  // Evidence capture
  tengu_hive_evidence: true,         // capture context for tools
  // Destructive command warnings
  tengu_destructive_command_warning: true, // safer bash permission requests
  // Streaming tool execution
  streamingToolExecution: true,      // stream tool results
}

export type GrowthBookUserAttributes = {
  id: string
  subscriptionType?: string
  rateLimitTier?: string
  accountUUID?: string
  organizationUUID?: string
  [key: string]: unknown
}

type RefreshCallback = () => void
const callbacks: RefreshCallback[] = []

export function onGrowthBookRefresh(cb: RefreshCallback): () => void {
  callbacks.push(cb)
  return () => {
    const idx = callbacks.indexOf(cb)
    if (idx >= 0) callbacks.splice(idx, 1)
  }
}

export function hasGrowthBookEnvOverride(_feature: string): boolean {
  return false
}

export function getAllGrowthBookFeatures(): Record<string, unknown> {
  return {}
}

export function getGrowthBookConfigOverrides(): Record<string, unknown> {
  return {}
}

export function setGrowthBookConfigOverride(
  _key: string,
  _value: unknown,
): void {}

export function clearGrowthBookConfigOverrides(): void {}

export function getApiBaseUrlHost(): string | undefined {
  return undefined
}

export const initializeGrowthBook = async (): Promise<void> => {}

export async function getFeatureValue_DEPRECATED<T>(
  key: string,
  defaultValue: T,
): Promise<T> {
  return (key in ENABLED_FLAGS ? ENABLED_FLAGS[key] : defaultValue) as T
}

export function getFeatureValue_CACHED_MAY_BE_STALE<T>(
  key: string,
  defaultValue: T,
): T {
  return (key in ENABLED_FLAGS ? ENABLED_FLAGS[key] : defaultValue) as T
}

export function getFeatureValue_CACHED_WITH_REFRESH<T>(
  key: string,
  defaultValue: T,
): T {
  return (key in ENABLED_FLAGS ? ENABLED_FLAGS[key] : defaultValue) as T
}

export function checkStatsigFeatureGate_CACHED_MAY_BE_STALE(
  gate: string,
  defaultValue?: boolean,
): boolean {
  return (gate in ENABLED_FLAGS ? !!ENABLED_FLAGS[gate] : defaultValue) ?? false
}

export async function checkSecurityRestrictionGate(
  _gate: string,
): Promise<boolean> {
  return false
}

export async function checkGate_CACHED_OR_BLOCKING(
  gate: string,
  defaultValue?: boolean,
): Promise<boolean> {
  return (gate in ENABLED_FLAGS ? !!ENABLED_FLAGS[gate] : defaultValue) ?? false
}

export function refreshGrowthBookAfterAuthChange(): void {}

export function resetGrowthBook(): void {}

export async function refreshGrowthBookFeatures(): Promise<void> {}

export function setupPeriodicGrowthBookRefresh(): void {}

export function stopPeriodicGrowthBookRefresh(): void {}

export async function getDynamicConfig_BLOCKS_ON_INIT<T>(
  key: string,
  defaultValue: T,
): Promise<T> {
  return (key in ENABLED_FLAGS ? ENABLED_FLAGS[key] : defaultValue) as T
}

export function getDynamicConfig_CACHED_MAY_BE_STALE<T>(
  _key: string,
  defaultValue: T,
): T {
  return defaultValue
}
