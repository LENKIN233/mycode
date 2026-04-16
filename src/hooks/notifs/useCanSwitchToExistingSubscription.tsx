// OAuth profile not available (API key auth only) — subscription switch prompt disabled
export function useCanSwitchToExistingSubscription(): void {
  // no-op: getOauthProfileFromApiKey requires Anthropic OAuth, not available in this fork
}
