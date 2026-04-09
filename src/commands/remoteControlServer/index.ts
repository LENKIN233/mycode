// Stub: restored shim — remote control server not available
const remoteControlServer = {
  type: 'local-jsx' as const,
  name: 'remote-control-server',
  description: 'Remote control server (not available in this build)',
  isEnabled: () => false,
  immediate: true,
  load: () => Promise.resolve({ async call() { return null } }),
}

export default remoteControlServer
