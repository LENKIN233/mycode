// Stub: restored shim — torch command not available
const torch = {
  type: 'local-jsx' as const,
  name: 'torch',
  description: 'Torch mode (not available in this build)',
  isEnabled: () => false,
  immediate: true,
  load: () => Promise.resolve({ async call() { return null } }),
}

export default torch
