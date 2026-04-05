// GrowthBook/Statsig removed — all exports return safe defaults

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
  return defaultValue
}

export function getFeatureValue_CACHED_WITH_REFRESH<T>(
  _key: string,
  defaultValue: T,
): T {
  return defaultValue
}

export function checkStatsigFeatureGate_CACHED_MAY_BE_STALE(
  _gate: string,
  defaultValue?: boolean,
): boolean {
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
