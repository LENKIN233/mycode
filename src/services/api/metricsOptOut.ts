type MetricsStatus = {
  enabled: boolean
  hasError: boolean
}

/**
 * Check if metrics are enabled for the current organization.
 * [MyCode] Always disabled for personal use — skips Anthropic API call.
 */
export async function checkMetricsEnabled(): Promise<MetricsStatus> {
  return { enabled: false, hasError: false }
}

// Export for testing purposes only
export const _clearMetricsEnabledCacheForTesting = (): void => {}
