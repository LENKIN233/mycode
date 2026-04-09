// Stub: restored shim — subscribe-pr command not available
const subscribePr = {
  type: 'local-jsx' as const,
  name: 'subscribe-pr',
  description: 'Subscribe to PR (not available in this build)',
  isEnabled: () => false,
  immediate: true,
  load: () => Promise.resolve({ async call() { return null } }),
}

export default subscribePr
