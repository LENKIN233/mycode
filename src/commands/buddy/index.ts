// Stub: restored shim — buddy command not available
const buddy = {
  type: 'local-jsx' as const,
  name: 'buddy',
  description: 'Buddy companion (not available in this build)',
  isEnabled: () => false,
  immediate: true,
  load: () => Promise.resolve({ async call() { return null } }),
}

export default buddy
