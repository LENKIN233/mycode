// Stub: restored shim — workflows command not available
const workflows = {
  type: 'local-jsx' as const,
  name: 'workflows',
  description: 'Manage workflows (not available in this build)',
  isEnabled: () => false,
  immediate: true,
  load: () => Promise.resolve({ async call() { return null } }),
}

export default workflows
