// Stub: restored shim — force-snip command not available
const forceSnip = {
  type: 'local-jsx' as const,
  name: 'force-snip',
  description: 'Force snip conversation (not available in this build)',
  isEnabled: () => false,
  immediate: true,
  load: () => Promise.resolve({ async call() { return null } }),
}

export default forceSnip
