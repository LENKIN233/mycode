// Stub: restored shim — proactive command not available
const proactive = {
  type: 'local-jsx' as const,
  name: 'proactive',
  description: 'Toggle proactive mode (not available in this build)',
  isEnabled: () => false,
  immediate: true,
  load: () => Promise.resolve({ async call() { return null } }),
}

export default proactive
