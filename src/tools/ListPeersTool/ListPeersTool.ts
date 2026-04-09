// Stub: restored shim — original implementation not available
import { buildTool } from '../../Tool.js'
import { lazySchema } from '../../utils/lazySchema.js'
import { z } from 'zod/v4'

const inputSchema = lazySchema(() =>
  z.strictObject({}),
)

export const ListPeersTool = buildTool({
  name: 'ListPeers',
  async description() {
    return 'List connected peers.'
  },
  inputSchema: inputSchema(),
  userFacingName() {
    return 'List Peers'
  },
  isReadOnly() {
    return true
  },
  isEnabled() {
    return false
  },
  async call() {
    return {
      type: 'text' as const,
      text: 'ListPeers tool is not available in this build.',
    }
  },
})
