// Stub: restored shim — fork command not available
const fork = {
  type: 'local-jsx' as const,
  name: 'fork',
  description: 'Fork subagent (not available in this build)',
  isEnabled: () => false,
  immediate: true,
  load: () => Promise.resolve({ async call() { return null } }),
}

export default fork
