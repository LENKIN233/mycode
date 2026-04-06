// GrowthBook/Statsig removed — all exports return safe defaults
// [MyCode] Added ENABLED_GATES: GrowthBook gates that should return true
// for personal use. Without these overrides, double-gated features
// (feature() + growthbook gate) remain disabled even with --feature flags.
const ENABLED_GATES = new Set([
  // Memory extraction — required for EXTRACT_MEMORIES to run
  'tengu_passport_quail',
  // Non-interactive mode memory extraction
  'tengu_slate_thimble',
  // Memory feature enhancements
  'tengu_coral_fern',
  // Coordinator mode — required for COORDINATOR_MODE
  'tengu_scratch',
  // Evidence-based tool verification
  'tengu_hive_evidence',
  // Skill search improvements — required for EXPERIMENTAL_SKILL_SEARCH
  'tengu_glacier_2xr',
  // File write/edit improvements
  'tengu_quartz_lantern',
  // Auto background agents
  'tengu_auto_background_agents',
  // Agent list attach
  'tengu_agent_list_attach',
  // Plan mode v2
  'tengu_plan_mode_v2',
])

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
  _key: string,
  defaultValue: T,
): Promise<T> {
  return defaultValue
}

export function getFeatureValue_CACHED_MAY_BE_STALE<T>(
  _key: string,
  defaultValue: T,
): T {
  if (ENABLED_GATES.has(_key)) return true as T
  return defaultValue
}

export function getFeatureValue_CACHED_WITH_REFRESH<T>(
  _key: string,
  defaultValue: T,
): T {
  if (ENABLED_GATES.has(_key)) return true as T
  return defaultValue
}

export function checkStatsigFeatureGate_CACHED_MAY_BE_STALE(
  _gate: string,
  defaultValue?: boolean,
): boolean {
  if (ENABLED_GATES.has(_gate)) return true
  return defaultValue ?? false
}

export async function checkSecurityRestrictionGate(
  _gate: string,
): Promise<boolean> {
  return false
}

export async function checkGate_CACHED_OR_BLOCKING(
  _gate: string,
  defaultValue?: boolean,
): Promise<boolean> {
  if (ENABLED_GATES.has(_gate)) return true
  return defaultValue ?? false
}

export function refreshGrowthBookAfterAuthChange(): void {}

export function resetGrowthBook(): void {}

export async function refreshGrowthBookFeatures(): Promise<void> {}

export function setupPeriodicGrowthBookRefresh(): void {}

export function stopPeriodicGrowthBookRefresh(): void {}

export async function getDynamicConfig_BLOCKS_ON_INIT<T>(
  _key: string,
  defaultValue: T,
): Promise<T> {
  return defaultValue
}

export function getDynamicConfig_CACHED_MAY_BE_STALE<T>(
  _key: string,
  defaultValue: T,
): T {
  return defaultValue
}
