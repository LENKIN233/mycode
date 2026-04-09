// Stub: restored shim — peers command not available
const peers = {
  type: 'local-jsx' as const,
  name: 'peers',
  description: 'Manage peers (not available in this build)',
  isEnabled: () => false,
  immediate: true,
  load: () => Promise.resolve({ async call() { return null } }),
}

export default peers
