// Stub: restored shim — assistant command not available
const assistant = {
  type: 'local-jsx' as const,
  name: 'assistant',
  description: 'Assistant mode (not available in this build)',
  isEnabled: () => false,
  immediate: true,
  load: () => Promise.resolve({ async call() { return null } }),
}

export default assistant
